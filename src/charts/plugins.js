/**
 * Chart.js plugins for dashboard rendering
 */

export const refLabelPlugin = {
  id: 'refLabel',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    chart.data.datasets.forEach((ds, i) => {
      if (!ds._refLabel) return;
      const meta = chart.getDatasetMeta(i);
      if (!meta.data.length) return;
      const lastPt = meta.data[meta.data.length - 1];
      const y = lastPt.y;
      ctx.save();
      ctx.font = 'bold 9px "IBM Plex Mono", monospace';
      ctx.fillStyle = ds.borderColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(ds._refLabel, chart.chartArea.right, y - 4);
      ctx.restore();
    });
  }
};

/**
 * Reference line dataset generator
 * Creates a flat dataset for displaying reference values (targets) on charts
 */
export function refDS(labels, val, label, subColor) {
  return {
    label: label || val.toLocaleString(),
    data: Array(labels.length).fill(val),
    type: 'line',
    borderColor: subColor,
    borderDash: [6, 3],
    borderWidth: 1.5,
    pointRadius: 0,
    fill: false,
    order: 0,
    tension: 0,
    _refLabel: label || val.toLocaleString()
  };
}
