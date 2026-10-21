# Roadmap

The detailed, editable version lives in the project's roadmap document (shared separately). This file keeps
the dates and gates in the repo so they are version-controlled.

| Phase | Dates | Output | Gate |
| --- | --- | --- | --- |
| 0 Foundation + course submission | Oct 15-31 2026 | RTL verified; five software/hardware versions on MinorCPU; latency flow; MinorCPU vs O3CPU; YOLOv8n swap; report + slides | G1: RTL == golden on 65,536 inputs. G2: baselines decide the headline |
| 1 Design space | Nov 1-21 | Activation histograms; segment/cutoff Pareto front; two verified new designs | G3: a new design beats f4, or f4 stays |
| 2 Real core | Nov 15-Dec 20 | Instruction on an FPU-less RISC-V core on FPGA; measured cycles, area, power | G4 (Nov 25): runs on the board, else simulation only |
| 3 Architecture + accuracy | Dec 1-Jan 5 | Calibrated gem5; in-order vs out-of-order; Amdahl curve; COCO + LLM accuracy | G5 (Dec 27): accuracy within contract, else bias correction / fine-tune |
| 4 Writing | Jan 5-early Feb | Paper (6 pages), anonymous code, submission | G6 freeze Jan 5; G7 advisor review Jan 20 |

Target: ISVLSI 2027 (6-page IEEE paper); backup GLSVLSI 2027. Deadlines unpublished for 2027; the 2026 editions
were Feb 10 and Mar 16.

## What fits in the course deadline (Oct 31)
Phase 0 only. Phases 1-3 are presented as dated future work.
