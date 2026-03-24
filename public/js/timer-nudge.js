/**
 * Physics-based cursor interaction for the hanging timer widget.
 *
 * Model: damped harmonic oscillator driven by cursor proximity.
 *   α = -ω₀²(θ - θ_target) - β·ω
 *
 * Behaviours:
 *  - Idle: completely still — no animation running
 *  - Cursor enters widget: leans toward cursor (2D direction, not just horizontal)
 *  - Fast sweep: angular impulse from cursor velocity
 *  - Cursor leaves: springs back to 0°, loop stops once settled
 *  - Touch: touchstart / touchmove / touchend
 *  - Rope geometry: lower-side rope lengthens, upper-side shortens
 */
export function initTimerNudge() {
  const body = document.querySelector('.timer-body');
  const hang = document.querySelector('.timer-hang');
  if (!body || !hang) return;

  body.style.animation = 'none';

  // tuning
  const OMEGA_SQ   = 1.20;   // natural frequency²
  const DAMPING    = 1.65;   // slightly underdamped: gentle spring-back
  const MAX_TILT   = 0.18;   // ~10° max lean
  const LEAN_RANGE = 80;     // px — horizontal range for full tilt saturation
  const IMPULSE    = 0.00015;// velocity kick from cursor sweeps
  const ROPE_BASE  = 60;     // px — resting rope height
  // Rope lever arm = distance from pivot (body centre) to the rope anchor on the body.
  // The CSS anchors are at left:28px / right:28px from the body edges.
  // Lever arm = body_width/2 - 28.  Computed once from live DOM width.
  const bodyWidth  = body.getBoundingClientRect().width;
  const ROPE_LEVER = Math.max(bodyWidth / 2 - 28, 10); // fallback 10 if not yet painted

  // state
  let theta   = 0;
  let omega   = 0;
  let cursorX = null;
  let cursorY = null;
  let prevX   = null;
  let prevY   = null;
  let isNear  = false;
  let rafId   = null;
  let lastTs  = null;

  // helpers
  function applyRopes(th) {
    // When leaning RIGHT (th > 0): left anchor drops → left rope LONGER
    //                              right anchor rises → right rope SHORTER
    // ROPE_LEVER = distance from pivot to anchor (body_width/2 − 28), NOT just 28.
    // CSS rotate(+θ) = clockwise = right top drops, left top rises = lean RIGHT
    // → right rope LONGER, left rope SHORTER
    // d = ROPE_LEVER × sin(θ): positive when θ > 0 (lean right)
    const d = ROPE_LEVER * Math.sin(th);
    hang.style.setProperty('--rope-left-h',  `${(ROPE_BASE - d).toFixed(1)}px`);
    hang.style.setProperty('--rope-right-h', `${(ROPE_BASE + d).toFixed(1)}px`);
  }

  function startLoop() {
    if (rafId) return;
    lastTs = null;
    rafId  = requestAnimationFrame(tick);
  }

  // physics loop
  function tick(ts) {
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;

    let target = 0;

    if (isNear && cursorX !== null && cursorY !== null) {
      const rect   = body.getBoundingClientRect();
      const pivotX = rect.left + rect.width * 0.5;
      const pivotY = rect.top;
      const dx     = cursorX - pivotX;
      const dy     = cursorY - pivotY;

      // 2D lean: angle from "straight down" axis to cursor position
      // atan2(dx, dy) = 0 when cursor is directly below,
      //               = ±90° when cursor is directly left/right at pivot height,
      //               = ±180° when cursor is directly above
      // This means: upper-left → strong left lean; lower-left → moderate left lean
      const rawAngle = Math.atan2(dx, Math.abs(dy) < 10 ? 10 : dy);
      target = Math.max(-MAX_TILT, Math.min(MAX_TILT, rawAngle));

      // Velocity impulse: horizontal + vertical reinforcement in same lean direction
      if (prevX !== null && prevY !== null) {
        const vx = (cursorX - prevX) / dt;
        const vy = (cursorY - prevY) / dt;

        // Horizontal kick (primary)
        omega += vx * IMPULSE;

        // Vertical kick: only when it reinforces the lean direction
        // cursor upper-left (dx<0) moving up (vy<0) → lean left more (omega–)
        // cursor upper-right (dx>0) moving up (vy<0) → lean right more (omega+)
        // cursor lower-* moving down: no extra kick (avoids fighting the spring)
        if (vy < 0) {
          omega += -vy * (dx / LEAN_RANGE) * IMPULSE * 0.35;
        }
      }
    }

    // Damped spring
    const alpha = -OMEGA_SQ * (theta - target) - DAMPING * omega;
    omega += alpha * dt;
    theta += omega * dt;
    theta  = Math.max(-0.25, Math.min(0.25, theta));

    body.style.transform = `rotate(${(theta * 180 / Math.PI).toFixed(3)}deg)`;
    applyRopes(theta);

    // Stop loop when fully settled and cursor is gone
    if (!isNear && Math.abs(theta) < 0.0003 && Math.abs(omega) < 0.0003) {
      theta = 0; omega = 0;
      body.style.transform = 'rotate(0deg)';
      applyRopes(0);
      rafId  = null;
      lastTs = null;
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  // mouse
  body.addEventListener('mouseenter', () => {
    isNear = true;
    startLoop();
  });

  body.addEventListener('mouseleave', () => {
    isNear = false;
  });

  document.addEventListener('mousemove', e => {
    prevX   = cursorX;
    prevY   = cursorY;
    cursorX = e.clientX;
    cursorY = e.clientY;
  });

  // touch
  body.addEventListener('touchstart', e => {
    prevX   = cursorX;   prevY   = cursorY;
    cursorX = e.touches[0].clientX;
    cursorY = e.touches[0].clientY;
    isNear  = true;
    startLoop();
  }, { passive: true });

  body.addEventListener('touchmove', e => {
    prevX   = cursorX;   prevY   = cursorY;
    cursorX = e.touches[0].clientX;
    cursorY = e.touches[0].clientY;
  }, { passive: true });

  body.addEventListener('touchend', () => {
    isNear = false;
  });
}
