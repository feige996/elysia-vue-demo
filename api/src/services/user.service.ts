import type { LogService } from "./log.service";
import type { UserRepository } from "../repositories/user.repository";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logService: LogService
  ) {}

  getUsers(keyword?: string) {
    this.logService.info(`Query users with keyword: ${keyword ?? "all"}`);
    return this.userRepository.findAll(keyword);
  }

  login(account: string, password: string) {
    const user = this.userRepository.findByAccount(account);
    if (!user) return null;
    const expectedPassword = `${account}123`;
    if (password !== expectedPassword) return null;
    return {
      token: "demo-token",
      user
    };
  }
}
