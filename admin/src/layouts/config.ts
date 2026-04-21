export const DEMO_MENU_CONFIG = {
  parent: {
    key: '/demo',
    label: '示例页',
  },
  defaultChildKey: '/demo/charts',
  children: [
    { key: '/demo/charts', label: '图表能力演示' },
    { key: '/demo/table-ops', label: '表格能力演示' },
    { key: '/demo/rich-text', label: '富文本能力演示' },
  ],
} as const;

export const DEMO_MENU_CHILD_KEYS = DEMO_MENU_CONFIG.children.map(
  (item) => item.key,
);
