import { state } from './state.js';

export const ReportModal = {
  open() {
    this.renderHeatmap();
    document.getElementById('report-modal').classList.add('open');
  },

  close() {
    document.getElementById('report-modal').classList.remove('open');
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById('report-modal')) this.close();
  },

  getOrCreateTooltip() {
    let t = document.getElementById('heatmap-tooltip');
    
    // If it exists but is inside the modal, move it to the body to fix stacking issues
    if (t && t.parentElement !== document.body) {
      document.body.appendChild(t);
    }
    
    if (!t) {
      t = document.createElement('div');
      t.id = 'heatmap-tooltip';
      t.className = 'heatmap-tooltip';
      document.body.appendChild(t);
    }
    return t;
  },

  renderHeatmap() {
    const grid = document.getElementById('heatmap-grid');
    grid.innerHTML = ''; // clear

    // 1. Build counts map: { 'YYYY-MM-DD': count }
    const counts = {};
    state.questions.forEach(q => {
      if (q.is_done && q.updated_at) {
        // extract local date string format YYYY-MM-DD reliably
        const d = new Date(q.updated_at);
        const pad = n => n.toString().padStart(2, '0');
        const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    // 2. We want to start exactly from March 12, 2026.
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const startDate = new Date('2026-03-12T00:00:00');
    
    // Calculate how many days have passed since start date to today
    const diffTime = Math.abs(today - startDate);
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    // 3. GitHub grids map Row 1 = Sunday ... Row 7 = Saturday.
    const startDayOfWeek = startDate.getDay(); // 0(Sun) - 6(Sat)
    for (let i = 0; i < startDayOfWeek; i++) {
      const spacer = document.createElement('div');
      spacer.style.visibility = 'hidden';
      grid.appendChild(spacer);
    }

    const pad = n => n.toString().padStart(2, '0');

    // 4. Generate the cells up to today
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);

      const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const count = counts[key] || 0;

      const box = document.createElement('div');
      box.className = 'heatmap-box';
      
      // Level assignment
      let level = 0;
      if (count >= 1 && count <= 2) level = 1;
      else if (count === 3) level = 2;
      else if (count >= 4) level = 3;

      box.dataset.level = level;

      // Tooltip formatting
      const dateString = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const tipText = count === 0 ? `No questions on ${dateString}` : `${count} question(s) solved on\n${dateString}`;
      
      box.addEventListener('mouseover', (e) => {
        const tooltip = ReportModal.getOrCreateTooltip();
        tooltip.textContent = tipText;
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
      });

      box.addEventListener('mousemove', (e) => {
        const tooltip = ReportModal.getOrCreateTooltip();
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
      });

      box.addEventListener('mouseout', () => {
        const tooltip = document.getElementById('heatmap-tooltip');
        if (tooltip) tooltip.style.display = 'none';
      });

      grid.appendChild(box);
    }
    
    // Auto scroll to the far right so today's cell is visible
    setTimeout(() => {
      const scrollWrap = document.querySelector('.heatmap-scroll');
      if(scrollWrap) scrollWrap.scrollLeft = scrollWrap.scrollWidth;
    }, 10);
  }
};
