#!/usr/bin/env python3
"""
collect_runs.py - turn every results/raw/*/ run directory into one CSV row (results/tables/runs.csv).
Only the FIRST statistics block of stats.txt is used: it is the dump written by m5 dump_stats at the end of
the timed loop, after reset_stats at its start, so it covers exactly the loop.
Derived: cycles per input, instructions per input, time (cycles x clock period), mispredicts per 1000 insts.
"""
import csv, gzip, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
WANT = {
    "cycles": "system.cpu.numCycles",
    "insts": "system.cpu.commitStats0.numInsts",
    "cond_pred": "system.cpu.branchPred.condPredicted",
    "cond_wrong": "system.cpu.branchPred.condIncorrect",
    "silu_commits": "system.cpu.commitStats0.committedInstType::SimdMisc",
}


def first_block(path):
    d, n = {}, 0
    path = pathlib.Path(path)
    if not path.exists():
        path = path.with_name(path.name + ".gz")
    for line in (gzip.open(path, "rt") if path.suffix == ".gz" else open(path)):
        if "Begin Simulation Statistics" in line:
            n += 1
            continue
        if n > 1:
            break
        m = re.match(r"(\S+)\s+(-?[0-9.]+(?:e[-+]?[0-9]+)?|nan|inf)\b", line)
        if m:
            d[m.group(1)] = float(m.group(2)) if m.group(2) not in ("nan", "inf") else float("nan")
    return d


def main():
    raw = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "results/raw")
    out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else ROOT / "results/tables/runs.csv")
    rows = []
    for man_p in sorted(raw.glob("*/manifest.json")):
        man = json.loads(man_p.read_text())
        st = first_block(man_p.parent / "stats.txt")
        so = (man_p.parent / "stdout.txt").read_text()
        m = re.search(r"checksum=(-?\d+) cycles=(\d+) instret=(\d+)", so)
        w = re.search(r"inputs=(\d+) reps=(\d+)", so); mac = re.search(r"macs=(\d+)", so)
        r = {"run": man["name"], "bench": man.get("bench", "loop"), "macs": int(mac.group(1)) if mac else "", "cpu": man["cpu"], "variant": man["variant"], "clock_mhz": man["clock_mhz"],
             "silu_lat": man["silu_latency_cycles"], "hw": man["hw"],
             "checksum": m.group(1) if m else "", "extra": man.get("extra", "")}
        for k, key in WANT.items():
            r[k] = st.get(key, "")
        n_in = int(w.group(1)) * int(w.group(2))   # activations evaluated in the timed region
        r["cycles_per_input"] = r["cycles"] / n_in
        r["insts_per_input"] = r["insts"] / n_in
        r["cpi"] = r["cycles"] / r["insts"]
        r["time_us"] = r["cycles"] * man["period_ns"] / 1000.0
        r["mpki"] = 1000.0 * r["cond_wrong"] / r["insts"]
        rows.append(r)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(f"{len(rows)} runs -> {out}")


if __name__ == "__main__":
    main()
