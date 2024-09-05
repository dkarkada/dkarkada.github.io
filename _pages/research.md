---
layout: page
permalink: /research/
title: research
years: [2024, 2023, 2022]
nav: true
nav_order: 1
---

Deep learning is humanity’s most successful attempt thus far to imitate human intelligence. Despite fundamental differences between deep learning systems and biological brains, deep learning remains a theoretically- and experimentally-accessible playground for understanding learning as a general phenomenon. Even as a toy model of learning, deep learning is itself mysterious in many ways. Experiments reveal many interesting behaviors (e.g. feature learning, neural scaling laws, emergent abilities) which are poorly understood from a theory standpoint. In particular, I'm interested the large-learning-rate phenomena associated with feature learning (e.g., dynamics of the local loss geometry, representation alignment, and edge-of-stability behavior) and I hope to understand why deep learning is more sample efficient than kernel machines.

My advisor is Michael DeWeese and I'm affiliated with the Berkeley AI Research group and the Redwood Center for Theoretical Neuroscience. Find a list of my recent work below.

<!-- _pages/publications.md -->
<div class="publications">

{%- for y in page.years %}
  <h2 class="year">{{y}}</h2>
  {% bibliography -f papers -q @*[year={{y}}]* %}
{% endfor %}

</div>

<div class="col-sm mt-0 mt-md-0">
    {% include figure.html path="assets/img/neural-pastel.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div>
