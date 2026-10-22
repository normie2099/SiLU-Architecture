"""silu_se.py - run gem5's se.py with the SiLU instruction given its own functional unit.

The instruction is decoded as op class SimdMisc (unused by RISC-V in gem5 v23, so it is effectively
dedicated). This wrapper removes SimdMisc from the shared SIMD/float units and adds one dedicated unit with a
chosen latency, for MinorCPU (in-order) and the O3 CPU (out-of-order). The latency comes from synthesis:
scripts/synth2gem5.py  (cycles = ceil(data delay / clock period)).

Usage (from the gem5 root):
  build/RISCV/gem5.opt -d OUTDIR <repo>/gem5/configs/silu_se.py --silu-lat 3 --silu-units 1 \
      --cpu-type=MinorCPU --caches -c prog.elf          (any other se.py option is passed through)
The unit is fully pipelined (a new SiLU can issue every cycle); --silu-pipelined 0 makes it block for its latency.
"""
import os, sys, runpy

def pop(flag, default):
    for i, a in enumerate(sys.argv):
        if a == flag:
            v = sys.argv[i + 1]; del sys.argv[i:i + 2]; return v
        if a.startswith(flag + "="):
            v = a.split("=", 1)[1]; del sys.argv[i]; return v
    return default

LAT = int(pop("--silu-lat", 1))
UNITS = int(pop("--silu-units", 1))
PIPE = int(pop("--silu-pipelined", 1))
ISSUE = 1 if PIPE else LAT

import m5.objects as O
from m5.objects.BaseMinorCPU import (MinorFU, MinorFUPool, MinorDefaultFUPool, MinorDefaultFloatSimdFU,
                                     minorMakeOpClassSet)

# ---- in-order (MinorCPU)
fs_classes = [str(o.opClass) for o in MinorDefaultFloatSimdFU.opClasses.opClasses]
assert "SimdMisc" in fs_classes, fs_classes

class FloatSimdNoSilu(MinorDefaultFloatSimdFU):
    opClasses = minorMakeOpClassSet([c for c in fs_classes if c != "SimdMisc"])

class SiluFU(MinorFU):
    opClasses = minorMakeOpClassSet(["SimdMisc"])
    opLat = LAT
    issueLat = ISSUE

class SiluMinorFUPool(MinorFUPool):
    funcUnits = [FloatSimdNoSilu() if isinstance(f, MinorDefaultFloatSimdFU) else f
                 for f in MinorDefaultFUPool.funcUnits] + [SiluFU() for _ in range(UNITS)]

# ---- out-of-order (O3)
from m5.objects.FuncUnitConfig import SIMD_Unit
from m5.objects.FuncUnit import FUDesc, OpDesc
from m5.objects.FUPool import FUPool, DefaultFUPool

class SIMDNoSilu(FUDesc):
    opList = [o for o in SIMD_Unit.opList if str(o.opClass) != "SimdMisc"]
    count = SIMD_Unit.count

class SiluUnit(FUDesc):
    opList = [OpDesc(opClass="SimdMisc", opLat=LAT, pipelined=bool(PIPE))]
    count = UNITS

class SiluO3FUPool(FUPool):
    FUList = [SIMDNoSilu() if isinstance(f, SIMD_Unit) else f for f in DefaultFUPool.FUList] + [SiluUnit()]

for name in dir(O):
    cls = getattr(O, name)
    if isinstance(cls, type):
        if name in ("MinorCPU", "RiscvMinorCPU"):
            cls.executeFuncUnits = SiluMinorFUPool()
        elif name in ("O3CPU", "DerivO3CPU", "RiscvO3CPU"):
            cls.fuPool = SiluO3FUPool()

print(f"[silu_se] SiLU unit: latency={LAT} cycles, units={UNITS}, pipelined={bool(PIPE)}", file=sys.stderr)
se = os.path.join(os.environ.get("GEM5_ROOT", "."), "configs", "deprecated", "example", "se.py")   # run from the gem5 root
sys.path.insert(0, os.path.join(os.environ.get("GEM5_ROOT", "."), "configs"))   # se.py imports common/, ruby/
runpy.run_path(se, run_name="__main__")
