# How to reproduce every result

Each step names its input, command and output. Raw outputs go to `results/raw/`; tables and figures are generated
from them and never edited by hand.

## 0. Reference model and software checks (any machine with Python, numpy, gcc)
```
make golden       # error analysis of f4, writes golden/f4_vectors.hex (65,536 vectors)
make host-test    # C kernels vs golden
pip install torch && make torch-check     # PyTorch emulator == golden on all 65,536 inputs
```

## 1. RTL against the reference (Icarus Verilog)
```
make rtl-check    # simulates rtl/silu.v on all 65,536 inputs; expect "0 mismatches"
```

## 2. gem5 with the instruction
Follow `gem5/README.md` (apply the patch, build `build/RISCV/gem5.opt`). A RISC-V cross compiler is needed. This
project used Zig's bundled clang (`pip install ziglang`): `python3 -m ziglang cc -target riscv64-linux-musl
-mcpu=baseline_rv64`. Any `riscv64` GCC/clang with a static libc and libm works; pass it with `--cc` to `run_all.py`.
```
make runs GEM5=~/gem5     # ~250 simulations, a few minutes; results/raw/<run>/
```
Exhaustive check of the instruction inside gem5 (all 65,536 inputs):
build `bench/exhaustive_main.c` with `-DVARIANT=5`, run it with `scripts/run_gem5.py --cpu RiscvAtomicSimpleCPU`, keep
the `xxxx yyyy` lines and run `python3 golden/f4_golden.py --compare <lines>`.

## 3. Latency from synthesis
`scripts/synth2gem5.py` holds the rule (cycles = ceil(delay / period); pipeline stages for the pipelined unit).
`scripts/run_gem5.py` applies it per run: `--delay-ns 8.058` is the data delay from `quartus/reports/silu.sta.rpt`.

## 4. Model accuracy (YOLOv8n)
```
pip install ultralytics      # weights: yolov8n.pt;  data: COCO128 (128 COCO images with labels)
make yolo
```
`model/eval_yolo.py` prints, for each activation, the number of SiLU modules replaced, the number left (must be 0),
the activation call count, the share of inputs outside [-4,4] and the mAP.

## 5. Tables and figures
```
make results      # results/tables/*.csv, results/tables/summary.md, results/figures/*.png
```
