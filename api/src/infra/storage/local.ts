import { mkdir } from 'node:fs/promises';
import { IStorage } from './types';

export class LocalStorage implements IStorage {
    private readonly baseDir: string;
    private readonly baseUrl: string;

    constructor(baseDir: string = 'uploads', baseUrl: string = 'http://localhost:6000/uploads') {
        this.baseDir = baseDir;
        this.baseUrl = baseUrl;
    }

    async upload(file: File, key: string): Promise<string> {
        const fullPath = `${this.baseDir}/${key}`;
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        await mkdir(dir, { recursive: true });

        const buffer = await file.arrayBuffer();
        await Bun.write(fullPath, buffer);

        return `${this.baseUrl}/${key}`;
    }

    async delete(key: string): Promise<void> {
        const path = `${this.baseDir}/${key}`;
        try {
            await Bun.file(path).delete();
        } catch {
            // ignore if file doesn't exist
        }
    }

    getUrl(key: string): string {
        return `${this.baseUrl}/${key}`;
    }
}
