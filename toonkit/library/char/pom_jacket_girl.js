// @piece char/pom_jacket_girl: purple-jacket customer with red hair and a yellow pom-pom beanie. Options: shirt, hair.
// usage: const cB = char_pom_jacket_girl();
function char_pom_jacket_girl(o = {}) { const c = makeChar({ shirt: o.shirt || '#7A3FD1', hair: o.hair || ['#E5302A', '#A01F18', '#FF6A55'], kind: 2, fr0: 0.58, frDip: 0.1, frPart: 0.0, res: 512, cloth: wear_puffer_vest() });
  wear_pom_beanie(c.head); return c; }
