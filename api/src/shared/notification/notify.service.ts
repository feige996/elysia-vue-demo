import { env } from '../config/env';
import { logService } from '../logger/log.service';

type VerifyChannel = 'email' | 'sms';

const withTimeout = async (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    env.NOTIFY_PROVIDER_TIMEOUT_MS,
  );
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const maskTarget = (target: string, channel: VerifyChannel) => {
  if (channel === 'email') {
    const [name, domain] = target.split('@');
    if (!name || !domain) return '***';
    if (name.length <= 2) return `**@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  }
  if (target.length <= 4) return '****';
  return `${target.slice(0, 3)}****${target.slice(-2)}`;
};

const sendByWebhook = async (
  channel: VerifyChannel,
  target: string,
  code: string,
  account: string,
) => {
  const webhookUrl =
    channel === 'email'
      ? env.NOTIFY_EMAIL_WEBHOOK_URL
      : env.NOTIFY_SMS_WEBHOOK_URL;
  const webhookToken =
    channel === 'email'
      ? env.NOTIFY_EMAIL_WEBHOOK_TOKEN
      : env.NOTIFY_SMS_WEBHOOK_TOKEN;

  if (!webhookUrl) {
    // Dev fallback: no real provider, still log the code.
    logService.warn('notify_webhook_not_configured', {
      channel,
      account,
      target: maskTarget(target, channel),
      code,
    });
    return;
  }

  const response = await withTimeout(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
    },
    body: JSON.stringify({
      channel,
      target,
      account,
      template: 'password_reset',
      variables: {
        code,
        ttlSeconds: env.PASSWORD_RESET_CODE_TTL_SECONDS,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`notify provider failed: ${response.status}`);
  }
};

export const sendVerificationCode = async (
  channel: VerifyChannel,
  target: string,
  code: string,
  account: string,
) => {
  await sendByWebhook(channel, target, code, account);
  return {
    maskedTarget: maskTarget(target, channel),
  };
};
