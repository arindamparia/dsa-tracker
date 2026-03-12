const quotes = [
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear, Atomic Habits" },
  { text: "Habits are the compound interest of self-improvement.", author: "James Clear, Atomic Habits" },
  { text: "Success is a few simple disciplines, practiced every day; while failure is simply a few errors in judgment, repeated every day.", author: "Jim Rohn" },
  { text: "The difference between who you are and who you want to be is what you do.", author: "Charles Duhigg, The Power of Habit" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "Small choices + consistency + time = significant results.", author: "Darren Hardy, The Compound Effect" },
  { text: "To change your behavior for good, you need to start playing the long game.", author: "BJ Fogg, Tiny Habits" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear, Atomic Habits" },
  { text: "Change might not be fast and it isn't always easy. But with time and effort, almost any habit can be reshaped.", author: "Charles Duhigg, The Power of Habit" },
  { text: "If you want to change your life, you have to change your habits.", author: "Katy Milkman, How to Change" },
  { text: "First forget inspiration. Habit is more dependable. Habit will sustain you whether you're inspired or not.", author: "Octavia Butler" }
];

export function initMotivation() {
  const quoteObj = quotes[Math.floor(Math.random() * quotes.length)];
  const el = document.getElementById('motivation-text');
  if (el) {
    el.innerHTML = `“${quoteObj.text}” <br><span style="font-size:0.85em; opacity:0.7; margin-top:4px; display:inline-block">— ${quoteObj.author}</span>`;
  }
}
