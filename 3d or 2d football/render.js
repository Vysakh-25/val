// render.js
// Rendering and projection utilities for the modular football prototype.

export function createCanvasAndContext(){
  const c = document.createElement('canvas');
  c.id = '__football_canvas';
  Object.assign(c.style, {
    position:'fixed',
    inset:'0',
    width:'100%',
    height:'100%',
    zIndex:2147483647,
    background:'#0b6a11',
    cursor:'none'
  });
  document.body.style.margin = '0';
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  return { c, ctx };
}

export function resizeCanvas(c, state){
  c.width = innerWidth; c.height = innerHeight;
  state.cx = c.width/2;
  state.cy = c.height * 0.42;
  state.c = c;
  state.ctx = c.getContext('2d');
}

// project a world point to screen using the camera in state
export function project(p, state){
  const F = 900;
  const camY = 140;
  const camZ = -360;
  const dz = p.z - camZ;
  const scale = F / (dz + 0.0001);
  return {
    x: state.cx + p.x * scale,
    y: state.cy - (p.y - camY) * scale,
    s: scale
  };
}

// helper: draw a 3D-filled trapezoid type panel given four world corners
function fillPanel(ctx, proj, corners, fillStyle, strokeStyle, lineWidth=1){
  const ps = corners.map(c => proj(c));
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(ps[0].x, ps[0].y);
  for (let i=1;i<ps.length;i++) ctx.lineTo(ps[i].x, ps[i].y);
  ctx.closePath();
  ctx.fill();
  if (strokeStyle){
    ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth;
    ctx.beginPath(); ctx.moveTo(ps[0].x, ps[0].y);
    for (let i=1;i<ps.length;i++) ctx.lineTo(ps[i].x, ps[i].y);
    ctx.closePath(); ctx.stroke();
  }
}

// draw the whole field including barriers, center circle (slanted), and goals
export function drawField(ctx, project, field, state){
  // background
  ctx.fillStyle = '#0b6a11';
  ctx.fillRect(0,0, state.c.width, state.c.height);

  // projection helper bound
  const proj = (p) => project(p, state);

  // stripes - world-space quads
  const stripeCount = 24;
  for (let i=0;i<stripeCount;i++){
    const z0 = (i/stripeCount) * field.h;
    const z1 = ((i+1)/stripeCount) * field.h;
    const alpha = (i%2===0) ? 0.02 : 0.06;
    const poly = [
      { x:-field.w/2, y:0, z:z0 },
      { x: field.w/2, y:0, z:z0 },
      { x: field.w/2, y:0, z:z1 },
      { x:-field.w/2, y:0, z:z1 },
    ];
    fillPanel(ctx, proj, poly, `rgba(0,0,0,${alpha})`, null);
  }

  // perspective lines across field
  for (let i=0;i<=18;i++){
    const z = (i/18) * field.h;
    const L = proj({ x:-field.w/2, y:0, z });
    const R = proj({ x: field.w/2, y:0, z });
    ctx.strokeStyle = i%6===0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(R.x, R.y); ctx.stroke();
  }

  // draw sidelines (thin white lines)
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3;
  const leftTop = proj({x:-field.w/2,y:0,z:0});
  const leftBot = proj({x:-field.w/2,y:0,z:field.h});
  const rightTop = proj({x:field.w/2,y:0,z:0});
  const rightBot = proj({x:field.w/2,y:0,z:field.h});
  ctx.beginPath(); ctx.moveTo(leftTop.x,leftTop.y); ctx.lineTo(leftBot.x,leftBot.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rightTop.x,rightTop.y); ctx.lineTo(rightBot.x,rightBot.y); ctx.stroke();

  // center line
  const c1 = proj({x:-field.w/2,y:0,z:field.h/2});
  const c2 = proj({x:field.w/2,y:0,z:field.h/2});
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(c1.x,c1.y); ctx.lineTo(c2.x,c2.y); ctx.stroke();

  // center circle (true 3D slanted ring)
  drawCenterCircleWorld(ctx, proj, { x:0, y:0, z: field.h/2 }, 40);

  // penalty boxes (slanted outlines)
  const pbDepth = 120; const pbWidth = 200;
  drawRectWorldCentered(ctx, proj, { x:0, y:0, z: pbDepth/2 }, pbWidth, pbDepth);
  drawRectWorldCentered(ctx, proj, { x:0, y:0, z: field.h - pbDepth/2 }, pbWidth, pbDepth);
  drawPenaltyArc(ctx, proj, pbDepth + 6, true);
  drawPenaltyArc(ctx, proj, field.h - pbDepth - 6, false);

  // sponsor barriers: draw them BEFORE goals so goals render on top
  drawSponsorBarriers(ctx, proj, field, state);

  // draw goalposts (front and back) with nets AFTER barriers
  drawGoal(ctx, proj, 10, field);
  drawGoal(ctx, proj, field.h - 10, field);
}

// draw an actual slanted center circle by sampling points in world-space and projecting
function drawCenterCircleWorld(ctx, proj, center, radiusWorld){
  const segments = 48;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i=0;i<=segments;i++){
    const a = (i/segments) * Math.PI*2;
    const wx = center.x + Math.cos(a) * radiusWorld;
    const wz = center.z + Math.sin(a) * radiusWorld;
    const p = proj({ x: wx, y: 0, z: wz });
    if (i===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  // center point
  const pc = proj(center);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(pc.x, pc.y, 2, 0, Math.PI*2); ctx.fill();
}

// draw rectangle world centered (outline)
function drawRectWorldCentered(ctx, proj, center, w, d){
  const hw = w/2, hd = d/2;
  const corners = [
    { x: center.x - hw, y:0, z: center.z - hd },
    { x: center.x + hw, y:0, z: center.z - hd },
    { x: center.x + hw, y:0, z: center.z + hd },
    { x: center.x - hw, y:0, z: center.z + hd },
  ];
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
  const ps = corners.map(c => proj(c));
  ctx.beginPath(); ctx.moveTo(ps[0].x, ps[0].y);
  for (let i=1;i<ps.length;i++) ctx.lineTo(ps[i].x, ps[i].y);
  ctx.closePath(); ctx.stroke();
}

// penalty arc (slanted)
function drawPenaltyArc(ctx, proj, zCenter, isNear){
  const worldRadius = 40;
  const segments = 20;
  const start = isNear ? -Math.PI/2 - Math.PI/3 : -Math.PI/2 + Math.PI/3;
  const end = isNear ? -Math.PI/2 + Math.PI/3 : -Math.PI/2 - Math.PI/3;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i=0;i<=segments;i++){
    const t = i/segments;
    const a = start + (end - start) * t;
    const wx = Math.cos(a) * worldRadius;
    const wz = zCenter + Math.sin(a) * worldRadius;
    const p = proj({ x: wx, y:0, z: wz });
    if (i===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

// draw a 3d goal (front at zPos). field passed for dimension context.
function drawGoal(ctx, proj, zPos, field){
  const gw = field.goalWidth || 120;
  const gd = field.goalDepth || 28;
  const dir = (zPos < field.h/2) ? 1 : -1;
  const zFront = zPos;
  const zBack = zPos + dir * gd;

  const corners = {
    lf: { x:-gw/2, y:0, z:zFront },
    rf: { x: gw/2, y:0, z:zFront },
    lb: { x:-gw/2, y:0, z:zBack },
    rb: { x: gw/2, y:0, z:zBack },
  };

  const Pf = proj(corners.lf), Pr = proj(corners.rf);
  // ground line (front)
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(Pf.x, Pf.y); ctx.lineTo(Pr.x, Pr.y); ctx.stroke();

  const postHeight = 34;
  const topLf = proj({ x: corners.lf.x, y: postHeight, z: corners.lf.z });
  const topRf = proj({ x: corners.rf.x, y: postHeight, z: corners.rf.z });

  // vertical posts
  ctx.beginPath(); ctx.moveTo(Pf.x,Pf.y); ctx.lineTo(topLf.x, topLf.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(Pr.x,Pr.y); ctx.lineTo(topRf.x, topRf.y); ctx.stroke();
  // crossbar
  ctx.beginPath(); ctx.moveTo(topLf.x, topLf.y); ctx.lineTo(topRf.x, topRf.y); ctx.stroke();

  // back top edges and net mesh
  ctx.lineWidth = 2;
  const topLb = proj({ x: corners.lb.x, y: postHeight, z: corners.lb.z });
  const topRb = proj({ x: corners.rb.x, y: postHeight, z: corners.rb.z });
  ctx.beginPath();
  ctx.moveTo(topLf.x, topLf.y); ctx.lineTo(topLb.x, topLb.y);
  ctx.lineTo(topRb.x, topRb.y); ctx.lineTo(topRf.x, topRf.y);
  ctx.stroke();

  // net mesh lines - light and subtle
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  const meshCols = 8, meshRows = 6;
  for (let i=0;i<=meshCols;i++){
    const t = i/meshCols;
    const fx = corners.lf.x + (corners.rf.x - corners.lf.x) * t;
    const fz = corners.lf.z;
    const bx = corners.lb.x + (corners.rb.x - corners.lb.x) * t;
    const bz = corners.lb.z;
    for (let r=0;r<=meshRows;r++){
      const rt = r/meshRows;
      const sx = fx + (bx-fx)*rt;
      const sz = fz + (bz-fz)*rt;
      const pA = proj({ x:sx, y:0, z:sz });
      if (r < meshRows){
        const rt2 = (r+1)/meshRows;
        const sx2 = fx + (bx-fx)*rt2; const sz2 = fz + (bz-fz)*rt2;
        const pB = proj({ x:sx2, y:0, z:sz2 });
        ctx.beginPath(); ctx.moveTo(pA.x,pA.y); ctx.lineTo(pB.x,pB.y); ctx.stroke();
      }
    }
  }
  for (let r=0;r<=meshRows;r++){
    const rt = r/meshRows;
    const fx = corners.lf.x, fz = corners.lf.z, bx = corners.lb.x, bz = corners.lb.z;
    const sx = fx + (bx-fx)*rt, sz = fz + (bz-fz)*rt;
    const ex = corners.rf.x + (corners.rb.x - corners.rf.x)*rt, ez = corners.rf.z + (corners.rb.z - corners.rf.z)*rt;
    const pA = proj({ x:sx,y:0,z:sz }), pB = proj({ x:ex,y:0,z:ez });
    ctx.beginPath(); ctx.moveTo(pA.x,pA.y); ctx.lineTo(pB.x,pB.y); ctx.stroke();
  }
}

// Draw sponsor barriers that act as pitch boundaries.
// We'll draw four runs of panels along left, right, near and far edges.
// panels are slightly raised above ground and have sponsor rectangles and text.
function drawSponsorBarriers(ctx, proj, field, state){
  const wallHeight = 18; // world units above ground
  const panelDepth = 8;  // thickness/depth of barrier
  const sponsorColors = ['#e63946','#ffb703','#457b9d','#2a9d8f'];
  const sponsors = ['ACME', 'NEXUS', 'EKART', 'SOLID'];

  function drawSide(isLeft){
    const xEdge = isLeft ? -field.w/2 - 6 : field.w/2 + 6; // slightly outside line
    const xInner = isLeft ? -field.w/2 + 6 : field.w/2 - 6;
    const zSegments = 12;
    for (let i=0;i<zSegments;i++){
      const z0 = (i/zSegments) * field.h;
      const z1 = ((i+1)/zSegments) * field.h;
      const corners = [
        { x: xEdge,    y:0, z: z0 },
        { x: xEdge,    y:0, z: z1 },
        { x: xInner,   y:0, z: z1 },
        { x: xInner,   y:0, z: z0 },
      ];
      const topCorners = corners.map(c => ({ x:c.x, y: wallHeight, z:c.z }));
      fillPanel(ctx, proj, [ corners[2], corners[3], topCorners[3], topCorners[2] ],
                'rgba(18,65,18,0.16)', 'rgba(0,0,0,0.06)', 1);
      const color = sponsorColors[i % sponsorColors.length];
      fillPanel(ctx, proj, topCorners, color, 'rgba(0,0,0,0.06)', 1);
      const center = { x:(corners[0].x+corners[2].x)/2, y: wallHeight+0.5, z:(z0+z1)/2 };
      const pcenter = proj(center);
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `${Math.max(10, 8 * (pcenter.s))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(sponsors[i % sponsors.length], pcenter.x, pcenter.y);
      ctx.restore();
    }
  }

  function drawAcross(isNear){
    const zEdge = isNear ? -8 : field.h + 8;
    const zInner = isNear ? 6 : field.h - 6;
    const xSegments = 10;
    for (let i=0;i<xSegments;i++){
      const x0 = -field.w/2 + (i/xSegments) * field.w;
      const x1 = -field.w/2 + ((i+1)/xSegments) * field.w;
      const corners = [
        { x:x0, y:0, z:zEdge },
        { x:x1, y:0, z:zEdge },
        { x:x1, y:0, z:zInner },
        { x:x0, y:0, z:zInner },
      ];
      const topCorners = corners.map(c=>({x:c.x,y:wallHeight,z:c.z}));
      const color = sponsorColors[i % sponsorColors.length];
      fillPanel(ctx, proj, topCorners, color, 'rgba(0,0,0,0.06)', 1);
      const center = { x:(x0+x1)/2, y:wallHeight+0.5, z:(zEdge+zInner)/2 };
      const pcenter = proj(center);
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `${Math.max(10, 8 * (pcenter.s))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(sponsors[i % sponsors.length], pcenter.x, pcenter.y);
      ctx.restore();
    }
  }

  drawSide(true);
  drawSide(false);
  drawAcross(true);
  drawAcross(false);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  const pA = proj({x:-field.w/2-12,y:0,z:0}); const pB = proj({x:field.w/2+12,y:0,z:0});
  ctx.beginPath(); ctx.moveTo(pA.x,pA.y); ctx.lineTo(pB.x,pB.y); ctx.stroke();
  const pC = proj({x:-field.w/2-12,y:0,z:field.h}); const pD = proj({x:field.w/2+12,y:0,z:field.h});
  ctx.beginPath(); ctx.moveTo(pC.x,pC.y); ctx.lineTo(pD.x,pD.y); ctx.stroke();
}

// draw player; accepts a bound project function
export function drawPlayer(ctx, projectFn, p, label){
  const proj = projectFn(p);
  const size = Math.max(6, Math.min(140, 10 * proj.s));
  const shadow = projectFn({ x:p.x, y:0.1, z:p.z });
  ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y + 6, size * 1.05, size * 0.62, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.26)'; ctx.fill();
  ctx.beginPath(); ctx.fillStyle = p.color; ctx.arc(proj.x, proj.y - size*0.12, size*0.6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.fillStyle = '#222'; ctx.arc(proj.x, proj.y - size*0.45, size*0.28, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = `${Math.max(10, size*0.22)}px monospace`; ctx.textAlign = 'center';
  ctx.fillText(label, proj.x, proj.y + size*0.88);
}

// draw ball; accepts bound project function
export function drawBall(ctx, projectFn, b){
  const proj = projectFn(b);
  const size = Math.max(4, Math.min(80, 6 * proj.s));
  const shadow = projectFn({ x:b.x, y:0.05, z:b.z });
  ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y + 6, size * 1.1, size * 0.75, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
  ctx.beginPath(); ctx.fillStyle = b.color; ctx.arc(proj.x, proj.y - size*0.1, size*0.9, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.stroke();
}
