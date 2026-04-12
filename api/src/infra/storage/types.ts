export type StorageType = 'local' | 'oss' | 'cos';

export interface IStorage {
    upload(file: File, key: string): Promise<string>;
    delete(key: string): Promise<void>;
    getUrl(key: string): string;
}

export interface UploadResult {
    url: string;
    key: string;
}

export type FileType = 'avatar' | 'image' | 'document';

export const ALLOWED_FILE_TYPES: Record<FileType, string[]> = {
    avatar: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
    ],
};

export const DEFAULT_MAX_FILE_SIZE: Record<FileType, number> = {
    avatar: 2 * 1024 * 1024,
    image: 10 * 1024 * 1024,
    document: 50 * 1024 * 1024,
};

export const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
};

export const generateFileKey = (file: File, prefix: string = 'uploads'): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = getFileExtension(file.name);
    return `${prefix}/${timestamp}-${random}${ext ? `.${ext}` : ''}`;
};
