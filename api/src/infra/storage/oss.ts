import OSS from 'ali-oss';
import { IStorage } from './types';

export class OssStorage implements IStorage {
  private readonly client: any;
  private readonly bucket: string;
  private readonly cdnUrl?: string;

  constructor(options: {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    cdnUrl?: string;
  }) {
    this.client = new OSS({
      region: options.region,
      accessKeyId: options.accessKeyId,
      accessKeySecret: options.accessKeySecret,
      bucket: options.bucket,
    });
    this.bucket = options.bucket;
    this.cdnUrl = options.cdnUrl;
  }

  async upload(file: File, key: string): Promise<string> {
    const buffer = await file.arrayBuffer();
    const result = await this.client.put(key, Buffer.from(buffer));
    return result.url;
  }

  async delete(key: string): Promise<void> {
    await this.client.delete(key);
  }

  getUrl(key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }
    return `https://${this.bucket}.oss-${this.client.options.region}.aliyuncs.com/${key}`;
  }
}
