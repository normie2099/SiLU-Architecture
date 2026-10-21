# gem5 notes (verify against YOUR gem5 version before relying on any of this)

These are working notes, not tested here: the assistant's workspace has no gem5. Where a statement depends on
the gem5 version, it says so.

## What must be in the repo
- the diff of every file you changed to add the instruction (`git diff > gem5/silu_instruction.patch`);
- the exact build command (`scons build/RISCV/gem5.opt ...`);
- the run script(s) with CPU model, clock, caches and memory settings;
- the stats output of every run (`m5out/stats.txt`).

## MinorCPU (in-order)
The custom operation's latency comes from its functional-unit description in the Minor config
(operation class and FU latency). Set it from `gem5/generated/silu_lat_*.py` (written by
`scripts/synth2gem5.py`), not by hand.

## O3CPU (out-of-order)
O3 needs the instruction's operation class to map to a functional unit in its FU pool, with a latency and (if
pipelined) an issue latency. If the new instruction's op class is not served by any unit in the pool, O3 will
not execute it as intended. Check three things after every change:
1. the op class assigned in `decoder.isa` appears in the FU pool you run with;
2. dump the config (`m5out/config.ini`) and read the latency that the instruction actually gets;
3. a one-instruction test program shows the expected latency in the stats.
The exact class and file names depend on the gem5 version.

## Measuring only the loop
Either wrap the loop with m5 `reset_stats` / `dump_stats` (build the gem5 `m5` library for RISC-V and call it
from the benchmark) and use the last stats section (`scripts/parse_gem5_stats.py` does), or run an empty-loop
version and subtract. State which one you used.

## Things to report with every table
CPU model, issue width, ROB size, clock, caches (sizes) or none, memory latency, compile flags, gem5 version.
