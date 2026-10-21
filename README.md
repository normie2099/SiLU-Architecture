# Multiplier-less SiLU custom instruction for RISC-V

Computer Architecture (BAEVD202) course project, VIT Vellore.

**Question.** What does a one-cycle, multiplier-free SiLU instruction change in the processor performance
equation (instruction count x CPI x clock period), on an in-order and an out-of-order RISC-V core, and how much
of that survives at whole-model level (Amdahl's law)?

SiLU(x) = x * sigmoid(x) is the activation in YOLOv8 and many other networks. The instruction implements the
six-segment piecewise-linear approximation f4 of Spagnolo, Perri and Corsonello (ISVLSI 2025) in 16-bit Q6.10
fixed point, using only shifts, adds and comparators. See `docs/SYLLABUS_MAP.md` for how the project maps to the
course and which experiments are planned.

## Layout
```
golden/    f4_golden.py + f4_vectors.hex: reference model, error analysis, 65,536 test vectors
rtl/       silu.v (combinational unit), silu_timing.v (registered wrapper), silu_tb.v (exhaustive testbench)
quartus/   timing.sdc, silu.qsf, reports/ (timing, fitter, mapper, power summaries)
gem5/      silu_instruction.patch (adds the instruction), benchmark.c, test_custom.c, build/run notes
bench/     C kernels: expf, integer f4, lookup table, custom instruction; host test
model/     PyTorch bit-exact f4 and the tools to swap it into a model
scripts/   synth2gem5.py (synthesis delay -> gem5 latency), parse_gem5_stats.py (gem5 stats -> CSV)
docs/      SYLLABUS_MAP.md, FINDINGS.md (measured facts), REPRODUCE.md (step by step)
```

## Quick start
```
make golden host-test           # numpy + gcc only
pip install torch               # then:
make torch-check                # PyTorch emulator == golden on all 65,536 inputs
```

## Results so far
- f4 error: max 0.0452 on [-3, 3], 0.0719 at x = +-4; mean 0.0279 on (-4, 4) (`docs/FINDINGS.md`).
- Quartus (Cyclone IV E): 8.058 ns critical path, Fmax about 123 MHz, 191 logic elements, no multipliers, no memory.
- gem5: custom instruction decodes and runs (`gem5/test_custom.c`). The decoder logic matches the golden model on all 65,536 inputs. First speed-up measurement is in `gem5/benchmark.c`.

## Known issues and next steps
1. **Latency is not yet tied to the hardware.** The instruction runs as a plain integer-ALU op in gem5; it should
   take the latency derived from the Quartus delay (`scripts/synth2gem5.py`).
2. **Benchmark fairness.** `gem5/benchmark.c` sweeps raw -5000..+4990 (about 18% of inputs fall outside [-4, 4])
   and both loops contain `volatile` stores. Next version: inputs in [-4, 4), identical loop overhead, stats
   reset around the loop only, same `-O2` flags, plus integer-f4 and table baselines.
3. **RTL vs reference.** Run `rtl/silu_tb.v` and compare with `golden/f4_vectors.hex`
   (`python3 golden/f4_golden.py --compare results/raw/rtl_out.hex`); the result is not yet recorded.
4. **Timing constraints.** Add `derive_clock_uncertainty` to `quartus/timing.sdc`. The power estimate in
   `quartus/reports/` has low confidence (no simulation toggle data).
5. In-order vs out-of-order, branch-predictor and Amdahl experiments: see `docs/SYLLABUS_MAP.md`.
