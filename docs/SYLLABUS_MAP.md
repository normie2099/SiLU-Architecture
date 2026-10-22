# Link to the course (BAEVD202 Computer Architecture)

## Core idea
The project is one controlled experiment on the **processor performance equation**:

    execution time = instruction count x CPI x clock period

A multiplier-free SiLU instruction attacks all three terms at once, and the project measures each one:

- **Instruction count**: a software SiLU takes dozens of instructions (`expf`, divide, or a branchy integer
  version). The custom instruction is one.
- **CPI**: depends on the instruction's latency and on whether the pipeline can hide it (in-order vs out-of-order).
- **Clock period**: the instruction's logic delay (8.058 ns on Cyclone IV, from Quartus) decides how many cycles
  it needs at a given clock, so a faster clock can make the instruction slower in cycles.

## Mapping

| Module | Topic | Where it appears | Experiment |
| --- | --- | --- | --- |
| 1 | CPI, IPC, speedup, iron law | gem5 `stats.txt`: instructions, cycles, CPI per variant | E1 |
| 1 | Amdahl's law | Fraction of a model's runtime spent in the activation bounds the whole-model speedup | E5 |
| 1 | ISA design | R-type encoding in custom-0 space, `rd = f(rs1)`, 16-bit Q6.10 operand, `rs2` unused | `gem5/`, `bench/silu_insn.h` |
| 1 | Pipeline hazards | A multi-cycle functional unit stalls dependent instructions (data hazard) and blocks the unit if unpipelined (structural hazard) | E2 |
| 3 | In-order vs out-of-order | Same binaries on `MinorCPU` and `O3CPU`: does out-of-order hide the latency? | E3 |
| 3 | Branch prediction | The piecewise f4 in software is a chain of compares and branches; the custom instruction removes them | E4 |
| 2 | Cache (optional) | A 514-byte lookup table vs the instruction as L1D size shrinks | E6 |

Not covered: Module 4 (parallel and distributed), virtual memory, VLIW.

## Experiments (all run; tables in `results/tables/summary.md`, figures in `results/figures/`)

| ID | Question | Method | Where |
| --- | --- | --- | --- |
| E1 | How much do instruction count, CPI and cycles drop? | Five variants (loop only, float `expf`, integer f4, table, custom instruction), same inputs and flags, gem5 stats | `t1_variants.csv`, fig 1 |
| E2 | What does the instruction really cost at a given clock? | Latency from the 8.058 ns Quartus delay: pipelined (N stages) or multi-cycle, clocks 100-1000 MHz | `t2_clock.csv`, fig 3 |
| E2b | Which latencies can each core hide? | Custom instruction alone, latency 1-16 cycles, pipelined vs not | `t3_latency.csv`, fig 2 |
| E3 | In-order vs out-of-order | E1, E2 on `RiscvMinorCPU` and `RiscvO3CPU` | all tables |
| E4 | Branch behaviour of software f4 | Same loop with sorted vs shuffled inputs, branch-predictor statistics | `t4_branches.csv`, fig 6 |
| E5 | Whole-model effect (Amdahl) | Conv layer in gem5; YOLOv8n MAC and activation counts; SiLU swapped into YOLOv8n and mAP measured | `t5`, `t6`, `t7`, figs 4-5 |
| E7 | How much is code placement? | Same source at five loop alignments | `t8`, `t9` |

Input range for the loop experiments: x in [-4, 4), the range the approximation covers. In YOLOv8n 8.8% of
activation inputs lie outside it (fig 5), where SiLU is 0 or x.
