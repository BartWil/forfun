#!/usr/bin/env python3
"""Extract a short raw-EMG excerpt from the Santuz et al. 2021 open dataset.

Source
------
Santuz A, Janshen L, Bruell L, Munoz-Martel V, Taborri J, Rossi S, Arampatzis A.
"Sex-specific tuning of modular muscle activation patterns for locomotion in
young and older adults." Zenodo, 2021.  https://doi.org/10.5281/zenodo.5171823
Licensed CC BY 4.0.

Why this script exists
----------------------
The committed CSV under data/emg/ must be reproducible from the original archive
by anyone, without trusting us. Run this and you get the same file.

RAW_EMG.RData is 952 MB, but we only need the first trial, which sits at the
start of the stream. R's serialisation writes a list's elements before its names
attribute, so the names of the whole 261-trial list are only readable after
decompressing everything. We avoid that: a byte-range download of the first few
MB is enough to decode element 1 in full, including that data frame's own column
names. Trial identity is then cross-checked against CYCLE_TIMES.RData, which is
small enough to read completely.

No third-party packages. Standard library only.
"""

import argparse
import csv
import gzip
import io
import struct
import sys
import urllib.request

REC = "https://zenodo.org/api/records/5171823/files/{}/content"

# ---------------------------------------------------------------- RData reader
# R serialisation format 2/3, XDR (big-endian). Only the subset needed here.
NILVALUE, SYMSXP, LISTSXP, CHARSXP = 254, 1, 2, 9
INTSXP, REALSXP, STRSXP, VECSXP = 13, 14, 16, 19
REFSXP, NILSXP = 255, 0


class Truncated(Exception):
    """Ran off the end of a deliberately partial download."""


class RDataReader:
    def __init__(self, stream):
        self.s = stream
        self.refs = []

    def raw(self, n):
        b = self.s.read(n)
        if len(b) < n:
            raise Truncated()
        return b

    def i32(self):
        return struct.unpack(">i", self.raw(4))[0]

    def f64(self, n):
        return list(struct.unpack(">%dd" % n, self.raw(8 * n)))

    def header(self):
        magic = self.raw(2)
        if magic == b"RD":                       # "RDX2\n" / "RDX3\n"
            self.raw(3)
            magic = self.raw(2)
        if magic[:1] != b"X":
            raise ValueError("not XDR-serialised RData (got %r)" % magic)
        ver = self.i32()                          # format version (2 or 3)
        self.i32()                                # writer R version
        self.i32()                                # minimum reader version
        if ver >= 3:
            # RDX3 adds the native encoding here, e.g. "CP1252" or "UTF-8"
            self.raw(self.i32())
        return ver

    def item(self, want_first_only=False):
        flags = self.i32()
        typ = flags & 0xFF
        has_attr = bool((flags >> 9) & 1)
        has_tag = bool((flags >> 10) & 1)

        if typ == NILVALUE or typ == NILSXP:
            return None

        if typ == REFSXP:
            idx = flags >> 8
            return self.refs[idx - 1] if idx else self.refs[self.i32() - 1]

        if typ == SYMSXP:
            name = self.item()
            self.refs.append(name)
            return name

        if typ == CHARSXP:
            n = self.i32()
            if n < 0:
                return None
            return self.raw(n).decode("utf-8", "replace")

        if typ == LISTSXP:                        # pairlist: used at top level
            out = {}
            while True:
                if has_attr:
                    self.item()
                tag = self.item() if has_tag else None
                val = self.item(want_first_only)
                if tag is not None:
                    out[tag] = val
                flags = self.i32()
                typ = flags & 0xFF
                has_attr = bool((flags >> 9) & 1)
                has_tag = bool((flags >> 10) & 1)
                if typ == NILVALUE or typ == NILSXP:
                    break
            return out

        if typ == REALSXP:
            n = self.i32()
            v = self.f64(n)
            if has_attr:
                self.item()
            return v

        if typ == INTSXP:
            n = self.i32()
            v = [self.i32() for _ in range(n)]
            if has_attr:
                self.item()
            return v

        if typ == STRSXP:
            n = self.i32()
            v = [self.item() for _ in range(n)]
            if has_attr:
                self.item()
            return v

        if typ == VECSXP:                          # generic list / data frame
            n = self.i32()
            vals = []
            for i in range(n):
                if want_first_only and i >= 1:
                    # element 0 is decoded; the remaining 260 trials are 950 MB
                    # away and we do not need them
                    return {"__list__": vals, "__attr__": {}, "__partial__": True}
                vals.append(self.item())
            attrs = {}
            if has_attr:
                a = self.item()
                if isinstance(a, dict):
                    attrs = a
            return {"__list__": vals, "__attr__": attrs}

        raise ValueError("unhandled R type %d" % typ)


def names_of(obj):
    a = obj.get("__attr__") or {}
    return a.get("names") or []


def as_frame(obj):
    """A data.frame is a VECSXP of columns plus a names attribute."""
    cols = obj["__list__"]
    nm = names_of(obj)
    return {nm[i]: cols[i] for i in range(min(len(nm), len(cols)))}


# ------------------------------------------------------------------ fetching
def fetch(name, byte_range=None):
    req = urllib.request.Request(REC.format(name),
                                 headers={"User-Agent": "biolab-play/extract"})
    if byte_range:
        req.add_header("Range", "bytes=0-%d" % (byte_range - 1))
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, default=8.0,
                    help="length of the excerpt to keep")
    ap.add_argument("--muscles", default="TA,GM,RF",
                    help="channels to keep, comma separated")
    ap.add_argument("--bytes", type=int, default=48 * 1024 * 1024,
                    help="how much of RAW_EMG.RData to download")
    ap.add_argument("--out", default="data/emg/santuz2021_demo.csv")
    args = ap.parse_args()

    want = [m.strip().upper() for m in args.muscles.split(",")]

    # --- cycle times: small, read in full, gives the trial ordering
    print("fetching CYCLE_TIMES.RData ...")
    ct_raw = gzip.decompress(fetch("CYCLE_TIMES.RData"))
    r = RDataReader(io.BytesIO(ct_raw))
    r.header()
    top = r.item()
    ct = top["CYCLE_TIMES"]
    ct_names = names_of(ct)
    print("  %d trials, first = %s" % (len(ct["__list__"]), ct_names[0]))

    # --- raw EMG: partial download, decode element 1 only
    print("fetching first %.0f MB of RAW_EMG.RData ..." % (args.bytes / 1e6))
    blob = fetch("RAW_EMG.RData", byte_range=args.bytes)
    gz = gzip.GzipFile(fileobj=io.BytesIO(blob))
    r2 = RDataReader(gz)
    r2.header()

    flags = r2.i32()                     # top-level pairlist entry
    if bool((flags >> 9) & 1):
        r2.item()                        # attributes, if any
    if bool((flags >> 10) & 1):
        r2.item()                        # the symbol RAW_EMG
    vflags = r2.i32()
    if (vflags & 0xFF) != VECSXP:
        raise SystemExit("expected RAW_EMG to be a list, got R type %d" % (vflags & 0xFF))
    n_trials = r2.i32()
    print("  list of %d trials; decoding the first" % n_trials)
    first = r2.item()                    # trial 1, a data frame

    frame = as_frame(first)
    cols = list(frame.keys())
    print("  trial 1 columns: %s" % ", ".join(cols))

    upper = {c.upper(): c for c in cols}
    tcol = upper.get("TIME")
    if tcol is None:
        raise SystemExit("no time column in trial 1")
    missing = [m for m in want if m not in upper]
    if missing:
        raise SystemExit("channels not in this trial: %s (have %s)"
                         % (", ".join(missing), ", ".join(cols)))

    t = frame[tcol]
    fs = round(1.0 / (t[1] - t[0]))
    print("  %d samples, %.2f s, sampling rate %d Hz" % (len(t), t[-1] - t[0], fs))

    n = min(len(t), int(args.seconds * fs))
    t0 = t[0]

    # --- cycle times for this trial, so the page can mark touchdowns
    ct_frame = as_frame(ct["__list__"][0])
    td = [x for x in (ct_frame.get("touchdown") or []) if x - t0 <= args.seconds]

    trial_name = ct_names[0].replace("CYCLE_TIMES_", "")
    print("  trial: %s, %d touchdowns inside the excerpt" % (trial_name, len(td)))

    import os
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["# Raw surface EMG excerpt, Santuz et al. 2021, CC BY 4.0"])
        w.writerow(["# source", "https://doi.org/10.5281/zenodo.5171823"])
        w.writerow(["# trial", trial_name])
        w.writerow(["# sampling_rate_hz", fs])
        w.writerow(["# units", "millivolt"])
        w.writerow(["# touchdown_s", ";".join("%.4f" % (x - t0) for x in td)])
        w.writerow(["# regenerate", "python scripts/extract_emg_demo.py"])
        w.writerow(["time_s"] + [m.lower() + "_mv" for m in want])
        for i in range(n):
            w.writerow(["%.5f" % (t[i] - t0)] +
                       ["%.6f" % frame[upper[m]][i] for m in want])
    print("wrote %s (%d rows)" % (args.out, n))


if __name__ == "__main__":
    main()
