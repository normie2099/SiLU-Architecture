#!/usr/bin/env python3
"""
eval_yolo.py - swap SiLU for the approximations inside a real network (YOLOv8n) and measure what happens.

For each activation variant it records, on the COCO128 images:
  mAP50, mAP50-95                           (Ultralytics validator, CPU, 640x640, batch 8)
  swap count and per-forward call count     (proof that every SiLU was really replaced)
  share of activation inputs outside [-4,4] (what the approximation never sees / has to saturate)
  histogram of activation inputs            (for the figure)
and, once, per-forward multiply-accumulates and activation elements (input to the Amdahl scaling).

Variants: silu (exact), silu_q (exact SiLU but with Q6.10 input/output rounding: separates quantisation from
approximation error), f4_strict, f4_tails (see f4_torch.py), table (257-entry table + interpolation as in bench/).

Usage: python3 model/eval_yolo.py --weights yolov8n.pt --data-dir coco128 --out results/raw/yolo
"""
import argparse, json, pathlib, re, sys, time
import numpy as np
import torch, torch.nn as nn

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from f4_torch import F4, swap_activations, SCALE

ROOT = pathlib.Path(__file__).resolve().parent.parent
BINS = np.linspace(-12, 12, 97)          # 0.25-wide bins; first/last bins also catch the tails


def load_table():
    txt = (ROOT / "bench/silu_table.h").read_text()
    vals = [int(v) for v in re.findall(r"-?\d+", txt[txt.index("{"):])]
    assert len(vals) == 257, len(vals)
    return torch.tensor(vals, dtype=torch.int64)


G = {}   # shared counters: Ultralytics deep-copies the model inside val(), so per-instance counters would be lost


def g_reset():
    G.update(calls=0, elements=0, beyond4=0, hist=np.zeros(len(BINS) - 1, dtype=np.int64))


g_reset()


class Base(nn.Module):
    """Common bookkeeping into the shared counters G: calls, elements, outside-[-4,4] share, input histogram."""
    @torch.no_grad()
    def note(self, x):
        G["calls"] += 1
        G["elements"] += x.numel()
        G["beyond4"] += int((x.abs() > 4).sum())
        G["hist"] += np.histogram(x.float().clamp(-11.99, 11.99).cpu().numpy(), bins=BINS)[0]


class ExactSiLU(Base):
    def forward(self, x):
        self.note(x)
        return x * torch.sigmoid(x)


class QuantSiLU(Base):
    def forward(self, x):
        self.note(x)
        q = torch.round(x.float() * SCALE).clamp(-32768, 32767)
        y = torch.round((q / SCALE) * torch.sigmoid(q / SCALE) * SCALE)
        return (y / SCALE).to(x.dtype)


class F4Counted(F4, Base):
    def __init__(self, mode):
        F4.__init__(self, mode)

    def forward(self, x):
        self.note(x)
        return F4.forward(self, x)


class TableSiLU(Base):
    """Bit-exact torch version of silu_table() in bench/silu_kernels.h."""
    def __init__(self):
        super().__init__()
        self.tab = load_table()

    def forward(self, x):
        self.note(x)
        q = torch.round(x.float() * SCALE).clamp(-32768, 32767).to(torch.int64)
        p = (q + 4096).clamp(0, 8192)
        i, f = p >> 5, p & 31
        i0 = i.clamp(max=255)
        a, b = self.tab[i0], self.tab[(i0 + 1).clamp(max=256)]
        y = a + (((b - a) * f) >> 5)
        y = torch.where(q == 4096, self.tab[256].expand_as(q), y)
        y = torch.where(q > 4096, q, y)
        y = torch.where(q < -4096, torch.zeros_like(q), y)
        return (y.to(torch.float32) / SCALE).to(x.dtype)


MAKERS = {"silu": ExactSiLU, "silu_q": QuantSiLU, "f4_strict": lambda: F4Counted("strict"),
          "f4_tails": lambda: F4Counted("tails"), "table": TableSiLU}


def count_macs(net, imgsz=640):
    macs = [0]
    def hook(m, i, o):
        macs[0] += o.numel() // o.shape[0] * (m.in_channels // m.groups) * m.kernel_size[0] * m.kernel_size[1]
    hs = [m.register_forward_hook(hook) for m in net.modules() if isinstance(m, nn.Conv2d)]
    with torch.no_grad():
        net(torch.zeros(1, 3, imgsz, imgsz))
    for h in hs:
        h.remove()
    return macs[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", default="yolov8n.pt")
    ap.add_argument("--data-dir", default="coco128")
    ap.add_argument("--out", default=str(ROOT / "results/raw/yolo"))
    ap.add_argument("--variants", nargs="+", default=list(MAKERS))
    ap.add_argument("--batch", type=int, default=8)
    a = ap.parse_args()
    from ultralytics import YOLO
    import ultralytics
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    data = pathlib.Path(a.data_dir).resolve()
    names = YOLO(a.weights).names
    (out / "coco128.yaml").write_text(
        f"path: {data}\ntrain: images/train2017\nval: images/train2017\nnames:\n" +
        "".join(f"  {k}: {v}\n" for k, v in names.items()))
    res = {"torch": torch.__version__, "ultralytics": ultralytics.__version__, "weights": a.weights,
           "dataset": "coco128 (128 COCO train2017 images; relative comparison only, not a published mAP)"}
    for v in a.variants:
        y = YOLO(a.weights)
        net = y.model
        if v != "silu_baseline_unswapped":
            repl = swap_activations(net, MAKERS[v], report=False)
        acts = [m for m in net.modules() if isinstance(m, Base)]
        n_silu_left = sum(isinstance(m, nn.SiLU) for m in net.modules())
        if v == "silu":
            res["macs_per_forward_640"] = count_macs(net)
        g_reset()
        t0 = time.time()
        r = y.val(data=str(out / "coco128.yaml"), imgsz=640, batch=a.batch, device="cpu", plots=False,
                  verbose=False, workers=0, project=str(out / "ultralytics_runs"), name=v, exist_ok=True)
        elems, beyond, hist = G["elements"], G["beyond4"], G["hist"]
        res[v] = {"modules_swapped": len(repl), "silu_modules_left": n_silu_left, "activation_modules": len(acts),
                  "calls": G["calls"], "elements": elems,
                  "share_outside_pm4": beyond / max(1, elems),
                  "map50": float(r.box.map50), "map50_95": float(r.box.map),
                  "hist_counts": hist.tolist(), "wall_s": round(time.time() - t0, 1)}
        print(v, {k: res[v][k] for k in ("modules_swapped", "silu_modules_left", "calls", "share_outside_pm4",
                                         "map50", "map50_95", "wall_s")}, flush=True)
        (out / "yolo_results.json").write_text(json.dumps(res, indent=1))
    res["hist_bins"] = BINS.tolist()
    (out / "yolo_results.json").write_text(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
