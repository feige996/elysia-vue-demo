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

const DYNAMIC_ROUTE_NAME_PREFIX = 'dynamic:';

const dynamicRouteNames = new Set<string>();

const ConsoleLayout = () => import('../layouts/ConsoleLayout.vue');
const Forbidden = () => import('../views/Forbidden.vue');
const LoginPage = () => import('../views/LoginPage.vue');
const MenuManagement = () => import('../views/MenuManagement.vue');
const RoleManagement = () => import('../views/RoleManagement.vue');
const UserManagement = () => import('../views/UserManagement.vue');
const DictConfigManagement = () => import('../views/DictConfigManagement.vue');
const DeptManagement = () => import('../views/DeptManagement.vue');
const AuditLogManagement = () => import('../views/AuditLogManagement.vue');
const OnlineUserManagement = () => import('../views/OnlineUserManagement.vue');
const CacheMonitorManagement = () =>
  import('../views/CacheMonitorManagement.vue');
const IpBlacklistManagement = () =>
  import('../views/IpBlacklistManagement.vue');

const resolveMenuComponent = (menu: MenuTreeEntity) => {
  const componentKey = menu.component ?? '';
  if (componentKey === 'system/user/index') return UserManagement;
  if (componentKey === 'system/role/index') return RoleManagement;
  if (componentKey === 'system/menu/index') return MenuManagement;
  if (componentKey === 'system/dept/index') return DeptManagement;
  if (componentKey === 'system/dict-config/index') return DictConfigManagement;
  if (componentKey === 'system/audit-log/index') return AuditLogManagement;
  if (componentKey === 'monitor/online/index') return OnlineUserManagement;
  if (componentKey === 'monitor/cache/index') return CacheMonitorManagement;
  if (componentKey === 'security/ip-blacklist/index')
    return IpBlacklistManagement;
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
    path: '/',
    name: 'root',
    component: ConsoleLayout,
    children: [
      {
        path: '',
        redirect: '/login',
      },
      {
        path: '403',
        component: Forbidden,
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
