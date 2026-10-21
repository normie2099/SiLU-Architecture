# Hard questions and the evidence for each answer

Fill the "Evidence" column with a file in this repo. An answer without evidence is a guess; do not give it.

| Question | Honest answer (draft) | Evidence (file) |
| --- | --- | --- |
| Why a custom instruction for one activation? | Depends on Amdahl: the activation share p of a layer. Report p measured, not assumed. | results/ (Amdahl run) |
| Why is the speedup over expf meaningful? | It is not the headline. The headline is against the best software version (integer f4, table). | results/tables/runs.csv |
| A 257-entry table is ~60x more accurate. Why f4? | The table needs 514 bytes of memory and a multiply per lookup; f4 needs neither. Whether that matters is the cycles/energy/area comparison. | docs/FINDINGS.md, results |
| How are synthesis and simulation connected? | `scripts/synth2gem5.py`: cycles = ceil(delay / clock period). 8.058 ns is 1 cycle only up to ~123 MHz on Cyclone IV. | results/raw/latency_table.json |
| Why [-4, 4]? | SiLU is near 0 or near x outside it; the error beyond the cutoff is c*sigmoid(-c): 0.072 at 4, 0.015 at 6, 0.003 at 8. Real activation histograms decide how much the tails matter. | model histograms (to add) |
| Does it help a whole model? | Measure: YOLOv8n mAP50-95 with f4 vs exact SiLU, no retraining, and the activation share of runtime. | results (to add) |
| Is gem5 right? | Only trust it after comparing with a real core or RTL cycle counts; report the gap. | results (to add) |
| Why does out-of-order change the result? | Test: IPC, branch mispredictions and ROB size for software f4 (data-dependent branches) vs the instruction (none). Do not assume the direction. | results (to add) |
| How is this different from PACE, Flex-SFU, GRAU? | See docs/RELATED_WORK.md; they use FPUs, vector units or are standalone; we target an integer-only scalar core. Re-check before submission. | docs/RELATED_WORK.md |
| What if f4's error hurts the model? | Report it. Then bias correction, then a short fine-tune with f4 in the forward pass. | results (to add) |
| Does the 16-bit format clip real activations? | `F4.saturated` counts inputs with |x| >= 32; report it per layer. | results (to add) |
