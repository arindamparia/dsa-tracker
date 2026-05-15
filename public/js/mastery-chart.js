/**
 * Topic Mastery Map — Canvas radar/spider chart.
 *
 * Groups questions by topic, computes mastery % per topic,
 * draws a radar chart in a modal.
 */
import { state } from './state.js';
import { lockScroll, unlockScroll } from './utils.js';

function getSectionStats() {
  const map = new Map();
  for (const q of state.questions) {
    const t = q.section || 'Other';
    if (!map.has(t)) map.set(t, { total: 0, done: 0 });
    const s = map.get(t);
    s.total++;
    if (q.is_done) s.done++;
  }
  // Filter to sections with ≥ 2 questions
  const sections = [];
  for (const [name, s] of map) {
    if (s.total >= 2) {
      sections.push({ name, total: s.total, done: s.done, pct: Math.round((s.done / s.total) * 100) });
    }
  }
  // Sort alphabetically for stable layout
  sections.sort((a, b) => a.name.localeCompare(b.name));
  return sections;
}

/** Draw text with automatic 2-line word-wrap if it exceeds maxW. */
function drawWrappedLabel(ctx, text, lx, ly, maxW) {
  if (ctx.measureText(text).width <= maxW) {
    ctx.fillText(text, lx, ly);
    return;
  }
  // Find the best split point
  const words = text.split(' ');
  let line1 = words[0], line2 = words.slice(1).join(' ');
  for (let i = words.length - 1; i >= 1; i--) {
    const candidate = words.slice(0, i).join(' ');
    if (ctx.measureText(candidate).width <= maxW) {
      line1 = candidate;
      line2 = words.slice(i).join(' ');
      break;
    }
  }
  ctx.fillText(line1, lx, ly - 7);
  ctx.fillText(line2, lx, ly + 7);
}

function drawRadar(sections) {
  const canvas = document.getElementById('mastery-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(canvas.parentElement.offsetWidth - 16, 640);
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.30;
  const n = sections.length;

  if (n < 3) {
    ctx.fillStyle = '#6b6b85';
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Need at least 3 sections with ≥2 problems', cx, cy);
    return;
  }

  const angleStep = (Math.PI * 2) / n;

  // Draw concentric rings at 25%, 50%, 75%, 100%
  [0.25, 0.5, 0.75, 1.0].forEach(pct => {
    const r = radius * pct;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(42,42,56,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Percentage label at 12 o'clock position
    if (pct < 1) {
      ctx.fillStyle = '#4a4a60';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(pct * 100) + '%', cx + 2, cy - r + 12);
    }
  });

  // Draw spokes
  for (let i = 0; i < n; i++) {
    const angle = i * angleStep - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    ctx.strokeStyle = 'rgba(42,42,56,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw data polygon
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const angle = idx * angleStep - Math.PI / 2;
    const r = radius * (sections[idx].pct / 100);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(124,106,247,0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(124,106,247,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw data points + labels
  for (let i = 0; i < n; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const r = radius * (sections[i].pct / 100);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    // Point
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#7c6af7';
    ctx.fill();

    // Label — positioned outside the radar, with 2-line word-wrap
    const labelR = radius + 28;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    ctx.font = '10.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#9898b0';

    // Text alignment based on angular position
    const cosA = Math.cos(angle);
    if (Math.abs(cosA) < 0.15) {
      ctx.textAlign = 'center';
    } else if (cosA > 0) {
      ctx.textAlign = 'left';
    } else {
      ctx.textAlign = 'right';
    }
    ctx.textBaseline = Math.sin(angle) > 0.3 ? 'top' : Math.sin(angle) < -0.3 ? 'bottom' : 'middle';

    // Compute available width from label anchor to canvas edge
    let availW;
    if (Math.abs(cosA) < 0.15) {
      availW = size * 0.85;
    } else if (cosA > 0) {
      availW = size - lx - 4;  // left-aligned: space to right edge
    } else {
      availW = lx - 4;          // right-aligned: space to left edge
    }

    drawWrappedLabel(ctx, sections[i].name, lx, ly, Math.max(availW, 50));
  }
}

function renderLegend(sections) {
  const el = document.getElementById('mastery-legend');
  if (!el) return;

  // Sort by mastery descending for legend
  const sorted = [...sections].sort((a, b) => b.pct - a.pct);
  el.innerHTML = sorted.map(t => {
    const barColor = t.pct >= 75 ? 'var(--easy)' : t.pct >= 40 ? 'var(--medium)' : t.pct > 0 ? 'var(--accent)' : 'var(--border2)';
    return `
      <div class="mastery-legend-item">
        <span class="mastery-legend-name">${t.name}</span>
        <div class="mastery-legend-bar"><div style="width:${t.pct}%; background:${barColor}"></div></div>
        <span class="mastery-legend-pct">${t.done}/${t.total}</span>
      </div>`;
  }).join('');
}

export const MasteryChart = {
  open() {
    const sections = getSectionStats();
    lockScroll();
    document.getElementById('mastery-modal').classList.add('open');
    // Slight delay so modal is visible before drawing (canvas needs dimensions)
    requestAnimationFrame(() => {
      drawRadar(sections);
      renderLegend(sections);
    });
  },
  close() {
    document.getElementById('mastery-modal').classList.remove('open');
    unlockScroll();
  },
  handleOverlayClick(e) {
    if (e.target === document.getElementById('mastery-modal')) this.close();
  }
};
