// ---------- real kit: photo materials and a real sky, for styles that must look like a real 3D render ----------
// Pulled in with the line `@kit real` after the engine includes. Files: textures/<name>/{diff,nor,rough}.jpg (1K, CC0 from
// Poly Haven, see textures/sources.json) and textures/sky.hdr (a partly cloudy midday sky, CC0).
//
// REAL.setup(renderer)                 ACES tone mapping, sRGB out, soft shadows: call once after the renderer exists.
// REAL.sky(renderer, scene, o)         image-based light from the real sky: every material gets real light and reflections.
//                                      o.intensity (1), o.background (false: keep your own sky), o.bgIntensity, o.blur,
//                                      o.ground [r, g, b] linear colour of the ground metals reflect (soft earth).
// REAL.mat(name, o)                    a MeshStandardMaterial with the photo colour, normal and roughness maps.
//      names  stone_blocks rock concrete brick planks grass soil gravel steel siding
//      o.rep  [x, y] how often the photo repeats across the face (1 = once per UV square; real size: about 1 per 1-2 m)
//      o.tint a colour multiplied in (paint the siding, dirty the concrete), o.rough / o.metal scale the maps,
//      o.normal bump strength (1), o.side
// REAL.wait()                          a promise for every texture and the sky: render only after it, e.g.
//      Promise.all([REAL.wait(), fetch('./words.json').then(r => r.json())]).then(([, w]) => { WORDS = w; window.render(0); window.ready = true; });
// Tips: give each face sensible UVs (BoxGeometry repeats per face: scale o.rep to the face size), keep a real sun as the key
// light with shadows (the sky gives the soft fill and reflections), lower your old ambient/hemisphere lights a lot.
const REAL = (() => {
  let pending = 0, done = null;
  const ready = new Promise(r => { done = r; });
  const tick = () => { if (--pending <= 0) done(); };
  const loader = new THREE.TextureLoader();

  function tex(path, srgb, rep) {
    pending++;
    const t = loader.load(path, tick, undefined, () => { console.log('ERR texture ' + path); tick(); });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function mat(name, o = {}) {
    const rep = o.rep || [1, 1], n = o.normal ?? 1, base = `./textures/${name}/`;
    return new THREE.MeshStandardMaterial({
      map: tex(base + 'diff.jpg', true, rep), normalMap: tex(base + 'nor.jpg', false, rep),
      roughnessMap: tex(base + 'rough.jpg', false, rep), normalScale: new THREE.Vector2(n, n),
      color: o.tint || '#ffffff', roughness: o.rough ?? 1, metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide,
    });
  }

  function parseHDR(b) {                                   // Radiance .hdr (RGBE, flat or run-length) to linear floats
    let p = 0;
    const line = () => { let s = ''; while (p < b.length && b[p] !== 10) s += String.fromCharCode(b[p++]); p++; return s; };
    while (line() !== '') { /* header */ }
    const m = line().match(/-Y (\d+) \+X (\d+)/), h = +m[1], w = +m[2];
    const out = new Float32Array(w * h * 4), sc = new Uint8Array(w * 4);
    for (let y = 0; y < h; y++) {
      let planar = true;
      if (w < 8 || w > 0x7fff || b[p] !== 2 || b[p + 1] !== 2 || (b[p + 2] & 0x80)) {
        planar = false; for (let i = 0; i < w * 4; i++) sc[i] = b[p++];
      } else {
        p += 4;
        for (let c = 0; c < 4; c++) {
          let x = 0;
          while (x < w) {
            let k = b[p++];
            if (k > 128) { k -= 128; const v = b[p++]; while (k--) sc[c * w + x++] = v; } else { while (k--) sc[c * w + x++] = b[p++]; }
          }
        }
      }
      for (let x = 0; x < w; x++) {
        const at = (c) => (planar ? sc[c * w + x] : sc[x * 4 + c]), e = at(3), o = (y * w + x) * 4;
        const f = e ? Math.pow(2, e - 136) : 0;
        out[o] = at(0) * f; out[o + 1] = at(1) * f; out[o + 2] = at(2) * f; out[o + 3] = 1;
      }
    }
    return { w, h, data: out };
  }

  function sky(renderer, scene, o = {}) {
    pending++;
    fetch('./textures/sky.hdr').then(r => r.arrayBuffer()).then(buf => {
      const { w, h, data } = parseHDR(new Uint8Array(buf));
      const g = o.ground || [0.16, 0.15, 0.11];            // the sky photo has no ground: give the lower half a soft earth tone
      for (let y = Math.floor(h / 2); y < h; y++) {        // so metal and glass reflect ground, not black
        const k = Math.min(1, (y - h / 2) / (h * 0.04));
        for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; for (let c = 0; c < 3; c++) data[i + c] = data[i + c] * (1 - k) + g[c] * k; }
      }
      const half = new Uint16Array(data.length);
      for (let i = 0; i < data.length; i++) half[i] = THREE.DataUtils.toHalfFloat(data[i]);
      const t = new THREE.DataTexture(half, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
      t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.LinearSRGBColorSpace;
      t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.flipY = true; t.needsUpdate = true;
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromEquirectangular(t).texture; pm.dispose();
      scene.environmentIntensity = o.intensity ?? 1;
      if (o.background) { scene.background = t; scene.backgroundIntensity = o.bgIntensity ?? 1; scene.backgroundBlurriness = o.blur ?? 0; }
      tick();
    }).catch(e => { console.log('ERR sky ' + e); tick(); });
  }

  function setup(renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;      // r186 dropped PCFSoft; soften with light.shadow.radius
  }

  return { setup, sky, mat, wait: () => (pending ? ready : Promise.resolve()) };
})();
