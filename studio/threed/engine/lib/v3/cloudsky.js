// cloudsky.js — Legion 3D v3, WP4 (V3_SPEC 2.4): sky.cloud_layer, an Earth cloud deck you can fly into, through and
// out of (the nature/giants.js raymarcher ported to an Earth layer, any world under it).
//   * one camera-centred dome draws the layer as a real volume: Worley-billow cumulus shapes in a weather map
//     (coverage, big GAPS down to the ground), eroded edges, a flat-ish base and heaped tops; lit by the scene's moon
//     (or sun) with a 5-tap march toward it (dark cores, beer-powder crevices), a forward-scattering phase (silver
//     linings when the light is behind the cloud), sky light on the tops and ground bounce on the bases;
//   * it is composited against the scene's own depth (a depth-only prepass the dome runs just before it draws), so a
//     bomber in the cloud fades into the fog and emerges from it, the snowy ground shows through the gaps, and the
//     lens can pass through the deck with no seam (inside = the volume all round, no surfaces anywhere);
//   * `tunnel` carves a billowing corridor (a polyline, or `follow` an aircraft's flight path) for the cloud-tunnel
//     reveal; `wind` moves the whole field (with an aircraft held still at speed 0 the clouds stream past it at
//     airspeed); `streaks` adds speed streaks round a fast lens. Deterministic in t (jitter averages over sub-frames).
// Heights are metres above the ground at the stage (0, 0). Kind section 'objects' (sky.* has no section of its own).
import * as THREE from 'three';
import { U } from '../shared/env.js';
import { clamp, lerp, smooth, smoother } from '../shared/util.js';

export const CATALOG = {
  'sky.cloud_layer': {
    desc: 'enterable volumetric cloud deck (moonlit / sunlit cumulus-stratocumulus) over any world: fly into it, through it and out; seen from below, inside and above with no seams; a carved tunnel corridor for an aircraft, gaps down to the ground, wind, speed streaks. Night: silver moonlit edges, blue whiteout inside',
    section: 'objects', actions: [],
    params: {
      base: 'm above the ground at the stage (default 800)', top: 'm (default 1500)', coverage: '0..1 (default 0.7)', density: '0.2..3 (default 1)',
      gaps: '0..1 big holes down to the ground (default 0.3)', scale: 'billow size m (default 340)',
      tunnel: '{from: [x,y,z], to: [x,y,z] | via: [[x,y,z]...] | follow: "objects:N" (+ t: [t0, t1]: the stretch of its flight that is carved; the lens behind the t0 end starts inside the cloud), radius m (default 45), fog 0..1 (thin wisps left in the corridor, default 0.3)}: a corridor through the deck (world y)',
      near: 'm: cloud fades out this close to the lens (default 5)', inner: '0..0.5 patchy fog inside the deck between the billows (default 0.1; 0.25 = a long whiteout when the lens starts deep inside)', fill: '0.3..1 how solid a fully covered deck is (default 0.8: billows with dark gaps)', scatter: '0..3 multiple-scattering glow of the cloud body (default 1)',
      wind: '[x, z] m/s (the cloud field moves; e.g. [0, -62] past an aircraft held still heading 180)', moon: '{az, el}: the light direction (default: the scene key light)',
      brightness: '0.2..3 (default 1)', streaks: '0..1 speed streaks round a fast lens (default 0)', haze: '0..1 air between the clouds and below the deck (default 0.4)',
      fog_in: 'true | {t0, t1 (default 0, 0.9 s), depth m (120), density (1)}: the lens starts inside a cloud bank whose front face sweeps back past it (fern C1: 0-0.5 s blue whiteout, then the aircraft emerges)',
      view: 'm marched in full detail (default 9000)', far: 'm: the deck continues analytically to here and fades into the horizon haze (default 120000)',
    },
    footprint: [0, 0], height: 0, snap: false, fly: true, contact: false,
    tags: ['sky', 'clouds', 'cloud', 'weather', 'fog', 'volumetric', 'tunnel', 'night', 'flight', 'aircraft'],
  },
};

// ── tileable 3D noise (giants.js recipe), baked once: R value-noise fbm, G Worley billows (1 - F1 fbm) ──────────────
let NOISE3 = null;
function noise3D() {
  if (NOISE3) return NOISE3;
  const N = 64, data = new Uint8Array(N * N * N * 2), fR = new Float32Array(N * N * N), fG = new Float32Array(N * N * N);
  const hash = (x, y, z, s) => { let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vn = (px, py, pz, per, s) => {
    const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz), fx = px - ix, fy = py - iy, fz = pz - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const m = (a) => ((a % per) + per) % per;
    const x0 = m(ix), x1 = m(ix + 1), y0 = m(iy), y1 = m(iy + 1), z0 = m(iz), z1 = m(iz + 1);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(hash(x0, y0, z0, s), hash(x1, y0, z0, s), ux), l(hash(x0, y1, z0, s), hash(x1, y1, z0, s), ux), uy),
      l(l(hash(x0, y0, z1, s), hash(x1, y0, z1, s), ux), l(hash(x0, y1, z1, s), hash(x1, y1, z1, s), ux), uy), uz);
  };
  const worley = (px, py, pz, per, s) => {
    const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz); let d2 = 9;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx, cy = iy + dy, cz = iz + dz, wx = ((cx % per) + per) % per, wy = ((cy % per) + per) % per, wz = ((cz % per) + per) % per;
      const ox = cx + hash(wx, wy, wz, s), oy = cy + hash(wx, wy, wz, s + 17), oz = cz + hash(wx, wy, wz, s + 31);
      const e = (ox - px) ** 2 + (oy - py) ** 2 + (oz - pz) ** 2; if (e < d2) d2 = e;
    }
    return Math.sqrt(d2);
  };
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0, a = 0.5, per = 4;
    for (let o = 0; o < 4; o++) { const k = per / N; v += a * vn(x * k, y * k, z * k, per, o + 3); a *= 0.5; per *= 2; }
    let w = 0; const WS = [[4, 0.6], [8, 0.27], [16, 0.13]];
    for (const [P, wt] of WS) { const k = P / N; w += wt * (1 - Math.min(1, worley(x * k, y * k, z * k, P, 50 + P))); }
    const i = (z * N + y) * N + x; fR[i] = v; fG[i] = w;
  }
  const norm = (f, sdK) => { let m = 0, q = 0; for (let i = 0; i < f.length; i++) { m += f[i]; q += f[i] * f[i]; } m /= f.length; const sd = Math.sqrt(Math.max(q / f.length - m * m, 1e-9)); return (v) => clamp(0.5 + (v - m) / sd * sdK, 0, 1); };
  const nR = norm(fR, 0.17), nG = norm(fG, 0.17);
  for (let i = 0; i < fR.length; i++) { data[i * 2] = Math.round(nR(fR[i]) * 255); data[i * 2 + 1] = Math.round(nG(fG[i]) * 255); }
  const t = new THREE.Data3DTexture(data, N, N, N);
  t.format = THREE.RGFormat; t.type = THREE.UnsignedByteType; t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping; t.unpackAlignment = 1; t.needsUpdate = true; t.userData.keep = true;
  return (NOISE3 = t);
}

const FS = /* glsl */`
precision highp sampler3D;
in vec3 vDir;
out vec4 fragColor;
uniform sampler3D uNoise;
uniform sampler2D uDepth;
uniform float uDepthOn, uLogFar, uBase, uTop, uCov, uGaps, uScale, uSigma, uTime, uSteps, uDt0, uGrowth, uMaxD, uTunN, uHaze, uNear, uFill, uTunFog;
uniform vec2 uMS;
uniform vec3 uMSTint;
uniform float uPhMax, uNearK, uInner;
uniform vec2 uRes;
uniform vec3 uCamFwd, uOff, uL, uLC, uAmbTop, uAmbBot;
uniform vec4 uTun[8];
uniform float uFrame, uJit, uDtCap, uFarD, uNight, uFogInD, uFogInK, uFogInK0, uGapW, uHorG, uShelter;
uniform vec3 uFogColor, uFogSunColor, uSunDir;
float hsh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// interleaved gradient noise (Jimenez): a per-pixel start offset with no low-frequency structure; shifted per sub-frame
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float remap(float x, float a, float b, float c, float d){ return c + (x - a) * (d - c) / max(b - a, 1e-4); }
float HG(float c, float g){ float g2 = g * g; return (1.0 - g2) / (12.566 * pow(max(1.0 + g2 - 2.0 * g * c, 1e-3), 1.5)); }
float segD(vec3 p, vec3 a, vec3 b){ vec3 ab = b - a; float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0); return length(p - a - ab * h); }
float tunnelD(vec3 q, out float R){
  float best = 1e9; R = 1.0;
  for (int i = 0; i < 7; i++) {
    if (float(i) >= uTunN - 1.0) break;
    float d = segD(q, uTun[i].xyz, uTun[i + 1].xyz);
    if (d < best) { best = d; R = mix(uTun[i].w, uTun[i + 1].w, 0.5); }
  }
  return best;
}
vec3 fogCol(vec3 rd){ float s = max(dot(rd, uSunDir), 0.0); return uFogColor + uFogSunColor * (pow(s, 5.0) * 0.5 + pow(s, 40.0) * 0.45); }
// the weather map: how covered the deck is over (q.xz) — wide soft edges, a few big feathered gaps (not a polka-dot field)
float coverAt(vec2 qxz){
  vec2 wu = qxz / (uScale * 7.0);
  float w = texture(uNoise, vec3(wu, 0.17)).r * 0.65 + texture(uNoise, vec3(wu * 2.6 + 0.31, 0.61)).r * 0.35;
  float cov = smoothstep(0.58 - uCov * 0.42, 0.78 - uCov * 0.42, w);
  if (uGaps > 0.0) cov *= smoothstep(0.15 + uGaps * 0.4, 0.15 + uGapW + uGaps * 0.4, texture(uNoise, vec3(wu * 0.15 + 0.7, 0.83)).r);
  return cov;
}
// density at world point p (full: with edge erosion; else the cheap shape for the light taps). hF: height fraction;
// dist: metres from the lens (near wisps get a finer octave so cloud streaming past the lens has 10-30 m structure)
float dens(vec3 p, bool full, float dist, out float hF){
  hF = (p.y - uBase) / max(uTop - uBase, 1.0);
  if (hF < 0.0 || hF > 1.0) return 0.0;
  vec3 q = p + uOff;
  float cov = coverAt(q.xz);
  float heap = texture(uNoise, vec3(q.xz / (uScale * 3.2), 0.37)).r;          // big rounded heaps on top, not a flat lid
  float topH = mix(0.5, 1.0, cov) * mix(0.68, 1.0, smoothstep(0.25, 0.75, heap));
  float band = min(0.45, 420.0 / max(uTop - uBase, 1.0));                       // the tops soften over <= 420 m (a thick deck stays solid round a bomber)
  float prof = smoothstep(0.0, 0.1, hF) * smoothstep(topH, topH - band, hF);
  if (prof * cov <= 0.002) return 0.0;
  vec3 s3 = q / uScale; s3.y *= 1.7;
  vec2 n = texture(uNoise, s3 * 0.55 + vec3(0.21, 0.0, 0.47)).rg;                        // big masses (billows 50-190 m)
  float shape = clamp((n.g * 0.62 + n.r * 0.38 - 0.5) * 1.7 + 0.5, 0.0, 1.0);
  float c = clamp(cov * prof, 0.0, 1.0) * uFill;
  // a soft knee at the iso-surface (the linear remap of the trilinear lookup terraced into 6 m steps)
  float e = clamp((shape - (1.0 - c)) / max(c, 1e-3), 0.0, 1.0);
  float d = mix(e, e * e * (3.0 - 2.0 * e), 0.6) * smoothstep(0.05, 0.5, c);              // thin cover = soft wisps, not popcorn
  float fogIn = uInner * smoothstep(0.15, 0.6, c);                                         // inside a deck it is fog everywhere
  float m = 1.0;
  if (uTunN > 1.5) {
    float R; float td = tunnelD(q, R);
    // the corridor's wall wanders with angle and length (a clean circular section showed as concentric arcs)
    td += R * 0.8 * (texture(uNoise, q / (R * 6.0) + vec3(0.37, 0.11, 0.73)).r - 0.5);
    m = smoothstep(R * 0.62, R * 1.15, td + (shape - 0.5) * R * 0.8);
    if (m < 0.999) {
      float veil = uTunFog * smoothstep(0.12, 1.0, shape) * max(c, 0.3);             // soft wisps in the corridor
      if (full) veil *= smoothstep(0.35, 0.75, texture(uNoise, s3 * 5.0 + vec3(0.5, 0.2 + uTime * 0.004, 0.1)).r);   // eroded: never a smooth isolated blob
      d = mix(veil, d, m);
    }
  }
  d = max(d, fogIn * m);                       // eroded below like the billows: patchy fog, not a flat white wall
  if (d <= 0.0) return 0.0;
  if (full) {
    vec2 nd = texture(uNoise, s3 * 4.3 + vec3(0.37, 0.11 + uTime * 0.002, 0.71)).rg;
    d = remap(d, (nd.g * 0.7 + nd.r * 0.3) * 0.42 * (1.0 - d), 1.0, 0.0, 1.0);
    float nk = (1.0 - smoothstep(40.0, 220.0, dist)) * uNearK;
    if (nk > 0.0) { float nf = texture(uNoise, s3 * 11.0 + vec3(0.13, 0.57 + uTime * 0.01, 0.29)).r; d *= mix(1.0, smoothstep(0.25, 0.75, nf), nk); }
    d = smoothstep(0.0, 0.3, d) * d * 1.25;
  }
  return max(d, 0.0);
}
// fog_in: the lens starts inside a cloud bank whose front face sweeps back past the lens (uFogInD = its depth now, m)
float lensFog(vec3 p, float dist, float K){
  if (uFogInD < 0.5 || dist > uFogInD) return 0.0;
  vec3 s3 = (p + uOff) / uScale; s3.y *= 1.7;
  float nf = texture(uNoise, s3 * 3.0 + vec3(0.52, 0.23, 0.11)).r, n2 = texture(uNoise, s3 * 9.0 + vec3(0.17, 0.71, 0.33)).r;
  float face = 1.0 - smoothstep(uFogInD * 0.55, uFogInD, dist + (nf - 0.5) * uFogInD * 0.6);
  return K * face * (0.45 + 0.55 * smoothstep(0.3, 0.7, nf)) * (0.75 + 0.5 * n2);
}
void main(){
  vec3 rd = normalize(vDir), ro = cameraPosition;
  float tEnd = uFarD, tHit = -1.0;
  if (uDepthOn > 0.5) {
    float z = texture(uDepth, gl_FragCoord.xy / uRes).r;
    if (z < 0.99999) { float w = exp2(z * uLogFar) - 1.0; tHit = w / max(dot(rd, uCamFwd), 1e-3); tEnd = min(tEnd, tHit); }
  }
  float ta, tb;
  if (abs(rd.y) < 1e-5) { ta = 0.0; tb = (ro.y > uBase && ro.y < uTop) ? 1e9 : -1.0; }
  else { ta = (uBase - ro.y) / rd.y; tb = (uTop - ro.y) / rd.y; if (ta > tb) { float x = ta; ta = tb; tb = x; } }
  float t0 = max(ta, 0.0), t1 = min(tb, tEnd);
  // the air below the deck (the ground seen through a gap from above): aerial perspective by the metres below the base
  bool below = tHit > 0.0 && ro.y > uBase && rd.y < -1e-3;
  // the air above the deck toward the horizon: a faint glow of the far deck's light, fading out over ~3 degrees up
  float hzG = (ro.y > uTop - 50.0 && tHit < 0.0) ? uHorG * (1.0 - smoothstep(-0.004, 0.055, rd.y)) * step(-0.08, rd.y) : 0.0;
  if ((tb <= 0.0 || t0 >= t1) && !below && hzG < 0.002) discard;
  float cosT = dot(rd, uL);
  float phase = min(mix(HG(cosT, 0.6), HG(cosT, -0.25), 0.35) * 12.566, uPhMax);
  float phase2 = mix(phase, 1.0, 0.6);
  // night: the direct moon term on the tops away from the moon is dimmer and bluer (a moonlit deck, not daylight cotton);
  // the silver edge toward the moon keeps its full strength
  float silver = smoothstep(0.2, 0.85, cosT);
  vec3 dirTint = mix(vec3(1.0), uMSTint, 0.5 * uNight * (1.0 - silver));
  float dirK = mix(1.0, mix(0.45, 1.0, silver), uNight);
  vec3 acc = vec3(0.0); float T = 1.0;
  vec3 colAvg = vec3(0.0); float wAvg = 0.0, sigAvg = 0.0;
  float t = t0;
  if (t0 < t1) {
    // start jitter in STEP-INDEX space: every sample sits the same random fraction jr of ITS OWN (growing) step, so far
    // grazing samples are decorrelated as well as near ones (a plain t0 + dt0 * r jitter left 40 m steps un-jittered =
    // the corduroy bands); jr = interleaved gradient noise, rotated per sub-frame by the golden ratio
    float g = uGrowth, dt = uDt0 * (1.0 + t0 * 0.004), jr;
    if (uJit < 0.5) { jr = hsh(gl_FragCoord.xy + fract(uTime * 7.31) * 91.0); t = t0 + dt * jr; }
    else {
      float k = mod(uFrame, 64.0);
      jr = fract(ign(gl_FragCoord.xy + 5.588238 * k) + 0.61803399 * k);
      float gj = pow(g, jr); t = t0 + dt * (gj - 1.0) / max(g - 1.0, 1e-4); dt *= gj;
    }
    float tM = min(t1, uMaxD);
    bool inC = false; float emp = 0.0, prevSt = 0.0;
    for (int i = 0; i < 256; i++) {
      if (float(i) >= uSteps || t > tM || T < 0.012) break;
      float cap = uDtCap * (1.0 + t * 0.0006);
      float st = inC ? min(dt, cap) : dt;
      vec3 p = ro + rd * t;
      float hF;
      float d = dens(p, true, t, hF);
      if (uFogInD > 0.5) d += lensFog(p, t, uFogInK);
      d *= smoothstep(0.4, uNear, t) * (1.0 - uShelter * (1.0 - smoothstep(16.0, 24.0, t)));
      if (d > 0.003 && !inC && uDtCap > 0.0) {
        inC = true; emp = 0.0;
        // entered the cloud from a long empty step: back up half of it and march the surface with the capped step
        if (i > 0 && prevSt > cap * 1.3) { t -= prevSt * 0.5; prevSt = 0.0; dt *= g; continue; }
        st = min(dt, cap);
      }
      float hz = uHaze * 0.0005 * (1.0 - smoothstep(0.0, 1.0, abs(hF - 0.5) * 2.0));
      vec3 amb = mix(uAmbBot, uAmbTop, smoothstep(0.0, 1.0, hF));
      if (d > 0.003) {
        emp = 0.0;
        float od = d * 7.0, sl = 9.0; vec3 q = p;                  // + the sample's own 7 m: a dense body is darker than its thin rim
        for (int j = 0; j < 5; j++) { q += uL * sl; float h2; od += dens(q, false, 999.0, h2) * sl; sl *= 2.1; }
        // inside a fog_in bank: its shade is the bank at FULL density over a fixed 18 m (the same at every depth and every
        // moment: a geometric tap brightened the deeper fog, so the frame brightened before it cleared)
        if (uFogInD > 0.5) od += lensFog(p, t, uFogInK0) * 18.0;
        od *= uSigma;
        float powder = 1.0 - exp(-d * 4.0);
        // thin wisps scatter less of the moon's single scatter (a lit thin veil read as a flat white hole)
        float phT = phase * mix(0.3, 1.0, smoothstep(0.02, 0.2, d));
        // three scattering octaves (Wrenninge): the moon's single scatter (silver edges, dark cores) plus the multiple
        // scattering that keeps a deep cloud body moon-blue instead of black
        vec3 sun = uLC * (dirTint * (dirK * exp(-od) * phT * mix(1.0, powder * 1.6, 0.35)) + uMSTint * (uMS.x * exp(-od * 0.3) * phase2 + uMS.y * exp(-od * 0.08)));
        vec3 col = sun + amb * (0.45 + 0.55 * hF);
        float sig = d * uSigma, a = 1.0 - exp(-sig * st);
        acc += T * col * a; T *= 1.0 - a;
        colAvg += col * st; sigAvg += sig * st; wAvg += st;
      } else {
        if (inC) { emp += st; if (emp > cap * 4.0) inC = false; }
        if (hz > 0.0) {
          float a = 1.0 - exp(-hz * st);
          acc += T * (amb * 0.6 + uLC * 0.05 * phase) * a; T *= 1.0 - a;
        }
      }
      prevSt = st;
      t += st; dt *= g;
    }
    // the far deck: the rest of the ray (step budget spent, or past the march range uMaxD out to uFarD) as one analytic
    // segment: the march's mean extinction blended with the weather map's cover along it, its mean colour fading into
    // the horizon haze by distance, so the deck runs out to the horizon instead of ending on a hard line
    if (t < t1 && T > 0.012) {
      float L = t1 - t, cw = 0.0;
      for (int k = 0; k < 3; k++) { vec3 pk = ro + rd * mix(t, t1, 0.17 + 0.33 * float(k)); cw += coverAt((pk + uOff).xz); }
      cw /= 3.0;
      float sigW = uSigma * uFill * cw * 0.3;
      float sigM = wAvg > 0.0 ? sigAvg / max(t - t0, 1.0) : sigW;
      float sigF = mix(sigW, sigM, 0.5);
      vec3 colF = wAvg > 0.0 ? colAvg / wAvg : uLC * (dirK * phase * 0.3 + uMSTint * (uMS.x * 0.4 + uMS.y)) + uAmbTop * 0.8;
      colF = mix(colF, fogCol(rd), 0.85 * (1.0 - exp(-(t + 0.5 * L) / 22000.0)));
      float aF = 1.0 - exp(-sigF * L);
      acc += T * colF * aF; T *= 1.0 - aF;
    }
  }
  if (below && T > 0.012) {
    float Lb = tHit - max((uBase - ro.y) / rd.y, 0.0);
    if (Lb > 0.0) { float a = 1.0 - exp(-Lb * 0.00035 * (0.4 + uHaze)); acc += T * fogCol(rd) * a; T *= 1.0 - a; }
  }
  if (hzG > 0.002 && T > 0.012) {
    vec3 hc = mix(uLC * (uMS.x * 0.35 + uMS.y) * uMSTint + uAmbTop, fogCol(rd), 0.5);
    acc += T * hc * hzG; T *= 1.0 - hzG;
  }
  if (T > 0.999) discard;
  fragColor = vec4(acc, 1.0 - T);
}`;

// ── speed streaks round a fast lens (giants.js speedStreaks, CPU ribbons) ──────────────────────────────────────────
function speedStreaks(n = 600, S = 150) {
  let sd = 9137; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const off = new Float32Array(n * 4); for (let i = 0; i < n; i++) { off[i * 4] = R() * S; off[i * 4 + 1] = R() * S; off[i * 4 + 2] = R() * S; off[i * 4 + 3] = R(); }
  const pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), al = new Float32Array(n * 4), idx = new Uint32Array(n * 6);
  for (let i = 0; i < n; i++) { uv.set([0, 0, 1, 0, 0, 1, 1, 1], i * 8); idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aA', new THREE.BufferAttribute(al, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0.7, 0.8, 1) }, uAmt: { value: 0 } },
    vertexShader: `#include <common>\n#include <logdepthbuf_pars_vertex>\nattribute float aA; varying float vA; varying vec2 vUv;\nvoid main(){ vA = aA; vUv = uv; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}`,
    fragmentShader: `#include <common>\n#include <logdepthbuf_pars_fragment>\nuniform vec3 uCol; uniform float uAmt; varying float vA; varying vec2 vUv;\nvoid main(){\n#include <logdepthbuf_fragment>\n float a = (1.0 - abs(vUv.x - 0.5) * 2.0) * sin(3.14159 * vUv.y) * vA * 0.22 * uAmt; if (a < 0.002) discard; gl_FragColor = vec4(uCol * a, a); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 5; m.name = 'v3.cloud_streaks'; m.userData.noQA = true;
  const P = new THREE.Vector3(), ax = new THREE.Vector3(), vd = new THREE.Vector3(), side = new THREE.Vector3();
  const update = (cam, rel, inCloud) => {
    const sp = rel.length(), on = Math.min(1, Math.max(0, (sp - 25) / 60)) * inCloud;
    if (sp > 1e-3) ax.copy(rel).multiplyScalar(-1 / sp); else ax.set(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const b = i * 4;
      P.set(off[b], off[b + 1], off[b + 2]);
      P.x = cam.x - S / 2 + (((P.x - (cam.x - S / 2)) % S) + S) % S; P.y = cam.y - S / 2 + (((P.y - (cam.y - S / 2)) % S) + S) % S; P.z = cam.z - S / 2 + (((P.z - (cam.z - S / 2)) % S) + S) % S;
      vd.copy(P).sub(cam); const d = vd.length(); vd.divideScalar(Math.max(d, 1e-3));
      side.crossVectors(ax, vd); if (side.lengthSq() < 1e-8) side.set(1, 0, 0); side.normalize();
      const w = 0.08 + 0.005 * d, len = Math.min(16, Math.max(0.5, sp * 0.028)) * (0.6 + 0.8 * off[b + 3]);
      const a = on * Math.min(1, Math.max(0, (d - 3) / 10)) * (1 - Math.min(1, Math.max(0, (d - S * 0.3) / (S * 0.2))));
      for (let k = 0; k < 4; k++) {
        const sx = (k & 1) ? 0.5 : -0.5, sy = (k & 2) ? 1 : 0, q = (i * 4 + k) * 3;
        pos[q] = P.x + side.x * sx * w + ax.x * sy * len; pos[q + 1] = P.y + side.y * sx * w + ax.y * sy * len; pos[q + 2] = P.z + side.z * sx * w + ax.z * sy * len;
        al[i * 4 + k] = a;
      }
    }
    g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true;
  };
  return { mesh: m, mat, update };
}

// shelter: an aircraft whose hold the lens is in reports it here (aircraft_ww2.js update, per scene time t); the deck then
// draws no cloud in the first 20 m of a ray (no fog inside the fuselage), the view out through the hatch keeps it
export const SHELTER = { k: 0, t: -1e9 };
// fog_in state (per scene time t) so additive glows / prop discs drawn after the deck can fade with the bank: they were
// visible through the whiteout as floating smudges. lensFogT(dist, t) = the bank's transmittance over dist metres
// (a pure function of t: the aircraft may update before the deck in a sub-frame)
export const FOGIN = { p: null, sigma: 0, ctx: null };
function fogInAt(f, t) {
  const sx = smooth((t - f.t0) / (f.t1 - f.t0)), g = Math.log(lerp(0.015, 1, sx)) / Math.log(0.015);
  return { D: g > 0.003 ? f.depth * (1 - 0.5 * sx) : 0, K: 2.0 * f.k * g, K0: 1.2 * f.k };
}
export function lensFogT(dist, t, ctx) {
  if (!FOGIN.p || (ctx && FOGIN.ctx && ctx !== FOGIN.ctx)) return 1;
  const s = fogInAt(FOGIN.p, t); if (s.D <= 0) return 1;
  return Math.exp(-s.K * 0.72 * FOGIN.sigma * Math.max(0, Math.min(dist, s.D) - 4));
}
export function shelter(k, t) { if (SHELTER.t !== t) { SHELTER.t = t; SHELTER.k = 0; } SHELTER.k = Math.max(SHELTER.k, k); }
// the scene's lights as they were before anything dimmed them this scene (shared with aircraft_ww2.js: the hold
// dims the key while the lens is inside it; the clouds outside keep the moon)
function lookHandle() { try { const f = globalThis.__f3d; return (f && typeof f.look === 'function' && f.look()) || null; } catch (e) { return null; } }
export function baseLights(lk, ctx) {
  if (!lk || !lk.cur) return null;
  if (!lk.cur.__v3base) lk.cur.__v3base = { key: lk.key.intensity, hemi: lk.hemi.intensity, env: ctx && ctx.world3 ? ctx.world3.environmentIntensity : 1, keyColor: lk.key.color.clone(), hemiColor: lk.hemi.color.clone(), gndColor: lk.hemi.groundColor.clone() };
  return lk.cur.__v3base;
}
const dirAzEl = (az, el) => { const a = az * Math.PI / 180, e = el * Math.PI / 180; return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); };

export async function build(kind, item = {}, ctx = {}) {
  const doc = CATALOG['sky.cloud_layer'].params, p = {};
  for (const [k, v] of Object.entries(item.params || {})) if (v !== doc[k]) p[k] = v;
  Object.assign(p, item);
  const num = (v, d) => (Number.isFinite(+v) && v !== null && v !== '' ? +v : d);
  const g0 = ctx.ground && ctx.ground.height ? (Number.isFinite(ctx.ground.height(0, 0)) ? ctx.ground.height(0, 0) : 0) : 0;
  const base = g0 + num(p.base, 800), top = Math.max(base + 60, g0 + num(p.top, 1500));
  const draft = ctx.quality === 'draft';
  const root = new THREE.Group(); root.name = 'sky.cloud_layer'; root.userData.noQA = true;
  const wind = Array.isArray(p.wind) ? [num(p.wind[0], 0), num(p.wind[1], 0)] : [0, 0];
  const mq = p.march && typeof p.march === 'object' ? p.march : {};          // debug: {steps, growth, dt0, cap, jitter: 'old'}
  // fog_in: the lens starts inside a cloud bank; its front face sweeps back past the lens between t0 and t1 (fern C1's
  // 0-0.5 s blue whiteout, the bomber emerging as the fog clears). true = {t0: 0, t1: 0.9, depth: 120, density: 1}
  const FI = p.fog_in === true ? {} : p.fog_in && typeof p.fog_in === 'object' ? p.fog_in : null;
  const fogIn = FI ? { t0: num(FI.t0, 0.0), t1: Math.max(num(FI.t0, 0.0) + 0.3, num(FI.t1, 0.9)), depth: clamp(num(FI.depth, 120), 10, 600), k: clamp(num(FI.density, 1), 0.1, 3) } : null;
  FOGIN.p = fogIn; FOGIN.ctx = ctx; FOGIN.sigma = 0.05 * clamp(num(p.density, 1), 0.1, 4);      // (a scene without fog_in clears it)
  const u = {
    uNoise: { value: noise3D() }, uDepth: { value: null }, uDepthOn: { value: 0 }, uLogFar: { value: Math.log2(60001) }, uRes: { value: new THREE.Vector2(1, 1) },
    uCamFwd: { value: new THREE.Vector3(0, 0, -1) }, uOff: { value: new THREE.Vector3() }, uBase: { value: base }, uTop: { value: top },
    uCov: { value: clamp(num(p.coverage, 0.7), 0, 1) }, uGaps: { value: clamp(num(p.gaps, 0.3), 0, 1) }, uScale: { value: clamp(num(p.scale, 340), 60, 4000) },
    uSigma: { value: 0.05 * clamp(num(p.density, 1), 0.1, 4) }, uTime: { value: 0 }, uSteps: { value: clamp(num(mq.steps, draft ? 96 : 160), 16, 256) }, uDt0: { value: num(mq.dt0, draft ? 4.5 : 3.0) },
    uGrowth: { value: clamp(num(mq.growth, draft ? 1.045 : 1.032), 1.001, 1.2) }, uMaxD: { value: num(p.view, 9000) }, uTunN: { value: 0 }, uTun: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
    uHaze: { value: clamp(num(p.haze, 0.4), 0, 2) }, uNear: { value: clamp(num(p.near, 5), 0.6, 60) },
    uMSTint: { value: new THREE.Vector3(1, 1, 1) }, uPhMax: { value: 2.0 }, uNearK: { value: 0.65 }, uInner: { value: clamp(num(p.inner, 0.1), 0, 0.5) },
    // fix round 1: per-sub-frame jitter index, in-cloud step cap (0 = off), analytic far deck range, night flag, lens fog
    uFrame: { value: 0 }, uJit: { value: mq.jitter === 0 || mq.jitter === 'old' ? 0 : 1 }, uDtCap: { value: Math.max(0, num(mq.cap, draft ? 12 : 8)) },
    uFarD: { value: Math.max(num(p.view, 9000), num(p.far, 120000)) }, uNight: { value: 0 }, uFogInD: { value: 0 }, uFogInK: { value: 0.9 }, uFogInK0: { value: 0 }, uShelter: { value: 0 }, uGapW: { value: 0.25 }, uHorG: { value: 0.35 * clamp(num(p.haze, 0.4) / 0.4, 0, 2) },
    uFogColor: U.uFogColor, uFogSunColor: U.uFogSunColor, uSunDir: U.uSunDir,
    uFill: { value: clamp(num(p.fill, 0.8), 0.3, 1) }, uTunFog: { value: 0 }, uMS: { value: new THREE.Vector2(0.5, 0.2).multiplyScalar(clamp(num(p.scatter, 1), 0, 3)) },
    uL: { value: new THREE.Vector3(0, 1, 0) }, uLC: { value: new THREE.Color(0.6, 0.7, 1) }, uAmbTop: { value: new THREE.Color(0.05, 0.06, 0.1) }, uAmbBot: { value: new THREE.Color(0.02, 0.025, 0.04) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, glslVersion: THREE.GLSL3,
    vertexShader: `out vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: FS, transparent: true, depthWrite: false, depthTest: false, side: THREE.BackSide, fog: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), mat);
  // first of the transparent pass: it composites over the opaque scene (to its depth), then prop discs, glows, beams and
  // streaks in front of it blend over the cloud instead of being painted out by it
  dome.frustumCulled = false; dome.renderOrder = -1e6; dome.name = 'v3.cloud_layer'; dome.userData.noQA = true;
  root.add(dome);
  // the depth prepass (the scene's opaque depth under this camera, this sub-frame), run right before the dome draws
  let rtD = null;
  const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false }), depthMat2 = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  const hidden = [], solid = [], twoSided = [];
  const _f = new THREE.Vector3();
  dome.onBeforeRender = (renderer, scene, camera) => {
    if (scene.overrideMaterial) { dome.scale.setScalar(1e-6); dome.updateMatrixWorld(); return; }    // a QA / mask / ink pass: draw nothing
    dome.scale.setScalar(1); dome.position.copy(camera.position); dome.updateMatrixWorld();
    const cur = renderer.getRenderTarget();
    const w = cur ? cur.width : renderer.domElement.width, h = cur ? cur.height : renderer.domElement.height;
    if (!rtD || rtD.width !== w || rtD.height !== h) {
      if (rtD) rtD.dispose();
      rtD = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, depthBuffer: true, depthTexture: new THREE.DepthTexture(w, h, THREE.FloatType) });
    }
    hidden.length = 0; solid.length = 0; twoSided.length = 0;
    scene.traverseVisible((o) => {
      if (o === dome) { hidden.push(o); return; }
      if (o.isPoints || o.isLine || o.isSprite) { hidden.push(o); return; }
      if (!o.isMesh) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.depthWrite === false || m.transparent || m.colorWrite === false || m.depthTest === false) hidden.push(o);
      else { solid.push(o); if (m.side !== THREE.FrontSide) twoSided.push(o); }
    });
    for (const o of hidden) o.visible = false;
    const ac = renderer.autoClear, au = renderer.shadowMap.autoUpdate, ov = scene.overrideMaterial, cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    try {
      renderer.shadowMap.autoUpdate = false; scene.overrideMaterial = depthMat;
      renderer.setRenderTarget(rtD); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, false);
      renderer.render(scene, camera);
      // the override draws front faces only: double-/back-sided solids (a bulkhead or a rib seen from behind) get a second
      // pass, or the cloud was composited over them as if they were not there
      if (twoSided.length) {
        const ts = new Set(twoSided);
        for (const o of solid) if (!ts.has(o)) o.visible = false;
        scene.overrideMaterial = depthMat2; renderer.autoClear = false;
        renderer.render(scene, camera);
        for (const o of solid) o.visible = true;
      }
    } finally {
      scene.overrideMaterial = ov; renderer.shadowMap.autoUpdate = au; renderer.setClearColor(cc, ca); renderer.autoClear = ac;
      renderer.setRenderTarget(cur);
      for (const o of hidden) o.visible = true;
    }
    u.uDepth.value = rtD.depthTexture; u.uDepthOn.value = 1; u.uRes.value.set(w, h);
    u.uShelter.value = SHELTER.t === u.uTime.value ? clamp(SHELTER.k, 0, 1) : 0;
    u.uLogFar.value = Math.log2(camera.far + 1);
    camera.getWorldDirection(_f); u.uCamFwd.value.copy(_f);
  };
  // tunnel: explicit points, or an item's flight path (followed in the cloud's moving frame)
  const T = p.tunnel && typeof p.tunnel === 'object' ? p.tunnel : null;
  const R0 = T ? clamp(num(T.radius, 45), 8, 400) : 45;
  if (T) u.uTunFog.value = clamp(num(T.fog, 0.3), 0, 1);
  let tunDone = false;
  function setTunnel(pts) {
    const n = Math.min(8, pts.length);
    for (let i = 0; i < n; i++) u.uTun.value[i].set(pts[i][0], pts[i][1], pts[i][2], pts[i][3] ?? R0);
    u.uTunN.value = n;
  }
  if (T && !T.follow) {
    const pts = Array.isArray(T.via) && T.via.length >= 2 ? T.via : [T.from, T.to];
    if (pts.every((q) => Array.isArray(q) && q.length >= 3)) setTunnel(pts.slice(0, 8).map((q) => [+q[0], +q[1], +q[2]]));
    else if (ctx.warn) ctx.warn('sky.cloud_layer: tunnel needs from/to [x, y, z] (or via, or follow); none carved');
    tunDone = true;
  }
  const resolveFollow = () => {
    if (tunDone) return;
    const S = ctx.S, it = S && S.byRef ? S.byRef[String(T.follow)] || S.byRef['ref:' + String(T.follow)] : null;
    if (!it) return;
    tunDone = true;
    const dur = ctx.dur || 8, ta = Array.isArray(T.t) ? num(T.t[0], -3) : -3, tb = Array.isArray(T.t) ? num(T.t[1], dur + 3) : dur + 3;
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const tt = lerp(ta, tb, k / 7);
      let q = null;
      try { q = typeof it.res.positionAt === 'function' ? it.res.positionAt(tt) : null; } catch (e) { q = null; }
      if (!q) { it.res.root.updateMatrixWorld(true); q = new THREE.Box3().setFromObject(it.res.root).getCenter(new THREE.Vector3()); }
      const x = q.x ?? q[0], y = q.y ?? q[1], z = q.z ?? q[2];
      pts.push([x - wind[0] * tt, y, z - wind[1] * tt]);       // the path in the cloud's frame (q = p - wind t: the field moves with the wind)
    }
    try { it.res.update && it.res.update(0, 0); } catch (e) { /* */ }
    setTunnel(pts);
  };
  // streaks
  const stK = clamp(num(p.streaks, 0), 0, 1);
  const streaks = stK > 0 ? speedStreaks(draft ? 350 : 650) : null;
  if (streaks) root.add(streaks.mesh);
  const bright = 0.6 * clamp(num(p.brightness, 1), 0.1, 4);
  const moonDir = p.moon && typeof p.moon === 'object' ? dirAzEl(num(p.moon.az, 180), num(p.moon.el, 30)) : null;
  const camP = new THREE.Vector3(), vel = new THREE.Vector3();
  function lights() {
    const lk = lookHandle(), b = baseLights(lk, ctx);
    if (moonDir) u.uL.value.copy(moonDir); else if (lk && lk.cur && lk.cur.keyDir) u.uL.value.copy(lk.cur.keyDir); else u.uL.value.copy(U.uNight.value > 0.5 ? U.uMoonDir.value : U.uSunDir.value);
    u.uL.value.normalize();
    // night: a moonlit deck at the night exposure reads as fern's moon-blue body with silver edges (not a white
    // daylight cumulus): the moon term at half strength, the scattered light inside tinted toward the blue
    // day: the sun term at 0.6 (a full-strength sunlit deck blew 35 % of the frame and fired the exposure ceiling, which
    // turned the bomber into a black cut-out) and the multiple scattering half-way to white (not saturated orange)
    const night = lk && lk.cur ? !!lk.cur.keyIsMoon : U.uNight.value > 0.5, kN = night ? 0.5 : 0.6;
    u.uNight.value = night ? 1 : 0;
    if (b) {
      u.uLC.value.copy(b.keyColor).multiplyScalar(b.key * bright * kN);
      u.uAmbTop.value.copy(b.hemiColor).multiplyScalar(b.hemi * 0.9 * bright);
      u.uAmbBot.value.copy(b.gndColor).multiplyScalar(b.hemi * 0.9 * bright).add(u.uLC.value.clone().multiplyScalar(0.07 * Math.max(0.1, u.uL.value.y)));
      // the night sky is black: the deck's own sky light is the moon scattered by the cloud round it (a floor, so a
      // moonlit deck never goes ink-black in its shade)
      const cmax = (c, k) => { const L = u.uLC.value; c.setRGB(Math.max(c.r, L.r * k), Math.max(c.g, L.g * k), Math.max(c.b, L.b * k)); };
      cmax(u.uAmbTop.value, 0.06); cmax(u.uAmbBot.value, 0.025);
    } else {
      u.uLC.value.copy(night ? U.uMoonColor.value : U.uSunColor.value).multiplyScalar(night ? 1.4 * bright * kN : 2.5 * bright);
      u.uAmbTop.value.setRGB(0.04, 0.05, 0.09).multiplyScalar(bright); u.uAmbBot.value.setRGB(0.02, 0.025, 0.04).multiplyScalar(bright);
    }
    if (night) u.uMSTint.value.set(0.7, 0.84, 1.14);
    else {
      const L = u.uLC.value, lum = Math.max(1e-4, 0.2126 * L.r + 0.7152 * L.g + 0.0722 * L.b);
      u.uMSTint.value.set(lerp(1, lum / Math.max(L.r, 1e-4), 0.5), lerp(1, lum / Math.max(L.g, 1e-4), 0.5), lerp(1, lum / Math.max(L.b, 1e-4), 0.5));
    }
  }
  function update(t = 0, clock, camera) {
    if (!tunDone && T && T.follow) resolveFollow();
    u.uTime.value = t;
    u.uFrame.value = Math.round(t * 720);                 // a distinct jitter rotation per sub-frame (deterministic in t)
    if (fogIn) {
      // the bank's density falls so the transmittance through it rises evenly (1.5 % -> 100 % on a smoothstep): an even
      // luma ramp, no single-frame jump, while its front face drifts back toward the lens
      const f = fogInAt(fogIn, t);
      u.uFogInD.value = f.D; u.uFogInK.value = f.K; u.uFogInK0.value = f.K0;
    }
    u.uOff.value.set(-wind[0] * t, 0, -wind[1] * t);
    lights();
    if (camera) camP.copy(camera.position);
    if (streaks) {
      const f = globalThis.__f3d, cur = f && f.cur && f.cur.ctx === ctx ? f.cur : null;
      vel.set(0, 0, 0);
      if (cur && cur.plan) { const a = cur.plan.camAt(t - 0.05).pos, b = cur.plan.camAt(t + 0.05).pos; vel.set((b[0] - a[0]) / 0.1 - wind[0], (b[1] - a[1]) / 0.1, (b[2] - a[2]) / 0.1 - wind[1]); }
      const inside = smooth((camP.y - (base - 60)) / 60) * (1 - smooth((camP.y - (top - 40)) / 60));
      streaks.mat.uniforms.uAmt.value = stK;
      streaks.mat.uniforms.uCol.value.copy(u.uLC.value).multiplyScalar(0.5).add(u.uAmbTop.value);
      streaks.update(camP, vel, inside);
    }
  }
  update(0);
  return {
    root, radius: 0, height: 0, snapped: true, fly: true, contact: false, update, anchors: {},
    cloud: { base, top, densityAt: null },
  };
}
