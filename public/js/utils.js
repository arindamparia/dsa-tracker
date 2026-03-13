/**
 * Pure utility functions — no side effects, no imports.
 * Safe to import from any module without creating circular deps.
 */

/**
 * Executes a callback with a smooth view transition if supported.
 */
export function smoothTransition(cb) {
  if (document.startViewTransition) {
    document.startViewTransition(cb);
  } else {
    cb();
  }
}

/**
 * Groups a flat question array into sections sorted by section_order.
 * @param {Array} questions
 * @returns {Array<{section, section_order, questions}>}
 */
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
