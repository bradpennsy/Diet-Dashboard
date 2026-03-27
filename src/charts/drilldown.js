/**
 * Shared drill-down panel for chart click interactions
 */

import { esc } from './factory.js';

/**
 * Toggle a drill-down meal-detail panel beneath a chart container.
 * Clicking the same bar again collapses the panel.
 *
 * @param {HTMLElement} containerEl - Parent element of the canvas
 * @param {string}      dayDate     - YYYY-MM-DD date string
 * @param {Array}       meals       - Meal records for this day
 * @param {Object}      colors      - Theme color map from getColors()
 */
export function toggleDrillDown(containerEl, dayDate, meals, colors) {
  const existing = containerEl.querySelector('.drill-down');
  if (existing) {
    existing.remove();
    return;
  }

  const panel = document.createElement('div');
  panel.className = 'drill-down';

  // Format date header
  const d = new Date(dayDate + 'T12:00:00');
  const dateStr =
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ', ' +
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' +
    d.getDate();

  let html = '<div style="margin-bottom:10px"><strong style="font-size:12px">' + dateStr + '</strong></div>';

  if (meals.length === 0) {
    html += '<p style="font-size:11px;color:var(--sub)">No meals recorded</p>';
  } else {
    // Group meals by type
    const byType = {};
    meals.forEach(m => {
      const type = m.meal_type || 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(m);
    });

    Object.entries(byType).forEach(([type, typeMeals]) => {
      html += '<div class="meal-type-header" style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--sub);margin:10px 0 4px">' + esc(type) + '</div>';
      typeMeals.forEach(m => {
        html += '<div class="meal-card">';
        html += '<h4 style="text-transform:capitalize">' + esc(m.meal_name || type) + '</h4>';
        if (m.description) html += '<div class="desc">' + esc(m.description) + '</div>';
        if (m.created_at) {
          const t = new Date(m.created_at);
          const timeStr = t.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true });
          html += '<div class="time">' + timeStr + '</div>';
        }
        html += '<div class="meal-macros">';
        if (m.calories_kcal) html += '<span style="background:' + colors.cCal + '20;color:' + colors.cCal + '">' + Math.round(m.calories_kcal) + ' kcal</span>';
        if (m.protein_g)     html += '<span style="background:' + colors.cProtein + '20;color:' + colors.cProtein + '">' + Math.round(m.protein_g) + 'g P</span>';
        if (m.carbs_g)       html += '<span style="background:' + colors.cCarbs + '20;color:' + colors.cCarbs + '">' + Math.round(m.carbs_g) + 'g C</span>';
        if (m.fat_g)         html += '<span style="background:' + colors.cFat + '20;color:' + colors.cFat + '">' + Math.round(m.fat_g) + 'g F</span>';
        html += '</div>';
        html += '</div>';
      });
    });
  }

  panel.innerHTML = html;
  containerEl.appendChild(panel);
}
