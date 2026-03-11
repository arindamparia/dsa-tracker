/**
 * Central mutable state.
 *
 * Why an object instead of separate exports?
 * ES modules forbid reassigning an imported binding in another module.
 * Wrapping state in a plain object lets any module do `state.questions = [...]`
 * without breaking the live-binding contract.
 */
export const state = {
  questions:    [],    // flat array from DB / cache
  diffFilter:   'all', // 'all' | 'Easy' | 'Medium' | 'Hard'
  statusFilter: 'all', // 'all' | 'done' | 'undone'
  saveTimers:   {},    // debounce handles for solution, keyed by lc_number
  notesTimers:  {},    // debounce handles for notes, keyed by lc_number
  hideTags:     false, // toggled by toggleTags()
  hideSolution: false, // toggled by toggleSolution()
  hideNotes:    false, // toggled by toggleNotes()
};
