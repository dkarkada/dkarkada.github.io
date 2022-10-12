---
layout: post
title: Blackbody radiation made simpler
date: 2019-08-15
description: Teaching blackbody radiation using the "cavity with a hole" is confusing
tags:
  - science
  - essay
---

I first learned about Planck's law for blackbody radiation studying stellar astrophysics. In simple terms, it tells us a few things about an "ideal" hot object:

* It emits light at all frequencies
* Its temperature determines the total amount of light emitted
* Its temperature also determines the amount of light emitted at each particular frequency (relative to other frequencies)

Planck's law gives the intensity of light $$B$$ at a given frequency and temperature. In math, the function looks like this:

$$
B(\omega, T)=\frac{\omega^2}{4\pi^3c^2}\frac{\hbar\omega}{e^{\hbar\omega/(kT)}-1}
$$

You can see that at small $$\omega$$ (redder light) the intensity of light drops to zero (due to the first factor) and at large $$\omega$$ (bluer light) the intensity of light *also* drops to zero (due to the exponential). So the spectrum has a peak somewhere in the middle, and the peak depends on the object temperature. That's why hot stars are bluer and cool stars are redder. All of this made perfectly good sense to me.

In sophomore year of college, we derived Planck's law in class. I won't go through the derivation because it's extremely standard, but it involves imagining a bunch of "modes" and "oscillators" inside an insulated cavity with a small peephole. This was super confusing to me, because it seemed so ad-hoc. What is the cavity? What is the oscillator? Sure, we get Planck's law in the end, but how was this related to actual hot, glowing things like stars and stovetops? I can guarantee you that the sun is not a box with a peephole.

I tried to ask about it, but the answer was: "This is just an idealization, don't worry about the cavity." Every derivation I found online kept referring to this same cursed cavity. What's the deal with this cavity?? Why did I have to think about boxes and oscillators and standing waves to understand what seems to be a much more general phenomenon?

### The punchline (tl;dr)

We don't need to talk about cavities to understand Planck's law. The real takeaways are
* Light *itself* can have a temperature, and we can treat the EM field as a statistical mechanical ensemble of energy carriers. 
* Then Planck's law decomposes into three parts: the energy per photon, the number of photons per mode, and the number of modes per unit frequency. 
* The energy per photon $$E=\hbar\omega$$ is given by quantum mechanics
* The number of photons per mode is the Bose-Einstein distribution (since photons are bosons). This insight is what allows us to avoid the ultraviolet catastrophe
* The number of modes per unit frequency comes from the density of states. Calculating the density of states is the only step you might need the cavity for
* Multiplying these terms gives the energy per unit frequency, which is the Planck function we want.

### Light and matter

To start to understand why stars produce a spectrum that nearly follows the Planck law, let's first talk about how light interacts with matter. I'm not an expert on this, so I'll avoid specific details. The key is to rethink the idea of a photon: not as particles, but as blips of energy on an invisible string. The string represents the EM field, which extends through all of space. Charged particles like electrons and protons interact with this string, sometimes plucking it like a harp to produce new blips, and sometimes absorbing existing blips. In physics terms, charged particle interactions can produce or absorb photons.

You can imagine there being infinitely many strings, each corresponding to a different frequency, kinda like how a harp has a separate string for each note. The difference is, when you pluck a harp string, you can choose how loudly or softly to pluck. The EM field isn't like that. It's *quantized*, which means that there's only a single "volume" that you can pluck each string at. If you want to put more energy into the string, you can't just pluck it louder. You have to pluck it multiple times. And since each pluck has a predetermined energy $$E=\hbar\omega$$, the total energy in the string can only take discrete values (integer multiples of the single-pluck energy).

Important note: these strings are just a metaphor (and completely unrelated to the strings from string theory). Unlike harp strings, these strings are 3-dimensional, not 1-dimensional. These EM strings all coexist in the same space. Actually, the only thing they really have in common with an instrument's strings is that you can "pluck" them by adding photons and "mute" them by absorbing photons.

Each different interaction between charged particles plucks a different string, unique to that interaction. For example, a proton and electron, initially configured in the Hydrogen 3s state, can interact in such a way that they pluck the $$E=1.89\;\mathrm{eV}$$ string and drop into the Hydrogen 2s state. This is the famous Balmer alpha transition: the electron drops an energy level, a photon with energy $$E=1.89\;\mathrm{eV}$$ flies out.

When you have a single atom, there are only so many interactions you can have. And so, there are only so many strings that can be plucked. That's why the atomic spectra are discrete. But when you have a bunch of atoms -- say, Avogadro's number of them -- they all interact with each other in super complicated ways, and the number of available interactions skyrockets. So together, they can pretty much pluck any string of their choosing. So the question is: how often is each string plucked?

The question I just asked is completely equivalent to the blackbody problem. We want to know which frequencies of light are emitted from a blackbody, and with what intensity. Since the strings each correspond to a particular frequency, and the number of photons corresponds to the intensity, we can derive the Planckian spectrum by answering the question about plucked strings.

### Thermalization

For me, the key insight into blackbody radiation was understanding thermalization. Roughly speaking, two systems are thermalized with each other when their energies are in balance with each other. Any flow of energy in one direction exactly matches the opposite flow. For matter, we invented a quantity called "temperature" to measure this. If two objects are at different temperatures, and then you allow them to transfer energy, energy will flow from the hotter body to the cooler body until their temperatures match. This is the *definition* of temperature: "the thing that's equal when two objects are in thermal equilibrium."

It's easy to think about how two systems made of matter can thermalize with each other. It's why we put ice in our drinks to cool them down, or why we enjoy hot chocolate in the winter. The next step is to imagine that one of the systems is some matter (like a hot star) and the other system *is the EM field*. This is a bit of a conceptual leap. We're saying that the EM field has a "temperature" and can either "heat up" or "cool down" when it "touches" an object.

Weird as that is, we can see that the EM field *does* trade energy with matter. That's what I was talking about earlier, with how electrons and protons can pluck the EM strings, or absorb existing blips on those strings. This isn't that much different from an ice cube plucking energy from the glass of water, causing the ice cube to slowly melt and the water to chill. Now we're just attaching a number -- temperature -- to the infinite-stringed EM harp.

Actually, we're going to go one step further. As I mentioned before, if we have enough atoms, they can pretty much pluck any string of their choosing. So you can imagine one string getting a blip absorbed by the atoms, which then interact with each other and redistribute that energy within themselves, and eventually pluck another string. So in the end, the gas particles are just a conduit: *the thermal equilibration is actually happening between the different strings themselves*.

### The three factors

This is great! Now, we've conceptually gotten rid of the atoms. All we have is the EM strings, all trying to equilibrate some fixed amount of energy among themselves. And this is where statistical mechanics comes in. Satyendra Bose showed that for bosons (such as photons) which don't have restrictions on the number of blips per string, the number of blips you expect to find on a given string is

$$
n(E) = \frac{1}{e^{E/kT}-1}
$$

where $$E=\hbar\omega$$ is the single-pluck energy of the string, and $$kT$$ is the temperature (scaled to use units of energy). Multiply this by the energy per blip (just $$E$$) and you get the expected energy on a given string:

$$
\langle E \rangle = \frac{\hbar\omega}{e^{\hbar\omega/kT}-1}
$$

Ok sweet, we're almost there. The last issue we need to take care of is that there are an uncountably infinite number of strings. The Planck function deals with this by being a *density function*. This means that $$B(\omega, T)$$ doesn't directly give the intensity of light at *exactly* frequency $$\omega$$. Instead, it gives the intensity of light in an infinitesimally small window around $$\omega$$. In other words, to get the total energy in a certain frequency band, you need to integrate the Planck function.

To turn our energy-per-string into a density function, we need to multiply a third factor: the *density of states*. Intuitively, this factor counts the number of strings in the small window around $$\omega$$. I won't go through the calculation, but in the end, the total number of states within the window $$[\omega,\;\omega+\mathrm{d}\omega]$$ is $$\omega^2/4\pi^3c^2\;\mathrm{d}\omega$$.

Multiplying these together: The energy per unit frequency (a.k.a the Planck function) is: energy per photon $$\times$$ number of photons per string $$\times$$ number of strings per unit frequency:

$$
B(\omega, T)=\hbar\omega \cdot \frac{1}{e^{\hbar\omega/(kT)}-1} \cdot \frac{\omega^2}{4\pi^3c^2}
$$

### A real example

So how does this explain why stars have near-perfect blackbody spectra? It's because we made a few assumptions in our derivation, and the conditions inside a stellar atmosphere satisfy these assumptions.

The first assumption is that the EM field is in contact with charged particles, and these particles are at a certain temperature. In the atmosphere of a star, there are a ton of hydrogen atoms, so the EM field has plenty of protons and electrons particles to interact with. These atoms have had ample time to thermalize with each other, so they're all at the same temperature (at least the ones near the surface).

The second assumption is that the EM field can freely trade energy with the matter. If the matter can only pluck certain strings, then the EM field has no hope of equilibrating with itself. But in a star, we have a bajillion atoms, all interacting with each other and with the EM field. This means that there are an ultra-bajillion different possible interactions, each plucking different strings. So, the EM field can steal energy from the hot particles, and it can freely distribute that energy among all its different strings, until it's in thermal equilibrium with the matter and with itself.

And that's it! Once the EM field is thermalized, that's the definition of blackbody radiation.

But the star's atmosphere doesn't go on forever -- the gas particles eventually end at the surface of the star, and there's just outer space after that. But the EM field pervades the whole universe, not just the inside of the star. So all those blips which have been plucked can keep travelling along those strings, flying away from the star until they hit our telescopes.

Because of this, all hot objects are always bleeding away energy; the EM field steals it and runs. If the star weren't constantly replenishing its energy via nuclear fusion, then the stolen energy would quickly cause the star to cool into a cold, dim ball of atoms.

### Takeaways

My qualm with the standard presentation of the derivation of the Planck function is that it doesn't clearly explain the relationship between the oscillators, the cavity, the modes, and the radiation. It was unclear to me which parts were mathematical tricks, which parts underlied "real" physics, and how this all related to the physics of real thermal radiation (like stars).

The explanation I gave is just how I think of it. It's nothing remarkable or revolutionary, and in retrospect, I can see how it fits in with the cavity/oscillator picture. I now see that the cavity is merely a tool to calculate the density of states, and has no other physical basis. The oscillators are just a way to abstract away the mechanism by which the different strings (modes) thermalize with each other. But I think spelling these things out can really help aid student understanding. Factoring the Planck function into the density of states, the photon energy, and the Bose-Einstein distribution really clarified a lot of conceptual misunderstandings on my end. That's why I wanted to write this post.