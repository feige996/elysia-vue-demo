import { z } from 'zod';
import { ALLOWED_FILE_TYPES, DEFAULT_MAX_FILE_SIZE, FileType } from '../../../infra/storage/types';

const fileTypeSchema = z.enum(['avatar', 'image', 'document']);

export const uploadFileSchema = z.object({
    fileType: fileTypeSchema.default('image'),
});

export const uploadBodySchema = z.object({
    file: z.instanceof(File),
    fileType: fileTypeSchema.default('image'),
});

export const deleteFileSchema = z.object({
    key: z.string().min(1, 'File key is required'),
});

export const listFilesSchema = z.object({
    prefix: z.string().optional(),
    max: z.coerce.number().int().positive().max(100).default(20),
    marker: z.string().optional(),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type UploadBodyInput = z.infer<typeof uploadBodySchema>;
export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
export type ListFilesInput = z.infer<typeof listFilesSchema>;

export const validateFile = (file: File, fileType: FileType): { valid: boolean; error?: string } => {
    const allowedTypes = ALLOWED_FILE_TYPES[fileType];
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` };
    }

    const maxSize = DEFAULT_MAX_FILE_SIZE[fileType];
    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        return { valid: false, error: `File size exceeds maximum allowed size of ${maxSizeMB}MB` };
    }

    return { valid: true };
};
