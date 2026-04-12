import { di } from 'elysia-di';
import { createDatabaseAdapter } from '../../infra/db/database-adapter';
import { ArticleRepository } from '../../modules/article';
import { UserRepository, UserService } from '../../modules/user';
import { createLogService } from '../../shared/logger/log.service';

const logService = createLogService();
const databaseAdapter = createDatabaseAdapter();
const userRepository = new UserRepository(databaseAdapter);
const articleRepository = new ArticleRepository(databaseAdapter);
const userService = new UserService(userRepository, logService);

export const dependencies = {
    logService,
    databaseAdapter,
    userRepository,
    articleRepository,
    userService,
};

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
