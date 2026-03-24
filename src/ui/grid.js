/**
 * Draggable grid layout with gridstack
 */

import { GridStack } from 'gridstack';

const DEFAULT_LAYOUTS = {
  overview: [
    { id: 'cumC', x: 0, y: 0, w: 12, h: 3 },
    { id: 'calC', x: 0, y: 3, w: 6, h: 3 },
    { id: 'sodC', x: 6, y: 3, w: 6, h: 3 },
    { id: 'ov_protein', x: 0, y: 6, w: 4, h: 3 },
    { id: 'ov_carbs', x: 4, y: 6, w: 4, h: 3 },
    { id: 'ov_fat', x: 8, y: 6, w: 4, h: 3 },
    { id: 'ov_fiber', x: 0, y: 9, w: 4, h: 3 },
    { id: 'ov_sugar', x: 4, y: 9, w: 4, h: 3 }
  ],
  trends: [
    { id: 'calT', x: 0, y: 0, w: 6, h: 3 },
    { id: 'sodT', x: 6, y: 0, w: 6, h: 3 },
    { id: 'tr_protein', x: 0, y: 3, w: 4, h: 3 },
    { id: 'tr_carbs', x: 4, y: 3, w: 4, h: 3 },
    { id: 'tr_fat', x: 8, y: 3, w: 4, h: 3 },
    { id: 'tr_fiber', x: 0, y: 6, w: 4, h: 3 },
    { id: 'tr_sugar', x: 4, y: 6, w: 4, h: 3 }
  ]
};

/**
 * Initialize grid for a tab
 */
export function initGrid(containerEl, tab, savedLayout) {
  const layout = savedLayout || DEFAULT_LAYOUTS[tab];
  if (!layout) return null;

  const isMobile = window.innerWidth < 768;

  // Find the .grid-stack div inside the container
  const gridStackEl = containerEl.querySelector('.grid-stack');
  if (!gridStackEl) return null;

  const grid = GridStack.init({
    column: 12,
    cellHeight: 80,
    minRow: 1,
    disableDrag: isMobile,
    disableResize: isMobile,
    handle: '.gs-drag-handle',
    animate: true,
    float: false
  }, gridStackEl);

  return grid;
}

/**
 * Get current grid layout
 */
export function getGridLayout(grid) {
  if (!grid) return null;
  return grid.engine.nodes.map(n => ({
    id: n.el?.querySelector('canvas')?.id || n.el?.id || n.id,
    x: n.x,
    y: n.y,
    w: n.w,
    h: n.h
  }));
}

/**
 * Listen for layout changes
 */
export function onLayoutChange(grid, callback) {
  if (!grid) return;
  grid.on('change', () => {
    callback(getGridLayout(grid));
  });
}

export { DEFAULT_LAYOUTS };
