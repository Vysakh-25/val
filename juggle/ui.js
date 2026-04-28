// minimalist UI helpers
export function setMessage(text) {
  const el = document.getElementById('ui');
  if (el) el.textContent = text;
}

export function drawHUD(ctx, w, score, combo, best) {
  ctx.fillStyle = '#222';
  ctx.font = '20px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Score: ${score}`, w - 18, 28);
  ctx.fillText(`Combo: x${combo}`, w - 18, 56);

  ctx.textAlign = 'left';
  ctx.fillText(`Best combo: x${best}`, 18, 56);
}
