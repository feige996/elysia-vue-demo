import { Elysia } from 'elysia';
import { createFileController } from './file.controller';
import { FileService } from './file.service';
import { createStorage } from '../../infra/storage';
import type { FileType } from '../../infra/storage/types';

const storage = createStorage();

if (!storage) {
    console.warn('File storage is not configured. File upload functionality will be unavailable.');
}

const fileService = storage ? new FileService(storage) : null;

export const fileModule = new Elysia({
    prefix: '/api',
    detail: {
        tags: ['File'],
    },
})
    .get(
        '/file',
        () => {
            return { message: 'File service is not available' };
        },
        {
            detail: { summary: '文件服务健康检查' },
            beforeHandle: () => {
                if (!fileService) {
                    return { status: 503, payload: { message: 'File storage is not configured' } };
                }
            },
        },
    )
    .post(
        '/file/upload',
        async (ctx) => {
            if (!fileService) {
                ctx.set.status = 503;
                return { message: 'File storage is not configured' };
            }

            const formData = await ctx.request.formData();
            const file = formData.get('file') as File | null;
            const fileType = (formData.get('fileType') as FileType) || 'image';

            if (!file) {
                ctx.set.status = 400;
                return { message: 'No file provided' };
            }

            const controller = createFileController(fileService);
            const response = await controller.upload({ file, fileType }, ctx.request);
            ctx.set.status = response.status;
            return response.payload;
        },
        {
            detail: { summary: '上传文件' },
        },
    )
    .delete(
        '/file',
        async (ctx) => {
            if (!fileService) {
                ctx.set.status = 503;
                return { message: 'File storage is not configured' };
            }

            const controller = createFileController(fileService);
            const response = await controller.delete(ctx.query as Record<string, string | undefined>, ctx.request);
            ctx.set.status = response.status;
            return response.payload;
        },
        {
            detail: { summary: '删除文件' },
        },
    )
    .get(
        '/file/url',
        async (ctx) => {
            if (!fileService) {
                ctx.set.status = 503;
                return { message: 'File storage is not configured' };
            }

            const controller = createFileController(fileService);
            const response = await controller.getUrl(ctx.query as Record<string, string | undefined>, ctx.request);
            ctx.set.status = response.status;
            return response.payload;
        },
        {
            detail: { summary: '获取文件访问地址' },
        },
    );
