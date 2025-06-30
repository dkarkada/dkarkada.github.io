---
title: How to take derivatives of matrix expressions
published: 2024-09-19
description: Using einsums for pen-and-paper matrix differentiation
tags:
  - science
  - tutorial
abbrlink: matrix-derivative
---

I used to be really confused about how to take derivatives of (multi)linear algebra expressions with respect to vectors or matrices in those expressions. This kind of derivative is really common in machine learning. For example, consider the gradient descent update in linear regression. We need to compute the derivative of the square loss with respect to the weights:

$$
\frac{\mathrm{d}}{\mathrm{d}{\mathbf{W}}}\left(\frac{1}{2N}\vert\vert\mathbf{W}^T\mathbf{X}-\mathbf{Y}\vert\vert^2\right)
$$

What's the right way to do this? Is there a recipe that works for arbitrary tensor expressions? Although one can find the recipes for derivatives of common matrix expressions [online](https://en.wikipedia.org/wiki/Matrix_calculus#Identities), here I'll explain a general systematic approach for calculating *any* tensor derivative, assuming no elementwise nonlinearities. At the end there'll be [exercises](#exercises) so you can practice :)

The trick is to use Einstein index notation. If you don't know what that is, read the [next section](#a-short-primer-on-tensor-contraction) and then come back here. Right now, I'll just state the punchline.

1. **Write your tensor expression in Einstein notation.** Here are the rules:
    1. Vectors have upper indices, so $$\mathbf{x}=x^\mu$$. Matrices have one upper and one lower index, with the upper index to the left of the lower, to indicate that the upper index contracts to the left and vice versa. (Think "upper index = row index" and "lower index = column index.") For example, $$\mathbf{M}={M^\mu}_\nu$$ and $$\mathbf{Mx}={M^\mu}_\nu x^\nu$$. 
    2. A transpose switches the "up-ness" of all indices, so $$\mathbf{w}^T=w_\mu$$ and $$(\mathbf{AB})^T={A_\mu}^\nu{B_\nu}^\rho$$. (Conveniently, if you're careful about maintaining the left-right order of the indices on a given tensor, the order of the tensors themselves is irrelevant.[^1])
    3. Repeated indices, one on top one on bottom, indicate contraction over an axis, so $$\mathbf{w}^T\mathbf{x}=w_\mu x^\mu$$. Repeated indices, both on either top or bottom, indicate elementwise multiplication, and the index remains free, i.e., $$\mathbf{w}\odot\mathbf{x}=w^\mu x^\mu$$.
    4. A matrix trace is just a self-contraction, i.e. $$\mathrm{Tr}\,\mathbf{M}={M^\mu}_\mu$$. There are no free indices, telling us that tracing yields a scalar.
    5. Any Frobenius norm can be written $${\vert\vert\mathbf{M}\vert\vert}_F^2=\mathrm{Tr}[\mathbf{M}^T\mathbf{M}]$$.

2. **Differentiate.** The derivative of a tensor with respect to itself just yields Kronecker deltas for each pair of corresponding indices, with the indices up or down exactly as you'd expect. For example:

    $$
    \begin{align*}\mathrm{d}\mathbf{W}/\mathrm{d}\mathbf{W} &= \mathrm{d}{W^\mu}_\nu/\mathrm{d}{W^\alpha}_\beta = \delta^\mu_\alpha \delta^\beta_\nu \newline \mathrm{d}(\mathbf{W}^T)/\mathrm{d}\mathbf{W} &= \mathrm{d}{W_\mu}^\nu/\mathrm{d}{W^\alpha}_\beta = \delta_{\mu\alpha} \delta^{\nu\beta} \end{align*}
    $$

    where $$\delta$$ is the Kronecker delta. Apart from this, use the differentiation rules from scalar calculus.[^2]
3. **Contract away all the Kronecker deltas.** If possible, convert your expression back to matrix notation. 
    1. Contracted indices are dummy indices, so their upness can be swapped at will. $$\mathbf{w}^T\mathbf{x}=w_\mu x^\mu=w^\mu x_\mu=\mathrm{Tr}[\mathbf{w}\mathbf{x}^T]=\mathbf{x}^T\mathbf{w}$$
    2. In matrix notation we rely on matrix multiplication convention to tell us which indices contract. Indices that contract from lower left to upper right represent matrix multiplication. For example, we should reorder $${A_\mu}^\nu{B_\nu}^\rho \to {B_\nu}^\rho {A_\mu}^\nu$$ so that $$(\mathbf{AB})^T=\mathbf{B}^T\mathbf{A}^T$$. In the special case that a scalar term contains a single pair of contracting indices that contract from upper left to lower right, we can write it as a trace, like the example above $$w^\mu x_\mu=\mathrm{Tr}[\mathbf{w}\mathbf{x}^T]$$ or $${W^\nu}_\mu{U^\mu}_\nu=\mathrm{Tr}[\mathbf{W}\mathbf{U}]$$.
    3. If you have tensor expressions which can't be written in terms of indices contracting from lower left to upper right (with the exception of scalars that can be written as a trace), it may not be possible to write it in matrix form. Einstein notation *generalizes* matrix notation.

### Example.

Let's do the example above: differentiate 

$$
\frac{\mathrm{d}}{\mathrm{d}{\mathbf{W}}}\left(\frac{1}{2N}\vert\vert\mathbf{W}^T\mathbf{X}-\mathbf{Y}\vert\vert^2\right).
$$

I'll spell out every step so it's easy to follow along, but of course when you're practiced it'll take far less effort to compute the derivative. First, we convert to index notation:

$$
\begin{align*}
&=\frac{\mathrm{d}}{\mathrm{d}{\mathbf{W}}}\left(\frac{1}{2N}\mathrm{Tr}\left[(\mathbf{W}^T\mathbf{X}-\mathbf{Y})^T(\mathbf{W}^T\mathbf{X}-\mathbf{Y})\right]\right) \newline
&= \frac{\mathrm{d}}{\mathrm{d}{\mathbf{W}}}\left(\frac{1}{2N}\mathrm{Tr}\left[
\mathbf{X}^T\mathbf{W}\mathbf{W}^T\mathbf{X} - \mathbf{Y}^T\mathbf{W}^T\mathbf{X} - \mathbf{X}^T\mathbf{W}\mathbf{Y} + \mathbf{Y}^T\mathbf{Y}\right]\right) \newline
&= \frac{\mathrm{d}}{\mathrm{d}{W^\alpha}_\beta}\left(\frac{1}{2N}\left({X_\mu}^\nu{W^\mu}_\sigma{W_\gamma}^\sigma{X^\gamma}_\nu - {Y_\sigma}^\nu{W_\gamma}^\sigma{X^\gamma}_\nu - {X_\mu}^\nu{W^\mu}_\sigma{Y^\sigma}_\nu + {Y_\sigma}^\nu{Y^\sigma}_\nu\right)\right)
\end{align*}
$$


Then we differentiate and contract the Kronecker deltas:

$$
\begin{align*}
&=\frac{1}{2N}\left({X_\mu}^\nu{\delta^\mu_\alpha}{\delta^\beta_\sigma}{W_\gamma}^\sigma{X^\gamma}_\nu + {X_\mu}^\nu{W^\mu}_\sigma{\delta_{\alpha\gamma}}{\delta^{\beta\sigma}}{X^\gamma}_\nu \newline
- {Y_\sigma}^\nu{\delta_{\alpha\gamma}}{\delta^{\beta\sigma}}{X^\gamma}_\nu - {X_\mu}^\nu{\delta^\mu_\alpha}{\delta^\beta_\sigma}{Y^\sigma}_\nu + 0\right) \newline
&=\frac{1}{2N}\left({X_\alpha}^\nu{W_\gamma}^\beta{X^\gamma}_\nu + {X_\mu}^\nu{W^{\mu\beta}}{X_{\alpha\nu}} - {Y^{\beta\nu}}{X_{\alpha\nu}} - {X_\alpha}^\nu{Y^\beta}_\nu\right)
\end{align*}
$$

The contracted indices are dummy indices, and their "upness" can be swapped freely. So the first term is equal to the second, and same for the third and fourth. Then I'll reorder the scalar factors in each term so that all the scalars so the indices contract from lower left to upper right, to make translation into matrix notation easy:

$$
\begin{align*}
&=\frac{1}{N}\left({W_\gamma}^\beta{X^\gamma}_\nu{X_\alpha}^\nu - {Y^\beta}_\nu{X_\alpha}^\nu\right) \newline
&=\frac{1}{N}(\mathbf{W}^T\mathbf{X}-\mathbf{Y})\mathbf{X}^T
\end{align*}
$$

In retrospect, the answer is pretty intuitive — it looks like a direct application of the chain rule. You only need to check that the transposes are in the right places. It's easy in this case because the square loss is simple. But it's nice to have an unambiguous recipe for finding derivatives of arbitrary tensor expressions.

## A short primer on tensor contraction.

A *tensor* combines vectors from different vectors spaces and produces a scalar. The number of vectors a given tensor needs in order to produce a scalar is called the tensor's *order*. For example, a scalar $$x\in\mathbb{R}$$ is an order-zero tensor. A vector $$\mathbf{x}\in\mathbb{R}^n$$ is an order-1 tensor: it combines with a single other vector to produce a scalar (via the dot product). A matrix $$\mathbf{M}\in\mathbb{R}^{m\times n}$$ is an order-2 tensor, which takes two vectors $$\mathbf{x}\in\mathbb{R}^n$$ and  $$\mathbf{y}\in\mathbb{R}^m$$ and produces a scalar $$\mathbf{y}^T\mathbf{M}\mathbf{x}$$. And so on for higher-order tensors.

An order-$$n$$ tensor can be written as a rectangular prism of numbers with $$n$$ *axes*. Each axis acts on its own vector space. For example, a matrix $$\mathbf{M}$$ has two axes (the columns and rows), and they act on the column space and row space respectively.[^3] The elements along a given axis are enumerated by an *index*. So, an order-$$n$$ tensor will have $$n$$ different indices.

The process by which tensors combine with other tensors or vectors is called contraction. Beloved examples of contractions include the dot product, any matrix multiplication, and the trace. Tensor contraction is a binary operation that "fuses" two axes together by summing pairwise products over the shared axis. For example,

$$
\mathbf{M}\mathbf{x}=\sum_j M_{ij}x_j
$$

is a single contraction. It fuses the shared axes between $$\mathbf{x}$$ and the row space of $$\mathbf{M}$$. Since $$\mathbf{M}$$ is an order-2 tensor, we need another contraction to get a scalar:

$$
\mathbf{y}^T\mathbf{M}\mathbf{x}=\sum_i (y_i\sum_j M_{ij}x_j)
$$

Tensors can only contract axes that share a vector space: if $$\mathbf{M}\in\mathbb{R}^{m\times n}$$ and $$\mathbf{v}\in\mathbb{R}^k$$, the contraction $$\mathbf{Mv}$$ is undefined.

![How I imagine tensor contraction](../_images/contraction/contraction.gif)

A contraction is a structure-reducing operation. I imagine that it's called "contraction" because it collapses large and unwieldy tensors towards structureless scalars. Because of their linearity, contractions are easily parallelizable, which is what gives modern GPUs a decisive computational advantage in computing tensor expressions.

The insight of Einstein notation is that contraction is such a common operation that we should save ourselves the pain of writing out all the summation signs. We can *infer* a sum when indices are repeated. This is the same notation used in np.einsum and torch.einsum.

$$
\mathbf{M}\mathbf{x}=\sum_j M_{ij}x_j={M^\mu}_\nu x^\nu
$$

The other ingredient is that we distinguish two *types* of axes, which we denote by either upper or lower indices. This is equivalent to the distinction we make in matrix algebra between column vectors and row vectors (which we usually denoted with a transpose). In differential geometric terms, this is the distinction between contravariant and covariant vectors. Here are two key points to remember about this:

1. It's important that contractions happen between a lower index and an upper index. After all, we write dot products as $$\mathbf{a}^T\mathbf{b}$$ and not as $$\mathbf{a}\mathbf{b}$$. This is consistent with the fact that the vector transpose (a.k.a. covector) is a linear functional: it contracts with vectors to produce scalars.
2. The derivative w.r.t. a contravariant tensor is covariant, and vice versa. I remember this by thinking about a typical Taylor expansion, where derivatives contract directly with displacements: $$f(\mathbf{x}+d\mathbf{x}) \approx f(\mathbf{x}) + \nabla f(\mathbf{x})d\mathbf{x} + \cdots$$. Since $$d\mathbf{x}$$ and $$\mathbf{x}$$ are tensors of the same type, $$\nabla_\mathbf{x}$$ must contract with $$\mathbf{x}$$, implying that the indices in the derivative are all flipped.

## Exercises.

1. Write these in Einstein notation. Then take the derivative with respect to $$\mathbf{x}$$. Also take the derivative with respect to $$\mathbf{W}$$ if present.
    1. An outer product, $$\mathbf{x}\mathbf{x}^T$$
    2. A shallow linear network with vector input and scalar output, $$\mathbf{u}^T\mathbf{Wx}$$
    3. A deep linear network with vector input/output, $$\mathbf{f}(\mathbf{x};\mathbf{U,W,V})=\mathbf{UWVx}$$
    4. A scalar quadratic model, $$f(\mathbf{x};a,\mathbf{v},\mathbf{W}) = a + \mathbf{v}^T\mathbf{x}+\frac{1}{2}\mathbf{x}^T \mathbf{W} \mathbf{x}$$
    5. $$\mathrm{diag}(\mathbf{v})\mathbf{x}$$, where $$\mathrm{diag}(\mathbf{v})\in\mathbb{R}^{n\times n}$$ is the diagonal matrix with $$\mathbf{v}\in\mathbb{R}^n$$ on the diagonal.
    6. The linear Barlow Twins loss for self-supervised learning, $$\frac{1}{2}\vert\vert\sum_i^N\mathbf{Wx}_i(\mathbf{Wx}_i)^T-\mathbb{I}\vert\vert^2$$
2. Demonstrate the cyclic trace property, e.g., $$\mathrm{Tr}(\mathbf{ABC})=\mathrm{Tr}(\mathbf{BCA})=\mathrm{Tr}(\mathbf{CAB})$$, given the rules regarding Einstein summation. Extend the argument to a matrix product of any length. Show why arbitrary permutations within the matrix product aren't allowed.
3. Consider input with spatial and channel axes (shape $$S\times C$$). A Conv1D layer (with no bias) convolves the spatial axis with $$C'$$ small filter stacks, each of height $$C$$. This produces a feature map of shape $$S'\times C'$$.
    1. Write the 1D convolution operator in einstein notation. Hint: it's helpful to define a "patchify" operator, which is a linear tensor operator.
    2. Take the derivative of the feature map w.r.t. one of the filters.


[^1]: This is because a tensor product written in index notation is really a sum of scalar products, and scalars commute.

[^2]: Remember to use different indices in the variable of differentiation from those in the expression; there's no contraction between the variable of differentiation and your expression.

[^3]: Unfortunately, the nomenclature is pretty muddy. The term "axis" is used in math to refer to a particular direction in a vector space — that's very different from an axis of a tensor. What's worse, the "size" of a tensor axis is the dimension of the vector space that axis acts on, but pytorch uses "dimensions" to refer to the axes themselves. This ambiguity is avoided in numpy, which uses the kwarg "axis" to refer to an axis. Both numpy and pytorch use attribute "shape" to refer to the sizes of each axis (i.e., the geometric dimension of each corresponding vector space).