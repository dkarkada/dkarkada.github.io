"""Per-layer 3D PCA of the date representations, for the residual-stream widget.

For each date format in FORMATS, reads reps_<format>.npy (365 dates x layers x
d_model, from extract.py) from R2, caching it next to this file. For each decoder
layer, projects the 365 mean date vectors onto their own top-3 principal
components.

Each layer's cloud is shown in its own PC basis (PC1-3 are the widget's fixed
axes), rescaled to unit RMS radius. Each PC's sign is arbitrary, which would make
the depth animation flip, so each component's sign is chosen to agree with the
same component in the neighboring layer, propagating outward from DEFAULT_LAYER.
At DEFAULT_LAYER, every format's signs are chosen to agree with DEFAULT_FORMAT,
so the widget can morph between formats. Where PCs change order or mix between
layers, the cloud visibly rotates; that's real, not an artifact.

Run: bash launch.sh --local pca.py
     (writes src/content/posts/_media/residualstream/dates-pca.json)
"""

import base64
import json
from pathlib import Path

import numpy as np
from dkexpt import FileManager
from einops import einsum

MODEL = "Olmo-3-1025-7B"
DEFAULT_LAYER = 16
DEFAULT_FORMAT = "dm"
# Format key (see extract.py) -> label shown on the widget's toggle.
FORMATS = {
    "dm": "14 March",
    "dm-ordinal": "the 14th of March",
    "md": "March 14",
    "md-period": "March 14.",
}

here = Path(__file__).resolve().parent
local = FileManager(str(here))
remote = FileManager(f"residualstream/{MODEL}", r2=True)


def load(fmt):
    fn = f"reps_{fmt}.npy"
    reps = local.load(fn)
    if reps is None:
        reps = remote.load(fn)
        local.save(reps, fn)
    return reps


def pca3(X):
    """Top-3 PCs of the rows of X, centered: coords (date, 3) and explained
    variance ratios (3,). Computed via the 365 x 365 Gram matrix: same PCs as an
    SVD of X, but far cheaper with d = 4096."""
    X = X.astype(np.float64)
    X -= X.mean(0)
    lam, U = np.linalg.eigh(einsum(X, X, "i d, j d -> i j"))
    lam, U = lam[::-1].clip(0), U[:, ::-1]
    return U[:, :3] * np.sqrt(lam[:3]), lam[:3] / lam.sum()


def unit_rms(C):
    """Rescale each layer of C (layer, date, 3) to unit RMS radius."""
    return C / np.sqrt((C**2).sum(-1).mean(-1))[:, None, None]


def match_signs(A, B):
    """Sign flips (3,) that make each column of A agree with the same column of B."""
    return np.where(einsum(A, B, "n k, n k -> k") < 0, -1, 1)


def sign_chain(C, anchor=None):
    """Flip each layer's PC signs to agree with the neighboring layer, outward
    from DEFAULT_LAYER, whose signs are matched to `anchor` (if given)."""
    C = C.copy()
    a = DEFAULT_LAYER - 1
    if anchor is not None:
        C[a] *= match_signs(C[a], anchor)
    for l in range(a + 1, len(C)):
        C[l] *= match_signs(C[l], C[l - 1])
    for l in range(a - 1, -1, -1):
        C[l] *= match_signs(C[l], C[l + 1])
    return C


def pack_int8(x):
    scale = float(np.abs(x).max())
    q = np.round(x / scale * 127).astype(np.int8)
    return {'scale': round(scale, 4), 'shape': list(q.shape), 'data': base64.b64encode(q.tobytes()).decode()}


views = {}
for fmt in FORMATS:
    reps = load(fmt)
    pcs = [pca3(reps[:, l]) for l in range(1, reps.shape[1])]   # layers 1..L; 0 is the embedding
    views[fmt] = dict(C=unit_rms(np.stack([c for c, _ in pcs])), evr=np.stack([e for _, e in pcs]))

C_ref = sign_chain(views[DEFAULT_FORMAT]['C'])
formats = []
for fmt, label in FORMATS.items():
    v = views[fmt]
    C = sign_chain(v['C'], anchor=C_ref[DEFAULT_LAYER - 1])
    print(f"{fmt:>10}: PC1-3 explain {v['evr'].sum(1).min():.2f}-{v['evr'].sum(1).max():.2f} of variance across layers")
    formats.append({'key': fmt, 'label': label, 'evr': np.round(v['evr'], 3).tolist(), 'coords': pack_int8(C)})

data = {
    'model': f'allenai/{MODEL}',
    'defaultLayer': DEFAULT_LAYER,
    'defaultFormat': DEFAULT_FORMAT,
    'formats': formats,
}
out = here.parents[1] / 'src/content/posts/_media/residualstream/dates-pca.json'
out.write_text(json.dumps(data, separators=(',', ':')))
print(f'wrote {out} ({out.stat().st_size / 1024:.0f} KB)')
