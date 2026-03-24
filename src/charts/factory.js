/**
 * Chart factory utilities and color/formatting helpers
 */

// ─── CSS Variable Helpers ───

/**
 * Get computed CSS custom property value
 */
export function cv(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Get all theme colors from CSS variables
 */
export function getColors() {
  return {
    accent: cv('--accent'),
    green: cv('--green'),
    red: cv('--red'),
    gray: cv('--gray'),
    border: cv('--border'),
    sub: cv('--sub'),
    card: cv('--card'),
    text: cv('--text'),
    cCal: cv('--c-cal'),
    cSodium: cv('--c-sodium'),
    cProtein: cv('--c-protein'),
    cCarbs: cv('--c-carbs'),
    cFat: cv('--c-fat'),
    cFiber: cv('--c-fiber'),
    cSugar: cv('--c-sugar'),
    cBurn: cv('--c-burn'),
    cIndigo: cv('--c-indigo')
  };
}

// ─── Date/Time Formatting ───

/**
 * Format date string to M/D
 */
export function fm(s) {
  const d = new Date(s + 'T12:00:00');
  return (d.getMonth() + 1) + '/' + d.getDate();
}

/**
 * Get day name from date string
 */
export function dn(s) {
  const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return DN[new Date(s + 'T12:00:00').getDay()];
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/**
 * Convert UTC timestamp to local hour (0-24)
 */
export function localHour(utcStr) {
  const d = new Date(utcStr);
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(d);
  return +(p.find(x => x.type === 'hour')?.value || 0) + (+(p.find(x => x.type === 'minute')?.value || 0)) / 60;
}

/**
 * Format UTC timestamp to local time (12-hour format)
 */
export function fmtTime(utcStr) {
  return new Date(utcStr).toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Calculate cumulative value at a specific hour from meals
 */
export function cumulativeAtHour(meals, hour, key) {
  let total = 0;
  for (const m of meals) {
    if (localHour(m.created_at) <= hour) {
      total += +(m[key] || 0);
    }
  }
  return total;
}

// ─── Color Utilities ───

/**
 * Convert hex color to RGB array
 */
export function hexToRGB(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
  ];
}

/**
 * Generate gradient color based on score (-1 to 1)
 * -1 = green, 0 = yellow, 1 = red
 */
export function gradientColor(score) {
  const s = Math.max(-1, Math.min(1, score));
  const gRGB = hexToRGB(cv('--green'));
  const rRGB = hexToRGB(cv('--red'));
  const yRGB = [
    Math.min(255, Math.round((gRGB[0] + rRGB[0]) / 2 * 1.1)),
    Math.round((gRGB[1] + rRGB[1]) / 2 * 0.95),
    Math.round((gRGB[0] + rRGB[2]) / 2 * 0.4)
  ];
  let r, g, b;
  if (s <= 0) {
    const t = s + 1;
    r = Math.round(gRGB[0] + t * (yRGB[0] - gRGB[0]));
    g = Math.round(gRGB[1] + t * (yRGB[1] - gRGB[1]));
    b = Math.round(gRGB[2] + t * (yRGB[2] - gRGB[2]));
  } else {
    const t = s;
    r = Math.round(yRGB[0] + t * (rRGB[0] - yRGB[0]));
    g = Math.round(yRGB[1] + t * (rRGB[1] - yRGB[1]));
    b = Math.round(yRGB[2] + t * (rRGB[2] - yRGB[2]));
  }
  return 'rgb(' + Math.min(255, r) + ',' + Math.min(255, g) + ',' + Math.min(255, b) + ')';
}

/**
 * Calculate pace score with dead zone
 * Returns -1 (on pace), gradually to 1 (significantly off pace)
 */
export function paceScore(val, pace, hg) {
  if (!pace) return -1;
  const ratio = (val - pace) / pace;
  const dead = 0.10; // 10% dead zone
  let raw;
  if (hg) {
    // Higher is good: green until 10% below, then ramp to red
    raw = ratio >= -dead ? -1 : Math.min(1, (-ratio - dead) / (0.5 - dead));
  } else {
    // Lower is good: green until 10% over, then ramp to red
    raw = ratio <= dead ? -1 : Math.min(1, (ratio - dead) / (0.5 - dead));
  }
  return raw;
}

/**
 * Get bar color based on value vs target
 * Green when on-target, gradient to red when exceeding
 */
export function barColor(val, target, hg) {
  const good = hexToRGB(cv('--green'));
  const bad = hexToRGB(cv('--red'));
  const mid = [
    Math.min(255, Math.round(good[0] * 0.4 + bad[0] * 0.6)),
    Math.round(good[1] * 0.55 + bad[1] * 0.45),
    Math.round(good[2] * 0.3 + bad[2] * 0.2)
  ];

  function lerp(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function rgb3(c) {
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }

  function blend(t) {
    // t: 0=mid, 1=bad
    t = Math.max(0, Math.min(1, t));
    return 'rgb(' + lerp(mid[0], bad[0], t) + ',' + lerp(mid[1], bad[1], t) + ',' + lerp(mid[2], bad[2], t) + ')';
  }

  if (hg) {
    // Higher is good: green if at or above target
    if (val >= target) return rgb3(good);
    const pct = (target - val) / target; // 0=at target, 1=zero intake
    return blend(pct * 1.5); // ramps to full bad at ~67% below target
  } else {
    // Lower is good: green if at or below target
    if (val <= target) return rgb3(good);
    const pct = (val - target) / target; // 0=at target, 1=double target
    return blend(pct * 2); // ramps to full bad at 50% over target
  }
}

/**
 * Create tooltip config with target comparison
 * Shows value, % of target, and delta
 */
export function targetTooltip(target, unit, metricName) {
  return {
    callbacks: {
      label(ctx) {
        const val = ctx.parsed.y;
        if (ctx.dataset._refLabel) return null; // Hide tooltip for reference lines
        const pct = Math.round((val / target) * 100);
        const delta = Math.round(val - target);
        const sign = delta >= 0 ? '+' : '';
        return [
          metricName + ': ' + val.toLocaleString() + unit,
          pct + '% of ' + target.toLocaleString() + unit + ' target',
          sign + delta + unit + ' ' + (delta >= 0 ? 'over' : 'under')
        ];
      }
    }
  };
}
