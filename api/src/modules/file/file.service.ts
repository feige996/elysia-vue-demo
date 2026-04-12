import type { IStorage } from '../../infra/storage/types';
import { generateFileKey, type FileType } from '../../infra/storage/types';

export class FileService {
    constructor(private readonly storage: IStorage) {}

    async uploadFile(file: File, fileType: FileType): Promise<{ url: string; key: string }> {
        const prefix = fileType === 'avatar' ? 'avatars' : fileType === 'image' ? 'images' : 'documents';
        const key = generateFileKey(file, prefix);
        const url = await this.storage.upload(file, key);
        return { url, key };
    }

    async deleteFile(key: string): Promise<void> {
        await this.storage.delete(key);
    }

    getFileUrl(key: string): string {
        return this.storage.getUrl(key);
    }
}
