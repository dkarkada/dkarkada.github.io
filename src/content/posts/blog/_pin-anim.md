---
title: what's that animation? ⇨
published: 2025-01-04
description: mousemove over it. trust me.
tags:
  - misc
pin: 98
abbrlink: anim
---

I did surgery on a deep neural network and recorded from three neurons while it was learning. I assigned each neuron to an RGB channel and created a composite animation. Sweep your mouse over it. I honestly can't believe how beautiful it is.

Here are the details. I instantiated a fully connected tanh net (depth 20, width 50), initialized deep in the [chaotic regime](https://arxiv.org/abs/1606.05340). I constructed a synthetic target function from a random linear combination of orthogonal Hermite polynomials. I trained the neural network on this target function (GD + weight decay) for a couple hundred steps, and then cycled back to the initialization to make a loop. Each pixel in the animation corresponds to a coordinate in a 2D slice of input space. On a given pixel, the RGB values are the normalized postactivations from three neurons in layer 15.

Getting the animation on the website was kinda annoying. The full animation is a bit too hefty to send on pageload. Instead, I performed a [discrete cosine transform](https://en.wikipedia.org/wiki/Discrete_cosine_transform) on each frame and retained only the top 32 modes. Then, I send those coefficients over to you, and your browser does the inverse DCT to actually render the animation using some custom WebGPU code. (If you don't see the animation, it might be because your browser doesn't support WebGPU... in which case, get with the program.)

Why DCT instead of FFT? It turns out that DCT avoids Gibbs phenomena (ringing effects at the edges) by simply including half-wavelength terms. These half wavelength terms account for discontinuities at the edge arising from periodic boundary conditions. This enables fast convergence to the true signal (which, for many natural images, is concentrated in the low-frequency modes). Nifty.

*This animation brought to you by LSD gang.*