export type UserEntity = {
  id: number;
  account: string;
  name: string;
  role: "admin" | "editor";
};

export class UserRepository {
  private readonly users: UserEntity[] = [
    { id: 1, account: "admin", name: "Admin", role: "admin" },
    { id: 2, account: "editor", name: "Editor", role: "editor" },
    { id: 3, account: "alice", name: "Alice", role: "editor" }
  ];

  findAll(keyword?: string) {
    if (!keyword) return this.users;
    const normalizedKeyword = keyword.toLowerCase();
    return this.users.filter(
      user =>
        user.account.toLowerCase().includes(normalizedKeyword) ||
        user.name.toLowerCase().includes(normalizedKeyword)
    );
  }

  findByAccount(account: string) {
    return this.users.find(user => user.account === account);
  }
}
