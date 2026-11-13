import { Linking, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export const RESUME_BUCKET = 'resumes';
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60; // 1 hour

export interface PickedPdf {
  uri: string;
  name?: string | null;
  size?: number | null;
  mimeType?: string | null;
}

/** students.resume_url value for an uploaded file: "resumes/{uid}/resume.pdf" (bucket/object). */
export const resumeStoragePath = (uid: string) => `${RESUME_BUCKET}/${uid}/resume.pdf`;

const isHttp = (v: string) => /^https?:\/\//i.test(v.trim());

/** Throws a user-readable Error when the picked file is not a PDF or is over 5 MB. */
export function validatePdf(file: PickedPdf): void {
  const looksPdf = file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.name ?? '');
  if (!looksPdf) throw new Error('Only PDF files are allowed.');
  if (file.size != null && file.size > MAX_RESUME_BYTES) throw new Error('The PDF is larger than 5 MB. Please choose a smaller file.');
}

/**
 * Uploads (or replaces) the student's resume and returns the path to store in students.resume_url.
 * Web uploads a Blob from fetch(uri); native uploads the bytes (RN cannot reliably send a Blob).
 */
export async function uploadResume(uid: string, file: PickedPdf): Promise<string> {
  validatePdf(file);
  const response = await fetch(file.uri);
  const body: Blob | ArrayBuffer = Platform.OS === 'web' ? await response.blob() : await response.arrayBuffer();
  const bytes = body instanceof ArrayBuffer ? body.byteLength : body.size;
  if (bytes === 0) throw new Error('The selected file is empty.');
  if (bytes > MAX_RESUME_BYTES) throw new Error('The PDF is larger than 5 MB. Please choose a smaller file.');

  const { error } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(`${uid}/resume.pdf`, body, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;
  return resumeStoragePath(uid);
}

/**
 * Turns a students.resume_url value into an openable URL.
 *  - old pasted http(s) links are returned unchanged
 *  - uploaded files ("resumes/{uid}/resume.pdf") get a 1-hour signed URL
 * Throws if the value is empty or the signed URL cannot be created (no access / file missing).
 */
export async function getResumeUrl(value: string | null | undefined): Promise<string> {
  const v = (value ?? '').trim();
  if (!v) throw new Error('No resume has been added.');
  if (isHttp(v)) return v;
  const objectPath = v.startsWith(`${RESUME_BUCKET}/`) ? v.slice(RESUME_BUCKET.length + 1) : v;
  const { data, error } = await supabase.storage.from(RESUME_BUCKET).createSignedUrl(objectPath, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not open the resume.');
  return data.signedUrl;
}

/** Resolves the URL and opens it (new tab on web). Throws on failure so callers can showAlert. */
export async function openResume(value: string | null | undefined): Promise<void> {
  await Linking.openURL(await getResumeUrl(value));
}
