# gem5: the custom instruction and its benchmarks

| File | What it is |
| --- | --- |
| `silu_instruction.patch` | Diff for `src/arch/riscv/isa/decoder.isa` (gem5 v23.0.0.1). Adds `custom_silu`: R-type, opcode `0x0B` (custom-0), funct3 `0`, funct7 `0`, `rd = f4(rs1)` in Q6.10. Operation class `IntAluOp`. |
| `benchmark.c` | First prototype: float `expf` loop vs custom-instruction loop, cycle counts read with `rdcycle`. |
| `test_custom.c` | 11-vector parity test of the instruction against known f4 outputs. |

Apply and build:
```
cd <gem5 checkout> && git apply <this repo>/gem5/silu_instruction.patch
scons build/RISCV/gem5.opt -j8
```

Compile a benchmark (state the flags with every result; this is what the prototype used):
```
riscv64-linux-gnu-gcc -O2 -static -march=rv64gc -mabi=lp64d benchmark.c -o benchmark.elf -lm
```
Run with the in-order and out-of-order models (list the exact CPU type names with `--list-cpu-types` for your gem5 version):
```
build/RISCV/gem5.opt configs/example/se.py --cpu-type=MinorCPU --caches -c benchmark.elf
```

## How the instruction gets its latency
The instruction is decoded as `IntAluOp`, so on `MinorCPU` and `O3CPU` it takes whatever latency the integer ALU
functional unit has (1 cycle by default). That number is not derived from the hardware. The plan is to take the
critical-path delay from the Quartus report (`quartus/reports/`) and convert it with
`scripts/synth2gem5.py` (cycles = ceil(delay / clock period)), then give the instruction its own op class and
functional-unit latency in the CPU config.

## Notes
- O3CPU only executes an op class that exists in its functional-unit pool. After any change, dump
  `m5out/config.ini`, read the latency the instruction really gets, and check with a one-instruction test.
- Measure only the loop: use m5 `reset_stats` / `dump_stats` around it, or subtract an empty-loop run. Say which.
- Report with every table: CPU model, issue width, ROB size, clock, cache sizes, memory latency, compile flags,
  gem5 version.
