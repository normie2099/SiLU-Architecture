# SiLU instruction for RISC-V: from gates to models

Course project (BAEVD202 Computer Architecture, VIT Vellore) and the base of a possible paper.

**Question.** On a RISC-V core, how much does a multiplier-free fixed-point SiLU instruction buy, what does
it cost, and what does it do to a real model?

**What is in here.** One place for every file, script and result, so every number in the report can be
traced to a command and a raw output file. Read `docs/ROADMAP.md` first, then `docs/REPRODUCE.md`.

```
golden/    f4_golden.py + f4_vectors.hex: the reference for the approximation (65,536 test vectors)
rtl/       Verilog of the f4 unit and its testbench                      [to add from the team]
quartus/   project, SDC, timing / fitter / power reports                  [to add from the team]
gem5/      the diff / files that add the custom instruction, run configs [to add from the team]
bench/     C kernels: expf soft/hard float, integer f4, lookup table, custom instruction
model/     PyTorch bit-exact f4 and the swap-into-YOLO tools
scripts/   synth2gem5.py (Quartus delay -> gem5 latency), parse_gem5_stats.py, ...
results/   raw/ (untouched tool output), tables/ (generated), figures/ (generated)
docs/      roadmap, paper contract, setup, reproduction steps, related work, Q&A, findings
report/    IEEE report source (written after the results exist)
slides/    class presentation
refs/      the papers used
LOG.md     dated lab log: what was done, the command, where the output is, what it means
```

## Status

See `LOG.md` (newest entry last). Short version: golden model, PyTorch emulator, C kernels, latency
script are written and tested (see LOG.md). RTL, Quartus and gem5 files must be added by the team; the gem5
runs, YOLO runs and report come after that.

## Rules

1. No hand-typed numbers: results come from scripts reading files in `results/raw/`.
2. The golden model defines correct output. RTL, C and PyTorch all match `golden/f4_vectors.hex`.
3. Log every run in `LOG.md` with the exact command.
4. Commit after each working step; tag the commit behind each figure used in the report.

## Quick start

```
make golden host-test           # always works (numpy + gcc)
pip install torch ultralytics   # then:
make torch-check
```
