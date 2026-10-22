# Multiplier-less SiLU custom instruction for RISC-V

Computer Architecture (BAEVD202) course project, VIT Vellore.

**Question.** What does a one-cycle, multiplier-free SiLU instruction change in the processor performance
equation (instruction count x CPI x clock period), on an in-order and an out-of-order RISC-V core, and how much
of that survives at whole-model level (Amdahl's law)?

SiLU(x) = x * sigmoid(x) is the activation of YOLOv8 and many other networks. The instruction implements the
six-segment piecewise-linear approximation f4 of Spagnolo, Perri and Corsonello (ISVLSI 2025) in 16-bit Q6.10
fixed point, using only shifts, adds and comparators. `docs/SYLLABUS_MAP.md` maps the project to the course.

## Pipeline
```
golden model -> Verilog (rtl/) -> Quartus timing (quartus/) -> 8.058 ns
                                                                  | scripts/run_gem5.py: cycles = ceil(delay / period)
gem5 + custom instruction (gem5/) -> in-order and out-of-order runs (results/raw/) -> tables, figures (results/)
PyTorch f4 (model/) -> YOLOv8n accuracy and activation counts -----------------------^
```

## Layout
```
golden/    f4_golden.py + f4_vectors.hex: reference model, error analysis, 65,536 test vectors
rtl/       silu.v (combinational), silu_timing.v (registered wrapper), silu_tb.v (exhaustive testbench)
quartus/   timing.sdc, silu.qsf, reports/ (timing, fitter, mapper, power)
gem5/      silu_instruction.patch, configs/silu_se.py (op-class latency), build and run notes
bench/     bench_main.c (activation loop), conv_main.c (conv layer), exhaustive_main.c, kernels, inputs
model/     PyTorch f4, swap tools, eval_yolo.py, count_model.py
scripts/   run_gem5.py, run_all.py, collect_runs.py, make_results.py, synth2gem5.py, pack_runs.sh
results/   report/ (IEEE paper: report.tex, report.pdf), slides/ (class deck), raw/ (every gem5 run, RTL and YOLO outputs), tables/ (generated), figures/ (generated)
docs/      SYLLABUS_MAP.md, FINDINGS.md (all numbers), REPRODUCE.md (commands)
```

## Headline results (details and caveats: `docs/FINDINGS.md`)
- Correctness: Verilog, the instruction inside gem5, C and PyTorch all match the golden model on all 65,536 inputs.
- Hardware (Quartus, Cyclone IV E): 8.058 ns critical path, 191 logic elements, no multipliers or memory.
- Loop (1,024 inputs in [-4,4)): the instruction takes 7.0 cycles/activation in-order and 1.0 out-of-order, against 169.8 / 36.8 for float `expf`, 16.6 / 3.8 for integer f4 and 21.0 / 5.0 for a lookup table.
- Latency: in-order exposes latency beyond ~4 cycles; out-of-order hides it only if the unit is pipelined. At 1 GHz the instruction's advantage over integer f4 shrinks to 1.1-1.4x in-order.
- Branches: software f4 mispredicts 0.41 branches per activation on unordered data; the instruction has none.
- Whole model (YOLOv8n, 315 MACs per activation): about 1.1x over `expf` on a scalar core, 2.5-2.7x if MACs are 16x faster (Amdahl).
- Accuracy (COCO128): exact SiLU 0.4439 mAP50-95; f4 0.4359; Q6.10 rounding alone accounts for 0.4374.

## Quick start
```
make golden host-test           # numpy + gcc only
make rtl-check                  # needs Icarus Verilog
make results                    # regenerate tables and figures from results/raw
```
Full instructions, including gem5 and the YOLO evaluation: `docs/REPRODUCE.md`.

## Known limits
Single-loop and single-layer microbenchmarks with a scalar core; code alignment moves small-loop results by 1-3
cycles; the 8.058 ns delay is an FPGA slow-corner number; accuracy is on a 128-image set. See `docs/FINDINGS.md`, section 6.
