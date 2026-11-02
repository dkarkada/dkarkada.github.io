"""Residual-stream representations of calendar dates in a base LLM (runs on a GPU pod).

Each of ~20 short prompt templates ends with a date ("... on March 14"), filled in
with all 365 days of a non-leap year. For every prompt we record the residual
stream at the final token after the embedding and after each decoder block,
then average over templates to get one vector per (date, layer).

The date is written in one of several FORMATS (picked on the command line). With
"md" the final token is the day number, whose identity dominates the variance
(the top PCs trace day of month, not time of year). "md-period" reads out at a
trailing period instead, a token that is the same in every prompt; "dm" and
"dm-ordinal" put the month last. The month-last formats give the cleanest
yearly loop (month identity is ~85% of the variance), so the widget uses "dm".

Hooks read the raw residual stream; HF's `output_hidden_states` would hand back
the final layer *after* the last norm, which isn't comparable to the others.

Writes reps_<format>.npy, shape (date, layer, d) = (365, n_layers + 1, d_model),
float32, to R2 under residualstream/<model>/.

Run: bash launch.sh --sky rs-extract .sky/extract.yaml
     (the yaml's run: line lists the formats)
"""

import datetime
import sys

import numpy as np
import torch
from dkexpt import FileManager
from einops import reduce
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL = "allenai/Olmo-3-1025-7B"
BATCH = 128

TEMPLATES = [
    "The current date is {date}",
    "Today is my birthday, {date}",
    "Yesterday was our anniversary, {date}",
    "A great event took place on {date}",
    "The meeting is scheduled for {date}",
    "She was born on {date}",
    "The package should arrive by {date}",
    "The deadline for applications is {date}",
    "The festival begins on {date}",
    "We got married on {date}",
    "The store will reopen on {date}",
    "My flight leaves on {date}",
    "The letter was dated {date}",
    "The concert is on {date}",
    "He passed away on {date}",
    "The first day of the trip is {date}",
    "Mark your calendars for {date}",
    "The report was published on {date}",
    "The game was played on {date}",
    "I will never forget {date}",
]


def ordinal(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


FORMATS = {
    "md": lambda d: f"{d:%B} {d.day}",
    "md-period": lambda d: f"{d:%B} {d.day}.",
    "dm": lambda d: f"{d.day} {d:%B}",
    "dm-ordinal": lambda d: f"the {ordinal(d.day)} of {d:%B}",
}
DATES = [datetime.date(2025, 1, 1) + datetime.timedelta(days=i) for i in range(365)]

tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.bfloat16, device_map="cuda")
model.eval()
n_layers = model.config.num_hidden_layers
d_model = model.config.hidden_size

# Hooks write the final-token residual of each batch into `captured`.
captured = {}
last_idx = None


def hook(k):
    def fn(module, args, output):
        h = output[0] if isinstance(output, tuple) else output
        captured[k] = h[torch.arange(h.shape[0]), last_idx].float()
    return fn


handles = [model.model.embed_tokens.register_forward_hook(hook(0))]
handles += [layer.register_forward_hook(hook(k + 1)) for k, layer in enumerate(model.model.layers)]

fm = FileManager(f"residualstream/{MODEL.split('/')[-1]}", r2=True)
for fmt in sys.argv[1:] or ["md"]:
    # OLMo has no BOS token; pretraining documents are delimited by EOS, so an
    # EOS prefix marks the start of a fresh document.
    date_strs = [FORMATS[fmt](d) for d in DATES]
    prompts = [(t, i, tok.eos_token + t.format(date=s)) for t in TEMPLATES for i, s in enumerate(date_strs)]
    print(f"{len(prompts)} prompts, e.g. {prompts[0][2]!r} -> {tok.tokenize(prompts[0][2])}")

    sums = np.zeros((len(DATES), n_layers + 1, d_model), dtype=np.float64)
    counts = np.zeros(len(DATES))
    with torch.inference_mode():
        for b in range(0, len(prompts), BATCH):
            batch = prompts[b:b + BATCH]
            # Right padding: causal attention keeps real tokens blind to the pads.
            enc = tok([p for _, _, p in batch], return_tensors="pt", padding=True, add_special_tokens=False).to("cuda")
            last_idx = enc["attention_mask"].sum(1) - 1
            model.model(**enc)
            reps = torch.stack([captured[k] for k in range(n_layers + 1)], dim=1).cpu().numpy()
            for (_, i, _), r in zip(batch, reps):
                sums[i] += r
                counts[i] += 1
            print(f"batch {b // BATCH + 1}/{-(-len(prompts) // BATCH)}")

    reps = (sums / counts[:, None, None]).astype(np.float32)
    norms = reduce(np.linalg.norm(reps, axis=-1), "date layer -> layer", "mean")
    print("mean residual norm per layer:", np.round(norms, 1))

    fm.save(reps, f"reps_{fmt}.npy")
    fm.save({"model": MODEL, "templates": TEMPLATES, "dates": date_strs}, f"meta_{fmt}.pkl")
    print("saved", fm.get_filename(f"reps_{fmt}.npy"), reps.shape)

for h in handles:
    h.remove()
