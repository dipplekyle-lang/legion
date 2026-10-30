// @piece char/diner_owner: the diner owner: navy shirt, white anchor apron, captain's cap, moustache and a name tag. Options: name, shirt, moustache.
// usage: const own = char_diner_owner({ name: 'SKIP' });
function char_diner_owner(o = {}) { const shirt = o.shirt || '#1E2F86';
  const c = makeChar({ shirt, hair: ['#5A3A24', '#3A2416', '#7E5638'], kind: 1, fr0: 0.5, frDip: 0.16, frPart: 0.0, moustache: o.moustache || '#5A3A24', cloth: wear_anchor_apron({ anchor: shirt }) });
  wear_name_tag(c.body, { text: o.name || 'SKIP', color: shirt }); wear_captain_hat(c.head); return c; }
