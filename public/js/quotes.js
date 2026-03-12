const quotes = [
  // ── Atomic Habits – James Clear ──
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear — Atomic Habits" },
  { text: "Habits are the compound interest of self-improvement.", author: "James Clear — Atomic Habits" },
  { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear — Atomic Habits" },
  { text: "The most effective form of motivation is progress.", author: "James Clear — Atomic Habits" },
  { text: "You don't have to be the victim of your environment. You can also be the architect of it.", author: "James Clear — Atomic Habits" },

  // ── The Compound Effect – Darren Hardy ──
  { text: "Small choices + consistency + time = significant results.", author: "Darren Hardy — The Compound Effect" },
  { text: "You will never change your life until you change something you do daily. The secret of your success is found in your daily routine.", author: "Darren Hardy — The Compound Effect" },
  { text: "Success is doing a half dozen things really well, repeated five thousand times.", author: "Darren Hardy — The Compound Effect" },
  { text: "The Compound Effect is the strategy of reaping huge rewards from seemingly insignificant actions.", author: "Darren Hardy — The Compound Effect" },
  { text: "It's not the big things that add up in the end; it's the hundreds, thousands, or millions of little things that separate the ordinary from the extraordinary.", author: "Darren Hardy — The Compound Effect" },
  { text: "There is nothing glamorous about it. The compound effect requires no complicated financial scheme or lottery win. It is simply consistency in the small, mundane choices.", author: "Darren Hardy — The Compound Effect" },

  // ── Tiny Habits – BJ Fogg ──
  { text: "To change your behavior for good, you need to start playing the long game.", author: "BJ Fogg — Tiny Habits" },
  { text: "Tiny is mighty. The right tiny behavior done consistently gives big results.", author: "BJ Fogg — Tiny Habits" },
  { text: "Help yourself feel successful. Emotions create habits, not repetition or reward.", author: "BJ Fogg — Tiny Habits" },
  { text: "Don't rely on motivation. Rely on a good design.", author: "BJ Fogg — Tiny Habits" },
  { text: "Simplicity changes behavior. When you make a behavior tiny, it becomes easy. When it's easy, you do it consistently.", author: "BJ Fogg — Tiny Habits" },

  // ── The Power of Habit – Charles Duhigg ──
  { text: "The difference between who you are and who you want to be is what you do.", author: "Charles Duhigg — The Power of Habit" },
  { text: "Change might not be fast and it isn't always easy. But with time and effort, almost any habit can be reshaped.", author: "Charles Duhigg — The Power of Habit" },
  { text: "Champions don't do extraordinary things. They do ordinary things, but they do them without thinking, too fast for the other team to react.", author: "Charles Duhigg — The Power of Habit" },
  { text: "If you believe you can change — if you make it a habit — the change becomes real.", author: "Charles Duhigg — The Power of Habit" },
  { text: "Once people learned how to believe in something, that skill started spilling over to other parts of their lives.", author: "Charles Duhigg — The Power of Habit" },

  // ── Mindset – Carol S. Dweck ──
  { text: "In a growth mindset, challenges are exciting rather than threatening. So rather than thinking, oh, I'm going to reveal my weaknesses, you say, wow, here's a chance to grow.", author: "Carol S. Dweck — Mindset" },
  { text: "No matter what your ability is, effort is what ignites that ability and turns it into accomplishment.", author: "Carol S. Dweck — Mindset" },
  { text: "Becoming is better than being.", author: "Carol S. Dweck — Mindset" },
  { text: "The passion for stretching yourself and sticking to it, even (or especially) when it's not going well, is the hallmark of the growth mindset.", author: "Carol S. Dweck — Mindset" },
  { text: "Why waste time proving over and over how great you are, when you could be getting better?", author: "Carol S. Dweck — Mindset" },
  { text: "Effort is one of those things that gives meaning to life.", author: "Carol S. Dweck — Mindset" },

  // ── Essentialism – Greg McKeown ──
  { text: "If you don't prioritize your life, someone else will.", author: "Greg McKeown — Essentialism" },
  { text: "The way of the Essentialist is to ruthlessly and relentlessly eliminate everything that doesn't matter so that he or she can make the highest possible contribution.", author: "Greg McKeown — Essentialism" },
  { text: "Almost everything is noise, and a very few things are exceptionally valuable. The pursuit of success can be a catalyst for failure.", author: "Greg McKeown — Essentialism" },
  { text: "The disciplined pursuit of less is the path to more.", author: "Greg McKeown — Essentialism" },
  { text: "You cannot overestimate the unimportance of practically everything.", author: "Greg McKeown — Essentialism" },

  // ── Deep Work – Cal Newport ──
  { text: "Deep work is the ability to focus without distraction on a cognitively demanding task.", author: "Cal Newport — Deep Work" },
  { text: "If you don't produce, you won't thrive — no matter how skilled or talented you are.", author: "Cal Newport — Deep Work" },
  { text: "The ability to perform deep work is becoming increasingly rare and increasingly valuable in our economy.", author: "Cal Newport — Deep Work" },
  { text: "Who you are, what you think, feel, and do, what you love — is the sum of what you focus on.", author: "Cal Newport — Deep Work" },
  { text: "Clarity about what matters provides clarity about what does not.", author: "Cal Newport — Deep Work" },
  { text: "Concentration is a skill that must be trained, not an innate gift.", author: "Cal Newport — Deep Work" },

  // ── Evergreen ──
  { text: "Success is a few simple disciplines, practiced every day; while failure is simply a few errors in judgment, repeated every day.", author: "Jim Rohn" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  { text: "First forget inspiration. Habit is more dependable. Habit will sustain you whether you're inspired or not.", author: "Octavia Butler" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "If you want to change your life, you have to change your habits.", author: "Katy Milkman — How to Change" },
];

let currentIndex = -1;

function pickQuote() {
  // avoid repeating the same quote back to back
  let idx;
  do { idx = Math.floor(Math.random() * quotes.length); } while (idx === currentIndex && quotes.length > 1);
  currentIndex = idx;
  return quotes[idx];
}

function renderQuote(quoteObj) {
  const el = document.getElementById('motivation-text');
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(6px)';
  setTimeout(() => {
    el.innerHTML = `"${quoteObj.text}" <br><span class="quote-author">— ${quoteObj.author}</span>`;
    el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }, 200);
}

export function initMotivation() {
  renderQuote(pickQuote());

  // Wire shuffle button
  const btn = document.getElementById('quote-shuffle-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      renderQuote(pickQuote());
      // brief spin animation on the icon
      btn.classList.remove('spin');
      void btn.offsetWidth;
      btn.classList.add('spin');
    });
  }
}
