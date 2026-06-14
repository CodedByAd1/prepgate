import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) throw new Error("SUPABASE_URL is not set");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

/**
 * Server-side only Supabase client using the service role key.
 * Never expose this client to the browser.
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Storage bucket names
export const BUCKETS = {
  PDF_IMPORTS: "pdf-imports",
  PAGE_IMAGES: "page-images",
  QUESTION_IMAGES: "question-images",
} as const;
