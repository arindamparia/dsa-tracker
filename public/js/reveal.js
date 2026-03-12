/**
 * Scroll-reveal: stat cards fade+slide up as they enter the viewport.
 * Uses IntersectionObserver — zero scroll jank, purely additive.
 */
export function initReveal() {
  const cards = document.querySelectorAll('.stat-card');
  if (!cards.length || !('IntersectionObserver' in window)) return;

  // Mark cards ready (starts them invisible via CSS)
  cards.forEach((card, i) => {
    card.classList.add('reveal-ready');
    // Stagger delay via inline style so each card pops in sequence
    card.style.transitionDelay = `${i * 55}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target); // fire once
        }
      });
    },
    { threshold: 0.15 }
  );

  cards.forEach((card) => observer.observe(card));
}
