// lib/game — the QUEST look (Legion's "3D video game" style): chibi people with faces, a low-poly toy world and the
// game set pieces (level map, chests, gates, rings, camps, tags). Every kind is marked `look: 'game'`: the director
// sees them only when the video's look preset is `game` (storyboard.catalog_text), and under that preset this library
// CLAIMS every person of the scene (claimFigures): the cast becomes chibi figures, `figure.*` / `core.crowd` groups
// become game.formation / game.crowd, `figure.person` objects become game.npc — so one director, one catalog.
import * as chibi from './chibi.js';
import * as crowd from './crowd.js';
import * as world from './world.js';
import * as props from './props.js';
import * as tags from './tags.js';
import * as mounts from './mounts.js';

export const MODULES = [chibi_mod(), crowd, world, props, tags, mounts];

// ── the people: cast + npc ───────────────────────────────────────────────────────────────────────────────────────────
function chibi_mod() {
  const CATALOG = {
    'game.npc': { desc: 'QUEST: one chibi person (def {kit, chibi:{outfit, top, wear, crest, held, held_l, back, cape, hair, hair_color, skin, beard, expression}}); actions like the cast', actions: chibi.ACTIONS, params: { def: 'chibi def', action: 'stand|walk|march|run|salute|point|wave|cheer|celebrate|levelup|dig|build|swing|block|talk|nod|look_around|think|carry|sit|kneel|bow|scared|tired|aim|read|count|pray|push|fall|lie', actions: '[{t, action}]', path: '[[x,z]...]', speed: 'm/s', face: '[x, z]' }, footprint: [0.7, 0.6], height: 1.45, tags: ['figure', 'person', 'character', 'game'], look: 'game', section: 'objects', extends: 'cast' },
  };
  async function build(kind, item = {}, ctx = {}) {
    const def = item.def || { id: item.id || 'npc', kit: item.kit, chibi: item.chibi, colors: item.colors };
    return person(def, item, ctx);
  }
  return { NAME: 'game/people', CATALOG, build, claimFigures: (spec) => claimFigures(spec) };
}

export function person(def, item, ctx) {
  // a rider: the figure on a chibi horse that walks / trots / gallops along the path
  const acts = [item.action, ...((item.actions || []).map((e) => (Array.isArray(e) ? e[1] : e && (e.action || e.a))))].map((a) => chibi.normAction(a));
  if (!item.mounted && acts.includes('ride')) {
    const sp = +(item.speed ?? (item.path ? 1.6 : 0));
    return mountedPerson(def, item, ctx, sp);
  }
  const L = chibi.chibiLook(def || {});
  const fig = chibi.buildChibi(L, ctx, { detail: 1 });
  const ctl = chibi.makeChibiController(fig, item, ctx);
  const G = (x, z) => (ctx.ground ? Math.max(ctx.ground.height(x, z), ctx.water?.level ?? -1e9) : 0);
  const update = (t) => { ctl.update(t); const p = fig.group.position; p.y = item.mounted ? 0 : G(p.x, p.z); };
  update(0);
  const out = {
    root: ctl.root, radius: 0.45 * fig.scale, height: fig.height, snapped: true,
    update, anchors: { ...fig.anchors, body: fig.group, feet: fig.group, figure: fig.group },
    figure: fig, character: def?.id, chibi: true,
  };
  if (ctl.members) out.members = (t) => { update(t); const p = fig.group.position; return [[p.x, p.z]]; };
  if (ctl.loco) out.loco = ctl.loco;
  return out;
}

function mountedPerson(def, item, ctx, speed) {
  const gait = speed >= 5 ? 'gallop' : speed >= 2.4 ? 'trot' : speed > 0 ? 'walk' : 'idle';
  const p = mounts.build('game.horse', { ...item, gait, speed, color: item.horse_color || (def?.chibi?.horse_color) || 'brown', caparison: item.caparison || def?.chibi?.caparison || def?.chibi?.tabard || def?.chibi?.cape || null, rider: { def: { ...(def || {}), id: def?.id } } }, ctx);
  return p.then ? p : p;
}

// the registry asks every module: does your look claim this scene's people? (only under look.preset 'game')
export function claimFigures(spec) {
  const p = String(spec?.look?.preset || '').toLowerCase();
  if (p !== 'game') return null;
  return {
    buildCast: async (def, item, ctx) => person(def, item, ctx),
    // a people group or a single person of the documentary library -> the game's own kinds
    kind: (kind, entry, section) => {
      const k = String(kind || '');
      if (section === 'groups' && (/^figure\./.test(k) || k === 'core.crowd' || /^crowd/.test(k))) {
        if (k === 'figure.crowd' || /^crowd/.test(k)) return { kind: 'game.crowd', params: { era: entry?.era || entry?.params?.era } };
        const kit = k.startsWith('figure.') ? k.slice(7).replace(/^soldier_1944_us$/, 'ww2_us').replace(/^soldier_1944_german$/, 'ww2_german') : null;
        return { kind: 'game.formation', params: { kit: kit && kit !== 'cavalry' ? kit : (entry?.kit || entry?.params?.kit || (kit === 'cavalry' ? 'medieval_knight' : 'roman_legion')) } };
      }
      if ((section === 'objects' || section === 'groups') && /^(creature|animal)\.horse/.test(k))
        return { kind: 'game.horse', params: { gait: ({ walk: 'walk', trot: 'trot', run: 'gallop', gallop: 'gallop', charge: 'gallop' })[String(entry?.action || '').toLowerCase()] || 'idle' } };
      if ((section === 'objects' || section === 'cast') && (k === 'figure.person' || k === 'figure.witness' || k === 'core.mannequin'))
        return { kind: 'game.npc', params: { def: { id: entry?.id || 'npc', kit: entry?.kit, chibi: entry?.chibi, colors: entry?.colors, headwear: entry?.headwear } } };
      return null;
    },
  };
}
