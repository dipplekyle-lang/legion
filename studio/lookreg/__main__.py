"""python3 -m lookreg — self-test of every registry (exit 1 on any problem)."""
import sys

import lookreg

probs = lookreg.selftest()
regs = lookreg.registries()
print("versions:", lookreg.versions())
print("entries:", {ws: {ax: len(d) for ax, d in reg.items()} for ws, reg in regs.items()})
for p in probs:
    print("PROBLEM:", p)
print("OK" if not probs else f"{len(probs)} problem(s)")
sys.exit(1 if probs else 0)
