import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client — używa service_role key.
 * Używać TYLKO w server actions / route handlers, nigdy po stronie klienta.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Brakuje zmiennych środowiskowych Supabase (URL lub SERVICE_ROLE_KEY).");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
