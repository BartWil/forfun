// Sagittal-plane stick figure, forward-kinematics from a fixed hip anchor.
// This is a simplified single-limb educational abstraction (not a full multi-body simulation):
// the hip stays at a fixed horizontal position (like a figure on a treadmill / fixed camera),
// bobbing vertically per the movement's hipDrop curve, while the reference leg and trunk are
// drawn below/above it purely from the joint-angle curves. This keeps one consistent rendering
// path for stance, swing, and flight phases across all five movements.

const SEG = { foot: 0.16, shank: 0.42, thigh: 0.45, trunk: 0.56, headR: 0.09, arm: 0.46 };
const LEG_LEN = SEG.shank + SEG.thigh;

function toRad(deg) { return deg * Math.PI / 180; }

function setupCanvasDPR(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: cssW, h: cssH };
}

function drawStickFigure(canvas, state) {
  const { ctx, w: W, h: H } = setupCanvasDPR(canvas);
  ctx.clearRect(0, 0, W, H);

  const groundY = H - 34;
  const scale = (H - 90) / (LEG_LEN + SEG.trunk + SEG.headR * 2);
  const cx = W / 2;

  ctx.strokeStyle = "#22304a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, groundY);
  ctx.lineTo(W - 24, groundY);
  ctx.stroke();

  const { hipAngle, kneeAngle, ankleAngle, trunkLean, hipDrop, grf } = state;

  const hip = { x: cx, y: groundY - LEG_LEN * scale + hipDrop * scale };

  const thighTilt = trunkLean + hipAngle;
  const knee = {
    x: hip.x + SEG.thigh * scale * Math.sin(toRad(thighTilt)),
    y: hip.y + SEG.thigh * scale * Math.cos(toRad(thighTilt)),
  };

  const shankTilt = thighTilt - kneeAngle;
  const ankle = {
    x: knee.x + SEG.shank * scale * Math.sin(toRad(shankTilt)),
    y: knee.y + SEG.shank * scale * Math.cos(toRad(shankTilt)),
  };

  const footTilt = shankTilt + (90 - ankleAngle);
  const footTip = {
    x: ankle.x + SEG.foot * scale * Math.sin(toRad(footTilt)),
    y: ankle.y + SEG.foot * scale * Math.cos(toRad(footTilt)),
  };

  const shoulder = {
    x: hip.x - SEG.trunk * scale * Math.sin(toRad(trunkLean)),
    y: hip.y - SEG.trunk * scale * Math.cos(toRad(trunkLean)),
  };

  const headCenter = {
    x: shoulder.x - SEG.headR * 0.85 * scale * Math.sin(toRad(trunkLean)),
    y: shoulder.y - SEG.headR * 0.85 * scale * Math.cos(toRad(trunkLean)),
  };

  const armTilt = trunkLean - hipAngle * 0.45;
  const hand = {
    x: shoulder.x + SEG.arm * scale * Math.sin(toRad(armTilt)),
    y: shoulder.y + SEG.arm * scale * Math.cos(toRad(armTilt)),
  };

  // GRF arrow (ground reaction force), rooted at the foot, scaled in body-weights.
  if (grf > 0.03) {
    const arrowLen = grf * LEG_LEN * 0.55 * scale;
    ctx.strokeStyle = "#5eead4";
    ctx.fillStyle = "#5eead4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ankle.x, groundY);
    ctx.lineTo(ankle.x, groundY - arrowLen);
    ctx.stroke();
    ctx.beginPath();
    const ah = 7;
    ctx.moveTo(ankle.x, groundY - arrowLen - ah);
    ctx.lineTo(ankle.x - ah * 0.6, groundY - arrowLen + 2);
    ctx.lineTo(ankle.x + ah * 0.6, groundY - arrowLen + 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#e8edf7";
  ctx.lineWidth = 6;

  function seg(a, b) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  seg(ankle, footTip);
  seg(ankle, knee);
  seg(knee, hip);
  seg(hip, shoulder);
  seg(shoulder, hand);

  ctx.fillStyle = "#e8edf7";
  [hip, knee, ankle, shoulder].forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#e8edf7";
  ctx.beginPath();
  ctx.arc(headCenter.x, headCenter.y, SEG.headR * scale, 0, Math.PI * 2);
  ctx.fill();
}
