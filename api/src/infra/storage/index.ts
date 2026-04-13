import { IStorage, StorageType } from './types';
import { env } from '../../shared/config/env';
import { LocalStorage } from './local';
import { OssStorage } from './oss';
import { CosStorage } from './cos';

export { LocalStorage } from './local';
export { OssStorage } from './oss';
export { CosStorage } from './cos';

export const createStorage = (): IStorage | null => {
  switch (env.STORAGE_TYPE as StorageType) {
    case 'local':
      return new LocalStorage(env.LOCAL_BASE_DIR, env.LOCAL_BASE_URL);
    case 'oss':
      if (
        !env.OSS_REGION ||
        !env.OSS_ACCESS_KEY_ID ||
        !env.OSS_ACCESS_KEY_SECRET ||
        !env.OSS_BUCKET
      ) {
        console.warn(
          'OSS storage is configured but missing required environment variables',
        );
        return null;
      }
      return new OssStorage({
        region: env.OSS_REGION,
        accessKeyId: env.OSS_ACCESS_KEY_ID,
        accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
        bucket: env.OSS_BUCKET,
        cdnUrl: env.OSS_CDN_URL,
      });
    case 'cos':
      if (
        !env.COS_SECRET_ID ||
        !env.COS_SECRET_KEY ||
        !env.COS_BUCKET ||
        !env.COS_REGION
      ) {
        console.warn(
          'COS storage is configured but missing required environment variables',
        );
        return null;
      }
      return new CosStorage({
        SecretId: env.COS_SECRET_ID,
        SecretKey: env.COS_SECRET_KEY,
        bucket: env.COS_BUCKET,
        region: env.COS_REGION,
        cdnUrl: env.COS_CDN_URL,
      });
    default:
      return null;
  }
};
