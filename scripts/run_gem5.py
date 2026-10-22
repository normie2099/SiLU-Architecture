#!/usr/bin/env python3
"""
run_gem5.py - run one gem5 experiment and keep EVERYTHING: stats, config, stdout, command, versions.

One run = one directory  results/raw/<cpu>_v<variant>_<clock>MHz_lat<L>_<pipe|nopipe>/  containing
  stats.txt  config.ini  config.json  stdout.txt  stderr.txt  manifest.json (exact command, md5 of the ELF,
  gem5 binary, wall time, the SiLU latency and where it came from).
Nothing is typed by hand: the SiLU latency is computed here from the synthesis delay with the same rule as
scripts/synth2gem5.py (cycles = ceil(delay / period)) unless --lat is given explicitly.

Example:
  python3 scripts/run_gem5.py --gem5 ~/gem5 --cpu MinorCPU --variant 5 --clock-mhz 500 --delay-ns 8.058 \
      --elf elf/bench_v5.elf
"""
import argparse, hashlib, json, math, os, pathlib, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from synth2gem5 import min_stages

CPU_NAMES = {"MinorCPU": "MinorCPU", "O3CPU": "O3CPU"}   # resolved against --list-cpu-types by the caller


def md5(p):
    return hashlib.md5(pathlib.Path(p).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gem5", required=True, help="gem5 root (contains build/RISCV/gem5.opt)")
    ap.add_argument("--cpu", required=True, help="MinorCPU or the O3 CPU type name for this gem5 version")
    ap.add_argument("--variant", type=int, required=True)
    ap.add_argument("--elf", required=True)
    ap.add_argument("--clock-mhz", type=float, default=1000.0)
    ap.add_argument("--delay-ns", type=float, default=8.058, help="SiLU unit data delay from Quartus")
    ap.add_argument("--hw", choices=["pipelined", "multicycle"], default="pipelined",
                    help="pipelined: N register stages, latency N, one new SiLU per cycle (N from delay, clock and "
                         "--stage-overhead-ns). multicycle: unregistered logic, latency ceil(delay/period), "
                         "unit busy for the whole latency")
    ap.add_argument("--stage-overhead-ns", type=float, default=0.3, help="register overhead per pipeline stage (assumption)")
    ap.add_argument("--lat", type=int, help="override SiLU latency in cycles (E2b latency isolation)")
    ap.add_argument("--silu-units", type=int, default=1)
    ap.add_argument("--out", default="results/raw")
    ap.add_argument("--tag", default="")
    ap.add_argument("--bench", default="loop", help="loop (bench_main.c) or conv (conv_main.c); prefixes the run name")
    a = ap.parse_args()

    period = 1000.0 / a.clock_mhz
    if a.lat:
        lat, src = a.lat, "override --lat"
    elif a.hw == "multicycle":
        lat, src = max(1, math.ceil(a.delay_ns / period - 1e-9)), f"multicycle: ceil({a.delay_ns} ns / {period:.3f} ns)"
    else:
        lat = min_stages(a.delay_ns, a.clock_mhz, a.stage_overhead_ns)
        src = f"pipelined: fewest stages with {a.delay_ns}/N + {a.stage_overhead_ns} ns <= {period:.3f} ns"
    pipelined = a.hw == "pipelined"
    pipe = "pipe" if pipelined else "multi"
    name = ("" if a.bench == "loop" else a.bench + "_") + f"{a.cpu}_v{a.variant}_{int(a.clock_mhz)}MHz_lat{lat}_{pipe}{a.tag}"
    out = pathlib.Path(a.out).resolve() / name
    out.mkdir(parents=True, exist_ok=True)

    gem5 = pathlib.Path(a.gem5).resolve()
    cfg = pathlib.Path(__file__).resolve().parent.parent / "gem5" / "configs" / "silu_se.py"
    clk = f"{a.clock_mhz}MHz"
    cmd = [str(gem5 / "build/RISCV/gem5.opt"), "-d", str(out), str(cfg),
           "--silu-lat", str(lat), "--silu-units", str(a.silu_units), "--silu-pipelined", "1" if pipelined else "0",
           f"--cpu-type={a.cpu}", "--caches", f"--cpu-clock={clk}", f"--sys-clock={clk}",
           "-c", str(pathlib.Path(a.elf).resolve())]
    env = dict(os.environ, GEM5_ROOT=str(gem5))
    t0 = time.time()
    r = subprocess.run(cmd, cwd=gem5, env=env, capture_output=True, text=True)
    wall = time.time() - t0
    (out / "stdout.txt").write_text(r.stdout)
    (out / "stderr.txt").write_text(r.stderr)
    man = {"name": name, "cmd": cmd, "returncode": r.returncode, "wall_s": round(wall, 1),
           "cpu": a.cpu, "variant": a.variant, "bench": a.bench, "clock_mhz": a.clock_mhz, "period_ns": period,
           "silu_latency_cycles": lat, "latency_source": src, "silu_delay_ns": a.delay_ns,
           "silu_pipelined": pipelined, "hw": a.hw, "stage_overhead_ns": a.stage_overhead_ns, "silu_units": a.silu_units,
           "elf": a.elf, "elf_md5": md5(a.elf), "gem5_bin_md5": md5(gem5 / "build/RISCV/gem5.opt"),
           "gem5_git": subprocess.run(["git", "-C", str(gem5), "describe", "--tags", "--always"],
                                      capture_output=True, text=True).stdout.strip(),
           "date": time.strftime("%Y-%m-%d %H:%M:%S")}
    (out / "manifest.json").write_text(json.dumps(man, indent=2))
    ok = r.returncode == 0 and "checksum=" in r.stdout
    print(("OK   " if ok else "FAIL ") + name, f"{wall:.0f}s")
    if not ok:
        print(r.stdout[-600:], r.stderr[-1500:])
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
