export type UserEntity = {
  id: number;
  account: string;
  name: string;
  role: string;
};

export type MenuEntity = {
  id: number;
  parentId: number;
  name: string;
  path: string;
  routeName: string;
  component: string | null;
  icon: string | null;
  type: number;
  sort: number;
  visible: number;
  status: number;
  permissionCode: string | null;
  keepAlive: number;
};

export type MenuTreeEntity = MenuEntity & {
  children: MenuTreeEntity[];
};

export type ArticleEntity = {
  id: number;
  title: string;
  author: string;
};
