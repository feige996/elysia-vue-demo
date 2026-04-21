# Layout 使用说明

本目录用于放置页面壳布局（layout）。业务页面本身只关心内容区域，通用结构交给布局统一处理。

## `AdminLayout.vue`

- **适用场景**：后台主应用（登录后），需要顶部导航、侧边栏、主内容区。
- **典型页面**：用户管理、角色管理、菜单管理、监控中心、示例页。
- **路由建议**：放在受保护路由下作为父级 layout（例如当前 `name: 'root'` 的主路由）。

## `AuthLayout.vue`

- **适用场景**：认证相关页面，强调聚焦内容，不展示后台侧边栏。
- **典型页面**：登录、注册、忘记密码、重置密码。
- **路由建议**：给公开路由做父级 layout，并在父路由上配置 `meta.public = true`。

## `BlankLayout.vue`

- **适用场景**：只需要渲染一个页面，不需要任何包裹 UI。
- **典型页面**：403/404/500、全屏页面、嵌入页、临时落地页。
- **路由建议**：作为“纯透传” layout，父级只提供统一路由分组能力。

## 选择建议

- 后台主壳：选 `AdminLayout`
- 认证流程：选 `AuthLayout`
- 无壳页面：选 `BlankLayout`

## 新增 Layout 命名建议

- 命名要体现职责，避免历史语义不清（如 `ConsoleLayout`）。
- 推荐格式：`<DomainOrPurpose>Layout.vue`，例如 `ReportLayout.vue`、`MobileShellLayout.vue`。
