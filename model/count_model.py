#!/usr/bin/env python3
"""count_model.py - multiply-accumulates and SiLU activation elements in ONE forward pass of YOLOv8n (640x640, batch 1),
counted with forward hooks on the real network. Used to scale the gem5 per-MAC / per-activation cycles to a whole model."""
import json, pathlib, sys
import torch, torch.nn as nn
from ultralytics import YOLO

w = sys.argv[1] if len(sys.argv) > 1 else "yolov8n.pt"
out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "results/raw/yolo/model_counts.json")
net = YOLO(w).model.eval()
macs, acts, convs, nacts = [0], [0], [0], [0]
def conv_hook(m, i, o):
    macs[0] += o.numel() // o.shape[0] * (m.in_channels // m.groups) * m.kernel_size[0] * m.kernel_size[1]; convs[0] += 1
def act_hook(m, i, o):
    acts[0] += o.numel(); nacts[0] += 1
hs = [m.register_forward_hook(conv_hook) for m in net.modules() if isinstance(m, nn.Conv2d)]
hs += [m.register_forward_hook(act_hook) for m in net.modules() if isinstance(m, nn.SiLU)]
with torch.no_grad():
    net(torch.zeros(1, 3, 640, 640))
res = {"model": w, "input": "1x3x640x640", "conv_layers": convs[0], "macs": macs[0], "silu_calls": nacts[0],
       "silu_elements": acts[0], "macs_per_silu_element": macs[0] / acts[0]}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(res, indent=1)); print(res)
