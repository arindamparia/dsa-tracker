/**
 * Scroll-reveal: stat cards fade+slide up as they enter the viewport.
 * Uses Motion.dev inView — zero scroll jank, purely additive.
 */
import { animate, inView, stagger } from './motion.js';

export function initReveal() {
  const cards = document.querySelectorAll('.stat-card');
  if (!cards.length) return;

  // Start cards invisible
  cards.forEach(card => { card.style.opacity = '0'; card.style.transform = 'translateY(16px)'; });

  const container = cards[0].closest('.stats-board') || cards[0].closest('.top-stats') || cards[0].parentElement;

  inView(container, () => {
    animate(
      cards,
      { opacity: [0, 1], y: [16, 0] },
      { duration: 0.45, easing: 'ease-out', delay: stagger(0.055) }
    );
  }, { amount: 0.15 });
}
