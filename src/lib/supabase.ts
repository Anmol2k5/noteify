import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === "") {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in secrets.');
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

export const BUCKET_NAME = 'notes';

/**
 * Uploads a file to Supabase Storage and returns the public URL
 */
export async function uploadNoteImage(file: File, path: string): Promise<string> {
  const client = getSupabase();
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Uploads a base64 enhanced image to Supabase Storage
 */
export async function uploadEnhancedImage(base64: string, path: string): Promise<string> {
  const client = getSupabase();
  // Convert base64 to Blob
  const res = await fetch(base64);
  const blob = await res.blob();
  
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/jpeg'
    });

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return publicUrl;
}
