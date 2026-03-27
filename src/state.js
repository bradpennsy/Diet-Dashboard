const CONFIG_KEY = 'dashboard-config';
const OLD_PALETTE_KEY = 'dashboard-palette';

const DEFAULTS = {
  apiUrl: '',
  targets: {
    calories: 2000,
    protein: 75,
    carbs: 200,
    fat: 75,
    fiber: 30,
    sugar: 50,
    sodium: 2300,
  },
  trackActiveBurn: true,
  palette: 'cream',
  gridLayout: null,
  dateRange: '14d',
};

export function loadConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  let config = null;
  if (raw) {
    try { config = JSON.parse(raw); } catch { localStorage.removeItem(CONFIG_KEY); }
  }

  // Migrate old palette key
  if (!config) {
    const oldPalette = localStorage.getItem(OLD_PALETTE_KEY);
    if (oldPalette) {
      config = { ...DEFAULTS, palette: oldPalette };
      saveConfig(config);
      localStorage.removeItem(OLD_PALETTE_KEY);
      return config;
    }
    return null; // No config = first run
  }

  return { ...DEFAULTS, ...config, targets: { ...DEFAULTS.targets, ...(config.targets || {}) } };
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function isFirstRun() {
  return !localStorage.getItem(CONFIG_KEY) && !localStorage.getItem(OLD_PALETTE_KEY);
}

export function getTargets(config) {
  return config?.targets ?? DEFAULTS.targets;
}

export { DEFAULTS };
