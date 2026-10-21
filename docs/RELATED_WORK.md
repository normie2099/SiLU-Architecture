# Related work notes

Status: second-hand summaries from the papers' own pages/abstracts, checked 2026-10-15. Read each paper in
full and replace these with your own five-line notes (what they built, how they measured, headline numbers).

| Work | What it is | Why it matters to us | Link |
| --- | --- | --- | --- |
| Spagnolo, Perri, Corsonello, ISVLSI 2025 | f4: multiplier-free piecewise-linear SiLU, 16-bit fixed point; Artix-7 76 LUTs, 4 ns; ST 28 nm FD-SOI numbers | The approximation we implement; our baseline to check | doi 10.1109/ISVLSI65124.2025.11130259 |
| PACE, ISVLSI 2025 (ETH Zurich, Bologna) | Piecewise-polynomial unit in each FPU of an RISC-V cluster, exposed as instructions + CSRs; SiLU/GELU/exp; MobileNetV3, ViT, OpenLLaMA 3B | Closest instruction-level prior art (uses FMA/polynomials, not multiplier-free) | https://pulp-platform.org/docs/isvlsi2025/Presentation_Prasad.pdf |
| Flex-SFU (Huawei, 2023) | Non-uniform piecewise-linear unit in a RISC-V vector unit, 3 instructions; ~600 ImageNet models | Prior art for instructions + large model sweeps; uses the VPU's multiply-add | https://arxiv.org/pdf/2305.04546 |
| GRAU (2026 preprint) | Power-of-two-slope piecewise-linear activation unit, shifts/adds only; FPGA; includes SiLU | Same multiplier-free idea as f4 with more segments; no core integration | https://arxiv.org/pdf/2602.22352 |
| VEXP (ETH Zurich, Bologna, 2025) | `EXP` instruction in an FPU of a RISC-V cluster; softmax; GPT-2/ViT end to end | Template for how to evaluate an instruction for a nonlinear function | https://arxiv.org/html/2504.11227v1 |
| Uni-SFU (Aug 2026 preprint) | Mixed-degree piecewise polynomials, six activations, 22 nm; 700+ vision models, LLaMA-2 7B | Sets the reviewers' expectation for model coverage | https://www.alphaxiv.org/abs/2608.11577.md |
| FPGA RISC-V extensions (2025 preprint) | Vector conv/GEMM/ReLU-family + GELU instructions via lookup tables on PYNQ-Z2 | Shows a small-core FPGA path with ARM baseline; no SiLU | https://arxiv.org/html/2511.06955v1 |
| Karki et al. (DPU YOLO) | Xilinx DPU lacks SiLU; ReLU swap confounded with a layer-structure change | Motivation: edge stacks drop SiLU | refs/karki_dpu_yolo.pdf |
| EfficientNet-Lite (TF blog, 2020) | Replaced swish with ReLU6; 8-bit post-training accuracy 46% -> 74.4% | Motivation, and a warning: SiLU's wide output range hurts int8 | https://blog.tensorflow.org/2020/03/higher-accuracy-on-vision-models-with-efficientnet-lite.html |

## The gap we claim (and its limits)
No instruction-level work found uses an integer-only multiplier-free SiLU inside an FPU-less scalar core with
measured cycles on hardware and a gem5 in-order/out-of-order study. This must be re-checked the week before
submission; the area moves monthly. We never claim "first SiLU instruction".
