/**
 * Date Range Filter Module
 * Provides pill-button filter bar for selecting date ranges
 */

export function renderDateRangeBar(selectedRange) {
  const ranges = ['7d', '14d', '30d', '90d', 'all'];
  const labels = {
    '7d': '7 days',
    '14d': '14 days',
    '30d': '30 days',
    '90d': '90 days',
    'all': 'All time'
  };

  const buttons = ranges.map(range => {
    const isActive = range === selectedRange;
    return `
      <button
        class="dr-pill ${isActive ? 'active' : ''}"
        data-range="${range}"
      >
        ${labels[range]}
      </button>
    `;
  }).join('');

  return `
    <div class="dr-bar">
      ${buttons}
    </div>
  `;
}

/**
 * Filter an array of day objects by date range
 * @param {Array} allDays - Array of day objects with 'raw' property (YYYY-MM-DD)
 * @param {String} range - Range key: '7d', '14d', '30d', '90d', or 'all'
 * @returns {Array} Filtered array of days
 */
export function filterByRange(allDays, range) {
  if (range === 'all') return allDays;
  const numDays = parseInt(range, 10);
  if (isNaN(numDays)) return allDays;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - numDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return allDays.filter(d => d.raw >= cutoffStr);
}
