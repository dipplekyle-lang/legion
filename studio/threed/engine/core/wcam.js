// wcam.js — camera moves for the Bastogne film. The same rules that fixed the Pharos cut (one move = one smooth speed
// curve, no knots where the speed jumps, no overshoot at the ends), plus altitude handled in log space so a camera can
// fall from 30 km over the staff map to 2 m above the snow without racing at the bottom or crawling at the top.
import { catmull, clamp, lerp } from '../lib/shared/util.js';

// monotone cubic Hermite through [[x, y], ...] (Fritsch–Carlson): C1, never overshoots; 'zero' = ease in and out
export function pchip(pts, endSlopes = 'zero') {
  const n = pts.length, X = pts.map((p) => p[0]), Y = pts.map((p) => p[1]);
  const d = []; for (let i = 0; i < n - 1; i++) d.push((Y[i + 1] - Y[i]) / (X[i + 1] - X[i]));
  const m = new Array(n);
  m[0] = endSlopes === 'zero' ? 0 : d[0]; m[n - 1] = endSlopes === 'zero' ? 0 : d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
    const w1 = 2 * (X[i + 1] - X[i]) + (X[i] - X[i - 1]), w2 = (X[i + 1] - X[i]) + 2 * (X[i] - X[i - 1]);
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  return (x) => {
    if (x <= X[0]) return Y[0];
    if (x >= X[n - 1]) return Y[n - 1];
    let i = 0; while (i < n - 2 && x > X[i + 1]) i++;
    const h = X[i + 1] - X[i], s = (x - X[i]) / h;
    return (2 * s ** 3 - 3 * s * s + 1) * Y[i] + (s ** 3 - 2 * s * s + s) * h * m[i] + (-2 * s ** 3 + 3 * s * s) * Y[i + 1] + (s ** 3 - s * s) * h * m[i + 1];
  };
}

const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };

// glide(keys, times, o): one continuous move through keys {pos, look, up?, fov?}; the path is re-parametrised by
// metres travelled + lambda x radians turned (+ logAlt x |d ln(height above ground)| for big altitude changes), and
// `times` [[t, keyIndex], ...] pins when the camera passes given keys. Directions and ups are low-passed along the path.
export function glide(keys, times, o = {}) {
  const lam = o.lambda ?? 0.18, N = 240 * (keys.length - 1), ground = o.ground ?? 0, la = o.logAlt ?? 0;
  const P = keys.map((k) => k.pos), L = keys.map((k) => k.look), UPS = keys.map((k) => k.up ?? [0, 1, 0]);
  const F = keys.map((k) => [Array.isArray(k.fov) ? k.fov[0] : (k.fov ?? 40)]);
  // positions: optionally interpolate altitude in log space (so a 10 000x change in height reads as an even fall)
  const alt = (p) => Math.log(Math.max(0.5, p[1] - ground));
  const PL = la ? P.map((p) => [p[0], alt(p), p[2]]) : P;
  const posAt = (u) => { const q = catmull(PL, u); return la ? [q[0], ground + Math.exp(q[1]), q[2]] : q; };
  const S = []; let acc = 0, prev = null;
  for (let i = 0; i <= N; i++) {
    const u = i / N, pos = posAt(u), look = catmull(L, u), d = norm([look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]]);
    if (prev) {
      const dp = Math.hypot(pos[0] - prev.pos[0], pos[1] - prev.pos[1], pos[2] - prev.pos[2]);
      const h = Math.max(1, Math.min(pos[1], prev.pos[1]) - ground);
      acc += (la ? dp / h * la : dp) + lam * Math.acos(clamp(d[0] * prev.d[0] + d[1] * prev.d[1] + d[2] * prev.d[2], -1, 1));
    }
    prev = { u, s: acc, pos, d }; S.push(prev);
  }
  const sig = o.smooth ?? N * 0.07, R = Math.ceil(sig * 3);
  const ups = S.map((q) => norm(catmull(UPS, q.u)));
  const lp = (arr, i) => { const a = [0, 0, 0]; let w = 0;
    for (let k = -R; k <= R; k++) { const j = Math.min(N, Math.max(0, i + k)); const g = Math.exp(-(k * k) / (2 * sig * sig)); a[0] += arr[j][0] * g; a[1] += arr[j][1] * g; a[2] += arr[j][2] * g; w += g; }
    return norm(a); };
  const D = S.map((q) => q.d);
  for (let i = 0; i <= N; i++) {
    const e = clamp(Math.min(i, N - i) / (R || 1)), k = e * e * (3 - 2 * e);
    const ds = lp(D, i), us = lp(ups, i);
    S[i].ds = norm(D[i].map((v, c) => v + (ds[c] - v) * k));
    S[i].us = norm(ups[i].map((v, c) => v + (us[c] - v) * k));
  }
  const sAtKey = (k) => S[Math.round(k / (keys.length - 1) * N)].s;
  const tm = pchip(times.map(([t, k]) => [t, sAtKey(k)]), o.ends ?? 'zero');
  return (t) => {
    const s = tm(t);
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const mi = (lo + hi) >> 1; if (S[mi].s < s) lo = mi; else hi = mi; }
    const a = S[lo], b = S[hi], f = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0, u = a.u + (b.u - a.u) * f;
    const pos = posAt(u), lk = catmull(L, u), dist = Math.max(1, Math.hypot(lk[0] - pos[0], lk[1] - pos[1], lk[2] - pos[2]));
    const d = norm(a.ds.map((v, c) => v + (b.ds[c] - v) * f)), up = norm(a.us.map((v, c) => v + (b.us[c] - v) * f));
    return { pos, look: [pos[0] + d[0] * dist, pos[1] + d[1] * dist, pos[2] + d[2] * dist], up, fov: catmull(F, u)[0], near: o.near ?? 0.05, far: o.far };
  };
}

// a locked-off or slowly drifting camera: pos/look lerped with an eased time over [0, dur]
export function drift(a, b, dur, o = {}) {
  const e = pchip([[0, 0], [dur, 1]], o.ends ?? 'zero');
  return (t) => {
    const f = e(t);
    return { pos: a.pos.map((v, i) => lerp(v, b.pos[i], f)), look: a.look.map((v, i) => lerp(v, b.look[i], f)), fov: lerp(a.fov ?? 35, b.fov ?? a.fov ?? 35, f), near: o.near ?? 0.05, up: a.up };
  };
}

// small handheld life on a locked camera: two slow sines per axis (a camera operator breathing), deterministic
export function handheld(c, t, amt = 1) {
  const s = (f, p) => Math.sin(t * f + p);
  const k = 0.0025 * amt;
  const d = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], L = Math.hypot(...d);
  return Object.assign({}, c, {
    look: [c.look[0] + L * k * (s(0.9, 0.3) + 0.5 * s(2.3, 1.1)), c.look[1] + L * k * 0.7 * (s(1.1, 2.0) + 0.5 * s(2.9, 0.4)), c.look[2] + L * k * (s(0.7, 4.1) + 0.5 * s(1.9, 2.2))],
    roll: (c.roll ?? 0) + 0.004 * amt * s(0.8, 0.9),
  });
}

// ── v3 (WP1, V3_SPEC 2.1): C2 paths for FPV ─────────────────────────────────────────────────────────────────────────
// nspline(X, Y): the natural cubic spline through (X[i], Y[i]) (X strictly increasing; Y numbers or equal-length arrays):
// continuous position, velocity AND acceleration (C2); f'' = 0 at both ends, so the straight-line extrapolation outside
// [X0, Xn] joins it C2 too. Returns { f(x), d1(x), d2(x) }.
export function nspline(X, Y) {
  const n = X.length, vec = Array.isArray(Y[0]), dim = vec ? Y[0].length : 1;
  const Yv = Y.map((y) => (vec ? y.map(Number) : [+y]));
  if (n < 2) { const c = Yv[0] || new Array(dim).fill(0); const out = (v) => (vec ? v : v[0]); return { f: () => out(c.slice()), d1: () => out(new Array(dim).fill(0)), d2: () => out(new Array(dim).fill(0)) }; }
  const h = []; for (let i = 0; i < n - 1; i++) h.push(Math.max(1e-9, X[i + 1] - X[i]));
  const M = Yv.map(() => new Array(dim).fill(0));
  if (n > 2) {
    for (let d = 0; d < dim; d++) {                       // tridiagonal (Thomas) for the inner second derivatives
      const a = [], b = [], c = [], r = [];
      for (let i = 1; i < n - 1; i++) {
        a.push(h[i - 1]); b.push(2 * (h[i - 1] + h[i])); c.push(h[i]);
        r.push(6 * ((Yv[i + 1][d] - Yv[i][d]) / h[i] - (Yv[i][d] - Yv[i - 1][d]) / h[i - 1]));
      }
      const m = b.length;
      for (let i = 1; i < m; i++) { const w = a[i] / b[i - 1]; b[i] -= w * c[i - 1]; r[i] -= w * r[i - 1]; }
      const x = new Array(m); x[m - 1] = r[m - 1] / b[m - 1];
      for (let i = m - 2; i >= 0; i--) x[i] = (r[i] - c[i] * x[i + 1]) / b[i];
      for (let i = 0; i < m; i++) M[i + 1][d] = x[i];
    }
  }
  const seg = (x) => { let lo = 0, hi = n - 1; while (hi - lo > 1) { const mi = (lo + hi) >> 1; if (X[mi] <= x) lo = mi; else hi = mi; } return lo; };
  const ev = (x, order) => {
    const out = new Array(dim);
    if (x <= X[0] || x >= X[n - 1]) {                     // linear extrapolation with the end slope (f'' = 0 there)
      const e = x <= X[0] ? 0 : n - 2, xe = x <= X[0] ? X[0] : X[n - 1], i = e;
      for (let d = 0; d < dim; d++) {
        const sl = (Yv[i + 1][d] - Yv[i][d]) / h[i] + (x <= X[0] ? -h[i] * (2 * M[i][d] + M[i + 1][d]) / 6 : h[i] * (M[i][d] + 2 * M[i + 1][d]) / 6);
        const y0 = x <= X[0] ? Yv[0][d] : Yv[n - 1][d];
        out[d] = order === 0 ? y0 + sl * (x - xe) : order === 1 ? sl : 0;
      }
      return vec ? out : out[0];
    }
    const i = seg(x), A = (X[i + 1] - x) / h[i], B = (x - X[i]) / h[i];
    for (let d = 0; d < dim; d++) {
      const y0 = Yv[i][d], y1 = Yv[i + 1][d], m0 = M[i][d], m1 = M[i + 1][d];
      if (order === 0) out[d] = A * y0 + B * y1 + ((A * A * A - A) * m0 + (B * B * B - B) * m1) * h[i] * h[i] / 6;
      else if (order === 1) out[d] = (y1 - y0) / h[i] + (-(3 * A * A - 1) * m0 + (3 * B * B - 1) * m1) * h[i] / 6;
      else out[d] = A * m0 + B * m1;
    }
    return vec ? out : out[0];
  };
  return { f: (x) => ev(x, 0), d1: (x) => ev(x, 1), d2: (x) => ev(x, 2) };
}

// hermiteTable(xs, ys, ms): C1 cubic Hermite through samples with known slopes (an inverse / integral table that keeps
// the speed continuous, so the C2 path is not re-broken by a piecewise-linear lookup). Clamps outside with the end slope.
export function hermiteTable(xs, ys, ms) {
  const n = xs.length;
  return (x) => {
    if (x <= xs[0]) return ys[0] + ms[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + ms[n - 1] * (x - xs[n - 1]);
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const mi = (lo + hi) >> 1; if (xs[mi] <= x) lo = mi; else hi = mi; }
    const h = xs[hi] - xs[lo], s = (x - xs[lo]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[lo] + (s3 - 2 * s2 + s) * h * ms[lo] + (-2 * s3 + 3 * s2) * ys[hi] + (s3 - s2) * h * ms[hi];
  };
}

// glide2(points, o): a C2 path through 3D points (natural cubic spline over centripetal knots, alpha 0.5: no cusps, little
// overshoot), parametrised by ARC LENGTH. Beyond both ends it continues straight along the end tangent (f'' = 0 there, so
// still C2). Returns { at(s) -> [x, y, z], tan(s) -> unit tangent, total m, knotS: arc length at each point }.
export function glide2(points, o = {}) {
  const P = points.map((p) => p.map(Number)), n = P.length, alpha = o.alpha ?? 0.5;
  if (n < 2) throw new Error('glide2: need >= 2 points');
  const U = [0];
  for (let i = 1; i < n; i++) U.push(U[i - 1] + Math.max(1e-3, Math.pow(Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]), alpha)));
  const S = nspline(U, P);
  const per = o.per ?? 160, us = [], ss = [], ds = [];
  let acc = 0;
  const sp = (u) => { const d = S.d1(u); return Math.max(1e-9, Math.hypot(d[0], d[1], d[2])); };
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < per; k++) {
      const u = U[i] + (U[i + 1] - U[i]) * k / per;
      if (us.length) { const u0 = us[us.length - 1], um = (u0 + u) / 2; acc += (u - u0) * (sp(u0) + 4 * sp(um) + sp(u)) / 6; }   // Simpson
      us.push(u); ss.push(acc); ds.push(1 / sp(u));
    }
  }
  { const u0 = us[us.length - 1], u = U[n - 1], um = (u0 + u) / 2; acc += (u - u0) * (sp(u0) + 4 * sp(um) + sp(u)) / 6; us.push(u); ss.push(acc); ds.push(1 / sp(u)); }
  const uOf = hermiteTable(ss, us, ds), total = acc;
  const t0 = (() => { const d = S.d1(0); const l = Math.hypot(...d) || 1; return d.map((v) => v / l); })();
  const t1 = (() => { const d = S.d1(U[n - 1]); const l = Math.hypot(...d) || 1; return d.map((v) => v / l); })();
  const at = (s) => {
    if (s <= 0) return [P[0][0] + t0[0] * s, P[0][1] + t0[1] * s, P[0][2] + t0[2] * s];
    if (s >= total) { const e = s - total; return [P[n - 1][0] + t1[0] * e, P[n - 1][1] + t1[1] * e, P[n - 1][2] + t1[2] * e]; }
    return S.f(uOf(s));
  };
  const tan = (s) => { if (s <= 0) return t0.slice(); if (s >= total) return t1.slice(); const d = S.d1(uOf(s)), l = Math.hypot(...d) || 1; return d.map((v) => v / l); };
  const knotS = U.map((u) => { let lo = 0, hi = us.length - 1; while (hi - lo > 1) { const mi = (lo + hi) >> 1; if (us[mi] <= u) lo = mi; else hi = mi; } return ss[lo]; });
  return { at, tan, total, knotS };
}
