import './styles/main.css';
import './styles/settings.css';
import { loadConfig, saveConfig, isFirstRun } from './state.js';
import { renderSetup } from './settings/setup.js';

function main() {
  const config = loadConfig();

  if (!config || !config.apiUrl) {
    // First run — show setup
    const app = document.getElementById('app');
    const loader = document.getElementById('loader');
    loader.style.display = 'none';
    app.style.display = 'block';
    renderSetup(app, (newConfig) => {
      saveConfig(newConfig);
      location.reload(); // Reload to start dashboard with config
    });
    return;
  }

  // Apply palette
  document.documentElement.setAttribute('data-palette', config.palette);

  // TODO: Load dashboard (Task 8+)
}

main();
