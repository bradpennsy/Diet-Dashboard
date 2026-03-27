/**
 * Scorecard view renderer
 */

import { HIGHER_GOOD } from '../charts/factory.js';

/**
 * Render the Scorecard view
 * @param {Object} data - Processed data object
 * @param {Object} config - Dashboard config with targets
 * @returns {string} HTML string
 */
export function renderScorecard(data, config) {
  const { days, allMets, colors, bSod, bDay, uSod, avgCal, avgDef, avgFat } = data;
  const C = colors;

  let h = '';

  // ─── SCORECARD ───
  h += '<div class="vw a" id="vw-scorecard"><div class="sec" style="overflow:auto"><table><thead><tr>';
  ['Nutrient', 'Target', days.length + '-Day Avg', 'Over/Under', 'Trend'].forEach((x, i) => {
    h += '<th class="m" style="text-align:' + (i ? 'right' : 'left') + '">' + x + '</th>';
  });
  h += '</tr></thead><tbody>';


  allMets.forEach((mt, i) => {
    const hg = HIGHER_GOOD.has(mt.k);
    const vs = days.map(d => d[mt.k]);
    const a = vs.length ? Math.round(vs.reduce((s, v) => s + v, 0) / vs.length * 10) / 10 : 0;
    const oc = hg ? vs.filter(v => v < mt.t).length : vs.filter(v => v > mt.t).length;
    const tr = vs.length >= 2 ? vs[vs.length - 1] - vs[0] : 0;

    const ig = hg ? a >= mt.t : a <= mt.t;
    const tg = hg ? tr > 0 : tr < 0;
    const pc = oc >= 4 ? C.red : oc >= 2 ? C.accent : C.green;
    const ocL = hg ? oc + '/' + days.length + ' under' : oc + '/' + days.length + ' over';
    const arrow = hg ? (tr > 0 ? '↑' : tr < 0 ? '↓' : '→') : (tr < 0 ? '↓' : tr > 0 ? '↑' : '→');

    h += '<tr style="border-bottom:' + (i < allMets.length - 1 ? '1px solid ' + C.border : 'none') + '"><td style="font-weight:600">';
    h += '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + mt.c + ';margin-right:6px"></span>' + mt.l + '</td>';
    h += '<td class="m" style="text-align:right;font-size:11px;color:' + C.sub + '">' + mt.t.toLocaleString() + mt.u + '</td>';
    h += '<td class="m" style="text-align:right;font-size:11px;font-weight:700;color:' + (ig ? C.green : C.accent) + '">' + a.toLocaleString() + mt.u + '</td>';
    h += '<td style="text-align:right"><span class="pill m" style="color:' + pc + ';background:' + pc + '15">' + ocL + '</span></td>';
    h += '<td class="m" style="text-align:right;font-size:12px;color:' + (tg ? C.green : C.accent) + '">' + arrow + ' ' + Math.abs(Math.round(tr)) + mt.u + '</td></tr>';
  });

  h += '</tbody></table></div>';

  h += '<div class="ins"><h4>Key Insights</h4>';

  // Sodium insight
  const sodiumUnderLimit = uSod + '/' + days.length + ' under ' + config.targets.sodium;
  h += '<p>🧂 Best sodium: ' + (bDay.date || '—') + ' at ' + bSod.toLocaleString() + 'mg — ' + sodiumUnderLimit + '</p>';

  // Calorie insight
  const calorieStatus = avgCal > config.targets.calories ? avgCal - config.targets.calories + ' over' : 'under';
  h += '<p>🔥 Avg cal: ' + avgCal + ' (' + calorieStatus + ') &middot; Avg deficit: ' + avgDef + ' kcal</p>';

  // Fat insight
  h += '<p>🥩 Fat avg ' + avgFat + 'g/day vs ' + config.targets.fat + 'g</p>';

  // Fiber insight
  const fiberHit = days.filter(d => d.fiber >= config.targets.fiber).length;
  h += '<p>🌾 Fiber hit ' + fiberHit + '/' + days.length + ' days</p>';

  h += '</div></div>';

  return h;
}
