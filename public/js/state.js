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
  hideTags:     true, // toggled by toggleTags()
  hideSolution: true, // toggled by toggleSolution()
  hideNotes:    false, // toggled by toggleNotes()
  focusTopic:      null,  // current topic for focus mode
  focusActive:     false, // whether focus mode is currently active
  companyFilter:   null,  // company name string | null
  hideCompanies:   true,  // toggled by toggleCompanies()
  isSubscribed:     false,  // set from get-questions response; gates AI features
  remindersEnabled: false,  // email reminder opt-in
  reminderEmail:    null,   // custom reminder send-to email (null = use account email)
  userName:         null,   // user's display name
  userPhone:        null,   // user's phone with country code
  userRole:         'USER', // 'USER' | 'ADMIN'
};
