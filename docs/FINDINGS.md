# Findings

Every number below is produced by a command in `docs/REPRODUCE.md` from files in `results/raw/`; the full tables
are in `results/tables/summary.md`. Cycle counts are for 1,024 inputs x 20 passes and are given per activation.

## 1. The approximation (f4, Q6.10)
| Fact | Value |
| --- | --- |
| Max error over [-3, 3] | 0.0452 |
| Max error at x = +-4 (over (-4,4) and (-5,5)) | 0.0719 |
| Mean absolute error over (-4, 4) | 0.0279 (the paper's 0.0278); over (-5, 5): 0.0324 |
| f4(0) | -0.0375 (SiLU(0) = 0) |
| Jumps between segments | 0.125 at x = +-4, 0.025 at x = +-1 |
| Fixed point vs real formula | at most 1 LSB, 4.8% of inputs differ |
| Software baselines (native C, [-4,4)) | `expf`: max 0.00049, mean 0.00024. 257-entry table + interpolation (514 bytes): max 0.00139, mean 0.00045 (about 60x lower mean error than f4) |

## 2. Correctness gates (all 65,536 16-bit inputs, 0 mismatches against `golden/f4_vectors.hex`)
- Verilog `rtl/silu.v` (Icarus Verilog), the custom instruction executed inside gem5, the integer C version inside gem5, the C kernels and the PyTorch emulator.
- Raw outputs: `results/raw/rtl/`, `results/raw/exhaustive/`, `results/raw/verification_summary.txt`.

## 3. Hardware cost (Quartus Prime 23.1std, Cyclone IV E EP4CE115F29C7)
Data delay 8.058 ns, setup slack +1.876 ns at 10 ns (slow 1200 mV 85 C), Fmax about 123 MHz, 191 logic elements, no
embedded multipliers, no memory bits. Power: 153 mW total but "low confidence" (no toggle data); not used. An FPGA delay, so
clocks above ~123 MHz extrapolate it to faster technology and are illustrative.

## 4. Processor-level results (gem5, 100 MHz row, latency 1; loops aligned to 64 B)
| Core | float expf | integer f4 | table | custom insn |
| --- | --- | --- | --- | --- |
| Instructions per activation (incl. 5 loop instructions) | 114 | 12.8 | 21.0 | 6.0 |
| In-order, cycles per activation | 169.8 | 16.6 | 21.0 | 7.0 |
| Out-of-order, cycles per activation | 36.8 | 3.8 | 5.0 | 1.0 |

- The instruction is 24x (in-order) / 36x (out-of-order) faster than `expf` and 2.4x / 3.7x faster than integer f4 on this loop. The out-of-order figure is front-end limited (one loop iteration per cycle).
- **Code placement matters.** With the same source, loop alignment moves the out-of-order custom-instruction loop between 1.0 and 4.0 cycles and integer f4 between 3.8 and 5.7 (`t8_alignment.csv`). Treat small-loop numbers as +-1 to 3 cycles.
- **Latency vs clock** (`t2`, `t3`). In-order: flat until the latency reaches 4 cycles, then +1 cycle per extra cycle of latency; at 1 GHz (12-stage pipelined or 9-cycle multi-cycle unit) the instruction is only 1.1-1.4x faster than integer f4. Out-of-order: a pipelined unit hides any latency up to 16 cycles (1.03 cycles per activation); an unpipelined unit exposes it completely (5 cycles at 500 MHz = as slow as integer f4; 9 cycles at 1 GHz = slower). The unit has to be pipelined for the out-of-order benefit.
- **Branch prediction** (`t4`, fig 6). With sorted inputs the software f4 is predictable. With shuffled inputs it mispredicts 0.41 branches per activation (32 per 1000 instructions), costing +3.4 cycles in-order and +5.4 out-of-order (3.8 -> 9.2); `expf` adds 0.44 mispredicts per activation. The custom instruction and the table have no data-dependent branches.

- **Cache** (`t10`, fig 7; shuffled loop, 500 MHz, no L2). Shrinking the L1 data cache from 64 kB to 512 B costs the table 35% in-order (21.0 -> 28.5 cycles) and 21% out-of-order (5.0 -> 6.1), and the custom instruction 8.0 -> 8.5 / 1.0 -> 1.5 cycles (its only loads are the inputs). The table only suffers once the cache is smaller than its working set (1 kB and up: <= 3% in-order); the instruction's advantage over the table is therefore not mainly a cache effect at this table size (514 bytes). A larger table (more segments or finer interpolation) would be affected sooner.

## 5. Model-level results (YOLOv8n, 640x640)
- The network has 4.37 GMAC and 13.9 M SiLU elements per image: 315 MACs per activation (57 SiLU modules, 64 convolutions).
- Swap check: 57 of 57 SiLU modules replaced, 0 left, 969 activation calls in the validation run (= 57 x 17 batches).
- 8.8% of activation inputs are outside [-4, 4] (fig 5).
- Accuracy on COCO128 (128 images, 929 instances; relative comparison only):

| Activation | mAP50 | mAP50-95 | delta vs exact |
| --- | --- | --- | --- |
| exact SiLU | 0.6024 | 0.4439 | - |
| exact SiLU with Q6.10 rounding | 0.5924 | 0.4374 | -0.0066 |
| f4 (16-bit strict) | 0.5991 | 0.4359 | -0.0081 |
| f4 (exact tails) | 0.6007 | 0.4359 | -0.0080 |
| 257-entry table | 0.5958 | 0.4373 | -0.0066 |

  Most of the loss comes from Q6.10 quantisation; f4's own approximation adds about 0.0015 mAP50-95, below the noise of a 128-image set.
- **Amdahl** (`t7`, fig 4; estimate from measured cycles per MAC and per activation at 500 MHz). With a scalar core the activation is a small part of the network, so replacing `expf` gives 1.09x (in-order) / 1.11x (out-of-order) whole-network speedup, and replacing integer f4 gives 1.01-1.02x. If the MACs get 16x faster (SIMD, accelerator) the numbers become 2.5x / 2.7x over `expf` and 1.1x / 1.3x over integer f4; at 64x, 6.6x / 8.0x and 1.4x / 2.3x. The instruction matters when the multiply-accumulate part is accelerated, not on a scalar core.

## 6. Limits of these results
- One activation loop and one scalar convolution layer, default cache hierarchy (64 kB L1D) except E6; the network-level numbers are an estimate scaled from them.
- Alignment sensitivity (section 4); conv-layer differences between the cheap variants are within noise, so network estimates use shuffled-loop costs.
- The in-order and out-of-order models use gem5's default configurations; the SiLU unit count is 1.
- 0.3 ns per pipeline stage is an assumption; the 8.058 ns delay is from a slow-corner FPGA.
- Compiler: clang (via Zig) with musl `expf`, not GCC/glibc; `-O2`, rv64gc, hard-float.
- COCO128 is a small set taken from COCO train2017; use it for comparing activations only.
