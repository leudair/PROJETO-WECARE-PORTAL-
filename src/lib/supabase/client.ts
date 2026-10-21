import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";
import { supabaseCookieOptions } from "./cookie-options";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: supabaseCookieOptions,
  });
}
