# Findings so far

Each line has a source: the command that reproduces it. All numbers are from `golden/f4_golden.py`
(real arithmetic, 1,000,001-point grid) or the C host test, run on 2026-10-21.

## The f4 approximation

| Fact | Value | Reproduce |
| --- | --- | --- |
| Max error over [-3, 3] | 0.0452 (at x = +-3) | `make golden`, section 1 |
| Max error over (-4, 4) and (-5, 5) | 0.0719 (at x = +-4) | same |
| Mean absolute error over (-4, 4) | 0.0279 | same |
| Mean absolute error over (-5, 5) | 0.0324 | same |
| Paper (Table III) mean error | 0.0278 | the paper |
| Our 4,096-random-input test, (-5, 5) | MAE 0.0324 (200 draws: 0.0318 to 0.0334) | `make golden`, section 5 |
| f4(0) | -0.0375 (SiLU(0) = 0) | section 3 |
| Jumps between segments | 0.125 at x = +-4, 0.025 at x = +-1 | section 2 |
| Fixed point vs real formula | at most 1 LSB, 4.8% of inputs differ | section 4 |
| Existing 1,000-point sweep, raw -5000..4990 step 10 | real -4.883..+4.873; 81.9% of inputs inside [-4, 4] | section 6 |

Reading: the paper's mean error equals our result over (-4, 4), not over (-5, 5). Do not claim to
reproduce it on (-5, 5). Always state the range.

Symmetry: f4(x) - x/2 is an even function (checked to 1e-15), so SiLU(x) = x/2 + h(|x|) holds exactly for f4;
the design space can search h on x >= 0 only.

## Software baselines (native C, Q6.10, inputs on a grid over [-4, 4))

| Kernel | Max error vs exact SiLU | Mean error | Notes |
| --- | --- | --- | --- |
| expf (float) | 0.00049 | 0.00024 | rounding to Q6.10 only |
| 257-entry table + interpolation | 0.00139 | 0.00045 | 514 bytes; one multiply per call |
| f4 integer C | matches f4 (0 mismatches on all 65,536) | 0.0279 over the range | no multiply, no memory |

Reading: both the table and expf are far more accurate than f4 on [-4, 4). If the project claims an
accuracy-versus-cost story, the table is the bar f4 has to beat on cost (cycles, energy, memory), and the
model-level accuracy test (YOLOv8n mAP) must show that f4's error does not matter in practice.

## Quartus (from `quartus/reports/`)

Cyclone IV, slow 1200 mV 85 C: data delay 8.058 ns, slack +1.876 ns at 10 ns constraint, Fmax about 123 MHz.
The SDC file has no clock uncertainty (add `derive_clock_uncertainty`).
Latency in cycles (`make latency DELAY_NS=8.058`): 1 at <= 123 MHz, 2 at 200 MHz, 5 at 500 MHz, 9 at 1 GHz.
