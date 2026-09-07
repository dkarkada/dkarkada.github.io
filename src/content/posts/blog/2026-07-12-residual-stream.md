---
title: "Geometric structures in the residual stream"
published: 2026-07-12
description: What are their statistical origin, representational fidelity, computational role?
tags:
  - science
  - misc
pin: 90
abbrlink: stream-geom
hidden: True
---

At ICML this year, I was invited to give a short talk at the mechanistic interpretability workshop. I gave a pretty speculative talk, it was fun! Here are its contents, abridged and edited.

A central premise of learning mechanics is that understanding the dynamics of model training is not just useful, but *necessary* for producing a full mechanistic understanding of LLM intelligence.
Recently, I’ve been focused on geometric structures that arise in the residual stream, including linear representational subspaces, curved feature manifolds, latent graphs, posteriors on a simplex, etc.
I think it's important to deeply understand this vibrant zoology.
The reason it's important is that the residual stream is a stage on which high-dimensional geometric operations are performed; therefore these residual stream structures are likely the substrates of forward pass computations.
At the same time, they are also the artifacts of pretraining and finetuning, so we can't expect to understand their origin without concurrently understanding the dynamics of the optimization and how they are driven by the character of the training data.

In some recent work, I along with some excellent collaborators focused on a bite-sized problem: understanding the origin, universality, and computational role of continuous feature manifolds.
What we prove is that the manifolds are a direct consequence of a symmetry structure inherent in natural language.[^1] We do this by:

1. Establishing that the symmetry structure is legit (it's a verifiable empirical fact).
2. Imposing an ansatz to describe learning — we propose that language models encode these statistics via inner products of representation vectors.

The ansatz is motivated by the fact that this is literally the `word2vec` learning rule. Another way to think of this is that we’re using `word2vec` as a "Hydrogen atom" of language modelling: complicated enough to be interesting and predictive, simple enough to be solvable.
And that’s exactly what we do — by solving the training dynamics of the `word2vec` learning rule, we prove that the representations form smooth, curved manifolds.
In fact, we show how to analytically derive the parametric equations for these manifolds in many realistic cases, and we extract as corollaries some nice computational properties of these manifolds, like the ease of decoding spatial maps and historical timelines from the learned representations using only linear probes.

That's a whirlwind tour of our technical result; you can check out the paper or the blog post for more details.
For the remainder of the post, I want to step back and assess our strategy, and highlight some general lessons one could take away.
The angle of attack in this project was to identify a simple setting in which we can directly solve the training dynamics.
This allows us to directly identify the causal link between the statistics of the data and the learned representational structure.

Here’s how I mentally decompose the subtasks of LLM interpretability.
There is a clear causal structure: during pretraining, repeated washes of forward and backward passes burns in the statistics of the data and task into the model weights, producing these geometric structures in the residual stream and computational circuits that exploit them.
In my mind, this process is the purview of learning mechanics.
Then, at inference time, geometrioc structure in the representations and circuits in the weights interact to produce intelligence. Understanding this interaction is one of the main charges of mechinterp.
To understand the origin of model intelligence — well enough to reliably monitor and effectively intervene — we need both research efforts to work in tandem, providing insights to each other and converging on a useful theory of language modeling.

I’ll conclude by showing a few successful examples of this synergy, although as a disclaimer, this is an unfair, incomplete, biased picture of the scientific history here, strongly skewed towards highlighting works that I’ve influenced and that have influenced me. 
But nonetheless, I think the trend is directionally correct: a full end-to-end understanding of how particular intelligent behaviors arise can be driven by collaboration between learning mechanics and mechanistic interpretability.
So, my call to action is: theoretical and empirical mechinterp researchers should diligently organize joint [research expeditions](../mapmaking/), so that we can quickly progress towards more complete scientific maps of LLM intelligence.


[^1]: A skeptic might object: "oh but that’s trivial; all gradient pressures arise from statistics in the data."
This is true, but the interesting thing is that the relevant statistic is extremely simple: pairwise co-occurrence. This is a two-point statistic, akin to a covariance. It is so simple that even `word2vec` learns it.