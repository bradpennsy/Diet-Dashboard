export async function fetchDashboardData(apiUrl) {
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const raw = await res.json();
  if (raw.error) throw new Error(raw.error);

  // Normalize response shape
  if (Array.isArray(raw)) {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
    return { daily: raw, recent_meals: [], today_date: todayStr };
  }

  return raw;
}

export async function testConnection(apiUrl) {
  try {
    const data = await fetchDashboardData(apiUrl);
    // Validate shape
    if (!data.daily || !Array.isArray(data.daily)) {
      return { ok: false, error: 'Response missing "daily" array' };
    }
    if (data.daily.length > 0) {
      const first = data.daily[0];
      const required = ['log_date', 'calories_kcal', 'protein_g', 'carbs_g', 'fat_g'];
      const missing = required.filter(k => !(k in first));
      if (missing.length) {
        return { ok: false, error: 'Missing fields: ' + missing.join(', ') };
      }
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
