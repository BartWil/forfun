#!/usr/bin/env python3
"""Generate the gold-standard reference the browser DSP is tested against.

The EMG Lab claims to run the Santuz processing pipeline. That claim is only
worth making if it is checked, so this script processes the committed excerpt
with a reference implementation and writes the intermediate outputs to
data/emg/reference_santuz.csv. tests/science.test.mjs then runs the browser's
own code over the same input and compares.

The published pipeline (muscle_synergies.R, lines 168-190) is:

    HP  = signal::butter(4, 50/(fs/2), type="high");  filtfilt
    rectify (abs)
    LP  = signal::butter(4, 20/(fs/2), type="low");   filtfilt
    negative -> 0
    subtract the minimum
    (then amplitude normalisation, which we skip so the comparison stays in mV)

R is not available in this environment, so the reference is scipy. That is a
fair substitution rather than a convenience: R's signal::butter and scipy's
signal.butter both design a Butterworth by the same bilinear transform and
return the same coefficients, and both filtfilt run the filter forward then
backward. Where they differ is padding at the very edges, which is exactly the
region the station shades and excludes from its metrics, and which the test
therefore compares separately and loosely.

Run:  python scripts/make_emg_reference.py
"""

import csv
import os
import sys

import numpy as np
from scipy import signal

SRC = os.path.join("data", "emg", "santuz2021_demo.csv")
OUT = os.path.join("data", "emg", "reference_santuz.csv")

HP_HZ, LP_HZ, ORDER = 50.0, 20.0, 4


def read_excerpt(path):
    meta, header, rows = {}, None, []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip():
                continue
            if line.lstrip('"').startswith("#"):
                parts = line.lstrip('"').lstrip("#").strip().split(",")
                if len(parts) >= 2:
                    meta[parts[0].strip().rstrip('"')] = ",".join(parts[1:]).strip()
                continue
            if header is None:
                header = line.split(",")
            else:
                rows.append([float(v) for v in line.split(",")])
    arr = np.array(rows)
    cols = {h.strip(): arr[:, i] for i, h in enumerate(header)}
    return meta, cols


def main():
    if not os.path.exists(SRC):
        sys.exit("missing %s; run scripts/extract_emg_demo.py first" % SRC)
    meta, cols = read_excerpt(SRC)
    fs = float(meta.get("sampling_rate_hz", 1000))
    nyq = fs / 2.0

    # scipy's filtfilt default padlen, stated explicitly so the JS can match it
    padlen = 3 * (ORDER + 1)

    bh, ah = signal.butter(ORDER, HP_HZ / nyq, btype="high")
    bl, al = signal.butter(ORDER, LP_HZ / nyq, btype="low")

    print("reference filter coefficients")
    print("  HP b:", " ".join("%.17g" % v for v in bh))
    print("  HP a:", " ".join("%.17g" % v for v in ah))
    print("  LP b:", " ".join("%.17g" % v for v in bl))
    print("  LP a:", " ".join("%.17g" % v for v in al))
    print("  padlen:", padlen)

    channels = [c for c in cols if c.endswith("_mv")]
    out = {"time_s": cols["time_s"]}
    for ch in channels:
        raw = cols[ch]
        hp = signal.filtfilt(bh, ah, raw, padlen=padlen)
        rect = np.abs(hp)
        env = signal.filtfilt(bl, al, rect, padlen=padlen)
        env = np.where(env < 0, 0.0, env)
        env = env - env.min()
        name = ch[:-3]
        out[name + "_hp"] = hp
        out[name + "_env"] = env
        print("  %-3s  RMS raw %.6f -> RMS hp %.6f, envelope peak %.6f"
              % (name.upper(), np.sqrt((raw ** 2).mean()),
                 np.sqrt((hp ** 2).mean()), env.max()))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    names = list(out.keys())
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["# Reference output for tests. Not shown to readers."])
        w.writerow(["# source", SRC])
        w.writerow(["# generator", "scipy %s, scripts/make_emg_reference.py" % __import__("scipy").__version__])
        w.writerow(["# pipeline", "butter(%d,%gHz,high)+filtfilt -> abs -> butter(%d,%gHz,low)+filtfilt -> clip -> minus min"
                    % (ORDER, HP_HZ, ORDER, LP_HZ)])
        w.writerow(["# padlen", padlen])
        w.writerow(["# sampling_rate_hz", int(fs)])
        # Every STRIDE-th sample. The test compares JS[i*STRIDE] against ref[i],
        # so this is exact, not interpolated; it just keeps the file small.
        STRIDE = 5
        w.writerow(["sample_index"] + names)
        n = len(out["time_s"])
        for i in range(0, n, STRIDE):
            w.writerow([i] + ["%.10g" % out[k][i] for k in names])
    print("wrote %s (%d of %d samples, stride 5)" % (OUT, len(range(0, n, 5)), n))


if __name__ == "__main__":
    main()
