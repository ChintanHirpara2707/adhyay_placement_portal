import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export const LOGO_BUCKET = 'company-logos';
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];

export interface PickedImage {
  uri: string;
  name?: string | null;
  size?: number | null;
  mimeType?: string | null;
}

const mimeFromName = (name?: string | null) => {
  const n = (name ?? '').toLowerCase();
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.webp')) return 'image/webp';
  return null;
};

/** Throws a user-readable Error unless the file is a PNG/JPEG/WebP under 2 MB. Returns the content type. */
export function validateLogo(file: PickedImage): string {
  const type = ALLOWED.includes(file.mimeType ?? '') ? (file.mimeType as string) : mimeFromName(file.name);
  if (!type) throw new Error('Use a PNG, JPG or WebP image.');
  if (file.size != null && file.size > MAX_LOGO_BYTES) throw new Error('The logo is larger than 2 MB. Please choose a smaller image.');
  return type;
}

/**
 * Uploads (or replaces) the company's logo at "{uid}/logo" in the public bucket and returns the public URL.
 * A ?v= stamp is added so browsers and the image cache pick up a replaced logo.
 */
export async function uploadCompanyLogo(uid: string, file: PickedImage): Promise<string> {
  const contentType = validateLogo(file);
  const response = await fetch(file.uri);
  const body: Blob | ArrayBuffer = Platform.OS === 'web' ? await response.blob() : await response.arrayBuffer();
  const bytes = body instanceof ArrayBuffer ? body.byteLength : body.size;
  if (bytes === 0) throw new Error('The selected file is empty.');
  if (bytes > MAX_LOGO_BYTES) throw new Error('The logo is larger than 2 MB. Please choose a smaller image.');

  const path = `${uid}/logo`;
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, body, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeCompanyLogoFile(uid: string): Promise<void> {
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove([`${uid}/logo`]);
  if (error) throw error;
}
