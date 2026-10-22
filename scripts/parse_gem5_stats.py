#!/usr/bin/env python3
"""
parse_gem5_stats.py - pull cycles, instructions, IPC and branch-misprediction counts out of gem5 stats.txt files
and write one CSV row per run.

gem5 stat names differ between versions and CPU models, so this matches by suffix and reports exactly
which names it used. If something is missing it says so; it never fills in a number.

Usage
  python scripts/parse_gem5_stats.py results/raw/*/stats.txt --out results/tables/runs.csv
A run directory name is used as the run label (e.g. minor_int_f4_100MHz).
When stats.txt holds several dump sections (m5 dump_stats), the LAST section is used, which should be the one
taken right after the measured loop; pass --section N to choose another.
"""
import argparse, csv, pathlib, re, sys

WANTED = {
    "cycles": [r"numCycles$"],
    "insts": [r"committedInsts$", r"numInsts$"],
    "ipc": [r"\.ipc$"],
    "cpi": [r"\.cpi$"],
    "branch_mispred": [r"branchMispredicts$", r"condIncorrect$", r"committed_\.branchMispredicts$"],
}


def sections(text):
    parts = re.split(r"-+ Begin Simulation Statistics -+", text)
    return [p for p in parts if p.strip()]


def parse(path, section=-1):
    secs = sections(pathlib.Path(path).read_text(errors="replace"))
    if not secs:
        return None, {}
    body = secs[section]
    stats, used = {}, {}
    for line in body.splitlines():
        m = re.match(r"^(\S+)\s+([-0-9.eE+]+|nan|inf)\b", line)
        if not m:
            continue
        name, val = m.group(1), m.group(2)
        for key, pats in WANTED.items():
            if key in stats:
                continue
            if any(re.search(p, name) for p in pats):
                try:
                    stats[key] = float(val); used[key] = name
                except ValueError:
                    pass
    return stats, used


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", default="results/tables/runs.csv")
    ap.add_argument("--section", type=int, default=-1)
    a = ap.parse_args()
    rows = []
    for f in a.files:
        stats, used = parse(f, a.section)
        label = pathlib.Path(f).parent.name
        if stats is None:
            print(f"WARNING {f}: no statistics sections found", file=sys.stderr); continue
        missing = [k for k in WANTED if k not in stats]
        if missing:
            print(f"WARNING {label}: not found in stats.txt: {', '.join(missing)}", file=sys.stderr)
        rows.append({"run": label, **stats, "stat_names": ";".join(f"{k}={v}" for k, v in used.items())})
    keys = ["run", *WANTED.keys(), "stat_names"]
    p = pathlib.Path(a.out); p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=keys, extrasaction="ignore"); w.writeheader(); w.writerows(rows)
    print(f"wrote {p} with {len(rows)} runs")


if __name__ == "__main__":
    main()
