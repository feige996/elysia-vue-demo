import { di } from 'elysia-di';
import { ArticleRepository } from '../../modules/article';
import { UserRepository, UserService } from '../../modules/user';
import { createLogService } from '../../shared/logger/log.service';

export const logService = createLogService();
const userRepository = new UserRepository();
const articleRepository = new ArticleRepository();
const userService = new UserService(userRepository, logService);

export const diPlugin = di({
    instances: [
        {
            identifier: 'logService',
            instance: logService,
        },
        {
            identifier: 'userRepository',
            instance: userRepository,
        },
        {
            identifier: 'articleRepository',
            instance: articleRepository,
        },
        {
            identifier: 'userService',
            instance: userService,
        },
    ],
});
