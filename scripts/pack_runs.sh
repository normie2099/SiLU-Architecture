#!/bin/sh
# Keep raw gem5 runs small: gzip stats.txt and config.ini, drop the redundant config.json and the empty fs/ dir.
# collect_runs.py reads the .gz files directly. Run once after run_all.py.
for d in results/raw/*/; do
  [ -f "$d/manifest.json" ] || continue
  for f in stats.txt config.ini; do [ -f "$d/$f" ] && gzip -f "$d/$f"; done
  rm -rf "$d/config.json" "$d/fs"
done
