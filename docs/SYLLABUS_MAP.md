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

## Experiments

| ID | Question | Method | Status |
| --- | --- | --- | --- |
| E1 | How much do instruction count, CPI and cycles drop? | Four variants (float `expf`, integer f4, table, custom instruction), same inputs and flags, gem5 stats | prototype in `gem5/benchmark.c`; needs the other variants and fair flags |
| E2 | What latency does the instruction really have, and what does it cost at higher clocks? | `scripts/synth2gem5.py`: 8.058 ns -> 1 cycle at <=123 MHz, 2 at 200 MHz, 5 at 500 MHz, 9 at 1 GHz | script ready; needs the op-class hookup in gem5 |
| E3 | In-order vs out-of-order | E1 and E2 on `MinorCPU` and `O3CPU` | to do |
| E4 | Branch behaviour of software f4 | gem5 branch-predictor stats for the integer f4 variant vs the instruction | to do |
| E5 | Whole-model effect (Amdahl) | Swap SiLU in a real network (`model/`), measure the activation share, apply Amdahl | emulator done; model run to do |
| E6 | Table vs instruction under cache pressure | Sweep L1D size | optional |

Input range for all experiments: x in [-4, 4), the only range where the approximation is used (outside it SiLU
is 0 or x).
