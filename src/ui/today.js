/**
 * Today view renderer
 */

import { fm, fmtTime, localHour, gradientColor, paceScore, esc, HIGHER_GOOD } from '../charts/factory.js';

/**
 * Render the Today view
 * @param {Object} data - Processed data object
 * @param {Object} config - Dashboard config with targets
 * @returns {string} HTML string
 */
export function renderToday(data, config) {
  const {
    todayData,
    todayMeals,
    allMets,
    currentHour,
    daysWithTimestamps,
    avgPace,
    avg7,
    currentTimeStr,
    todayLabel,
    hasPace,
    colors
  } = data;

  const C = colors;

  let h = '';

  // ─── TODAY ───
  h += '<div class="vw a" id="vw-today">';
  if (!todayData) {
    h += '<div class="sec"><p style="color:var(--sub);font-size:13px;padding:16px 0;text-align:center">No data logged yet.</p></div>';
  } else {
    // Remaining Budget
    h += '<div class="sec"><h3>Remaining Budget</h3><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px">';
    allMets.forEach(mt => {
      const val = todayData[mt.k];
      const rem = mt.t - val;
      const hg = HIGHER_GOOD.has(mt.k);
      const label = hg
        ? val >= mt.t ? 'Hit!' : Math.round(rem) + mt.u + ' to go'
        : rem >= 0 ? Math.round(rem) + mt.u + ' left' : Math.round(Math.abs(rem)) + mt.u + ' over';
      const color = hg ? (val >= mt.t ? C.green : C.accent) : (rem >= 0 ? C.green : C.red);
      h += '<div style="text-align:center;padding:10px 4px;background:var(--cream);border-radius:8px;border:1px solid var(--border)">';
      h += '<div class="m" style="font-size:9px;color:var(--sub);text-transform:uppercase;margin-bottom:3px">' + mt.l + '</div>';
      h += '<div class="m" style="font-size:14px;font-weight:700;color:' + color + '">' + label + '</div>';
      h += '</div>';
    });
    h += '</div></div>';

    // Daily data as of current time
    h += '<div class="sec"><h3>' + todayLabel + ' as of ' + currentTimeStr + '</h3>';
    if (hasPace) h += '<p style="font-size:10px;color:var(--sub);margin:-6px 0 10px">Pace from ' + daysWithTimestamps + ' days</p>';

    allMets.forEach(mt => {
      const val = todayData[mt.k];
      const tgt = mt.t;
      const pace = hasPace ? avgPace[mt.k] : null;
      const eodAvg = avg7(mt.k);
      const hg = HIGHER_GOOD.has(mt.k);
      const maxBar = Math.max(tgt, eodAvg, val, pace || 0) * 1.3;
      const pct = Math.min(100, val / maxBar * 100);

      let fillColor, metaHtml;
      if (pace !== null && pace > 0) {
        const sc = paceScore(val, pace, hg);
        fillColor = gradientColor(sc);
        const diff = Math.round(val - pace);
        const sign = diff >= 0 ? '+' : '';
        metaHtml = '<span style="color:' + fillColor + '">' + sign + diff + mt.u + ' vs pace</span>';
      } else {
        if (hg) {
          const r = val / tgt;
          fillColor = gradientColor(r >= 0.7 ? -1 : -(r - 0.3) * 2.5);
          metaHtml = val >= tgt ? '<span style="color:' + C.green + '">&#10003; hit</span>' : '<span style="color:' + fillColor + '">' + Math.round(tgt - val) + mt.u + ' to go</span>';
        } else {
          const r = val / tgt;
          fillColor = gradientColor(r <= 0.7 ? -1 : (r - 0.7) * 3.3);
          metaHtml = val <= tgt ? '<span style="color:' + fillColor + '">' + Math.round(tgt - val) + mt.u + ' left</span>' : '<span style="color:' + fillColor + '">' + Math.round(val - tgt) + mt.u + ' over</span>';
        }
      }

      h += '<div class="prog-row"><div class="prog-label m" style="color:' + mt.c + '">' + mt.l + '</div>';
      h += '<div class="prog-track"><div class="prog-fill" style="width:' + pct + '%;background:' + fillColor + '"></div>';

      if (pace !== null) {
        const pp = Math.min(100, pace / maxBar * 100);
        h += '<div class="prog-marker" style="left:' + pp + '%;background:' + C.cBurn + ';opacity:.9"></div>';
        h += '<div class="prog-marker-label m" style="left:' + pp + '%;color:' + C.cBurn + '">' + pace + '</div>';
      }

      const tp = Math.min(100, tgt / maxBar * 100);
      h += '<div style="position:absolute;top:0;bottom:0;left:' + tp + '%;width:2px;background:' + C.text + ';opacity:.2;z-index:1"></div>';
      h += '<div class="prog-val m">' + Math.round(val) + mt.u + '</div></div>';
      h += '<div class="prog-meta m">' + metaHtml + '</div></div>';
    });

    h += '<div style="display:flex;gap:14px;padding:6px 0 0;font-size:9px;color:var(--sub)">';
    h += '<div style="display:flex;align-items:center;gap:4px"><div style="width:2px;height:10px;background:' + C.text + ';opacity:.2"></div>Target</div>';
    if (hasPace) {
      h += '<div style="display:flex;align-items:center;gap:4px"><div style="width:2px;height:10px;background:' + C.cBurn + ';opacity:.9"></div>Pace</div>';
    }
    h += '</div></div>';

    // Meals
    if (todayMeals.length) {
      const groups = [];
      const sorted = [...todayMeals].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      sorted.forEach(m => {
        const mt = new Date(m.created_at).getTime();
        const last = groups.length ? groups[groups.length - 1] : null;
        if (last && last.type === m.meal_type && Math.abs(mt - last.lt) < 5 * 60 * 1000) {
          last.items.push(m);
          last.lt = mt;
        } else {
          groups.push({ type: m.meal_type, items: [m], lt: mt });
        }
      });

      h += '<div class="sec"><h3>Meals (' + groups.length + ')</h3>';
      groups.forEach(g => {
        const label = (g.type || '').charAt(0).toUpperCase() + (g.type || '').slice(1);
        const ts = g.items[0].created_at ? fmtTime(g.items[0].created_at) : '';
        const sum = { cal: 0, pro: 0, carb: 0, fat: 0, sod: 0 };
        g.items.forEach(m => {
          sum.cal += +(m.calories_kcal || 0);
          sum.pro += +(m.protein_g || 0);
          sum.carb += +(m.carbs_g || 0);
          sum.fat += +(m.fat_g || 0);
          sum.sod += +(m.sodium_mg || 0);
        });

        h += '<div class="meal-card"><h4>' + label + (g.items.length > 1 ? ' (' + g.items.length + ' items)' : '') + '</h4>';
        if (ts) h += '<div class="time m">' + ts + '</div>';

        g.items.forEach(m => {
          h += '<div style="margin:4px 0 1px;font-size:11px;font-weight:600">' + esc(m.meal_name || 'Untitled') + ' <span class="m" style="font-size:9px;font-weight:400;color:var(--sub)">' + (+(m.calories_kcal || 0)) + ' kcal</span></div>';
          if (m.description) h += '<div class="desc">' + esc(m.description) + '</div>';
        });

        h += '<div class="meal-macros" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">';
        h += '<span style="background:' + C.cCal + '20;color:' + C.cCal + '">' + Math.round(sum.cal) + ' kcal</span>';
        h += '<span style="background:' + C.cProtein + '20;color:' + C.cProtein + '">' + Math.round(sum.pro) + 'g P</span>';
        h += '<span style="background:' + C.cCarbs + '20;color:' + C.cCarbs + '">' + Math.round(sum.carb) + 'g C</span>';
        h += '<span style="background:' + C.cFat + '20;color:' + C.cFat + '">' + Math.round(sum.fat) + 'g F</span>';
        h += '<span style="background:' + C.cSodium + '20;color:' + C.cSodium + '">' + Math.round(sum.sod) + 'mg Na</span>';
        h += '</div></div>';
      });
      h += '</div>';
    }

    // Insights
    h += '<div class="ins"><h4>Today\'s Insights</h4>';
    const td = todayData;
    if (hasPace) {
      let worstK = null, worstD = -Infinity, bestK = null, bestD = Infinity;
      allMets.forEach(mt => {
        const p = avgPace[mt.k];
        if (!p) return;
        const sc = paceScore(td[mt.k], p, HIGHER_GOOD.has(mt.k));
        if (sc > worstD) { worstD = sc; worstK = mt; }
        if (sc < bestD) { bestD = sc; bestK = mt; }
      });
      if (bestK) h += '<p>✅ <strong>' + bestK.l + '</strong> best-paced — ' + Math.round(td[bestK.k]) + bestK.u + ' vs ' + avgPace[bestK.k] + bestK.u + ' typical</p>';
      if (worstK && worstK !== bestK) h += '<p>⚠️ <strong>' + worstK.l + '</strong> needs attention — ' + Math.round(td[worstK.k]) + worstK.u + ' vs ' + avgPace[worstK.k] + worstK.u + ' typical</p>';
    }

    // Sodium warning
    if (td.sodium > config.targets.sodium * 0.65) { // ~1500mg
      h += '<p>🧂 Sodium ' + Math.round(td.sodium) + 'mg — ' + (td.sodium > config.targets.sodium ? '<strong style="color:' + C.red + '">over limit</strong>' : Math.round(config.targets.sodium - td.sodium) + 'mg left') + '</p>';
    }

    // Calorie balance
    const calorieBudget = config.trackActiveBurn ? config.targets.calories + (td.ac || 0) : config.targets.calories;
    const calorieBalance = calorieBudget - td.cal;
    h += '<p>🔥 ' + (calorieBalance > 0 ? '<strong style="color:' + C.green + '">' + Math.round(calorieBalance) + ' kcal deficit</strong>' : '<strong style="color:' + C.red + '">' + Math.round(Math.abs(calorieBalance)) + ' kcal surplus</strong>');
    if (config.trackActiveBurn && td.ac > 0) {
      h += ' (' + Math.round(td.ac) + ' active)';
    }
    h += '</p>';

    // Protein status
    h += '<p>🍗 Protein ' + Math.round(td.protein) + 'g' + (td.protein >= config.targets.protein ? ' — target hit!' : ' — ' + Math.round(config.targets.protein - td.protein) + 'g to go') + '</p>';

    // Meal count
    const mgc = todayMeals.length ? (() => {
      const gs = [];
      const s = [...todayMeals].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      s.forEach(m => {
        const t = new Date(m.created_at).getTime();
        const l = gs.length ? gs[gs.length - 1] : null;
        if (l && l.type === m.meal_type && Math.abs(t - l.lt) < 3e5) {
          l.lt = t;
        } else {
          gs.push({ type: m.meal_type, lt: t });
        }
      });
      return gs.length;
    })() : 0;
    h += '<p>🍽️ ' + mgc + ' meal' + (mgc !== 1 ? 's' : '') + ' (' + todayMeals.length + ' item' + (todayMeals.length !== 1 ? 's' : '') + ')</p>';
    h += '</div>';
  }
  h += '</div>';

  return h;
}
