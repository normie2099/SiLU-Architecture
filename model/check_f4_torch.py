"""Prove the PyTorch emulator matches the golden vectors on all 65,536 inputs."""
import sys, pathlib
import torch
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from f4_torch import f4_fixed_raw

vec = pathlib.Path(__file__).resolve().parents[1] / "golden" / "f4_vectors.hex"
ins, outs = [], []
for line in vec.read_text().split("\n"):
    p = line.split()
    if len(p) == 2:
        a, b = int(p[0], 16), int(p[1], 16)
        ins.append(a - 65536 if a >= 32768 else a)
        outs.append(b - 65536 if b >= 32768 else b)
q = torch.tensor(ins, dtype=torch.int64)
y = f4_fixed_raw(q)
bad = int((y != torch.tensor(outs, dtype=torch.int64)).sum())
print(f"{len(ins)} inputs, {bad} mismatches")
sys.exit(1 if bad else 0)
