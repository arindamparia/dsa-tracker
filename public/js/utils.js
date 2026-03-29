// smoothTransition: intentionally bypasses View Transitions API to prevent
// Chrome's compositing flicker when a position:fixed background image is active.
// The theme toggle (circular clip) calls startViewTransition directly and is unaffected.
// CSS transitions on .section-body / .section-col-headers handle visual smoothness.
export function smoothTransition(cb) {
  cb();
}

export function groupBySections(questions) {
  const map = new Map();
  for (const q of questions) {
    const key = `${q.section_order}|||${q.section}`;
    if (!map.has(key)) {
      map.set(key, { section: q.section, section_order: q.section_order, questions: [] });
    }
    map.get(key).questions.push(q);
  }
  return [...map.values()].sort((a, b) => a.section_order - b.section_order);
}
