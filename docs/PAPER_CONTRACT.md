# Paper contract (fill in, then do not change after results exist)

Agree this with the advisor before running the final experiments. It stops the goalposts from moving.

**Claim to test.** On scalar RISC-V cores with no floating-point unit, a multiplier-free fixed-point SiLU
instruction costs ___ LUTs and makes SiLU ___ times faster than the best software version, and changes
YOLOv8n mAP50-95 by ___ points without retraining.

**Baselines (all must appear):** expf soft-float, expf hardware FPU, integer f4, 257-entry table with
interpolation, custom instruction.

**Fixed settings:** compiler flags ___; inputs: uniform over [-4, 4) and real YOLOv8n activations;
number format Q6.10; clock(s) ___; gem5 CPU models MinorCPU and O3CPU.

**Acceptable accuracy loss (decide before looking):** YOLOv8n mAP50-95 drop of at most ___ points;
LLM perplexity increase of at most ___ %.

**Authors and order:** ___

**Target venue:** ISVLSI 2027 (primary), GLSVLSI 2027 (backup). Check dates once published.

**Signed off by / date:** ___
