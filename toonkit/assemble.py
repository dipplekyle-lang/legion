"""Build index.html from src/index.tpl: a line '@@ a-b' pulls engine.html lines a..b (the shared rig, passes and timing),
with the patches below and any of this Short's own in subs.json ({"line": [["old", "new"], ...]}). A line
'@lib kind/name' pulls in a library piece (lib/kind/name.js: a set, prop, outfit or character that passed before);
'@kit motion' pulls in motion.js (smooth key-pose acting, named camera setups, the shot plan for check.py).
usage: python assemble.py [src/other.tpl other.html]"""
import json, pathlib, re, sys

HERE = pathlib.Path(__file__).parent
SRC = (HERE / "engine.html").read_text(encoding="utf-8").split("\n") if (HERE / "engine.html").exists() else []   # flatkit: script engine
PATCH = {
    # pose: the finger can point along a direction (fdir), not only straight up
    619: "  c.finger.visible = !!P.finger; if (P.finger) { const fd = (P.fdir || V(0, 1, 0)).clone().normalize(); c.finger.position.copy(P.finger === 'L' ? P.lh : P.rh).addScaledVector(fd, HAND_R + 0.008); c.finger.quaternion.setFromUnitVectors(V(0, 1, 0), fd); }",
}
SUBS = {
    686: [("if (['lid',", "if (!st.nb && ['lid',")],                 # a face can hold its eyes open ("without blinking")
    # the camera's own rules (motion.js governMoves): every move held to an operator's speed before the first frame
    1060: [("window.render = function (t) { if (!K._planned) planPaths();",
            "window.render = function (t) { if (!K._planned) { planPaths(); if (typeof governMoves === 'function') governMoves(); }")],
}
own = HERE / "subs.json"
if own.exists():
    for k, pairs in json.loads(own.read_text(encoding="utf-8")).items():
        SUBS.setdefault(int(k), []).extend((a, b) for a, b in pairs)
TPL = HERE / (sys.argv[1] if len(sys.argv) > 2 else "src/index.tpl")
DEST = HERE / (sys.argv[2] if len(sys.argv) > 2 else "index.html")
out, used = [], []
for line in TPL.read_text(encoding="utf-8").split("\n"):
    lib = re.fullmatch(r"@lib ([\w-]+/[\w-]+)", line.strip())
    if lib:
        f = HERE / "lib" / f"{lib.group(1)}.js"
        assert f.exists(), f"library piece missing: {lib.group(1)} (see LIBRARY.md)"
        if lib.group(1) not in used:                 # a piece is pulled in once, however often it is named
            used.append(lib.group(1)); out.extend(f.read_text(encoding="utf-8").rstrip().split("\n"))
        continue
    kit = re.fullmatch(r"@kit ([\w-]+)", line.strip())            # a shared kit file (motion.js: perform / camAt / shotPlan)
    if kit:
        out.extend((HERE / f"{kit.group(1)}.js").read_text(encoding="utf-8").rstrip().split("\n")); continue
    m = re.fullmatch(r"@@ (\d+)(?:-(\d+))?", line.strip())
    if not m:
        out.append(line); continue
    a = int(m.group(1)); b = int(m.group(2) or a)
    for n in range(a, b + 1):
        s = PATCH.get(n, SRC[n - 1])
        for old, new in SUBS.get(n, []):
            assert old in s, (n, old); s = s.replace(old, new)
        out.append(s)
DEST.write_text("\n".join(out), encoding="utf-8")
print(DEST.name, len(out), "lines", f"({len(used)} library pieces)" if used else "")
