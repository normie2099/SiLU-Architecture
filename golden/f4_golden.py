#!/usr/bin/env python3
"""
f4_golden.py - golden reference for the f4(x) SiLU approximation
(Spagnolo, Perri, Corsonello, ISVLSI 2025, equation (4) and Fig. 2).

Usage
    python3 f4_golden.py                  error analysis, paper self-check, writes f4_vectors.hex
    python3 f4_golden.py --compare FILE   compare a device-under-test output file with the golden model

Number format: 16-bit two's complement, 10 fraction bits (Q6.10). Real value = raw / 1024.

f4_vectors.hex holds every possible 16-bit input (65,536 lines) and the expected output, one
"iiii oooo" pair of 4-digit hex numbers per line. Drive the same inputs through the Verilog
testbench and through the gem5 instruction, write the results in the same format, and run
--compare on each file.

IMPORTANT
The constants and rounding follow equation (4) and the circuit in Fig. 2 of the paper. The
project's Verilog is the authority. A mismatch is usually a 1-LSB difference in a constant, or
a different choice of < versus <= at a breakpoint. Find out which side is wrong and fix that
side. Do not edit the vectors to make a mismatch disappear.
"""
import argparse
from collections import Counter

import numpy as np

FRAC = 10
SCALE = 1 << FRAC          # 1024
C1 = 384                   # 0.375  * 1024 = 384.0 exactly
C2 = 38                    # 0.0375 * 1024 = 38.4; rounding and truncation both give 38


def silu(x):
    x = np.asarray(x, dtype=np.float64)
    return x / (1.0 + np.exp(-x))


def f4_real(x):
    """Equation (4) in real arithmetic, no quantisation."""
    x = np.asarray(x, dtype=np.float64)
    return np.select(
        [x <= -4, x <= -1, x <= 0, x <= 1, x <= 4],
        [np.zeros_like(x), -x / 16 - 0.375, x / 4 - 0.0375,
         x / 2 + x / 4 - 0.0375, x + x / 16 - 0.375],
        default=x)


def f4_fixed_raw(q):
    """Bit-exact model on raw Q6.10 integers.

    Arithmetic right shifts floor, as in hardware. The negative-slope segment uses -(x >> 4),
    which is what the circuit builds with NOT plus a carry-in of 1 on the sign bit.
    """
    q = np.asarray(q, dtype=np.int64)
    s1, s2, s4 = q >> 1, q >> 2, q >> 4
    return np.select(
        [q <= -4 * SCALE, q <= -1 * SCALE, q <= 0, q <= 1 * SCALE, q <= 4 * SCALE],
        [np.zeros_like(q), -s4 - C1, s2 - C2, s1 + s2 - C2, q + s4 - C1],
        default=q)


def to_raw(x):
    r = np.round(np.asarray(x, dtype=np.float64) * SCALE)
    return np.clip(r, -32768, 32767).astype(np.int64)


def s16(v):
    return v - 65536 if v >= 32768 else v


def metrics(err):
    err = np.asarray(err, dtype=np.float64)
    return {"MSE": float(np.mean(err ** 2)), "RMSE": float(np.sqrt(np.mean(err ** 2))),
            "MAE": float(np.mean(np.abs(err))), "MAX": float(np.max(np.abs(err)))}


def analysis():
    print("=== 1. Error of f4 against exact SiLU (real arithmetic, 1,000,001-point grid) ===")
    grid = np.linspace(-5, 5, 1_000_001)
    err = f4_real(grid) - silu(grid)
    for name, lo, hi in [("(-5, 5)", -5, 5), ("(-4, 4)", -4, 4), ("[-3, 3]", -3, 3),
                         ("[-3, 0]", -3, 0), ("[0, 3]", 0, 3)]:
        sel = (grid >= lo) & (grid <= hi)
        e = err[sel]
        k = int(np.argmax(np.abs(e)))
        print(f"  {name:>8}: mean |err| {np.mean(np.abs(e)):.4f}   "
              f"max |err| {abs(e[k]):.4f} at x = {grid[sel][k]:+.3f}")
    print("  (the paper quotes 0.0452 as the maximum error over [-3, 0] and [0, 3])")

    print("\n=== 2. Jumps where neighbouring segments do not meet ===")
    for b in (-4, -1, 0, 1, 4):
        at = float(f4_real(np.array([float(b)]))[0])
        after = float(f4_real(np.array([b + 1e-9]))[0])
        print(f"  x = {b:+d}: f4(x) = {at:+.4f}   f4(x+) = {after:+.4f}   jump {after - at:+.4f}")

    print("\n=== 3. Near zero, where real Swish inputs concentrate ===")
    print(f"  f4(0) = {float(f4_real(np.array([0.0]))[0]):+.4f} while SiLU(0) = 0")
    for x0 in (0.02, 0.05, 0.1, 0.25, 0.5):
        parts = []
        for x in (-x0, x0):
            a = np.array([x])
            e = float(f4_real(a)[0] - silu(a)[0])
            rel = abs(e) / abs(float(silu(a)[0])) * 100
            parts.append(f"x = {x:+.2f}: err {e:+.4f} ({rel:.0f}% of |SiLU|)")
        print("  " + "   ".join(parts))
    near = np.abs(grid) <= 0.5
    print(f"  mean |err| over [-0.5, 0.5]: {np.mean(np.abs(err[near])):.4f}")

    print("\n=== 4. Fixed point against real f4 on all 65,536 inputs ===")
    q = np.arange(-32768, 32768)
    diff = f4_fixed_raw(q) - np.round(f4_real(q / SCALE) * SCALE)
    print(f"  max |difference| = {int(np.max(np.abs(diff)))} LSB, "
          f"{np.mean(diff != 0) * 100:.1f}% of inputs differ at all")


def paper_check():
    print("\n=== 5. The paper's own error test: 4096 random inputs in (-5, 5), 16-bit fixed point ===")

    def run(seed):
        rng = np.random.default_rng(seed)
        q = to_raw(rng.uniform(-5, 5, 4096))
        return metrics(f4_fixed_raw(q) / SCALE - silu(q / SCALE))

    m = run(0)
    print(f"  this model (seed 0): MSE {m['MSE']:.4f}  RMSE {m['RMSE']:.4f}  MAE {m['MAE']:.4f}")
    print("  paper, Table III   : MSE 0.0011  RMSE 0.0327  MAE 0.0278")
    maes = [run(s)["MAE"] for s in range(200)]
    print(f"  MAE over 200 different draws: mean {np.mean(maes):.4f}, "
          f"min {min(maes):.4f}, max {max(maes):.4f}")


def sweep_coverage():
    print("\n=== 6. The existing 1,000-element benchmark, assuming raw Q6.10 inputs -5000 .. +4990 step 10 ===")
    raw = np.arange(-5000, 5000, 10)
    seg = np.select([raw <= -4 * SCALE, raw <= -SCALE, raw <= 0, raw <= SCALE, raw <= 4 * SCALE],
                    [0, 1, 2, 3, 4], default=5)
    counts = np.bincount(seg, minlength=6)
    inside = np.abs(raw) <= 4 * SCALE
    print(f"  {len(raw)} inputs, real range {raw.min() / SCALE:+.3f} .. {raw.max() / SCALE:+.3f}")
    print(f"  inside |x| <= 4: {inside.mean() * 100:.1f}%")
    print(f"  inputs per segment (x<=-4, -4..-1, -1..0, 0..1, 1..4, >4): {counts.tolist()}")


def write_vectors(path="f4_vectors.hex"):
    q = np.arange(-32768, 32768)
    y = f4_fixed_raw(q)
    with open(path, "w") as f:
        for a, b in zip(q, y):
            f.write(f"{int(a) & 0xFFFF:04x} {int(b) & 0xFFFF:04x}\n")
    print(f"\nwrote {path}: {len(q)} lines, 'input output' as 16-bit two's complement hex")


def compare(path):
    q = np.arange(-32768, 32768)
    gold = {int(a) & 0xFFFF: int(b) & 0xFFFF for a, b in zip(q, f4_fixed_raw(q))}
    seen, bad, diffs = set(), [], Counter()
    with open(path) as f:
        for line in f:
            parts = line.split()
            if len(parts) != 2:
                continue
            a, b = int(parts[0], 16), int(parts[1], 16)
            if a not in gold:
                bad.append((a, b))
                continue
            seen.add(a)
            if gold[a] != b:
                bad.append((a, b))
                diffs[s16(b) - s16(gold[a])] += 1
    print(f"{path}: {len(seen)} distinct valid inputs read, {len(bad)} mismatches, "
          f"{65536 - len(seen)} of the 65,536 inputs missing")
    for a, b in bad[:10]:
        if a in gold:
            print(f"  input {s16(a):+6d} ({s16(a) / SCALE:+8.4f}): "
                  f"DUT {s16(b):+6d}  golden {s16(gold[a]):+6d}")
        else:
            print(f"  input {a:#06x} is outside the 16-bit range")
    if diffs:
        print("  difference (DUT - golden) in LSB -> count:", dict(sorted(diffs.items())))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--compare", metavar="FILE", help="DUT output file, one 'iiii oooo' hex pair per line")
    args = ap.parse_args()
    if args.compare:
        compare(args.compare)
        return
    analysis()
    paper_check()
    sweep_coverage()
    write_vectors()


if __name__ == "__main__":
    main()
