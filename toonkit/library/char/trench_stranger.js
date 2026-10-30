// @piece char/trench_stranger: the stranger: brown trench coat with a belt and turned-up collar, plum fedora with a red band. Options: shirt, hair.
// usage: const str = char_trench_stranger();
function char_trench_stranger(o = {}) { const c = makeChar({ shirt: o.shirt || '#B8642A', hair: o.hair || ['#2A2030', '#16101C', '#4A3C52'], kind: 1, fr0: 0.5, frDip: 0.12, cloth: wear_trench_coat() });
  wear_fedora(c); return c; }
