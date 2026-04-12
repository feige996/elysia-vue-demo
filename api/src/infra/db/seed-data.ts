import type { ArticleEntity, UserEntity } from '../../shared/types/entities';

export const defaultUsers: UserEntity[] = [
    { id: 1, account: 'admin', name: 'Admin', role: 'admin' },
    { id: 2, account: 'editor', name: 'Editor', role: 'editor' },
    { id: 3, account: 'alice', name: 'Alice', role: 'editor' }
];

export const defaultArticles: ArticleEntity[] = [
    { id: 1, title: 'Elysia + Bun 快速启动', author: 'Admin' },
    { id: 2, title: 'Vue3 + Alova 请求实践', author: 'Editor' },
    { id: 3, title: '前后端类型共享方案', author: 'Admin' }
];
