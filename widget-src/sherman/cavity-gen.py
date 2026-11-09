"""Precompute data for the cavity animation (cavity.js) in the Sherman-Morrison post.

Model: dh/dt = -A h + j(t), A = I + J, with J a random geometric graph
(random points, edges between near neighbors) with Gaussian weights. A geometric
graph keeps a zoomed-in window coherent: most of its edges stay inside it.
Drives are sums of harmonics of the loop period, so every trajectory is
computed exactly (and loops seamlessly) in frequency space:
h(w) = (A + iw)^-1 j(w).

Three things are computed for the cavity site 0:
  h_true:    site 0 in the full system.
  cavity:    the bath with site 0 deleted, giving the counterfactual field
             h_{b\\0} and the noise term eta = -A_0b h_{b\\0} (the post's -u).
  h_cavity:  the single-site equation driven by the actual noise term, but
             with the typical (self-averaged) memory kernel instead of the
             site's exact one.
And for the neighbor most strongly coupled to site 0:
  h_neighbor:         its trajectory in the full system.
  h_neighbor_cavity:  its trajectory in the bath (site 0 deleted), i.e. the
                      counterfactual field it would have with no coupling to site 0.

A second, wider rectangular window onto the same system (no single-site traces),
in disk units, feeds the intro animation (cavity.js with data-view="system").

Run: python3 cavity-gen.py  (writes src/content/posts/_media/sherman/cavity.json
and cavity-system.json)
"""

import base64
import json
from pathlib import Path

import numpy as np

SEED = 1
N = 500            # sites
K = 6              # nearest neighbors per site (approximate degree)
SPACING = 0.065    # minimum distance between sites in the unit disk
RHO = 0.8          # spectral radius of J; eig(A) >= 1 - RHO
PERIOD = 60.0      # loop period (time units)
W_MAX = 6.0        # highest drive frequency
W_C = 1.5          # drive corner frequency (OU-like spectrum)
N_SHOWN = 30       # sites shown in the zoomed graph
WIDE_HALF = (0.6, 0.3)  # half-width, half-height of the intro view's window (disk units)
DT_GRAPH = 0.2     # sample spacing for node colors
DT_SITE = 0.1      # sample spacing for the site-0 plot
LAG_MAX = 10.0     # length of the memory-kernel window

rng = np.random.default_rng(SEED)


def random_geometric_graph():
    # Random sequential placement with a minimum spacing (vectorized; same draws
    # and same acceptance test as checking each placed point in turn).
    pos = np.empty((N, 2))
    n = 0
    while n < N:
        p = rng.uniform(-1, 1, 2)
        if p @ p < 1 and np.all(np.sum((p - pos[:n]) ** 2, axis=1) > SPACING**2):
            pos[n] = p
            n += 1
    dist = np.linalg.norm(pos[:, None] - pos[None], axis=-1)
    reach = np.sort(dist, axis=1)[:, K].mean()
    adj = (dist < reach) & (dist > 0)
    w = np.triu(rng.normal(size=(N, N)), 1)
    J = (w + w.T) * adj
    J *= RHO / np.abs(np.linalg.eigvalsh(J)).max()
    return pos, J, adj


def synth(coeffs, dt):
    """Real time series from positive-frequency coefficients, one row per series."""
    t = np.arange(0, PERIOD, dt)
    phase = np.exp(1j * np.outer(omegas, t))
    return 2 * np.real(np.atleast_2d(coeffs) @ phase)


def pack_int8(x):
    scale = float(np.abs(x).max())
    q = np.round(x / scale * 127).astype(np.int8)
    return {'scale': round(scale, 4), 'shape': list(q.shape), 'data': base64.b64encode(q.tobytes()).decode()}


pos, J, adj = random_geometric_graph()
A = np.eye(N) + J
lams = np.linalg.eigvalsh(A)
print(f'eig(A) in [{lams.min():.3f}, {lams.max():.3f}]')

# Drives: random-phase harmonics with a Lorentzian power spectrum.
omegas = 2 * np.pi * np.arange(1, int(W_MAX * PERIOD / (2 * np.pi)) + 1) / PERIOD
amp = 1 / np.sqrt(1 + (omegas / W_C) ** 2)
C = amp * (rng.normal(size=(N, len(omegas))) + 1j * rng.normal(size=(N, len(omegas))))
C /= synth(C, DT_SITE).std()

# Typical memory kernel: r(w) = s2 * mean_i [(A + iw)^-1]_ii.
s2 = (J**2).sum(axis=1).mean()
r_typ = s2 * np.mean(1 / (lams[:, None] + 1j * omegas[None, :]), axis=0)
lags = np.arange(0, LAG_MAX + 1e-9, DT_SITE)
r_lag = s2 * np.mean(np.exp(-np.outer(lams, lags)), axis=0)

full = np.stack([np.linalg.solve(A + 1j * w * np.eye(N), C[:, n]) for n, w in enumerate(omegas)], axis=1)


def cavity_site(i):
    b = np.delete(np.arange(N), i)
    Ab = A[np.ix_(b, b)]
    hb = np.stack([np.linalg.solve(Ab + 1j * w * np.eye(N - 1), C[b, n]) for n, w in enumerate(omegas)], axis=1)
    eta = -A[i, b] @ hb
    h_cav = (C[i] + eta) / (A[i, i] + 1j * omegas - r_typ)
    return b, hb, h_cav


# Cavity site: among typical-degree sites near the middle, the one with the
# median error between h_true and h_cavity (representative, not cherry-picked).
deg = adj.sum(axis=1)
central = [i for i in np.argsort(np.linalg.norm(pos, axis=1))[:15] if abs(deg[i] - K) <= 1]
errs = []
for i in central:
    _, _, h_cav = cavity_site(i)
    errs.append(np.linalg.norm(h_cav - full[i]) / np.linalg.norm(full[i]))
site = central[np.argsort(errs)[len(errs) // 2]]
print(f'site {site}: degree {deg[site]}, rel. error {errs[central.index(site)]:.3f} (range {min(errs):.3f}-{max(errs):.3f})')
b, hb, h_cav = cavity_site(site)

def window(n_shown):
    """The n_shown sites nearest the cavity site, in viewport units (the cavity
    site is index 0), with the edges among them and the edges leaving."""
    rel = pos - pos[site]
    order = np.argsort(np.linalg.norm(rel, axis=1))
    shown = order[:n_shown]
    radius = (np.linalg.norm(rel[order[n_shown - 1]]) + np.linalg.norm(rel[order[n_shown]])) / 2
    xy = rel / radius
    idx = {int(g): k for k, g in enumerate(shown)}
    w_max = np.abs(J[adj]).max()
    edges, out_edges = [], []
    for g in shown:
        for h in np.flatnonzero(adj[g]):
            w = round(float(J[g, h] / w_max), 2)
            if int(h) in idx:
                if idx[int(h)] > idx[int(g)]:
                    edges.append([idx[int(g)], idx[int(h)], w])
            else:
                out_edges.append([idx[int(g)], *np.round(xy[h], 3).tolist(), w])
    return shown, xy, idx, edges, out_edges


def window_rect(half_w, half_h):
    """Sites within a half_w x half_h (half-extents) rectangle centered on the
    cavity site, ordered by distance (the cavity site is index 0), in disk units
    relative to it, with the edges among them and the edges leaving."""
    rel = pos - pos[site]
    inside = (np.abs(rel[:, 0]) < half_w) & (np.abs(rel[:, 1]) < half_h)
    shown = np.flatnonzero(inside)[np.argsort(np.linalg.norm(rel[inside], axis=1))]
    idx = {int(g): k for k, g in enumerate(shown)}
    w_max = np.abs(J[adj]).max()
    edges, out_edges = [], []
    for g in shown:
        for h in np.flatnonzero(adj[g]):
            w = round(float(J[g, h] / w_max), 2)
            if int(h) in idx:
                if idx[int(h)] > idx[int(g)]:
                    edges.append([idx[int(g)], idx[int(h)], w])
            else:
                out_edges.append([idx[int(g)], *np.round(rel[h], 4).tolist(), w])
    return shown, rel, edges, out_edges


def write(name, data):
    out = Path(__file__).resolve().parents[2] / 'src/content/posts/_media/sherman' / name
    out.write_text(json.dumps(data, separators=(',', ':')))
    print(f'wrote {out} ({out.stat().st_size / 1024:.0f} KB), {len(data["edges"])} edges, {len(data["outEdges"])} outgoing')


shown, xy, idx, edges, out_edges = window(N_SHOWN)

# Neighbor panel: the neighbor most strongly coupled to the cavity site.
nbr = int(max(np.flatnonzero(adj[site]), key=lambda g: abs(J[site, g])))
assert nbr in idx, 'neighbor must be in the zoomed view'
print(f'neighbor {nbr}: |J| = {abs(J[site, nbr]):.3f}')
nbr_row = int(np.flatnonzero(b == nbr)[0])

h_full = synth(full[shown], DT_GRAPH)
j_shown = synth(C[shown], DT_GRAPH)

data = {
    'period': PERIOD,
    'dtGraph': DT_GRAPH,
    'dtSite': DT_SITE,
    'nodes': np.round(xy[shown], 3).tolist(),
    'edges': edges,
    'outEdges': out_edges,
    'hFull': pack_int8(h_full),
    'j': pack_int8(j_shown),
    'hTrue': np.round(synth(full[site], DT_SITE)[0], 3).tolist(),
    'hCavity': np.round(synth(h_cav, DT_SITE)[0], 3).tolist(),
    'kernel': np.round(r_lag / r_lag[0], 3).tolist(),
    'neighbor': idx[nbr],
    'hNeighbor': np.round(synth(full[nbr], DT_SITE)[0], 3).tolist(),
    'hNeighborCavity': np.round(synth(hb[nbr_row], DT_SITE)[0], 3).tolist(),
}
write('cavity.json', data)

shown, rel, edges, out_edges = window_rect(*WIDE_HALF)
write('cavity-system.json', {
    'period': PERIOD,
    'dtGraph': DT_GRAPH,
    'window': list(WIDE_HALF),
    'spacing': SPACING,
    'nodes': np.round(rel[shown], 4).tolist(),
    'edges': edges,
    'outEdges': out_edges,
    'hFull': pack_int8(synth(full[shown], DT_GRAPH)),
    'j': pack_int8(synth(C[shown], DT_GRAPH)),
})
