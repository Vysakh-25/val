// ball.js — clean rebuild for proper foot-contact kicking physics

export class Ball {
  constructor(x, y, r = 26) {
    this.x = x;
    this.y = y;
    this.r = r;

    this.vx = 0;
    this.vy = 0;
    this.GRAV = 0.65;
    this.onGround = false;

    // PNG override if available
    this.img = null;
  }

  update(playerX, groundY, footPos) {
    // Pin to foot when nearly still and close
    const d = Math.hypot(this.x - footPos.x, this.y - footPos.y);
    if (d < 18 && Math.abs(this.vx) < 0.5 && Math.abs(this.vy) < 0.5) {
      this.x = footPos.x + 10;
      this.y = footPos.y;
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // Gravity
    this.vy += this.GRAV;
    this.y += this.vy;

    // Horizontal movement
    this.x += this.vx;
    this.vx *= 0.985; // air drag

    // Ground collision
    if (this.y + this.r > groundY) {
      this.y = groundY - this.r;
      this.vy *= -0.38;
      this.vx *= 0.88;

      if (Math.abs(this.vy) < 0.5) {
        this.vy = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false;
    }

    // Gentle attraction to player center if ball drifts too far
    const dx = playerX - this.x;
    if (Math.abs(this.vx) < 0.5 && Math.abs(dx) > 20) {
      this.x += dx * 0.015;
    }
  }

  // The ONLY moment ball gets force — when player foot actually hits it
  applyContactImpulse(footPos, footVel) {
    // vertical impulse — main kick
    this.vy = -11 - (Math.abs(footVel.y) * 0.25);

    // horizontal impulse — derived from foot directional speed
    const kickDir = Math.sign(footVel.x) || 1;
    const power = Math.min(4.5, Math.abs(footVel.x) * 0.9 + 1);
    this.vx += kickDir * power;
  }

  draw(ctx) {
    // PNG mode
    if (this.img && this.img.complete) {
      ctx.drawImage(this.img, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
      return;
    }

    // Vector fallback (simple shaded ball)
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shadow
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.ellipse(10, this.r * 0.9, this.r * 0.9, this.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.globalAlpha = 1;

    // Ball base
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#dcdcdc";
    ctx.stroke();

    // highlight
    ctx.beginPath();
    ctx.ellipse(-this.r * 0.35, -this.r * 0.45, this.r * 0.4, this.r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();

    ctx.restore();
  }
}
