// lib/supabase/client.js
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

let clientInstance = null;

export const supabase = new Proxy({}, {
  get(target, prop) {
    if (!clientInstance) {
      clientInstance = createClient();
    }
    const val = clientInstance[prop];
    return typeof val === 'function' ? val.bind(clientInstance) : val;
  }
});
