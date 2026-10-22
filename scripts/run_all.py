#!/usr/bin/env python3
"""
run_all.py - the experiment grid. Builds the five benchmark binaries, then runs every configuration through
scripts/run_gem5.py (which keeps stats, config, stdout and a manifest for each run).

  E1/E2/E3/E4  every variant x {in-order, out-of-order} x core clock {100,200,500,1000} MHz.
               SiLU unit either pipelined (N stages) or multi-cycle (ceil(delay/period)); delay 8.058 ns from Quartus
  E4           the same loop with shuffled inputs (data-dependent branches)
  E7           loop-alignment sensitivity (front-end effects on tiny loops)
  E5           3x3 conv layer + activation (Amdahl)
  E2b          latency isolation: custom instruction only, 1 GHz, latency 1..9 cycles, pipelined / not pipelined
Usage: python3 scripts/run_all.py --gem5 ~/gem5 [--cc "python3 -m ziglang cc -target riscv64-linux-musl -mcpu=baseline_rv64"]
"""
import argparse, concurrent.futures as cf, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CPUS = ["RiscvMinorCPU", "RiscvO3CPU"]
VARIANTS = [0, 1, 3, 4, 5]
CLOCKS = [100, 200, 500, 1000]
ALIGNS = [0, 8, 16, 32]          # E7: loop alignment sensitivity (headline builds use 64)
LATS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16]


def build(cc, outdir):
    outdir.mkdir(exist_ok=True)
    for src, pre, extra in (("bench_main.c", "bench", []), ("bench_main.c", "shuf", ["-DSHUFFLE=1"]),
                            ("conv_main.c", "conv", [])):
        for v in VARIANTS:
            cmd = cc.split() + ["-O2", "-static", "-falign-loops=64", f"-DVARIANT={v}", *extra, str(ROOT / "bench" / src),
                                "-o", str(outdir / f"{pre}_v{v}.elf"), "-lm"]
            subprocess.run(cmd, check=True, cwd=ROOT / "bench")
    for al in ALIGNS:                    # E7 conv binaries
        for v in VARIANTS:
            fl = [f"-falign-loops={al}"] if al else []
            cmd = cc.split() + ["-O2", "-static", *fl, f"-DVARIANT={v}", str(ROOT / "bench/conv_main.c"),
                                "-o", str(outdir / f"convalign{al}_v{v}.elf"), "-lm"]
            subprocess.run(cmd, check=True, cwd=ROOT / "bench")
    for al in ALIGNS:                    # E7 binaries: identical source, different loop alignment
        for v in VARIANTS:
            fl = [f"-falign-loops={al}"] if al else []
            cmd = cc.split() + ["-O2", "-static", *fl, f"-DVARIANT={v}", str(ROOT / "bench/bench_main.c"),
                                "-o", str(outdir / f"align{al}_v{v}.elf"), "-lm"]
            subprocess.run(cmd, check=True, cwd=ROOT / "bench")


def one(args):
    return subprocess.run(args, capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gem5", required=True)
    ap.add_argument("--cc", default="python3 -m ziglang cc -target riscv64-linux-musl -mcpu=baseline_rv64")
    ap.add_argument("--elf-dir", default=str(ROOT / "build"))
    ap.add_argument("--out", default=str(ROOT / "results/raw"))
    ap.add_argument("--jobs", type=int, default=2)
    ap.add_argument("--delay-ns", type=float, default=8.058)
    a = ap.parse_args()
    elf = pathlib.Path(a.elf_dir)
    build(a.cc, elf)
    base = [sys.executable, str(ROOT / "scripts/run_gem5.py"), "--gem5", a.gem5, "--out", a.out,
            "--delay-ns", str(a.delay_ns)]
    jobs = []
    for cpu in CPUS:
        for v in VARIANTS:
            for mhz in CLOCKS:
                for hw in (["pipelined", "multicycle"] if v == 5 else ["pipelined"]):
                    jobs.append(base + ["--cpu", cpu, "--variant", str(v), "--elf", str(elf / f"bench_v{v}.elf"),
                                        "--clock-mhz", str(mhz), "--hw", hw])
        for lat in LATS:
            for hw in ("pipelined", "multicycle"):
                jobs.append(base + ["--cpu", cpu, "--variant", "5", "--elf", str(elf / "bench_v5.elf"),
                                    "--clock-mhz", "1000", "--lat", str(lat), "--hw", hw, "--tag", "_E2b"])
    for cpu in CPUS:                      # E5: convolution layer + activation (Amdahl)
        for v in VARIANTS:
            for mhz in CLOCKS:
                for hw in (["pipelined", "multicycle"] if v == 5 else ["pipelined"]):
                    jobs.append(base + ["--cpu", cpu, "--variant", str(v), "--elf", str(elf / f"conv_v{v}.elf"),
                                        "--clock-mhz", str(mhz), "--hw", hw, "--bench", "conv"])
    for cpu in CPUS:                      # E4: same loop, shuffled inputs (data-dependent branches)
        for v in VARIANTS:
            for mhz in (100, 500, 1000):
                for hw in (["pipelined", "multicycle"] if v == 5 else ["pipelined"]):
                    jobs.append(base + ["--cpu", cpu, "--variant", str(v), "--elf", str(elf / f"shuf_v{v}.elf"),
                                        "--clock-mhz", str(mhz), "--hw", hw, "--bench", "loopshuf"])
    for cpu in CPUS:                      # E7: does the result depend on where the loop sits in memory?
        for al in ALIGNS:
            for v in VARIANTS:
                jobs.append(base + ["--cpu", cpu, "--variant", str(v), "--elf", str(elf / f"align{al}_v{v}.elf"),
                                    "--clock-mhz", "100", "--hw", "pipelined", "--bench", f"loopalign{al}"])
    for cpu in CPUS:
        for al in ALIGNS:
            for v in VARIANTS:
                jobs.append(base + ["--cpu", cpu, "--variant", str(v), "--elf", str(elf / f"convalign{al}_v{v}.elf"),
                                    "--clock-mhz", "500", "--hw", "pipelined", "--bench", f"convalign{al}"])
    bad = 0
    with cf.ThreadPoolExecutor(a.jobs) as ex:
        for r in ex.map(one, jobs):
            print(r.stdout.strip().splitlines()[0] if r.stdout.strip() else r.stderr[-300:])
            bad += r.returncode != 0
    print(f"{len(jobs)} runs, {bad} failed")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
