# CRUD 组件使用约定

本目录组件用于统一后台列表页的页面骨架和交互行为，建议新页面按以下顺序组合：

1. `DataTablePage`：承载页面标题、工具栏、统一空态/错态/加载态和表格区。
2. `SearchBar`：承载筛选表单项、查询与重置按钮。
3. `FormDrawer`：承载新增/编辑表单。
4. `useListQuery`：统一 `query/loading/error/run/reset`。

## 推荐目录与文件

- 页面模板：`admin/src/views/_templates/CrudPageTemplate.vue`
- 业务页面：`admin/src/views/<YourPage>.vue`
- 接口封装：`admin/src/api/modules/<your-module>.ts`

## 最小页面骨架

- 筛选条件放到 `useListQuery().query` 中。
- 查询按钮调用 `run`（页面内常命名为 `fetchList`）。
- 重置按钮先调用 `reset`，再调用 `run`。
- 分页状态从 `query.page/query.pageSize` 派生，切页后调用 `run`。
- 新增/编辑用 `FormDrawer`，保存成功后关闭抽屉并刷新列表。

## 权限约定

- 页面级：路由 `meta.permission` 控制访问。
- 按钮级：使用 `v-permission="'xxx:yyy:create'"` 等权限码。
- 优先保证写操作按钮（新增/编辑/删除/状态切换）按权限显示。

## 迁移建议（旧页面 -> 新模式）

1. 先替换列表查询状态到 `useListQuery`，保持 API 和 UI 不变。
2. 再收敛操作行为（确认弹窗、错误提示）到后续 `useCrudActions`。
3. 最后按需拆子组件（如搜索区/抽屉表单）降低单文件复杂度。
