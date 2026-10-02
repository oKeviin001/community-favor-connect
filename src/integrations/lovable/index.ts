// Compatibility shim for environments that still reference the legacy Lovable integration path.
// The independent app uses Supabase directly; no Lovable SDK is required.

import { supabase } from "@/integrations/supabase/client";

export const lovable = {
  auth: {
    async signInWithOAuth(
      provider: "google" | "github" | "apple",
      options?: { redirect_uri?: string }
    ) {
      return supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: options?.redirect_uri ?? window.location.origin,
        },
      });
    },
    async signOut() {
      return supabase.auth.signOut();
    },
    async getSession() {
      return supabase.auth.getSession();
    },
    async getUser() {
      return supabase.auth.getUser();
    },
  },
};
