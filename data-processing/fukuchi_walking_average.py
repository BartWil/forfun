from remotezip import RemoteZip
import numpy as np, json
url = "https://ndownloader.figshare.com/files/10058986"

with RemoteZip(url) as z:
    names = [n for n in z.namelist() if n.lower().endswith('walkocang.txt')]
    names.sort()
    print("walkOC files:", len(names))
    files = {n: z.read(n).decode('utf-8', 'replace') for n in names}

def parse(txt):
    lines = [l for l in txt.splitlines() if l.strip()]
    hdr = lines[0].split('\t')
    col = {name: i for i, name in enumerate(hdr)}
    rows = []
    for l in lines[1:]:
        p = l.split('\t')
        vals = [float(x) if x.strip() not in ('', 'nan', 'NaN') else np.nan for x in p]
        rows.append(vals)
    m = max(len(r) for r in rows)
    M = np.array([r + [np.nan]*(m-len(r)) for r in rows])
    return col, M

# canonical curve = average over subjects AND both legs, per joint (sagittal = Z)
acc = {'hip': [], 'knee': [], 'ankle': []}
for n, txt in files.items():
    col, M = parse(txt)
    if M.shape[0] != 101:
        continue
    for side in ('R', 'L'):
        acc['hip'].append(M[:, col[side+'HipAngleZ']])
        acc['knee'].append(M[:, col[side+'KneeAngleZ']])
        acc['ankle'].append(M[:, col[side+'AnkleAngleZ']])

grand = {j: np.nanmean(np.vstack(v), axis=0) for j, v in acc.items()}
n_curves = len(acc['hip'])
print("curves averaged (subjects x legs):", n_curves)
for j in ('hip', 'knee', 'ankle'):
    c = grand[j]
    print(f"{j:6s} min={c.min():6.1f}@{c.argmin():3d}%  max={c.max():6.1f}@{c.argmax():3d}%  "
          f"start={c[0]:.1f} mid={c[50]:.1f}")

np.save('gait_grand.npy', np.vstack([grand['hip'], grand['knee'], grand['ankle']]))
print("saved gait_grand.npy")
