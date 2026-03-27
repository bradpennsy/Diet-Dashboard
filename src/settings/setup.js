import { renderQuestionnaire } from './questionnaire.js';
import { testConnection } from '../api.js';
import { DEFAULTS } from '../state.js';
import { esc } from '../charts/factory.js';

export function renderSetup(container, onComplete) {
  const state = {
    currentScreen: 'welcome',
    config: {
      apiUrl: '',
      targets: { ...DEFAULTS.targets },
      trackActiveBurn: true,
      palette: 'cream',
      gridLayout: null,
      dateRange: '14d',
    },
  };

  const screens = {
    welcome: createWelcomeScreen(),
    connection: createConnectionScreen(),
    questionnaire: createQuestionnaireScreen(),
    activeBurn: createActiveBurnScreen(),
    palette: createPaletteScreen(),
    done: createDoneScreen(),
  };

  function showScreen(screenName) {
    state.currentScreen = screenName;
    renderCurrentScreen();
  }

  function renderCurrentScreen() {
    const screen = screens[state.currentScreen];
    container.innerHTML = '';

    const flowDiv = document.createElement('div');
    flowDiv.className = 'setup-flow';

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'setup-progress-bar';
    const screenOrder = ['welcome', 'connection', 'questionnaire', 'activeBurn', 'palette', 'done'];
    const currentIndex = screenOrder.indexOf(state.currentScreen);

    for (let i = 0; i < screenOrder.length; i++) {
      const segment = document.createElement('div');
      segment.className = 'setup-progress-segment';
      if (i < currentIndex) segment.classList.add('completed');
      if (i === currentIndex) segment.classList.add('active');
      progressBar.appendChild(segment);
    }

    flowDiv.appendChild(progressBar);

    // Container for screen content
    const screenContainer = document.createElement('div');
    screenContainer.className = 'setup-container';

    // Render current screen
    const screenContent = screen.render(state.config);
    screenContainer.innerHTML = screenContent;

    // Attach listeners
    if (screen.attachListeners) {
      screen.attachListeners(screenContainer, state.config, showScreen);
    }

    flowDiv.appendChild(screenContainer);
    container.appendChild(flowDiv);
  }

  function createWelcomeScreen() {
    return {
      render: () => `
        <div class="setup-card">
          <h1>Set up your personal diet dashboard</h1>
          <p class="setup-description">
            Connect your Supabase backend, answer some health questions, and we'll calculate your personalized macro targets.
          </p>
          <button class="setup-button primary" style="width: 100%; padding: 14px 20px; font-size: 15px;">
            Get Started
          </button>
        </div>
      `,
      attachListeners: (card, config, showScreen) => {
        card.querySelector('button').addEventListener('click', () => {
          showScreen('connection');
        });
      },
    };
  }

  function createConnectionScreen() {
    return {
      render: (config) => `
        <div class="setup-card">
          <h2>Connect to your API</h2>
          <p class="setup-description">Enter your Supabase Edge Function URL</p>
          <input type="text" class="setup-input" placeholder="https://your-project.supabase.co/functions/v1/..." value="${config.apiUrl}" />
          <button class="setup-button primary" style="width: 100%;">Test Connection</button>
          <div class="connection-status"></div>
          <p class="setup-description" style="font-size: 12px; margin-top: 16px; color: var(--text-secondary);">
            Need to set up your Supabase backend? <a href="/docs/supabase-setup.md" target="_blank" style="color: var(--accent); text-decoration: underline; cursor: pointer;">See the setup guide</a>
          </p>
        </div>
      `,
      attachListeners: (card, config, showScreen) => {
        const input = card.querySelector('.setup-input');
        const statusDiv = card.querySelector('.connection-status');
        const btn = card.querySelector('.setup-button');

        input.addEventListener('input', (e) => {
          config.apiUrl = e.target.value;
        });

        btn.addEventListener('click', async () => {
          if (!config.apiUrl) {
            statusDiv.textContent = 'Please enter a URL';
            statusDiv.className = 'connection-status show error';
            return;
          }

          btn.disabled = true;
          btn.textContent = 'Testing...';

          const result = await testConnection(config.apiUrl);
          if (result.ok) {
            statusDiv.textContent = '✓ Connection successful';
            statusDiv.className = 'connection-status show success';
            setTimeout(() => showScreen('questionnaire'), 1000);
          } else {
            statusDiv.textContent = '✗ ' + result.error;
            statusDiv.className = 'connection-status show error';
            btn.disabled = false;
            btn.textContent = 'Test Connection';
          }
        });
      },
    };
  }

  function createQuestionnaireScreen() {
    return {
      render: () => '',
      attachListeners: (card, config, showScreen) => {
        // Remove setup-card styling for questionnaire
        const parent = card.parentElement;
        card.innerHTML = '';

        renderQuestionnaire(card, (targets) => {
          config.targets = targets;
          showScreen('activeBurn');
        });
      },
    };
  }

  function createActiveBurnScreen() {
    return {
      render: (config) => `
        <div class="setup-card">
          <h2>Track Active Calorie Burn?</h2>
          <p class="setup-description">
            If you have access to active burn data (from Apple Watch, Fitbit, etc.), enable this to include it in your dashboard calculations.
          </p>
          <div class="setup-button-group">
            <button class="setup-button ${config.trackActiveBurn ? 'selected' : ''}" data-value="yes">Yes, I track active burn</button>
            <button class="setup-button ${!config.trackActiveBurn ? 'selected' : ''}" data-value="no">No, just totals</button>
          </div>
        </div>
      `,
      attachListeners: (card, config, showScreen) => {
        card.querySelectorAll('[data-value]').forEach(btn => {
          btn.addEventListener('click', () => {
            config.trackActiveBurn = btn.dataset.value === 'yes';
            showScreen('palette');
          });
        });
      },
    };
  }

  function createPaletteScreen() {
    const palettes = [
      { name: 'cream', bg: '#fffef3', accent: '#8b7355' },
      { name: 'slate', bg: '#f5f7fa', accent: '#2c3e50' },
      { name: 'mint', bg: '#f0fdf7', accent: '#10b981' },
      { name: 'rose', bg: '#fdf2f8', accent: '#ec4899' },
      { name: 'sky', bg: '#f0f9ff', accent: '#0284c7' },
      { name: 'amber', bg: '#fffbeb', accent: '#d97706' },
      { name: 'violet', bg: '#faf5ff', accent: '#a855f7' },
      { name: 'emerald', bg: '#f0fdf4', accent: '#059669' },
      { name: 'orange', bg: '#fff7ed', accent: '#ea580c' },
      { name: 'teal', bg: '#f0fdfa', accent: '#0d9488' },
      { name: 'indigo', bg: '#f0f4ff', accent: '#4f46e5' },
      { name: 'fuchsia', bg: '#fdf4ff', accent: '#d946ef' },
    ];

    return {
      render: (config) => {
        const grid = palettes.map(p => `
          <div class="palette-option ${config.palette === p.name ? 'selected' : ''}" data-palette="${p.name}">
            <div class="palette-preview">
              <div class="palette-preview-item" style="background: ${p.bg};"></div>
              <div class="palette-preview-item" style="background: ${p.accent};"></div>
            </div>
            <span class="palette-name">${p.name}</span>
          </div>
        `).join('');

        return `
          <div class="setup-card">
            <h2>Choose a theme</h2>
            <p class="setup-description">Pick a color palette you like</p>
            <div class="palette-grid">
              ${grid}
            </div>
          </div>
        `;
      },
      attachListeners: (card, config, showScreen) => {
        card.querySelectorAll('[data-palette]').forEach(btn => {
          btn.addEventListener('click', () => {
            config.palette = btn.dataset.palette;
            showScreen('done');
          });
        });
      },
    };
  }

  function createDoneScreen() {
    return {
      render: (config) => {
        const maskedUrl = esc(config.apiUrl.substring(0, 30) + '...');
        return `
          <div class="setup-card">
            <h2>You're all set!</h2>
            <div class="summary-card">
              <div class="summary-row">
                <span class="summary-label">API URL</span>
                <span class="summary-value" style="font-size: 12px;">${maskedUrl}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Daily Calorie Target</span>
                <span class="summary-value">${config.targets.calories} kcal</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Macros</span>
                <span class="summary-value">${config.targets.protein}g P | ${config.targets.carbs}g C | ${config.targets.fat}g F</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Theme</span>
                <span class="summary-value" style="text-transform: capitalize;">${config.palette}</span>
              </div>
            </div>
            <button class="setup-button primary" style="width: 100%; padding: 14px 20px; font-size: 15px;">
              Launch Dashboard
            </button>
          </div>
        `;
      },
      attachListeners: (card, config, showScreen) => {
        card.querySelector('button').addEventListener('click', () => {
          onComplete(config);
        });
      },
    };
  }

  renderCurrentScreen();
}
