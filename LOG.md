# Lab log

Format: date, what was done, exact command, where the output is, what it means. Newest last. Failures
stay in the log.

## 2026-10-21 (evening) - repository created

**Built and tested (in the assistant's workspace, not yet on the team's machines):**

| Item | Command | Result |
| --- | --- | --- |
| Golden model + vectors | `make golden` | Runs; wrote `golden/f4_vectors.hex` (65,536 lines) |
| Integer C f4 vs golden | `make host-test` (variant 3) | 65,536 inputs, 0 mismatches |
| Lookup-table kernel vs exact | `make host-test` (variant 4) | max error 0.00139, mean 0.00045 over [-4,4) |
| expf kernel vs exact | `make host-test` (variant 1) | max error 0.00049, mean 0.00024 over [-4,4) |
| `synth2gem5.py` | `make latency DELAY_NS=8.058` | 8.058 ns = 1 cycle at 100 MHz, 2 at 200, 5 at 500, 9 at 1000 |

**Findings from the golden model (see `docs/FINDINGS.md`):**
- f4 maximum error is 0.0452 only over [-3, 3]; over (-4, 4) it is 0.0719, at x = +-4.
- The paper's mean error 0.0278 matches (-4, 4) in this model (0.0279), not (-5, 5) (0.0324).
- f4(0) = -0.0375 although SiLU(0) = 0. Jumps of 0.125 at +-4 and 0.025 at +-1.
- The 257-entry lookup table (514 bytes, linear interpolation) has about 60 times lower mean error than f4
  inside [-4, 4) (0.00045 vs 0.0279) and max error 0.0014. It uses one multiply per lookup, so it needs
  the M extension or a shift-add loop. This is a strong baseline; the paper must answer it.

**Not done / unverified:**
- RTL not yet checked against the vectors (team to do: Gate G1).
- gem5, Quartus, Verilog files not in the repo yet.
- Real YOLOv8n/COCO evaluation not run (no model weights or dataset in the assistant's workspace); `model/eval_yolo.py` is not written yet.

## 2026-10-21 (late) - PyTorch emulator tested

| Check | Command | Result |
| --- | --- | --- |
| Emulator vs golden vectors | `make torch-check` | 65,536 inputs, 0 mismatches |
| Strict mode vs exact SiLU on [-4, 4] | ad-hoc, torch 2.14.1 | mean error 0.0279, max 0.0719 (matches the golden model) |
| Strict mode beyond the 16-bit range | ad-hoc | x = 40 and 100 both give 31.999: the Q6.10 input clips at +-32. `tails` mode returns x exactly (40, 100) |
| Swap on a toy model with a shared class-level SiLU (Ultralytics pattern) | ad-hoc | 4 activations expected, 4 swapped, 4 calls per forward pass, no nn.SiLU left |

Meaning: the emulator is bit-exact with the golden model. `strict` mode models the 16-bit hardware; `tails`
models a wider register where large inputs pass through. LLM gate inputs can exceed 32, so which mode is used
changes the LLM result: report both.
