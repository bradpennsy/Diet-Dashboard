/**
 * Tab switching logic
 */

/**
 * Initialize tab switching
 */
export function initTabs() {
  const buttons = document.querySelectorAll('.t');
  const views = document.querySelectorAll('.vw');

  buttons.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.getAttribute('data-v');

      // Update active button
      buttons.forEach(b => b.classList.remove('a'));
      this.classList.add('a');

      // Update active view
      views.forEach(v => v.classList.remove('a'));
      document.getElementById('vw-' + tabName)?.classList.add('a');

      // Store active tab
      window._activeTab = tabName;
    });
  });
}
