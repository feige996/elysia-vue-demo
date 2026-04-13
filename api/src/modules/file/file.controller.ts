import type { FileService } from './file.service';
import { ErrorKey, failByKey, ok } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';
import {
  deleteFileSchema,
  uploadBodySchema,
  validateFile,
} from './dto/file.dto';
import type { FileType } from '../../infra/storage/types';

export const createFileController = (fileService: FileService) => ({
  upload: async (body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedBody = uploadBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid upload payload',
      );
    }

    const { file, fileType } = parsedBody.data;
    const validation = validateFile(file, fileType as FileType);

    if (!validation.valid) {
      return failByKey(requestId, ErrorKey.VALIDATION_ERROR, validation.error);
    }

    const result = await fileService.uploadFile(file, fileType as FileType);

    return {
      status: 200,
      payload: ok(requestId, result, 'File uploaded successfully'),
    };
  },

  delete: async (
    query: Record<string, string | undefined>,
    request: Request,
  ) => {
    const { requestId } = ensureRequestContext(request);
    const parsedQuery = deleteFileSchema.safeParse(query);

    if (!parsedQuery.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedQuery.error.issues[0]?.message ?? 'Invalid query',
      );
    }

    await fileService.deleteFile(parsedQuery.data.key);

    return {
      status: 200,
      payload: ok(requestId, null, 'File deleted successfully'),
    };
  },

  getUrl: async (
    query: Record<string, string | undefined>,
    request: Request,
  ) => {
    const { requestId } = ensureRequestContext(request);

    if (!query.key) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        'File key is required',
      );
    }

    const url = fileService.getFileUrl(query.key);

    return {
      status: 200,
      payload: ok(requestId, { url }, 'OK'),
    };
  },
});
