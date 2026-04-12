export class LogService {
  info(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] ${timestamp} ${message}`);
  }

  error(message: string) {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] ${timestamp} ${message}`);
  }
}
