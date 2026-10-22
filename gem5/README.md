# gem5: the custom instruction

| File | What it is |
| --- | --- |
| `silu_instruction.patch` | Diff for `src/arch/riscv/isa/decoder.isa` (gem5 v23.0.0.1). Adds `custom_silu`: R-type, opcode `0x0B` (custom-0), funct3 `0`, funct7 `0`, `rd = f4(rs1)` in Q6.10, operation class `SimdMiscOp`. |
| `configs/silu_se.py` | Wrapper around gem5's `se.py`. Gives `SimdMisc` its own functional unit with a chosen latency, for the in-order (`RiscvMinorCPU`) and out-of-order (`RiscvO3CPU`) models. |
| `benchmark.c`, `test_custom.c` | The first prototype benchmark and the 11-vector parity test (kept for history; the experiments use `bench/bench_main.c`). |

## Why `SimdMiscOp`
gem5 gives an instruction its latency from its operation class. With `IntAluOp` the SiLU would share the integer
ALU (3 cycles by default on `MinorCPU`, 1 on `O3CPU`) and its latency could not be set from synthesis. RISC-V in
gem5 v23 never uses the SIMD operation classes, so `SimdMisc` is effectively free: `silu_se.py` removes it from the
shared SIMD/float units and adds one dedicated unit. This needs no change to gem5's C++ beyond the decoder.

## Build
```
git apply gem5/silu_instruction.patch          # in the gem5 checkout
scons build/RISCV/gem5.opt -j8                 # Python 3.11 and SCons 4.4 work; Python 3.13 does not
```
(If the link step is killed for lack of memory, relink with `-fuse-ld=lld -Wl,--strip-debug`.)

## Run one experiment
```
python3 scripts/run_gem5.py --gem5 ~/gem5 --cpu RiscvO3CPU --variant 5 --elf build/bench_v5.elf \
        --clock-mhz 500 --hw pipelined          # latency comes from the 8.058 ns Quartus delay
```
or the whole grid: `make runs`. Every run directory keeps `stats.txt`, `config.ini`, stdout, the exact command, the
MD5 of the ELF and of gem5.opt (`manifest.json`).

## Two SiLU hardware options modelled
- **pipelined**: N register stages (N = fewest with `8.058/N + 0.3 ns <= period`), latency N cycles, a new SiLU can issue every cycle.
- **multicycle**: the 8.058 ns logic left unregistered, latency `ceil(8.058 ns / period)`, unit busy for the whole latency.
The 0.3 ns per-stage register overhead is an assumption.

## Measuring only the loop
`bench/bench_main.c` calls gem5's `reset_stats` before and `dump_stats` after the timed loop (magic instruction
opcode `0x7b`, funct7 `0x40` / `0x41`), so the first statistics block of `stats.txt` covers exactly the loop.
`scripts/collect_runs.py` reads that block. Note `simInsts` is not reset by gem5; use `commitStats0.numInsts`.
