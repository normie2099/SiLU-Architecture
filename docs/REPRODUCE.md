# How to reproduce every result

Order matters. Each step names its input, command and output. If a step cannot run yet, it says why.

## 0. Check the reference (works anywhere)
```
make golden       # error analysis, paper self-check, writes golden/f4_vectors.hex
make host-test    # C kernels vs golden
```

## 1. Check the RTL (Gate G1)  [needs your simulator]
1. Drive all 65,536 16-bit inputs through the Verilog testbench; write one `iiii oooo` hex pair per line
   (input and output as 4-digit hex) to `results/raw/rtl_out.hex`.
2. `python3 golden/f4_golden.py --compare results/raw/rtl_out.hex`
3. Zero mismatches is the goal. If not: find which side is wrong (a constant off by 1, `<` vs `<=` at a
   breakpoint) and fix that side. Never edit the vectors. Log the result in `LOG.md`.

## 2. Software baselines on gem5  [needs gem5 + RISC-V toolchain]
1. `make inputs` (uniform over [-4, 4), 1,024 values) or `python3 bench/gen_inputs.py --real file.npy`.
2. Fill `bench/silu_insn.h` with the opcode/funct values from your `decoder.isa`.
3. Build the five variants (names are suggestions):
   - variant 1 (expf, soft-float): `-march=rv32im -mabi=ilp32 -DVARIANT=1`
   - variant 2 (expf, hard-float): `-march=rv32imf -mabi=ilp32f -DVARIANT=2`
   - variant 3 (integer f4): `-DVARIANT=3`;  variant 4 (table): `-DVARIANT=4`
   - variant 5 (custom instruction): `-DVARIANT=5 -DSILU_OPCODE=... -DSILU_FUNCT3=... -DSILU_FUNCT7=...`
   - all with the same `-O2`. Read each binary's disassembly of the loop and confirm the loop is there.
4. Run each in gem5 and keep the whole output directory as `results/raw/<cpu>_<variant>_<clock>/`.
5. `make stats` -> `results/tables/runs.csv`.
Note: the harness that calls the kernel and the m5 stat-reset/dump around the loop are part of the gem5
setup; see `docs/GEM5_NOTES.md`.

## 3. Latency from synthesis  [needs a Quartus timing report]
```
make latency REPORT=quartus/output_files/<name>.sta.rpt      # or: make latency DELAY_NS=8.058
```
Writes `results/raw/latency_table.json` and one `gem5/generated/silu_lat_*.py` per clock/stage count.
If the report format is not recognised the script stops and asks for `--delay-ns`; it does not guess.

## 4. Model accuracy  [needs torch, ultralytics, COCO val2017]
```
make torch-check                                     # emulator == golden on all 65,536 inputs
# the YOLO evaluation script (model/eval_yolo.py) is NOT written yet: it needs the weights, COCO val2017 paths
# and the Ultralytics version the team uses. Use swap_activations / count_calls from model/f4_torch.py inside it.
```
Always print the swap count and the per-forward call count (`model/f4_torch.py: swap_activations,
count_calls`). Compare the number of swapped activations with the number of Conv blocks you count in the
model yourself (print `sum(1 for m in model.modules() if hasattr(m, 'act'))`); they must agree.

## 5. Report
Tables and figures are generated from `results/` by scripts (to be added: `scripts/make_tables.py`,
`scripts/make_figures.py`). Do not paste numbers by hand.
