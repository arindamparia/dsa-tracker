// Direction-aware hover nudge for the hanging timer widget
export function initTimerNudge() {
  const body = document.querySelector('.timer-body');
  if (!body) return;

  const NUDGE_CLASSES = ['nudge-right', 'nudge-left', 'nudge-bottom'];

  body.addEventListener('mouseenter', (e) => {
    const rect = body.getBoundingClientRect();
    const x = e.clientX - rect.left;   // 0..width
    const y = e.clientY - rect.top;    // 0..height

    // Distances from each edge
    const fromLeft   = x;
    const fromRight  = rect.width - x;
    const fromBottom = rect.height - y;
    // (top is fixed, widget hangs — skip top entry)

    // Find the closest edge
    const min = Math.min(fromLeft, fromRight, fromBottom);

    // Clear previous class first
    NUDGE_CLASSES.forEach(c => body.classList.remove(c));

    // Force a reflow so removing+re-adding the same class re-triggers animation
    void body.offsetWidth;

    if (min === fromRight)  body.classList.add('nudge-right');
    else if (min === fromLeft)  body.classList.add('nudge-left');
    else                        body.classList.add('nudge-bottom');
  });

  // After animation ends, remove the nudge class so idle swing can resume
  body.addEventListener('animationend', () => {
    NUDGE_CLASSES.forEach(c => body.classList.remove(c));
  });
}
