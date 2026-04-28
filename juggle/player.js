// player.js — CLEAN SIDE VIEW FOOTBALLER REBUILD
// No dependency on any previous player code.
// Emits contact events ONLY from the correct kick frame.

export class Player {
  constructor(x, feetY) {
    this.x = x;
    this.feetY = feetY;

    // proportions
    this.headR = 22;
    this.torsoW = 70;
    this.torsoH = 115;
    this.neckH = 12;

    // idle foot positions (side view)
    this.leftFoot = { x: -26, y: 10 };
    this.rightFoot = { x: 32, y: 10 }; // kicking foot

    // animation
    this.kickDuration = 16;
    this.kickTimer = 0;
    this._contactFired = false;
    this.lean = 0;

    // listeners
    this.listeners = [];
    this._lastFoot = { x: this.x + 32, y: this.feetY + 10 };
  }

  addContactListener(fn) {
    this.listeners.push(fn);
  }

  kick() {
    this.kickTimer = this.kickDuration;
    this._contactFired = false;
    this.lean = 1;
  }

  getKickFoot() {
    let fx = this.x + this.rightFoot.x;
    let fy = this.feetY + this.rightFoot.y;

    if (this.kickTimer > 0) {
      const p = 1 - (this.kickTimer / this.kickDuration);

      // thigh swing forward
      const forward = 26 * Math.sin(p * Math.PI);
      const lift = -22 * Math.sin(p * Math.PI);

      // follow-through
      const follow = 10 * Math.sin(Math.max(0, (p - 0.6) * 2) * Math.PI);

      fx += forward + follow;
      fy += lift;
    }

    return { x: fx, y: fy };
  }

  _updateAnimation() {
    if (this.kickTimer > 0) {
      this.kickTimer -= 1;
    }

    if (this.lean > 0) {
      this.lean -= 0.05;
      if (this.lean < 0) this.lean = 0;
    }

    const foot = this.getKickFoot();
    const last = this._lastFoot;
    const vel = { x: foot.x - last.x, y: foot.y - last.y };

    if (!this._contactFired && this.kickTimer > 0) {
      const p = 1 - (this.kickTimer / this.kickDuration);

      // contact window
      if (p > 0.42 && p < 0.58) {
        this._contactFired = true;
        for (const fn of this.listeners) fn(foot, vel);
      }
    }

    this._lastFoot = foot;
  }

  draw(ctx) {
    this._updateAnimation();

    const cx = this.x;
    const fy = this.feetY;

    // shadow
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.ellipse(cx + 10, fy + 20, 70, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.restore();

    // head
    ctx.fillStyle = "#f2c49a";
    ctx.beginPath();
    ctx.arc(cx - 10, fy - this.torsoH - this.headR + 10, this.headR, 0, Math.PI * 2);
    ctx.fill();

    // hair
    ctx.fillStyle = "#2a2626";
    ctx.beginPath();
    ctx.arc(cx - 10, fy - this.torsoH - this.headR + 2, this.headR * 0.85, Math.PI, 2 * Math.PI);
    ctx.fill();

    // neck
    ctx.fillStyle = "#e0a783";
    ctx.fillRect(cx - 15, fy - this.torsoH + 5, 30, this.neckH);

    // torso
    ctx.fillStyle = "#d44444";
    ctx.beginPath();
    ctx.roundRect(cx - this.torsoW / 2, fy - this.torsoH + this.neckH + 5, this.torsoW, this.torsoH, 12);
    ctx.fill();

    // rear leg
    ctx.fillStyle = "#24385f";
    ctx.beginPath();
    ctx.moveTo(cx - 10, fy - 20);
    ctx.quadraticCurveTo(cx - 38, fy - 10, cx - 32, fy - 60);
    ctx.lineTo(cx - 14, fy - 60);
    ctx.closePath();
    ctx.fill();

    // front leg thigh
    ctx.fillStyle = "#f2c49a";
    ctx.beginPath();
    ctx.moveTo(cx + 16, fy - 20);
    ctx.quadraticCurveTo(cx + 44, fy - 26, cx + 34, fy - 70);
    ctx.lineTo(cx + 18, fy - 70);
    ctx.closePath();
    ctx.fill();

    // front shin
    ctx.beginPath();
    ctx.moveTo(cx + 22, fy - 40);
    ctx.lineTo(cx + 32, fy - 40);
    ctx.lineTo(cx + 28, fy + 6);
    ctx.lineTo(cx + 18, fy + 6);
    ctx.closePath();
    ctx.fill();

    // socks
    ctx.fillStyle = "white";
    ctx.fillRect(cx + 18, fy - 10, 16, 8);

    // stripes
    ctx.fillStyle = "#0a4ec6";
    ctx.fillRect(cx + 18, fy - 9, 16, 3);
    ctx.fillRect(cx + 18, fy - 4, 16, 3);

    // back cleat
    ctx.fillStyle = "#111";
    const bf = { x: cx + this.leftFoot.x, y: fy + this.leftFoot.y };
    ctx.beginPath();
    ctx.moveTo(bf.x - 12, bf.y);
    ctx.quadraticCurveTo(bf.x - 6, bf.y - 6, bf.x + 4, bf.y - 4);
    ctx.lineTo(bf.x + 4, bf.y + 8);
    ctx.quadraticCurveTo(bf.x - 6, bf.y + 10, bf.x - 12, bf.y + 6);
    ctx.closePath();
    ctx.fill();

    // kicking cleat (animated)
    const kf = this.getKickFoot();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.moveTo(kf.x + 12, kf.y - 2);
    ctx.lineTo(kf.x - 16, kf.y - 10);
    ctx.lineTo(kf.x - 16, kf.y + 8);
    ctx.lineTo(kf.x + 12, kf.y + 8);
    ctx.closePath();
    ctx.fill();
  }
}
