"""lookreg — the autostyle v2 registries (stdlib only; imported by the brain, never the reverse).

One module per workstream: fx, text, creative, maps, objects, footage, sound, threed, worlds (+ common, pairings,
fonts). Each exposes VERSION, REGISTRY {axis: {id: entry}}, FROZEN {axis: [ids Phase 0 froze]} and
adapt(genome, lang) -> look fragment. The loader below imports each module on its own inside try/except, so a
module with a bug drops out (and says why in ERRORS) instead of taking autostyle — or a render — down with it.

    import lookreg
    lookreg.registries()         {"fx": {...}, "text": {...}, ...}   (only modules that imported)
    lookreg.versions()           {"fx": "0.1-phase0", ...}            (for auto_style.json "reg_versions")
    lookreg.adapt_all(genome, lang)   {"fx": {...}, ...}             (each adapt() isolated)
    lookreg.menu(ws, axis, approved_only=True)   {id: entry} with the status gate of SPEC 7.6
    lookreg.allowed(entry, ctx)  one entry vs a title (fits/avoid/requires/excludes/tier/tragedy/latin_only)
    lookreg.prefilter(ws, axis, ctx)   ({id: entry}, note) — allowed() + the status gate (the brain's menus)
    python3 -m lookreg           self-test: every registry valid, every frozen id present, fonts.json readable
"""
import importlib

WORKSTREAMS = ("fx", "text", "creative", "maps", "objects", "footage", "sound", "threed", "worlds", "assets")
EXTRA = ("common", "pairings", "fonts", "brief")   # v22: assets = the asset catalog + palette; brief = the creator's brief
ERRORS: dict = {}
_MODS: dict = {}


def load(name: str):
    """The lookreg.<name> module, or None when it is missing or broken (the reason is kept in ERRORS)."""
    if name in _MODS:
        return _MODS[name]
    try:
        mod = importlib.import_module(f"{__name__}.{name}")
    except Exception as e:                                   # noqa: BLE001 - one broken registry never blocks the rest
        ERRORS[name] = f"{type(e).__name__}: {e}"
        mod = None
    _MODS[name] = mod
    return mod


def modules() -> dict:
    """{ws: module} of the workstream modules that imported."""
    return {n: m for n in WORKSTREAMS for m in [load(n)] if m is not None}


def registries() -> dict:
    return {n: getattr(m, "REGISTRY", {}) for n, m in modules().items()}


def versions() -> dict:
    out = {n: str(getattr(m, "VERSION", "?")) for n, m in modules().items()}
    for n in ("common", "pairings"):
        m = load(n)
        if m is not None:
            out[n] = str(getattr(m, "VERSION", "?"))
    return out


def adapt_all(genome: dict, lang: str = "en") -> dict:
    """{ws: fragment} — every module's adapt() on its own; a failing one yields {} and an ERRORS entry."""
    out = {}
    for n, m in modules().items():
        try:
            frag = m.adapt(genome, lang)
            out[n] = frag if isinstance(frag, dict) else {}
        except Exception as e:                               # noqa: BLE001
            ERRORS[f"{n}.adapt"] = f"{type(e).__name__}: {e}"
            out[n] = {}
    return out


def menu(ws: str, axis: str, approved_only: bool = True) -> dict:
    """{id: entry} of one axis. approved_only: approved entries; when none is approved yet, the documentary-tier
    drafts (SPEC 7.6 status gate fallback)."""
    m = load(ws)
    axis_d = dict((getattr(m, "REGISTRY", {}) or {}).get(axis) or {}) if m is not None else {}
    if not approved_only:
        return axis_d
    ok = {k: v for k, v in axis_d.items() if isinstance(v, dict) and v.get("status") == "approved"}
    if ok:
        return ok
    return {k: v for k, v in axis_d.items() if isinstance(v, dict) and v.get("tier", "documentary") == "documentary"}


_ERA_RX = None


def _years(v) -> list:
    """The 4-digit years in an era string ("1983-1991", "1986", "1950s" -> [1950, 1959])."""
    global _ERA_RX
    import re
    if _ERA_RX is None:
        _ERA_RX = re.compile(r"(1[5-9]\d\d|20[0-4]\d)(s)?")
    out = []
    for y, dec in _ERA_RX.findall(str(v or "")):
        out.append(int(y))
        if dec:
            out.append(int(y) + 9)
    return out


def _era_overlaps(era, spans) -> bool:
    ys = _years(era)
    if not ys:
        return False
    lo, hi = min(ys), max(ys)
    for s in spans or []:
        sy = _years(s)
        if sy and lo <= max(sy) and hi >= min(sy):
            return True
    return False


def allowed(e, ctx: dict) -> bool:
    """Whether one registry entry may be offered for a title (SPEC 7.4 prefilter, the status gate aside).
    ctx: tags (set of genre/tone tags), tragedy, tier ("documentary" | "stylised"), lang ("en" | "cs" | "pl" | "de"),
    era ("1983-1991"), reality (footage_reality), and the axes already decided: world, ground, frame, glow …
    requires = {axis: [ids]} must hold ("world" matches the world OR its ground — the registries name grounds there;
    "era" = year spans that must overlap; an axis ctx does not know fails, conservatively); excludes = {axis: [ids]}
    must not hold; avoid tags must not meet the title's tags; latin_only faces never for cs / pl / de."""
    if not isinstance(e, dict):
        return False
    c = ctx or {}
    tags = set(c.get("tags") or ())
    tragedy = bool(c.get("tragedy"))
    if tragedy and (not e.get("tragedy_ok", True) or "tragedy" in (e.get("avoid") or [])):
        return False
    if e.get("tier", "documentary") == "stylised" and c.get("tier") != "stylised":
        return False
    if set(e.get("avoid") or []) & (tags - {"tragedy"}):
        return False
    if e.get("latin_only") and str(c.get("lang") or "en") in ("cs", "pl", "de"):
        return False
    for axis, ids in (e.get("requires") or {}).items():
        ids = list(ids or [])
        if not ids:
            continue
        if axis == "era":
            if not _era_overlaps(c.get("era"), ids):
                return False
        elif axis == "world":
            if not ({str(c.get("world") or ""), str(c.get("ground") or "")} & set(ids)):
                return False
        elif axis in ("footage_reality", "reality"):
            if str(c.get("reality") or "") not in ids:
                return False
        elif str(c.get(axis) or "") not in ids:
            return False
    for axis, ids in (e.get("excludes") or {}).items():
        if axis == "world":
            if {str(c.get("world") or ""), str(c.get("ground") or "")} & set(ids or []):
                return False
        elif str(c.get(axis) or "") in set(ids or []):
            return False
    return True


def prefilter(ws: str, axis: str, ctx: dict, approved_only: bool = True) -> tuple:
    """({id: entry}, note) — one registry axis filtered for a title (allowed()) and then status-gated (SPEC 7.6):
    the approved entries that pass; when none of those pass, the documentary-tier drafts that pass (note says so).
    approved_only=False (or env AUTOSTYLE_DRAFTS=1, for review renders) keeps every entry that passes."""
    import os
    m = load(ws)
    reg = (getattr(m, "REGISTRY", {}) or {}).get(axis) if m is not None else None
    if not isinstance(reg, dict):
        return {}, f"{ws}.{axis}: no registry"
    ok = {k: v for k, v in reg.items() if allowed(v, ctx)}
    if not approved_only or os.environ.get("AUTOSTYLE_DRAFTS", "").strip() in ("1", "true", "yes"):
        return ok, ""
    appr = {k: v for k, v in ok.items() if v.get("status") == "approved"}
    if appr:
        return appr, ""
    drafts = {k: v for k, v in ok.items() if v.get("tier", "documentary") == "documentary"}
    return drafts, (f"{ws}.{axis}: nothing approved passes -> {len(drafts)} documentary-tier draft(s)" if drafts
                    else f"{ws}.{axis}: nothing passes")


def selftest() -> list:
    """Problems ([] = fine): import errors, invalid entries, frozen ids missing, fonts.json unreadable."""
    probs = []
    common = load("common")
    if common is None:
        return [f"common: {ERRORS.get('common')}"]
    for n in WORKSTREAMS + ("pairings",):
        m = load(n)
        if m is None:
            probs.append(f"{n}: import failed — {ERRORS.get(n)}")
            continue
        for attr in ("VERSION", "REGISTRY", "FROZEN", "adapt"):
            if not hasattr(m, attr):
                probs.append(f"{n}: no {attr}")
        reg = getattr(m, "REGISTRY", {}) or {}
        for axis, ids in (getattr(m, "FROZEN", {}) or {}).items():
            have = reg.get(axis) or {}
            gone = [i for i in ids if i not in have]
            if gone:
                probs.append(f"{n}.{axis}: frozen ids missing {gone}")
        if n != "pairings":
            for axis, d in reg.items():
                probs += common.validate(d, f"{n}.{axis}")
        try:
            if m.adapt({}, "en") != {} and getattr(m, "VERSION", "").endswith("phase0"):
                probs.append(f"{n}: phase-0 adapt() must return {{}}")
        except Exception as e:                               # noqa: BLE001
            probs.append(f"{n}: adapt() raised {type(e).__name__}: {e}")
    fonts = load("fonts")
    if fonts is None or not fonts.load().get("fonts"):
        probs.append("fonts.json missing or empty (python3 -m lookreg.fonts)")
    return probs
