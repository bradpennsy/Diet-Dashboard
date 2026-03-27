import { renderTargetEditor } from './targets.js';
import { renderQuestionnaire } from './questionnaire.js';
import { testConnection } from '../api.js';
import { saveConfig } from '../state.js';

let modalElement = null;
let modalState = null;

export function renderSettingsGearButton() {
  const btn = document.createElement('button');
  btn.className = 'settings-gear-btn';
  btn.textContent = '⚙️';
  btn.title = 'Settings';
  btn.addEventListener('click', openSettings);
  return btn;
}

export function renderSettingsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.style.display = 'none';

  const modal = document.createElement('div');
  modal.className = 'settings-modal';

  const header = document.createElement('div');
  header.className = 'settings-header';

  const title = document.createElement('h2');
  title.className = 'settings-title';
  title.textContent = 'Settings';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'settings-close-btn';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', closeSettings);

  header.appendChild(title);
  header.appendChild(closeBtn);

  const tabs = document.createElement('div');
  tabs.className = 'settings-tabs';

  const tabNames = ['Connection', 'Targets', 'Appearance', 'Layout'];
  const tabButtons = {};

  tabNames.forEach((name, idx) => {
    const btn = document.createElement('button');
    btn.className = 'settings-tab-btn';
    if (idx === 0) btn.classList.add('active');
    btn.textContent = name;
    btn.dataset.tab = name.toLowerCase();
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    tabButtons[btn.dataset.tab] = btn;
    tabs.appendChild(btn);
  });

  const content = document.createElement('div');
  content.className = 'settings-content';
  content.id = 'modal-content';

  const footer = document.createElement('div');
  footer.className = 'settings-footer';

  modal.appendChild(header);
  modal.appendChild(tabs);
  modal.appendChild(content);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettings();
  });

  modalElement = overlay;
  modalState = {
    modal,
    content,
    footer,
    tabButtons,
    currentTab: 'connection',
    config: null,
  };

  return overlay;
}

export function openSettings() {
  if (!modalElement) {
    modalElement = renderSettingsModal();
    document.body.appendChild(modalElement);
  }

  modalElement.style.display = 'flex';
  switchTab('connection');
}

export function closeSettings() {
  if (modalElement) {
    modalElement.style.display = 'none';
  }
}

function switchTab(tabName) {
  if (!modalState) return;

  // Update tab buttons
  Object.entries(modalState.tabButtons).forEach(([name, btn]) => {
    if (name === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  modalState.currentTab = tabName;

  // Clear content and footer
  modalState.content.innerHTML = '';
  modalState.footer.innerHTML = '';

  // Load tab content
  const tabs = {
    connection: renderConnectionTab,
    targets: renderTargetsTab,
    appearance: renderAppearanceTab,
    layout: renderLayoutTab,
  };

  if (tabs[tabName]) {
    tabs[tabName]();
  }
}

function renderConnectionTab() {
  const content = modalState.content;
  const footer = modalState.footer;

  const group = document.createElement('div');
  group.className = 'settings-form-group';

  const label = document.createElement('label');
  label.className = 'settings-label';
  label.textContent = 'Supabase Edge Function URL';

  const input = document.createElement('input');
  input.className = 'settings-input';
  input.type = 'text';
  input.placeholder = 'https://...';
  input.value = modalState.config?.apiUrl || '';

  const statusDiv = document.createElement('div');
  statusDiv.className = 'connection-status';

  const testBtn = document.createElement('button');
  testBtn.className = 'settings-button';
  testBtn.style.marginTop = '12px';
  testBtn.textContent = 'Test & Save';

  testBtn.addEventListener('click', async () => {
    const url = input.value;
    if (!url) {
      statusDiv.textContent = 'Please enter a URL';
      statusDiv.className = 'connection-status show error';
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';

    const result = await testConnection(url);
    if (result.ok) {
      modalState.config.apiUrl = url;
      saveConfig(modalState.config);
      statusDiv.textContent = '✓ Connection successful';
      statusDiv.className = 'connection-status show success';
      testBtn.disabled = false;
      testBtn.textContent = 'Test & Save';
    } else {
      statusDiv.textContent = '✗ ' + result.error;
      statusDiv.className = 'connection-status show error';
      testBtn.disabled = false;
      testBtn.textContent = 'Test & Save';
    }
  });

  group.appendChild(label);
  group.appendChild(input);
  group.appendChild(statusDiv);
  group.appendChild(testBtn);

  content.appendChild(group);
}

function renderTargetsTab() {
  if (!modalState?.config) return;
  const content = modalState.content;
  const footer = modalState.footer;

  // Targets editor
  const editorContainer = document.createElement('div');
  renderTargetEditor(editorContainer, modalState.config.targets, (updatedTargets) => {
    modalState.config.targets = updatedTargets;
    saveConfig(modalState.config);
  });
  content.appendChild(editorContainer);

  // Divider
  const divider = document.createElement('div');
  divider.style.margin = '24px 0';
  divider.style.borderTop = '1px solid var(--border)';
  content.appendChild(divider);

  // Active burn toggle
  const burnGroup = document.createElement('div');
  burnGroup.className = 'settings-form-group';

  const burnLabel = document.createElement('label');
  burnLabel.className = 'settings-label';
  burnLabel.textContent = 'Track Active Calorie Burn';

  const burnButtons = document.createElement('div');
  burnButtons.className = 'setup-button-group';

  const yesBtn = document.createElement('button');
  yesBtn.className = 'setup-button ' + (modalState.config.trackActiveBurn ? 'selected' : '');
  yesBtn.textContent = 'Yes';
  yesBtn.addEventListener('click', () => {
    modalState.config.trackActiveBurn = true;
    saveConfig(modalState.config);
    switchTab('targets');
  });

  const noBtn = document.createElement('button');
  noBtn.className = 'setup-button ' + (!modalState.config.trackActiveBurn ? 'selected' : '');
  noBtn.textContent = 'No';
  noBtn.addEventListener('click', () => {
    modalState.config.trackActiveBurn = false;
    saveConfig(modalState.config);
    switchTab('targets');
  });

  burnButtons.appendChild(yesBtn);
  burnButtons.appendChild(noBtn);

  burnGroup.appendChild(burnLabel);
  burnGroup.appendChild(burnButtons);
  content.appendChild(burnGroup);

  // Retake questionnaire button
  const retakeBtn = document.createElement('button');
  retakeBtn.className = 'settings-button secondary';
  retakeBtn.style.marginTop = '24px';
  retakeBtn.style.width = '100%';
  retakeBtn.textContent = 'Retake Questionnaire';

  retakeBtn.addEventListener('click', () => {
    content.innerHTML = '';
    const questionnaireContainer = document.createElement('div');
    renderQuestionnaire(questionnaireContainer, (targets) => {
      modalState.config.targets = targets;
      saveConfig(modalState.config);
      switchTab('targets');
    });
    content.appendChild(questionnaireContainer);
  });

  content.appendChild(retakeBtn);
}

function renderAppearanceTab() {
  const content = modalState.content;

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

  const label = document.createElement('label');
  label.className = 'settings-label';
  label.style.marginBottom = '16px';
  label.textContent = 'Theme';

  const grid = document.createElement('div');
  grid.className = 'palette-grid';

  palettes.forEach(p => {
    const option = document.createElement('div');
    option.className = 'palette-option ' + (modalState.config.palette === p.name ? 'selected' : '');
    option.dataset.palette = p.name;

    const preview = document.createElement('div');
    preview.className = 'palette-preview';

    const bg = document.createElement('div');
    bg.className = 'palette-preview-item';
    bg.style.background = p.bg;

    const accent = document.createElement('div');
    accent.className = 'palette-preview-item';
    accent.style.background = p.accent;

    preview.appendChild(bg);
    preview.appendChild(accent);

    const name = document.createElement('span');
    name.className = 'palette-name';
    name.textContent = p.name;

    option.appendChild(preview);
    option.appendChild(name);

    option.addEventListener('click', () => {
      modalState.config.palette = p.name;
      saveConfig(modalState.config);
      document.documentElement.setAttribute('data-palette', p.name);
      switchTab('appearance');
    });

    grid.appendChild(option);
  });

  content.appendChild(label);
  content.appendChild(grid);
}

function renderLayoutTab() {
  const content = modalState.content;
  const footer = modalState.footer;

  const desc = document.createElement('p');
  desc.className = 'setup-description';
  desc.textContent = 'Reset the dashboard layout to default.';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'settings-button';
  resetBtn.style.marginTop = '16px';
  resetBtn.textContent = 'Reset Layout';

  resetBtn.addEventListener('click', () => {
    modalState.config.gridLayout = null;
    saveConfig(modalState.config);
    location.reload();
  });

  content.appendChild(desc);
  content.appendChild(resetBtn);
}

export function setModalConfig(config) {
  if (!modalState) {
    modalElement = renderSettingsModal();
    document.body.appendChild(modalElement);
  }
  modalState.config = config;
}
