---
title: draft
published: 2025-06-28
draft: true
hidden: true
---

Upon revisiting `word2vec` last year, I quickly became convinced that a theory describing `word2vec` is a necessary stepping stone towards a full theory of transformer-based language modelling. Here's my rationale:
* both LLMs and `word2vec` model co-occurrence statistics using a self-supervised first-order optimization algorithm
* in both, the core computational primitive is the inner product between latent representations. (For LLMs, self-attention computes using inner products between token representations.)
* in both, the pre-training task is distinct from the actual downstream task of interest. (For LLMs, though we train to minimize perplexity, what we actually want is creative reasoning. In `word2vec`, though we minimize the aforementioned cross-entropy, we evaluate the quality of the embeddings using semantic understanding benchmarks.)