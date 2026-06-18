import { apiClient } from './client';

export async function subscribeToNewsletter(
  email: string,
): Promise<{ ok: boolean; alreadySubscribed: boolean }> {
  return apiClient<{ ok: boolean; alreadySubscribed: boolean }>(
    '/newsletter/subscribe',
    {
      method: 'POST',
      body: { email },
    },
  );
}
