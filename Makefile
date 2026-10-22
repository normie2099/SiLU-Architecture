# One entry point for everything that can be rebuilt from files in this repo.
# gem5 / compiler / Quartus setup is described in docs/REPRODUCE.md.
PY ?= python3
GEM5 ?= $(HOME)/gem5

.PHONY: all golden host-test torch-check inputs rtl-check runs collect results yolo clean

all: golden host-test torch-check

golden:            ## error analysis of f4, check against the paper, regenerate the 65,536 test vectors
	cd golden && $(PY) f4_golden.py

host-test:         ## native C kernels vs golden vectors / exact SiLU
	cd bench && for v in 3 4 1; do gcc -O2 -DVARIANT=$$v host_test.c -lm -o /tmp/host_test_$$v && /tmp/host_test_$$v; done

torch-check:       ## PyTorch emulator vs golden vectors (needs torch)
	$(PY) model/check_f4_torch.py

inputs:            ## regenerate benchmark inputs (uniform over [-4,4)) and the lookup table
	$(PY) bench/gen_inputs.py --n 1024 && $(PY) bench/gen_table.py

rtl-check:         ## Verilog vs golden on all 65,536 inputs (needs Icarus Verilog)
	mkdir -p results/raw/rtl && cd results/raw/rtl && iverilog -g2012 -o /tmp/silu_tb.vvp ../../../rtl/silu.v ../../../rtl/silu_tb.v && vvp /tmp/silu_tb.vvp
	$(PY) golden/f4_golden.py --compare results/raw/rtl/rtl_out.hex

runs:              ## all gem5 experiments (builds the benchmarks, runs ~250 simulations) -> results/raw/
	$(PY) scripts/run_all.py --gem5 $(GEM5) && sh scripts/pack_runs.sh

collect:           ## results/raw/*/ -> results/tables/runs.csv
	$(PY) scripts/collect_runs.py

results: collect   ## runs.csv + YOLO json -> every table and figure
	$(PY) scripts/make_results.py

yolo:              ## swap SiLU in YOLOv8n and measure mAP (needs torch, ultralytics, yolov8n.pt, coco128/)
	$(PY) model/count_model.py yolov8n.pt results/raw/yolo/model_counts.json
	$(PY) model/eval_yolo.py --weights yolov8n.pt --data-dir coco128 --out results/raw/yolo

clean:
	rm -rf build results/tables results/figures
