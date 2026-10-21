"""
f4_torch.py - bit-exact PyTorch emulation of the f4 SiLU approximation (Q6.10) and tools to swap it
into a model.

Two modes
  strict : the input is rounded to a 16-bit Q6.10 integer and clipped to [-32768, 32767] first, exactly
           as the 16-bit hardware sees it. The output is the Q6.10 result divided by 1024.
  tails  : only |x| <= 4 goes through the fixed-point datapath. Beyond +-4 the output is x (positive)
           or 0 (negative) at full precision, like the planned 32-bit-register instruction.

The integer arithmetic is identical to golden/f4_golden.py (f4_fixed_raw). Run
  python model/check_f4_torch.py
to prove the match on all 65,536 inputs.
"""
import torch
import torch.nn as nn

FRAC = 10
SCALE = 1 << FRAC
C1 = 384   # 0.375  * 1024
C2 = 38    # 0.0375 * 1024 (38.4 truncated)


def f4_fixed_raw(q: torch.Tensor) -> torch.Tensor:
    """Bit-exact f4 on int64 raw Q6.10 values. >> is an arithmetic (flooring) shift."""
    s1, s2, s4 = q >> 1, q >> 2, q >> 4
    out = q.clone()                                   # x > 4  -> x
    out = torch.where(q <= 4 * SCALE, q + s4 - C1, out)      # 1 < x <= 4
    out = torch.where(q <= 1 * SCALE, s1 + s2 - C2, out)     # 0 < x <= 1
    out = torch.where(q <= 0, s2 - C2, out)                  # -1 < x <= 0
    out = torch.where(q <= -1 * SCALE, -s4 - C1, out)        # -4 < x <= -1
    out = torch.where(q <= -4 * SCALE, torch.zeros_like(q), out)  # x <= -4 -> 0
    return out


class F4(nn.Module):
    """Drop-in replacement for nn.SiLU. Counts calls and input statistics for the evidence trail."""

    def __init__(self, mode: str = "strict"):
        super().__init__()
        assert mode in ("strict", "tails")
        self.mode = mode
        self.calls = 0
        self.elements = 0
        self.beyond4 = 0
        self.saturated = 0

    def reset_stats(self):
        self.calls = self.elements = self.beyond4 = self.saturated = 0

    @torch.no_grad()
    def _stats(self, x):
        self.calls += 1
        self.elements += x.numel()
        self.beyond4 += int((x.abs() > 4).sum())
        self.saturated += int((x.abs() >= 32).sum())

    def forward(self, x):
        self._stats(x)
        xf = x.float()
        q = torch.round(xf * SCALE).clamp(-32768, 32767).to(torch.int64)
        y = f4_fixed_raw(q).to(torch.float32) / SCALE
        if self.mode == "tails":
            y = torch.where(xf > 4, xf, y)
            y = torch.where(xf < -4, torch.zeros_like(xf), y)
        return y.to(x.dtype)


def swap_activations(model: nn.Module, make_act, report=True):
    """Replace every SiLU in `model` with make_act(). Returns the list of replaced locations.

    Handles the two ways SiLU hides in Ultralytics/YOLO models:
      1. nn.SiLU modules found by name (one per module path);
      2. the shared class-level default (Conv.default_act) - every Conv instance gets its own act.
    Any direct call to torch.nn.functional.silu inside forward() is NOT caught here; use count_calls()
    to compare the number of activation calls with the expected number.
    """
    replaced = []
    for name, module in list(model.named_modules()):
        for child_name, child in list(module.named_children()):
            if isinstance(child, nn.SiLU):
                setattr(module, child_name, make_act())
                replaced.append(f"{name}.{child_name}" if name else child_name)
    # Ultralytics Conv blocks: act may be the shared class attribute object
    for name, module in model.named_modules():
        if hasattr(module, "act") and isinstance(getattr(module, "act"), nn.SiLU):
            module.act = make_act()
            replaced.append(f"{name}.act")
    if report:
        print(f"swap_activations: replaced {len(replaced)} SiLU modules")
    return replaced


def count_calls(model: nn.Module, example_input):
    """Run one forward pass and return the total number of F4 calls (to prove the swap)."""
    acts = [m for m in model.modules() if isinstance(m, F4)]
    for a in acts:
        a.reset_stats()
    with torch.no_grad():
        model(example_input)
    return {"modules": len(acts), "calls": sum(a.calls for a in acts),
            "elements": sum(a.elements for a in acts),
            "beyond4": sum(a.beyond4 for a in acts),
            "saturated": sum(a.saturated for a in acts)}
