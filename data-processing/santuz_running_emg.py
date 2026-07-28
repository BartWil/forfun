import rdata, numpy as np, json
from scipy.signal import butter, filtfilt
from rdata.parser import RObjectType as RT

# ---------- R object helpers ----------
def sym_name(tag):
    if tag is None: return None
    v = getattr(tag, 'value', None)
    if isinstance(v, bytes): return v.decode()
    if hasattr(v, 'value') and isinstance(v.value, bytes): return v.value.decode()
    return None

def pairlist_to_dict(a):
    d = {}
    while a is not None and getattr(a, 'info', None) is not None and a.info.type == RT.LIST:
        d[sym_name(a.tag)] = a.value[0]; a = a.value[1]
    return d

def attrs(o): return pairlist_to_dict(getattr(o, 'attributes', None))
def char_vec(o): return [ (e.value.decode() if isinstance(e.value, bytes) else str(e.value)) for e in o.value ]
def names_of(o):
    n = attrs(o).get('names'); return char_vec(n) if n is not None else None
def numcol(o): return np.asarray(o.value, dtype=float)

print('parsing RData...', flush=True)
p = rdata.parser.parse_file('RAW_DATA.RData')
elems = p.object.value[0].value
print('trials:', len(elems), flush=True)

# ---------- Santuz-style EMG pipeline ----------
fs = 1000.0
hp_b, hp_a = butter(4, 50/(fs/2), btype='high')
lp_b, lp_a = butter(4, 20/(fs/2), btype='low')
def envelope(x):
    x = filtfilt(hp_b, hp_a, x)     # remove motion artefact / DC
    x = np.abs(x)                   # full-wave rectify
    x = filtfilt(lp_b, lp_a, x)     # low-pass -> linear envelope
    return np.clip(x, 0, None)

MUS = ['ME','MA','FL','RF','VM','VL','ST','BF','TA','PL','GM','GL','SO']
acc = {m: [] for m in MUS}
stance_fracs = []
used_cycles = 0

for ti, trial in enumerate(elems):
    subs = trial.value
    emg = max(subs, key=lambda s: len(s.value))
    cyc = min(subs, key=lambda s: len(s.value))
    # fixed column order: Time, ME, MA, FL, RF, VM, VL, ST, BF, TA, PL, GM, GL, SO
    if len(emg.value) != 14:
        print(' skip trial', ti, 'emg cols', len(emg.value)); continue
    time = numcol(emg.value[0])
    env = {}
    for j, m in enumerate(MUS):
        e = envelope(numcol(emg.value[1+j])); mx = e.max()
        env[m] = e/mx if mx > 0 else e            # per-muscle, per-trial amplitude normalisation
    td = numcol(cyc.value[0]); lo = numcol(cyc.value[1])
    for i in range(len(td)-1):
        t0, tl, t1 = td[i], lo[i], td[i+1]
        if not (np.isfinite(t0) and np.isfinite(tl) and np.isfinite(t1)): continue
        if not (t0 < tl < t1): continue
        stance_fracs.append((tl-t0)/(t1-t0))
        used_cycles += 1
        ts = np.linspace(t0, tl, 100, endpoint=False)
        tw = np.linspace(tl, t1, 100, endpoint=False)
        for m in MUS:
            st = np.interp(ts, time, env[m])
            sw = np.interp(tw, time, env[m])
            acc[m].append(np.concatenate([st, sw]))
    if ti % 50 == 0: print(' trial', ti, 'cycles so far', used_cycles, flush=True)

grand = {m: np.mean(np.vstack(acc[m]), axis=0) for m in MUS}   # 200-pt grand average
mean_stance = float(np.mean(stance_fracs))
print('\nused cycles:', used_cycles, 'mean stance fraction:', round(mean_stance, 4))

# ---------- collapse 13 -> our 5 modelled muscles ----------
combo = {
    'Gluteus Maximus': grand['MA'],
    'Quadriceps': np.mean([grand['RF'], grand['VM'], grand['VL']], axis=0),
    'Hamstrings': np.mean([grand['ST'], grand['BF']], axis=0),
    'Gastroc / Soleus': np.mean([grand['GM'], grand['GL'], grand['SO']], axis=0),
    'Tibialis Anterior': grand['TA'],
}
# per-muscle normalise to peak = 1.0 (Santuz convention) for full visual dynamic range
for k in combo:
    mx = combo[k].max()
    if mx > 0: combo[k] = combo[k]/mx

# ---------- map 200-pt (100 stance + 100 swing) onto our 0-100% timeline ----------
b = mean_stance * 100.0   # stance/swing boundary in % of the stride
def cycle_pos(k):         # k = 0..199 -> percent 0..100
    return (k/100.0)*b if k < 100 else b + ((k-100)/100.0)*(100.0 - b)
pos = np.array([cycle_pos(k) for k in range(200)])

# resample each envelope to a uniform 0..100 grid, then simplify with RDP so real
# burst shapes survive with a minimal keyframe set.
grid = np.arange(0, 101.0, 1.0)

def perp(pt, a, b):
    # distance from pt to line a-b in (x/100, y) space
    ax, ay = a[0]/100.0, a[1]; bx, by = b[0]/100.0, b[1]; px, py = pt[0]/100.0, pt[1]
    dx, dy = bx-ax, by-ay
    L2 = dx*dx + dy*dy
    if L2 == 0: return ((px-ax)**2 + (py-ay)**2)**0.5
    t = ((px-ax)*dx + (py-ay)*dy)/L2
    cx, cy = ax+t*dx, ay+t*dy
    return ((px-cx)**2 + (py-cy)**2)**0.5

def rdp(pts, eps):
    if len(pts) < 3: return pts
    dmax, idx = 0.0, 0
    for i in range(1, len(pts)-1):
        d = perp(pts[i], pts[0], pts[-1])
        if d > dmax: dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]

out = {}
peaks = {}
for name, env in combo.items():
    dense = np.interp(grid, pos, env)
    dense[-1] = dense[0]                              # close the loop at 100%
    pts = [[float(x), round(float(y), 3)] for x, y in zip(grid, dense)]
    simp = rdp(pts, 0.02)
    out[name] = [[int(round(x)), round(y, 2)] for x, y in simp]
    peaks[name] = int(grid[int(np.argmax(dense))])

print('\npeak location (% of stride) per muscle:')
for k, v in peaks.items(): print(f'  {k:20s} peak@{v}%  max={combo[k].max():.2f}')

json.dump({'mean_stance_pct': round(b,1), 'keyframes': out, 'peaks': peaks},
          open('santuz_run.json','w'), indent=1)
print('\n--- keyframes ---')
for k, v in out.items():
    print(k, v)
