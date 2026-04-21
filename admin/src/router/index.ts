import {
  createRouter,
  createWebHistory,
  type Router,
  type RouteRecordRaw,
} from 'vue-router';
import { ADMIN_TOKEN_KEY } from '../../../shared/auth/storage-keys';
import type { MenuTreeEntity } from '../../../api/src/shared/types/entities';
import { pinia } from '../store';
import { useAuthStore } from '../store/auth';
import { resolveViewLoaderByKey } from './view-map';

const DYNAMIC_ROUTE_NAME_PREFIX = 'dynamic:';

const dynamicRouteNames = new Set<string>();

const AdminLayout = () => import('../layouts/AdminLayout.vue');
const Forbidden = () => import('../views/Forbidden.vue');
const LoginPage = () => import('../views/LoginPage.vue');
const RegisterPage = () => import('../views/RegisterPage.vue');
const ForgotPasswordPage = () => import('../views/ForgotPasswordPage.vue');
const ResetPasswordPage = () => import('../views/ResetPasswordPage.vue');
const MenuManagement = () => import('../views/MenuManagement.vue');
const RoleManagement = () => import('../views/RoleManagement.vue');
const UserManagement = () => import('../views/UserManagement.vue');
const DictConfigManagement = () => import('../views/DictConfigManagement.vue');
const DeptManagement = () => import('../views/DeptManagement.vue');
const AuditLogManagement = () => import('../views/AuditLogManagement.vue');
const LoginLogManagement = () => import('../views/LoginLogManagement.vue');
const ApiCatalogManagement = () => import('../views/ApiCatalogManagement.vue');
const OnlineUserManagement = () => import('../views/OnlineUserManagement.vue');
const JobManagement = () => import('../views/JobManagement.vue');
const CacheMonitorManagement = () =>
  import('../views/CacheMonitorManagement.vue');
const IpBlacklistManagement = () =>
  import('../views/IpBlacklistManagement.vue');
const UserCenterPage = () => import('../views/UserCenterPage.vue');
const StorageManagement = () => import('../views/StorageManagement.vue');
const DashboardConsole = () => import('../views/DashboardConsole.vue');
const TableOpsDemoPage = () => import('../views/TableOpsDemoPage.vue');
const ChartsDemoPage = () => import('../views/demo/charts/index.vue');
const RichTextDemoPage = () => import('../views/demo/rich-text/index.vue');

type ViewComponentLoader = () => Promise<unknown>;

const legacyComponentResolverMap: Record<string, ViewComponentLoader> = {
  'system/user/index': UserManagement,
  'system/role/index': RoleManagement,
  'system/menu/index': MenuManagement,
  'system/dept/index': DeptManagement,
  'system/dict-config/index': DictConfigManagement,
  'system/audit-log/index': AuditLogManagement,
  'system/login-log/index': LoginLogManagement,
  'system/api-catalog/index': ApiCatalogManagement,
  'monitor/online/index': OnlineUserManagement,
  'monitor/job/index': JobManagement,
  'monitor/cache/index': CacheMonitorManagement,
  'system/storage/index': StorageManagement,
  'system/table-ops-demo/index': TableOpsDemoPage,
  'dashboard/console/index': DashboardConsole,
  'security/ip-blacklist/index': IpBlacklistManagement,
};

const resolveMenuComponent = (menu: MenuTreeEntity) => {
  const componentKey = (menu.component ?? '').replace(/^\/+/, '');
  const autoResolved = componentKey
    ? resolveViewLoaderByKey(componentKey)
    : undefined;
  if (autoResolved) {
    return autoResolved;
  }

  const legacyResolved = legacyComponentResolverMap[componentKey];
  if (legacyResolved) {
    return legacyResolved;
  }

  if (componentKey && import.meta.env.DEV) {
    console.warn(
      `[router] unresolved menu component key "${componentKey}", fallback to MenuManagement`,
    );
  }
  return MenuManagement;
};

const walkMenuTree = (
  tree: MenuTreeEntity[],
  collector: MenuTreeEntity[] = [],
  visited = new Set<number>(),
) => {
  for (const item of tree) {
    if (visited.has(item.id)) continue;
    visited.add(item.id);
    if (item.type === 2) collector.push(item);
    if (item.children.length > 0)
      walkMenuTree(item.children, collector, visited);
  }
  return collector;
};

const ensureDynamicRoutes = (router: Router, menuTree: MenuTreeEntity[]) => {
  for (const name of dynamicRouteNames) {
    if (router.hasRoute(name)) {
      router.removeRoute(name);
    }
  }
  dynamicRouteNames.clear();

  const dynamicMenus = walkMenuTree(menuTree);
  for (const menu of dynamicMenus) {
    const routeName = `${DYNAMIC_ROUTE_NAME_PREFIX}${menu.routeName}`;
    dynamicRouteNames.add(routeName);
    router.addRoute('root', {
      path: menu.path.replace(/^\//, ''),
      name: routeName,
      component: resolveMenuComponent(menu),
      meta: {
        permission: menu.permissionCode ?? undefined,
        title: menu.name,
      },
    });
  }
};

export const ensureAuthDynamicRoutes = (menuTree: MenuTreeEntity[]) => {
  ensureDynamicRoutes(router, menuTree);
};

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: LoginPage,
    meta: {
      public: true,
    },
  },
  {
    path: '/register',
    component: RegisterPage,
    meta: {
      public: true,
    },
  },
  {
    path: '/forgot-password',
    component: ForgotPasswordPage,
    meta: {
      public: true,
    },
  },
  {
    path: '/reset-password',
    component: ResetPasswordPage,
    meta: {
      public: true,
    },
  },
  {
    path: '/',
    name: 'root',
    component: AdminLayout,
    children: [
      {
        path: '',
        redirect: '/login',
      },
      {
        path: '403',
        component: Forbidden,
      },
      {
        path: 'system/user-center',
        component: UserCenterPage,
      },
      {
        path: 'demo/table-ops',
        component: TableOpsDemoPage,
      },
      {
        path: 'demo/charts',
        component: ChartsDemoPage,
      },
      {
        path: 'demo/rich-text',
        component: RichTextDemoPage,
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia);
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);

  if (to.meta.public) {
    if (token && to.path === '/login') {
      authStore.restoreProfile();
      if (!authStore.initialized) {
        try {
          await authStore.bootstrapAuthContext();
          ensureDynamicRoutes(router, authStore.menuTree);
        } catch {
          authStore.clearAuthState();
          return true;
        }
      } else if (dynamicRouteNames.size === 0) {
        ensureDynamicRoutes(router, authStore.menuTree);
      }
      return '/system/user';
    }
    return true;
  }

  if (!token) {
    authStore.clearAuthState();
    return '/login';
  }

  authStore.restoreProfile();
  if (!authStore.initialized) {
    try {
      await authStore.bootstrapAuthContext();
      ensureDynamicRoutes(router, authStore.menuTree);
    } catch {
      authStore.clearAuthState();
      return '/login';
    }
  }

  if (authStore.initialized && dynamicRouteNames.size === 0) {
    ensureDynamicRoutes(router, authStore.menuTree);
    return to.fullPath;
  }

  const permissionCode = to.meta.permission as string | undefined;
  if (permissionCode && !authStore.hasPermission(permissionCode)) {
    return '/403';
  }

  return true;
});
