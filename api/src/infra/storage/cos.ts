import COS from 'cos-js-sdk-v5';
import { IStorage } from './types';

export class CosStorage implements IStorage {
  private readonly cos: COS;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnUrl?: string;

  constructor(options: {
    SecretId: string;
    SecretKey: string;
    bucket: string;
    region: string;
    cdnUrl?: string;
  }) {
    this.cos = new COS({
      SecretId: options.SecretId,
      SecretKey: options.SecretKey,
    });
    this.bucket = options.bucket;
    this.region = options.region;
    this.cdnUrl = options.cdnUrl;
  }

  async upload(file: File, key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: file,
        },
        (err: unknown) => {
          if (err) {
            reject(err);
          } else {
            const url = this.getUrl(key);
            resolve(url);
          }
        },
      );
    });
  }

  async delete(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cos.deleteObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err: unknown) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }

  getUrl(key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }
    return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
  }
}
