import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseCredentials {
  url: string;
  publishableKey: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function getSupabaseCredentials(): SupabaseCredentials {
  const url = requiredEnv('SUPABASE_URL');
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();

  if (!publishableKey) {
    throw new Error(
      'SUPABASE_PUBLISHABLE_KEY is not set (SUPABASE_ANON_KEY is also supported for legacy projects)'
    );
  }

  return { url, publishableKey };
}

function getSupabaseSecretKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    undefined
  );
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, publishableKey } = getSupabaseCredentials();
  const secretKey = getSupabaseSecretKey();

  if (!token && !secretKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY is not set (SUPABASE_SERVICE_ROLE_KEY is also supported for legacy projects)'
    );
  }

  return createClient(url, token ? publishableKey : secretKey!, {
    global: token
      ? {
          headers: { Authorization: `Bearer ${token}` },
        }
      : undefined,
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export {
  getSupabaseCredentials,
  getSupabaseSecretKey,
  getSupabaseClient,
};
