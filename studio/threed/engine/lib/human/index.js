// lib/human — the human library of Legion 3D (owner A3): people, crowds, towns, landmarks, interiors, vehicles,
// ships, aircraft, monumental lettering and map markers. Every module exports CATALOG + build(kind, item, ctx).
//
// Routing (for the engine registry):
//   spec.cast[i]       -> build('cast', item, ctx)            item.ref resolves against ctx.cast (the video's CastDefs)
//   spec.groups[i]     -> build(item.kind, item, ctx)         'figure.<kit>' crowds / formations (crowd.js)
//   spec.objects[i]    -> build(item.kind, item, ctx)         'vehicle.*', 'ship.*', 'aircraft.*', 'rocket.*', 'marker.*', 'figure.person'
//   spec.structures[i] -> build(item.kind, item, ctx)         'town.*', 'landmark.*', 'interior.*'
//   spec.labels[i]     -> build('label', item, ctx)           monumental 3D lettering (labels.js)
// Every build returns { root (placed), radius, height, update(t, clock), anchors } and never throws for an unknown
// param (warnings go to ctx.warnings when present).
import * as cast from './cast.js';
import * as crowd from './crowd.js';
import * as towns from './towns.js';
import * as landmarks from './landmarks.js';
import * as interiors from './interiors.js';
import * as vehicles from './vehicles.js';
import * as labels from './labels.js';
import * as markers from './markers.js';
import * as props from './props.js';
import * as details from './details.js';   // E3 v2: insert-grade detail props (detail.*)
import * as astronaut from './astronaut.js';   // E4 v2: space.astronaut (suit states) + detail.suit_gauge / visor / thermometer
import * as propbuild from './propbuild.js';   // E1 specificity: prop.build (the generic prop builder) + prop.pistol/rifle/grenade/flashlight
import * as blast from './blast.js';   // E1 specificity: fx.grenade_blast
import * as surgery from './surgery.js';   // E1 specificity: interior.operating_room / field_hospital, prop.operating_table / surgical_lamp / instrument_tray
import * as tunnels from './tunnels.js';   // E1 specificity: interior.crawl_tunnel (pitch dark), prop.trapdoor
import * as traps from './traps.js';   // E1 specificity: trap.punji_pit / punji_wall / tripwire / bamboo_whip / spiked_mace / bamboo_viper, interior.water_lock
import * as firebase from './firebase.js';   // E1 specificity: landmark.firebase (the base camp above the tunnels)
import * as cutaway from './cutaway.js';   // E1 specificity: cutaway.tunnels (the ground cut open: the network below the base)
import * as kitSp from './kit_sp.js';   // E1 specificity: kits surgeon, patient, tunnel_rat, vietnam_us, viet_cong + accessories pistol, flashlight, m16, ak47, mask

export const MODULES = [cast, crowd, towns, landmarks, interiors, vehicles, labels, markers, props, details, astronaut, propbuild, blast, kitSp, surgery, tunnels, traps, firebase, cutaway];
export { buildCharacter } from './cast.js';
export { dress, KITS, HEADWEAR, ACCESSORIES } from './kits.js';

// convenience: one merged catalog and a router (the engine may use its own registry instead)
export const CATALOG = Object.assign({}, ...MODULES.map((m) => m.CATALOG));
export async function build(kind, item, ctx) {
  for (const m of MODULES) if (m.CATALOG[kind]) return m.build(kind, item, ctx);
  for (const m of MODULES) if (m.handles && m.handles(kind)) return m.build(kind, item, ctx);
  throw new Error('lib/human: unknown kind ' + kind);
}
