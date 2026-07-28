import numpy as np, json
G = np.load('gait_grand.npy')   # [hip, knee, ankle] x 101
names = ['hip', 'knee', 'ankle']

def perp(pt, a, b, xs, ys):
    ax, ay = a[0]/xs, a[1]/ys; bx, by = b[0]/xs, b[1]/ys; px, py = pt[0]/xs, pt[1]/ys
    dx, dy = bx-ax, by-ay; L2 = dx*dx+dy*dy
    if L2 == 0: return ((px-ax)**2+(py-ay)**2)**.5
    t = ((px-ax)*dx+(py-ay)*dy)/L2; cx, cy = ax+t*dx, ay+t*dy
    return ((px-cx)**2+(py-cy)**2)**.5

def rdp(pts, eps, xs, ys):
    if len(pts) < 3: return pts
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        d = perp(pts[i], pts[0], pts[-1], xs, ys)
        if d > dmax: dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[:idx+1], eps, xs, ys)[:-1] + rdp(pts[idx:], eps, xs, ys)
    return [pts[0], pts[-1]]

out = {}
for j, name in enumerate(names):
    c = G[j].copy()
    c[-1] = c[0]                      # close loop (100% == 0%)
    ys = max(1.0, c.max()-c.min())
    pts = [[float(x), float(round(c[x], 2))] for x in range(101)]
    simp = rdp(pts, 0.012, 100.0, ys)
    out[name] = [[int(round(x)), round(y, 1)] for x, y in simp]
    print(f"{name}: {len(out[name])} keyframes")
    print("  ", out[name])

json.dump(out, open('gait_keyframes.json', 'w'), indent=1)
