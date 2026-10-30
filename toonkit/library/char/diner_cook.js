// @piece char/diner_cook: the cook: red tee, teal hair with a teal bandana knot. Options: shirt, hair.
// usage: const cook = char_diner_cook();
function char_diner_cook(o = {}) { const c = makeChar({ shirt: o.shirt || '#E5302A', hair: o.hair || ['#1C9AAA', '#127684', '#5CC8D4'], kind: 1, fr0: 0.46, frDip: 0.1, frPart: 0.0, res: 512, cloth: wear_cook_tee() });
  wear_bandana_knot(c.head, { color: '#1C9AAA' }); return c; }
