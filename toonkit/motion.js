// ---------- motion kit (creator, 2026-10-27: "more scenes, more angles, it's a bit stiff, smoothen the animations") ----------
// Pulled in with the line `@kit motion` right after the acting include (after lip / wStart / place / REST / walk).
//
// 1. PERFORM: a character's acting written as a timeline of key poses instead of if-branches. Branches POP (the pose jumps the
//    frame a branch changes): that is the stiffness. perform() blends every key into the next with eased timing and layers on
//    what makes it feel alive:
//      - overlap: feet lead, the body follows, the head lags 2 frames, the hands lag 2-3 frames and overshoot ~5 %, then settle;
//      - anticipation: `ant: 1` dips and leans back for 4-5 frames before a big move;
//      - weight: `heavy: 1` on a key slows its start and stop (a big body, a heavy prop), `snap: 1` makes a strike arrive fast;
//      - the idle that never stops: breathing, a slow weight shift from foot to foot, a head drift, hands that float a little.
//    Keys: { t, lh, rh, lf, rf, lean, turn, tilt, dip, bx, bz, head: [x, y, z], blend, ant, heavy, snap, finger, fdir, calm }
//      t      the time the move STARTS (put it on the word start, wStart('word')); blend its length (default 0.28 s, at least 0.18)
//      lh/rh/lf/rf  hand and foot targets in body space as in pose() (left of fewer keys: the last value carries on)
//      lean/turn/tilt  body rotation x / y / z; dip lowers the body; bx/bz shift it; head = [x, y, z] rotation
//      calm   idle amount from here on (1 normal, 0.4 a still listener, 0 a frozen gag beat: rare)
//    Usage in stage(t):   perform(jan, t, JAN);   then add story things on top (a nod, a jolt) like before.
//    Missing fields fall back to REST and zeros, so a key can be as small as { t: 3.1, rh: V(-0.2, 0.7, 0.1) }.
//
// 2. CAMAT: camera setups by name, so a Short gets real variety without guessing coordinates. Each returns { p, l, up, kind }
//    to spread into a K entry:  { t: 4.2, how: 'move', dur: 0.4, ease: 'out', ...camAt('low', { at: own }), coc: 12, f: 'owner' }
//      at     a character (its head is the subject) or a V ground point; face its facing (ry) else the character's own
//      kinds  (sized to the character's real height) 'wide' (the whole set, 2-3 figures), 'full' (head to feet), 'medium' (waist up), 'close' (head and shoulders,
//             head about 1/3 of the frame), 'low' (hero, from knee height), 'high' (looking down), 'top' (straight down),
//             'profile' (side on), 'ots' (over the shoulder of o.from onto at), 'pov' (what o.from sees), 'insert' (a prop, o.h height)
//      o.side  -1..1 which side of the face the camera sits (default alternates per call), o.dist / o.h / o.lift scale them
//
// 2b. WALKPATH: a clean walk with planted feet along any path: const W = walkPath(own, t, [[0, 1.2], [0.4, 0.3], [0.4, -0.2]], 3.1, 5.0);
//    perform(own, t, OWNER, { walk: W }). It places the character, fits the steps to the path, eases in and out, bobs, sways, swings the arms.
//
// 3. SHOTPLAN: window.shotPlan() lists every K shot's size, angle and place; render.py --stills writes it to shots.json and
//    check.py prints the variety (how many setups, sizes in a row, places, the angle mix) next to the style's targets.
//
// 4. THE CAMERA'S OWN RULES (creator 2026-10-30: "Legion has to know HOW to move the camera, precise"; a buyer's Short smeared
//    into blur on camera spins). governMoves() runs once before the first frame (assemble.py hooks it after planPaths) and flies
//    every 'move' on its real eased path: a move that swings more than 35 degrees round its subject, travels more than 0.8x its
//    own distance or changes the shot size more than 1.8x is a new setup: a clean CUT; a move whose fastest frame slides more
//    than 15 % of the frame is given the time it
//    needs (up to the next shot), else it becomes a cut. `whip: true` keeps a deliberate whip pan (it must turn on the spot).
//    window.camAudit() (render.py --stills writes it to camera.json, check.py flags it) samples the camera 30x a second:
//    smears, whoever speaks (window.SPEAK = [[t0, t1, char], ...]) off screen / facing away / tiny on their own line, and every
//    character a shot names (`who: [a, b]` on its K entry) missing from it.

const _mk = (v) => v && v.isVector3 ? v.clone() : v;
function _lerpVal(a, b, x) {
  if (a === undefined) return _mk(b); if (b === undefined) return _mk(a);
  if (a && a.isVector3) return a.clone().lerp(b, x);
  if (Array.isArray(a)) return a.map((v, i) => v + ((b[i] ?? v) - v) * x);
  if (typeof a === 'number') return a + (b - a) * x;
  return x < 0.5 ? a : b;
}
const _smoother = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10);
const _heavy = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;   // slow out, slow in
const _snapE = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - Math.pow(x, 1.35), 4);                       // fast arrival, but never a dead start (no speed jump on frame 1)
// arrive with a little overshoot, then settle (the hands, held props): eased start, ~os past the target near 80 %, back by 100 %
const _settle = (x, os) => x <= 0 ? 0 : x >= 1 ? 1 : _smoother(Math.min(1, x * 1.15)) + os * 9.5 * x * x * x * (1 - x);
const _POSE0 = () => ({ lh: REST.lh.clone(), rh: REST.rh.clone(), lf: REST.lf.clone(), rf: REST.rf.clone(), lean: 0, turn: 0, tilt: 0, dip: 0, bx: 0, bz: 0, head: [-0.04, 0, 0], calm: 1 });
// the full pose at time t for one part ('body' | 'hands' | 'feet' | 'head'): each part runs on its own delay and easing
const _BLENDED = new Set(['t', 'blend', 'ant', 'heavy', 'snap']);
// one key's blend at time tt, from the pose S the character actually had when the key began
function _blendKey(S, K1, tt, part) {
  const dur = Math.max(0.18, (K1.blend ?? 0.28) * (K1.heavy ? 1.35 : 1) * (K1.snap ? 0.7 : 1)), u = (tt - K1.t) / dur;   // never under 0.18 s (5 frames)
  const e = K1.heavy ? _heavy(u) : K1.snap ? _snapE(u) : _smoother(u), eh = part === 'hands' ? _settle(u, K1.heavy ? 0.02 : K1.snap ? 0.08 : 0.05) : e;
  const out = {};
  for (const f in S) out[f] = _mk(S[f]);
  for (const f in K1) if (!_BLENDED.has(f)) out[f] = typeof K1[f] === 'number' || K1[f]?.isVector3 || Array.isArray(K1[f]) ? _lerpVal(S[f], K1[f], ['lh', 'rh'].includes(f) ? eh : e) : K1[f];
  return out;
}
function keyPose(keys, t, part = 'body') {
  const delay = { feet: -0.03, body: 0, head: 0.07, hands: 0.05 }[part] || 0, tt = t - delay;
  // each key starts from where the previous blend had got to at that moment (not from where it was heading), so a key that
  // comes before the last one has landed takes over mid-move with no jump
  let S = _POSE0(), i = -1;
  for (let k = 0; k < keys.length && keys[k].t <= tt; k++) { if (i >= 0) S = _blendKey(S, keys[i], keys[k].t, part); i = k; }
  if (i < 0) return S;
  const out = _blendKey(S, keys[i], tt, part);
  // anticipation: the 0.15 s before a key with ant, the body dips and leans away from the move
  const nx = keys[i + 1];
  if (nx && nx.ant && tt > nx.t - 0.15 && tt < nx.t) { const a = Math.sin(_smoother((tt - (nx.t - 0.15)) / 0.15) * Math.PI) * nx.ant; out.dip = (out.dip || 0) + 0.014 * a; out.lean = (out.lean || 0) - 0.05 * a; }
  return out;
}
// the idle that never stops: breathing (~0.25 Hz), a slow weight shift, a head drift, floating hands; seeded per character
function idleLayer(t, seed, amt = 1) {
  const r = (n) => Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453 % 1, ph = r(1) * 6.283, sp = 0.85 + 0.3 * Math.abs(r(2));
  const br = Math.sin(t * 1.6 * sp + ph), sh = Math.sin(t * 0.55 * sp + ph * 1.7), hd = Math.sin(t * 0.8 * sp + ph * 0.6);
  return { y: 0.004 * br * amt, sway: 0.018 * sh * amt, shift: 0.008 * sh * amt, hx: 0.025 * hd * amt, hy: 0.04 * Math.sin(t * 0.43 + ph) * amt, hz: 0.02 * sh * amt,
    lh: V(0.006 * sh, 0.008 * br, 0.004 * hd).multiplyScalar(amt), rh: V(0.006 * sh, 0.008 * Math.sin(t * 1.6 * sp + ph + 0.6), -0.004 * hd).multiplyScalar(amt) };
}
function perform(c, t, keys, o = {}) {
  const B = keyPose(keys, t, 'body'), Hd = keyPose(keys, t, 'head'), Hn = keyPose(keys, t, 'hands'), Ft = keyPose(keys, t, 'feet');
  const Wk = o.walk && o.walk.w > 0 ? o.walk : null, ww = Wk ? Wk.w : 0;   // a walkPath() gait: it owns the feet and the bob, the keys still own the rest
  const amt = (o.idle ?? 1) * (B.calm ?? 1) * (1 - 0.7 * ww), I = idleLayer(t, o.seed ?? (chars.indexOf(c) + 1), amt);
  c.body.position.set((B.bx || 0) + I.shift + (Wk ? Wk.sway : 0), I.y - (B.dip || 0) - (Wk ? Wk.dip : 0), B.bz || 0);
  c.body.rotation.set((B.lean || 0) + (Wk ? Wk.lean : 0), (B.turn || 0) + (Wk ? Wk.twist : 0), (B.tilt || 0) + I.sway * 0.4 + (Wk ? Wk.roll : 0));
  const h = Hd.head || [-0.04, 0, 0];
  c.head.rotation.set(h[0] + I.hx - (Wk ? Wk.lean * 0.7 : 0), h[1] + I.hy - (Wk ? Wk.twist * 0.8 : 0), h[2] + I.hz - I.sway * 0.3 - (Wk ? Wk.roll * 0.8 : 0)); c.head.position.y = HEAD_Y + I.y * 0.5;   // the head counters the sway (and the walk's lean, twist and roll: it stays level)
  let lf = Ft.lf.clone(), rf = Ft.rf.clone();
  if (Wk) { c.g.updateMatrixWorld(true); const toB = v => c.body.worldToLocal(c.g.localToWorld(v.clone()));   // planted feet: ground space -> body space
    lf = toB(Wk.lf); rf = toB(Wk.rf); }
  else if (!o.walking) { lf.x -= I.shift; rf.x -= I.shift; }       // the feet stay planted while the body shifts its weight over them
  const lh = Hn.lh.clone().add(I.lh), rh = Hn.rh.clone().add(I.rh); if (Wk) { lh.add(Wk.lh); rh.add(Wk.rh); }
  pose(c, { lh, rh, lf: o.lf || lf, rf: o.rf || rf, finger: B.finger, fdir: B.fdir });
  return B;
}

// ---------- walking (creator 2026-10-27: "consistent good clean smooth walking animation") ----------
// walkPath(c, t, path, t0, t1, o) walks c along path ([[x, z], ...] ground points, or V's) from t0 to t1 and returns the gait to
// hand to perform(c, t, KEYS, { walk: W }). It places the character itself (position and facing) from o.from (default t0) on, and
// keeps it at the end afterwards (o.until: stop placing it after this time, e.g. when it leaves the set).
//   - feet PLANTED: the step length is fitted to the path (a whole number of steps, ~0.12 x the character's height each), the foot on
//     the ground moves back exactly as fast as the body moves forward, so it never slides; the other foot swings through in an arc;
//   - eased start and stop (the speed ramps up and down over ~0.3 s), the last step closes the feet together, nothing pops;
//   - the body bobs (lowest on each contact, highest passing), sways over the standing foot, rolls and twists a little, leans into
//     the speed; the head stays level; the arms swing opposite the legs, trailing them by a few frames;
//   - turns: the facing follows the path ahead (smoothed), so a corner is walked round, not snapped.
//   o.step (step length, default 0.12 x height), o.lift (foot lift), o.bounce (bob, 1 normal; 1.6 a jaunty walk, 0.5 a trudge),
//   o.arms (arm swing, 1), o.lean (forward lean, 1). Fast walk / jog: shorter t1 - t0 for the same path, o.bounce 1.4.
function walkPath(c, t, path, t0, t1, o = {}) {
  const P = path.map(q => q.isVector3 ? [q.x, q.z] : q), L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const D = L[L.length - 1] || 1e-6, sz = c.g.scale.y || 1, n = Math.max(2, Math.round(D / ((o.step ?? 0.12) * sz))), st = D / n, dur = Math.max(0.3, t1 - t0);
  const at = d => { d = Math.max(0, Math.min(D, d)); let i = 1; while (i < L.length - 1 && L[i] < d) i++; const k = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * k, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k]; };
  const a = Math.min(0.35, 0.3 / dur), u = Math.max(0, Math.min(1, (t - t0) / dur));
  const dist = u < a ? D * (u * u / (2 * a)) / (1 - a) : u > 1 - a ? D * (1 - (1 - u) * (1 - u) / (2 * a) / (1 - a)) : D * (u - a / 2) / (1 - a);   // trapezoid speed: ramp, cruise, ramp
  const head = d => { let x = 0, z = 0; for (const e of [-0.06, 0, 0.06, 0.12]) { const p0 = at(d + e - 0.03), p1 = at(d + e + 0.03); x += p1[0] - p0[0]; z += p1[1] - p0[1]; } return Math.atan2(x, z); };
  const from = o.from ?? t0, out = { w: 0 };
  if (t < from || (o.until != null && t > o.until)) return out;
  const pos = at(dist), ry = head(Math.min(dist, D - 0.03)); place(c, pos[0], pos[1], ry);
  const ph = dist / (2 * st), lift = (o.lift ?? 0.035) * sz, w = _smoother(Math.min((t - t0) / 0.18, (t1 + 0.22 - t) / 0.22, 1));   // w: walking weight (0 standing .. 1 striding)
  const foot = (q) => { q = ((q % 1) + 1) % 1; if (q < 0.5) return [st / 2 - q / 0.5 * st, 0]; const v = (q - 0.5) / 0.5; return [-st / 2 + _smoother(v) * st, lift * Math.sin(Math.PI * v)]; };
  const fl = foot(ph), fr = foot(ph + 0.5), close = t > t1 ? _smoother((t - t1) / 0.22) : 0;   // after the last step the back foot comes up beside the front one
  const lz = fl[0] * (1 - close), rz = fr[0] * (1 - close), ly = fl[1] + (close > 0 && close < 1 && fl[0] < 0 ? lift * 0.6 * Math.sin(Math.PI * close) : 0), ry2 = fr[1] + (close > 0 && close < 1 && fr[0] < 0 ? lift * 0.6 * Math.sin(Math.PI * close) : 0);
  out.w = w; const bb = (o.bounce ?? 1) * w, aa = (o.arms ?? 1) * w;
  out.lf = V(REST.lf.x, ly * w, REST.lf.z * (1 - w) + lz * w); out.rf = V(REST.rf.x, ry2 * w, REST.rf.z * (1 - w) + rz * w);
  out.dip = 0.011 * sz * bb * (1 + Math.cos(4 * Math.PI * ph)) / 2;                  // lowest on each contact (feet apart), highest passing
  out.sway = 0.007 * sz * bb * Math.sin(2 * Math.PI * ph); out.roll = 0.035 * bb * Math.sin(2 * Math.PI * ph); out.twist = 0.07 * aa * Math.sin(2 * Math.PI * ph);
  out.lean = 0.05 * (o.lean ?? 1) * w * Math.min(1, D / dur / 0.5);
  const lag = foot(ph - 0.05)[0], lagR = foot(ph + 0.45)[0], sw = 0.85 * aa;          // arms opposite the legs, a few frames behind
  out.lh = V(0, 0.18 * Math.abs(lagR) * sw, lagR * sw); out.rh = V(0, 0.18 * Math.abs(lag) * sw, lag * sw);
  return out;
}

// ---------- camera setups by name ----------
let _side = 1;
function camAt(kind, o = {}) {
  const ch = o.at && o.at.head ? o.at : null;
  if (ch) ch.g.updateMatrixWorld(true);
  const base = ch ? ch.g.position.clone() : (o.at ? o.at.clone() : V(0, 0, 0));
  const ry = o.ry ?? (ch ? ch.g.rotation.y : 0);
  const side = o.side ?? (_side = -_side) * 0.6;
  // sized by the character's real height (a scaled-up hero or a small kid frames the same), measured to its head
  const sz = ch ? Math.max(0.4, (ch.head.getWorldPosition(V(0, 0, 0)).y - base.y) / HEAD_Y) : 1;
  const hy = HEAD_Y * sz, D = (o.dist ?? 1) * sz, front = (a) => V(Math.sin(ry + a), 0, Math.cos(ry + a));
  const S = {          // [distance, camera height, look height, angle off the face] for a character of the rig's own size
    wide: [2.3, 0.95, 0.5, 0.35], full: [1.45, 0.7, 0.52, 0.3], medium: [1.05, 0.84, 0.7, 0.32], close: [0.75, 0.88, HEAD_Y - 0.03, 0.22],
    low: [1.0, 0.2, HEAD_Y - 0.1, 0.35], high: [1.15, 1.95, 0.45, 0.3], profile: [0.95, 0.82, HEAD_Y - 0.08, 1.45], insert: [0.34, (o.h ?? 0.6) + 0.22, o.h ?? 0.6, 0.15],
  }[kind];
  let l, up = UP; const cands = [];
  // candidates in order of preference: the asked setup first, then the same setup from other sides and heights
  if (S) { const [d, ch_, lh0, a] = S, lh = kind === 'insert' ? lh0 : lh0 * sz; l = base.clone().add(V(0, lh, 0));
    for (const da of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6]) for (const hk of [1, 0.8, 1.2])
      cands.push(base.clone().addScaledVector(front(a * side * 1.6 + da), d * (kind === 'insert' ? (o.dist ?? 1) : D)).add(V(0, ch_ * (kind === 'insert' ? 1 : sz) * (o.lift ?? 1) * hk, 0))); }
  else if (kind === 'top') { l = base.clone(); up = TOPUP; for (const hk of [2.1, 1.6, 1.25]) cands.push(base.clone().add(V(0, hk * D, 0.001))); }
  else if (kind === 'ots' || kind === 'pov') {
    const fr = o.from; fr.g.updateMatrixWorld(true); const a = fr.g.position.clone(), b = base.clone();
    const dir = b.clone().sub(a).setY(0).normalize(), right = V(dir.z, 0, -dir.x), sd = o.side ?? 1;
    l = b.clone().add(V(0, kind === 'ots' ? hy - 0.04 : hy - 0.02, 0));
    if (kind === 'pov') cands.push(a.clone().addScaledVector(dir, 0.2).add(V(0, hy, 0)));
    else for (const bk of [0.85, 1.05, 0.65]) for (const sw of [sd, -sd, 1.3 * sd, -1.3 * sd]) cands.push(a.clone().addScaledVector(dir, -bk * D).addScaledVector(right, 0.36 * sw * D).add(V(0, hy + 0.12 * D, 0)));
  } else throw new Error('camAt(): unknown kind ' + kind);
  // never inside a wall, a counter or a head: a candidate is clear when nothing solid lies between the subject and the camera,
  // and on an over-the-shoulder the near character's head is beside the line of sight, never on it or around the lens
  if (o.clear === false) return { p: cands[0], l, up, kind };
  scene.updateMatrixWorld(true);
  const skip = new Set(); for (const c of [ch, o.from]) if (c && c.g) c.g.traverse(m => skip.add(m));
  const nearHead = o.from && o.from.head ? o.from.head.getWorldPosition(V(0, 0, 0)) : null;
  const block = (p) => { const dir = p.clone().sub(l), len = dir.length(); dir.normalize();
    const rc = new THREE.Raycaster(l, dir, 0.12, len); rc.camera = cam;   // sprites need a camera to be tested
    const solid = (h) => !skip.has(h.object) && h.object.visible && !h.object.userData.hull && !h.object.isSprite && h.object.material && !h.object.material.transparent;
    const hits = rc.intersectObjects(scene.children, true).filter(solid);
    // thin things (a rope, a pole, a railing, a chair leg) are fine to shoot past as foreground: an obstacle counts only when the
    // ray stays inside it for more than 6 cm, or it sits right in front of the lens
    const back = new THREE.Raycaster(p, dir.clone().negate(), 0, len); back.camera = cam; const bh = back.intersectObjects(scene.children, true).filter(solid);
    const wall = hits.find(h => { const exit = bh.find(b => b.object === h.object); return !exit || len - exit.distance - h.distance > 0.06 || exit.distance < 0.25; });
    if (wall) return wall.distance / len;
    if (nearHead && kind === 'ots') { if (p.distanceTo(nearHead) < 0.3) return 0.5; const ln = new THREE.Line3(p, l), q = V(0, 0, 0); ln.closestPointToPoint(nearHead, true, q); if (q.distanceTo(nearHead) < 0.25 * (o.from.g.scale.y || 1)) return 0.6;   /* the near head sits beside the far face, never over it */ }
    return 1; };
  let best = null, bf = -1;
  for (const p of cands) { const f = block(p); if (f >= 1) return { p, l, up, kind }; if (f > bf) { bf = f; best = p; } }
  // nothing fully clear: the most open candidate, brought forward to just in front of what blocks it
  const dir = best.clone().sub(l), len = dir.length(); dir.normalize();
  return { p: l.clone().addScaledVector(dir, Math.max(0.45, bf * len - 0.05)), l, up, kind };
}

// ---------- the camera's own rules, measured (see 4. in the header) ----------
const CAM_RULE = { swing: 35, travel: 0.8, size: 1.8, slide: 0.15 };   // a move: <= 35 degrees, <= 0.8x its distance, the shot size at most 1.8x closer or wider, <= 15 % of the frame on its fastest frame
const _hfov = () => 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
function _camFrame(s) { const d = s.l.clone().sub(s.p); return { dir: d.clone().normalize(), dist: d.length(), p: s.p.clone() }; }
// how far the picture slides between two camera states, as a share of the frame width: the view's turn + the travel's parallax
function _slide(a, b) { return (Math.acos(Math.max(-1, Math.min(1, a.dir.dot(b.dir)))) + a.p.distanceTo(b.p) / Math.max(0.15, (a.dist + b.dist) / 2)) / _hfov(); }
function _shotIdx(t) { let i = 0; while (i + 1 < K.length && K[i + 1].t <= t) i++; return i; }
function _flyPeak(i) { const k = K[i]; let peak = 0, prev = null;          // the fastest 30 fps frame of one move (flown at 60 Hz)
  for (let t = k.t; t <= k.t + k.dur + (k.settle || 0) + 1e-6; t += 1 / 60) { const f = _camFrame(shotAt(t).a); if (prev) peak = Math.max(peak, 2 * _slide(prev, f)); prev = f; }
  return peak; }
function _reOs(i) { const k = K[i]; k.os = k.how === 'move' && k.ease === 'out' && (!K[i + 1] || K[i + 1].t - k.t > k.dur + 0.4) ? 0.035 : 0; k.settle = k.os ? 0.27 : 0; }
function governMoves() {
  if (typeof K === 'undefined' || K._governed) return; K._governed = true; K._gov = [];
  const jolts = typeof JOLTS !== 'undefined' ? JOLTS.splice(0, JOLTS.length) : [];   // impact shakes are wanted; only the move itself is judged
  const deg = (r) => Math.round(THREE.MathUtils.radToDeg(r)), ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
  for (let i = 1; i < K.length; i++) { const k = K[i]; if (k.how !== 'move') continue;
    const s0 = shotAt(k.t).a, s1 = shotAt(k.t + k.dur + (k.settle || 0)).a, A = _camFrame(s0), B = _camFrame(s1);
    const pv = s0.l.clone().lerp(s1.l, 0.5), oa = s0.p.clone().sub(pv), ob = s1.p.clone().sub(pv);
    const swing = Math.max(ang(A.dir, B.dir), oa.length() > 0.05 && ob.length() > 0.05 ? ang(oa.normalize(), ob.normalize()) : 0);
    const travel = A.p.distanceTo(B.p) / Math.max(0.15, (A.dist + B.dist) / 2), room = (K[i + 1] ? K[i + 1].t : k.t + k.dur + 2) - k.t - 0.15;
    const d0 = k.dur, p0 = _flyPeak(i); let why = '';
    if (k.whip) { if (travel > 0.35) why = `a whip pan turns on the spot; this one travels ${travel.toFixed(1)}x its distance`; }
    else if (deg(swing) > CAM_RULE.swing || travel > CAM_RULE.travel || Math.max(A.dist, B.dist) / Math.max(0.05, Math.min(A.dist, B.dist)) > CAM_RULE.size) why = `${deg(swing)} degrees, ${travel.toFixed(1)}x its distance, ${(Math.max(A.dist, B.dist) / Math.max(0.05, Math.min(A.dist, B.dist))).toFixed(1)}x the shot size: a new setup, so a cut`;
    else { let peak = p0;
      for (let n = 0; n < 6 && peak > CAM_RULE.slide; n++) { const want = k.dur * peak / CAM_RULE.slide * 1.05; if (want > room) { why = `it needs ${want.toFixed(2)} s to stay smooth and has ${Math.max(0, room).toFixed(2)} s`; break; }
        k.dur = want; _reOs(i); peak = _flyPeak(i); }
      if (!why && k.dur > d0 + 0.01) K._gov.push({ t: +k.t.toFixed(2), did: 'slowed', from: +d0.toFixed(2), to: +k.dur.toFixed(2), slide: +p0.toFixed(3), swing: deg(swing) }); }
    if (why) { k.how = 'cut'; k.dur = 0; k.os = 0; k.settle = 0; K._gov.push({ t: +k.t.toFixed(2), did: 'cut', why, slide: +p0.toFixed(3), swing: deg(swing) }); } }
  if (typeof JOLTS !== 'undefined') JOLTS.push(...jolts);
}
// is a character seen right now (after the camera is set): on screen, not hidden, facing us, how big
function _see(c) { const hp = c.head.getWorldPosition(V(0, 0, 0)), q = hp.clone().project(cam), d = cam.position.distanceTo(hp);
  const r = { on: c.g.visible && Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95 && q.z < 1, hid: false, away: false, turn: 0, h: 2 * R * HX * 1.1 / (2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) };
  if (!r.on) return r;
  const fw = c.head.getWorldDirection(V(0, 0, 0)).setY(0).normalize(), to = cam.position.clone().sub(hp).setY(0).normalize();
  r.turn = Math.round(THREE.MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, fw.dot(to)))))); r.away = r.turn > 100;
  const own = new Set(); c.g.traverse(m => own.add(m)); const rc = new THREE.Raycaster(cam.position, hp.clone().sub(cam.position).normalize(), cam.near, Math.max(cam.near, d - 0.12)); rc.camera = cam;
  r.hid = rc.intersectObjects(scene.children, true).some(h => !own.has(h.object) && h.object.visible && !h.object.userData.hull && !h.object.isSprite && h.object.material && !h.object.material.transparent);
  return r; }
window.camAudit = function (fps = 30) {
  if (typeof K === 'undefined') return null; if (!K._planned) planPaths(); governMoves();
  const jolts = typeof JOLTS !== 'undefined' ? JOLTS.splice(0, JOLTS.length) : [];
  const name = (c) => (c && (c.o && c.o.name || c.name)) || ('character ' + (chars.indexOf(c) + 1));
  const end = Math.max(K[K.length - 1].t + 1, typeof WORDS !== 'undefined' && WORDS.length ? WORDS[WORDS.length - 1][1] + 0.3 : 0);
  const SP = (window.SPEAK || []).filter(x => x && x[2] && x[2].head).map(([a, b, c]) => ({ a, b, c, n: 0, off: 0, away: 0, tiny: 0, turn: 0 }));
  const out = { moves: K._gov, smear: [], speakers: window.SPEAK ? [] : null, missing: [], faceless: [] }; let prev = null, prevI = -1, prevB = false;
  const setCam = (s) => { cam.up.copy(s.up); cam.position.copy(s.p); cam.lookAt(s.l); cam.updateMatrixWorld(); };
  for (let t = 0; t <= end; t += 1 / fps) {
    stage(t); scene.updateMatrixWorld(true); const sh = shotAt(t), s = sh.a, i = _shotIdx(t); setCam(s);
    const f = _camFrame(s);
    if (prev && prevI === i && !sh.b && !prevB) { const sl = _slide(prev, f) * fps / 30; if (sl > CAM_RULE.slide * 1.25) { const last = out.smear[out.smear.length - 1];
      if (last && t - last.to < 0.1) { last.to = +t.toFixed(2); last.peak = Math.max(last.peak, +sl.toFixed(3)); } else out.smear.push({ shot: i, from: +t.toFixed(2), to: +t.toFixed(2), peak: +sl.toFixed(3) }); } }
    prev = f; prevI = i; prevB = !!sh.b;
    for (const sp of SP) if (t >= sp.a && t <= sp.b) { sp.n++; const v = _see(sp.c); if (!v.on || v.hid) sp.off++; else { if (v.away) sp.away++; if (v.h < 0.045) sp.tiny++; sp.turn += v.turn; } }
  }
  for (const sp of SP) if (sp.n) { const seen = sp.n - sp.off; out.speakers.push({ who: name(sp.c), from: +sp.a.toFixed(2), to: +sp.b.toFixed(2), off: +(sp.off / sp.n).toFixed(2), away: +(sp.away / sp.n).toFixed(2), tiny: +(sp.tiny / sp.n).toFixed(2), turn: seen ? Math.round(sp.turn / seen) : null }); }
  K.forEach((k, i) => { const nx = K[i + 1] ? K[i + 1].t : end, tm = Math.min(nx - 0.05, k.t + (k.dur || 0) + Math.max(0.15, (nx - k.t - (k.dur || 0)) * 0.5));
    stage(tm); scene.updateMatrixWorld(true); setCam(shotAt(tm).a);
    for (const c of (k.who || [])) { const v = _see(c); if (!v.on || v.hid) out.missing.push({ shot: i, t: +k.t.toFixed(2), who: name(c), why: !v.on ? 'out of frame' : 'hidden behind something' }); }
    if (k.kind !== 'insert' && !(k.cam && k.cam[0] === 'insert') && nx - k.t >= 1 && !chars.some(c => { const v = _see(c); return v.on && !v.hid; })) out.faceless.push({ shot: i, t: +k.t.toFixed(2) }); });
  if (typeof JOLTS !== 'undefined') JOLTS.push(...jolts);
  return out;
};

// ---------- the shot plan for check.py ----------
window.shotPlan = function () {
  if (typeof K === 'undefined') return null;
  return K.map((k, i) => {
    let f = null; try { stage(k.t + (k.dur || 0) + 0.05); f = F[k.f](); } catch (e) { f = k.l; }
    const d = k.p.distanceTo(f || k.l), dir = k.l.clone().sub(k.p), az = Math.atan2(dir.x, dir.z), el = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
    return { t: k.t, how: k.how, kind: k.kind || '', dist: +d.toFixed(3), az: +az.toFixed(3), el: +el.toFixed(3), top: !!(k.up && k.up !== UP && Math.abs(k.up.y) < 0.5),
      x: +k.p.x.toFixed(2), z: +k.p.z.toFixed(2), look: k.look || '', f: k.f || '', next: K[i + 1] ? K[i + 1].t : null };
  });
};

// ---------- the acting library: everyday moves for any story, as perform() keys ----------
// move(name, t, o) returns the keys of one move starting at t (put t on the word it acts); acting(...) joins lists and sorts them:
//   const OWNER = acting(move('rest', 0), move('talk', 1.2, { to: 3.0 }), move('shrug', wStart('maybe')), move('rest', 5.2));
// o.left: use the left hand instead of the right (the moves are written right-handed: the character's right is -x);
// o.hold: how long the pose holds before the next key (default per move); o.to: end time for 'talk' (word-driven gestures).
// Every move ends on its last pose; the next move (or 'rest') takes over from there with its own blend, so moves chain smoothly.
const _mir = (k) => { const o = { ...k }; if (k.lh || k.rh) { o.lh = k.rh && V(-k.rh.x, k.rh.y, k.rh.z); o.rh = k.lh && V(-k.lh.x, k.lh.y, k.lh.z); }
  if (k.finger) o.finger = k.finger === 'R' ? 'L' : 'R'; if (k.fdir) o.fdir = V(-k.fdir.x, k.fdir.y, k.fdir.z); if (k.head) o.head = [k.head[0], -k.head[1], -k.head[2]]; if (k.turn) o.turn = -k.turn; if (k.tilt) o.tilt = -k.tilt; return o; };
// wBeat(word, after): when the word's loudest syllable starts (measured from the voice; the word's start when it wasn't measured).
// stressed(from, to, min): the words the voice leans on between two times, loudest first, as {t, word, stress}. Put the BIG
// actions (a slam, a jump, a head snap, a camera punch-in) on those; Legion writes [start, end, word, stress, beat] per word.
function wBeat(word, after = 0) { const t = wStart(word, after), x = WORDS.find(y => Math.abs(y[0] - t) < 1e-4); return x && x[4] != null ? x[4] : t; }
function stressed(from = 0, to = 1e9, min = 0.6) { return WORDS.filter(x => x[0] >= from && x[0] < to && (x[3] ?? 0) >= min && String(x[2]).replace(/[^a-z0-9]/gi, '').length > 2)
  .sort((a, b) => b[3] - a[3]).map(x => ({ t: x[4] ?? x[0], word: x[2], stress: x[3] })); }
function move(name, t, o = {}) {
  const h = o.hold, L = (x, y, z) => V(x, y, z);
  const M = {
    rest: () => [{ t, lh: REST.lh, rh: REST.rh, lf: REST.lf, rf: REST.rf, lean: 0, turn: 0, tilt: 0, dip: 0, head: [-0.04, 0, 0], blend: 0.35 }],
    talk: () => { const out = [], end = o.to ?? t + 2, has = WORDS.some(w => w[3] != null); let n = 0, last = -9;
      /* with the voice measured: a beat gesture on the words the voice leans on (stress >= 0.55), its size from the stress, the
         hand ARRIVING on the stressed syllable; otherwise on the long words */
      for (const w of WORDS) { if (w[0] < t || w[0] >= end) continue; const word = w[2].replace(/[^a-z]/gi, '');
        const s = has ? (w[3] ?? 0) : word.length >= 4 ? 0.7 : 0; if (s < 0.55 || word.length < 3) continue;
        const at = (has && w[4] != null ? w[4] : w[0]) - 0.1; if (at - last < 0.35) continue; last = at;
        const up = n % 2 === 0, g = 0.6 + 0.6 * s;
        out.push({ t: at, rh: L(-0.2 - 0.03 * up * g, 0.5 + (0.04 + 0.06 * up) * g, 0.12 + 0.04 * up * g), lh: n % 3 === 2 ? L(0.19, 0.52, 0.13) : L(0.17, 0.46, 0.07),
          head: [(-0.04 - 0.04 * up) * g, 0.04 * g * (up ? 1 : -1), 0.03 * g * (up ? 1 : -1)], dip: 0.004 * s, blend: 0.2, snap: s > 0.85 ? 1 : 0 }); n++; }
      return out.length ? out : [{ t, rh: L(-0.2, 0.55, 0.14), head: [-0.06, 0, 0.03] }]; },
    point: () => [{ t, ant: 1, rh: L(-0.27, 0.68, 0.2), finger: 'R', fdir: L(-0.55, 0.25, 0.8), lh: L(0.16, 0.45, 0.06), turn: -0.12, head: [-0.06, -0.2, 0], snap: 1 },
                  { t: t + (h ?? 0.8), rh: L(-0.25, 0.64, 0.18), blend: 0.4 }],
    shrug: () => [{ t, ant: 1, lh: L(0.25, 0.6, 0.12), rh: L(-0.25, 0.6, 0.12), head: [-0.02, 0, 0.12], dip: -0.008, blend: 0.24 },
                  { t: t + (h ?? 0.55), lh: L(0.22, 0.56, 0.1), rh: L(-0.22, 0.56, 0.1), head: [-0.04, 0, 0.08], dip: 0, blend: 0.3 }],
    laugh: () => { const out = [{ t, lh: L(0.12, 0.5, 0.14), rh: L(-0.12, 0.5, 0.14), head: [-0.22, 0, 0.04], lean: -0.05, blend: 0.2 }];
      for (let i = 1; i <= 4; i++) out.push({ t: t + i * 0.16, dip: i % 2 ? 0.01 : 0, head: [i % 2 ? -0.16 : -0.22, 0, 0.04 * (i % 2 ? -1 : 1)], blend: 0.14 }); return out; },
    shock: () => [{ t, snap: 1, lh: L(0.15, 0.8, 0.17), rh: L(-0.15, 0.8, 0.17), lean: -0.09, head: [-0.13, 0, 0], dip: -0.01, blend: 0.16 },
                  { t: t + (h ?? 0.6), lh: L(0.14, 0.74, 0.16), rh: L(-0.14, 0.74, 0.16), lean: -0.05, head: [-0.08, 0, 0], dip: 0, blend: 0.4 }],
    think: () => [{ t, rh: L(-0.05, 0.77, 0.19), lh: L(0.03, 0.52, 0.13), head: [0.04, 0.15, 0.1], tilt: 0.02, blend: 0.4, heavy: 1 }],
    wave: () => { const out = [{ t, ant: 1, rh: L(-0.22, 0.95, 0.08), head: [-0.06, -0.1, -0.04], blend: 0.24 }];
      for (let i = 1; i <= 4; i++) out.push({ t: t + 0.12 + i * 0.17, rh: L(-0.22 + (i % 2 ? -0.06 : 0.04), 0.95, 0.08), blend: 0.15 }); return out; },
    nod: () => [0, 1, 2].map(i => ({ t: t + i * 0.22, head: [i % 2 ? -0.04 : 0.1, 0, 0], blend: 0.16 })).concat([{ t: t + 0.66, head: [-0.04, 0, 0], blend: 0.2 }]),
    no: () => [0, 1, 2, 3].map(i => ({ t: t + i * 0.18, head: [-0.04, i % 2 ? -0.22 : 0.22, 0], blend: 0.15 })).concat([{ t: t + 0.72, head: [-0.04, 0, 0], blend: 0.2 }]),
    arms: () => [{ t, lh: L(-0.05, 0.53, 0.15), rh: L(0.05, 0.51, 0.16), lean: -0.03, head: [-0.08, 0, 0.04], blend: 0.35 }],   // arms crossed
    hips: () => [{ t, lh: L(0.21, 0.43, -0.01), rh: L(-0.21, 0.43, -0.01), lean: -0.04, head: [-0.08, 0, 0], blend: 0.32 }],
    cheer: () => [{ t, ant: 1, lh: L(0.17, 1.03, 0.06), rh: L(-0.17, 1.03, 0.06), dip: -0.02, head: [-0.16, 0, 0], blend: 0.28 },
                  { t: t + 0.25, dip: 0.012, blend: 0.18 }, { t: t + 0.5, dip: 0, blend: 0.25 }],
    slump: () => [{ t, heavy: 1, lh: L(0.13, 0.35, 0.05), rh: L(-0.13, 0.35, 0.05), lean: 0.12, dip: 0.02, head: [0.28, 0, 0.05], blend: 0.5, calm: 0.5 }],
    reach: () => [{ t, ant: 1, rh: L(-0.11, 0.6, 0.33), lean: 0.07, head: [0.04, -0.06, 0], blend: 0.3 }],
    give: () => [{ t, lh: L(0.07, 0.58, 0.3), rh: L(-0.07, 0.58, 0.3), lean: 0.06, head: [0.02, 0, 0], blend: 0.32 }],
    listen: () => [{ t, lh: L(0.16, 0.44, 0.05), rh: L(-0.16, 0.44, 0.05), head: [-0.02, 0.12, 0.08], calm: 0.5, blend: 0.45 }],
  }[name];
  if (!M) throw new Error('move(): unknown move ' + name + ' (rest talk point shrug laugh shock think wave nod no arms hips cheer slump reach give listen)');
  const ks = M();
  if (ks.length && !('finger' in ks[0])) ks[0].finger = false;      // a move lets go of the last point unless it points itself
  if (ks.length && !('calm' in ks[0])) ks[0].calm = 1;              // and brings the idle back to full unless it sets its own
  return o.left ? ks.map(_mir) : ks;
}
function acting(...lists) { return lists.flat().sort((a, b) => a.t - b.t); }
