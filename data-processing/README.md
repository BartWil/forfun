# Data processing

Offline Python scripts that turn public open-access datasets into the small
keyframe arrays embedded in the site. You do **not** need to run these to use the
site — the outputs are already baked into `data.js` (running EMG) and
`gait3d.js` (walking kinematics). Run them only to regenerate or tweak that data.

## Setup

```bash
pip install numpy scipy pyreadr rdata remotezip
```

## Scripts

### `santuz_running_emg.py` — running muscle activation
- Downloads `RAW_DATA.RData` (~183 MB) from Santuz et al. 2018
  (Zenodo record 6655800, doi:10.5281/zenodo.1254380).
- Pipeline replicating the paper: 50 Hz high-pass → full-wave rectify → 20 Hz
  low-pass envelope → per-muscle amplitude normalisation → each gait cycle
  time-normalised to 100 stance + 100 swing points → averaged over ~11,388
  cycles from 135 adults.
- Collapses the 13 recorded channels into our 5 modelled muscles and prints
  RDP-simplified keyframes. Output was pasted into `data.js` → `MOVEMENTS.run.muscles`.
- Note: expects `RAW_DATA.RData` in the working directory (the script downloads it).

### `fukuchi_walking_average.py` — walking joint angles (averaging)
- Streams only the `*walkOCang.txt` files (overground, comfortable speed; 42
  subjects) out of the 585 MB `WBDSascii.zip` via HTTP range requests
  (`remotezip`) — no full download. Fukuchi et al. 2018, PeerJ 6:e4640,
  figshare 5722711.
- Averages the sagittal (Z-axis) hip / knee / ankle angles over all subjects and
  both legs (84 curves) → `gait_grand.npy` (3 × 101 points).

### `fukuchi_walking_keyframes.py` — walking keyframes
- Reads `gait_grand.npy`, closes the loop, RDP-simplifies. (The site actually
  embeds the full 101-point arrays; see `gait3d.js` → `GAIT`.)

## Where the outputs live in the site
- Running muscle activation → `data.js`, `MOVEMENTS.run.muscles`.
- Walking hip/knee/ankle → `gait3d.js`, the `GAIT` constant.
