---
layout: page
permalink: /research/
title: research
years: [2022]
nav: true
nav_order: 1
---

<div class="col-sm mt-0 mt-md-0">
    {% include figure.html path="assets/img/neural-pastel.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div>

Deep learning is humanity’s most successful attempt thus far to imitate aspects of human intelligence. Despite fundamental differences in the architectures of deep learning systems and biological brains, deep learning remains a theoretically- and experimentally-accessible playground for understanding learning as a general, emergent phenomenon. The overarching goal of my research is to probe deep learning systems (using both theoretical tools and numerical experiments) to elucidate and characterize the general properties of systems that learn.

But even as a toy model of learning, deep learning is itself mysterious in many ways. Experiments reveal many interesting behaviors (e.g. feature learning, double descent, neural scaling laws) which are not well-understood from a theory standpoint. On the other hand, idealized models of large neural networks have provable behaviors that are tantalizingly similar to those of real neural networks. My work bridges the gap between experiment and theory. I’m currently working on using percolation theory to characterize the texture of neural net outputs in input space.

My advisor is Michael DeWeese and I'm affiliated with the Berkeley AI Research group and the Redwood Center for Theoretical Neuroscience.

<!-- _pages/publications.md -->
<div class="publications">

{%- for y in page.years %}
  <h2 class="year">{{y}}</h2>
  {% bibliography -f papers -q @*[year={{y}}]* %}
{% endfor %}

</div>
