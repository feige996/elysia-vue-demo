export type UserEntity = {
    id: number;
    account: string;
    name: string;
    role: 'admin' | 'editor';
};

export type ArticleEntity = {
    id: number;
    title: string;
    author: string;
};
