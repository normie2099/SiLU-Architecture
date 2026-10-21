# One entry point for everything that can be rebuilt from files in this repo.
# Targets that need your tools (gem5, Quartus, Vivado) are documented in docs/REPRODUCE.md.
PY ?= python3

.PHONY: all golden host-test torch-check inputs tables latency stats clean

all: golden host-test torch-check

golden:            ## error analysis of f4, paper self-check, regenerate the 65,536 test vectors
	cd golden && $(PY) f4_golden.py

host-test:         ## native C kernels vs golden vectors / exact SiLU
	cd bench && for v in 3 4 1; do gcc -O2 -DVARIANT=$$v host_test.c -lm -o /tmp/host_test_$$v && /tmp/host_test_$$v; done

torch-check:       ## PyTorch emulator vs golden vectors (needs torch)
	$(PY) model/check_f4_torch.py

inputs:            ## regenerate benchmark inputs (uniform over [-4,4)) and the lookup table
	$(PY) bench/gen_inputs.py --n 1024 && $(PY) bench/gen_table.py

latency:           ## synthesis delay -> gem5 latency table. Set DELAY_NS or REPORT.
	$(PY) scripts/synth2gem5.py $(if $(REPORT),--report $(REPORT),--delay-ns $(DELAY_NS)) --clocks 50 100 200 500 1000 --pipeline-stages 1 2 3

stats:             ## gem5 stats.txt files -> CSV
	$(PY) scripts/parse_gem5_stats.py results/raw/*/stats.txt --out results/tables/runs.csv

clean:
	rm -rf gem5/generated results/tables/runs.csv
