# rtl/
Put here: the Verilog of the f4 unit, its testbench, and the script that runs all 65,536 inputs and writes
`results/raw/rtl_out.hex` (one `iiii oooo` hex pair per line). Then: `python3 golden/f4_golden.py --compare results/raw/rtl_out.hex`.
