import { h } from 'vue';
import { NText } from 'naive-ui';
import type { PaginationProps } from 'naive-ui';

/**
 * 表格分页左侧摘要：总条数、本页条号区间、当前页/总页数。
 * 供 NDataTable 的 pagination.prefix 使用。
 */
export const buildTablePaginationPrefix =
  (): NonNullable<PaginationProps['prefix']> => (info) => {
    const totalItems = info.itemCount ?? 0;
    if (totalItems <= 0) {
      return h(
        NText,
        { depth: 3, style: 'margin-right: 12px; white-space: nowrap;' },
        () => '共 0 条',
      );
    }
    const from = info.startIndex + 1;
    const to = info.endIndex + 1;
    return h(
      NText,
      { depth: 3, style: 'margin-right: 12px; white-space: nowrap;' },
      () =>
        `共 ${totalItems} 条，本页 ${from}-${to}，第 ${info.page}/${info.pageCount} 页`,
    );
  };
