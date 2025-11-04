'use client';

import { useState } from 'react';
import { ERROR_MESSAGES, type UILanguage } from '@/lib/admin/i18n';

export function useImageUpload(language: UILanguage = 'en') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string | null> {
    setLoading(true);
    setError(null);
    try {
      // Prefer direct-to-Cloudinary upload with server-signed params
      // Compute sha1 to enable deterministic public_id and dedupe across uploads
      const buf = await file.arrayBuffer();
      const hashBuf = await crypto.subtle.digest('SHA-1', buf);
      const bytes = new Uint8Array(hashBuf);
      const hash = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const signRes = await fetch(`/api/upload/sign?temp=1&hash=${hash}`, { method: 'GET' });
      if (!signRes.ok) {
        throw new Error('Sign failed');
      }
      const sign = (await signRes.json()) as {
        upload_url: string;
        api_key: string;
        params: { timestamp: number; folder: string; tags?: string; signature: string };
      };
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sign.api_key);
      fd.append('timestamp', String(sign.params.timestamp));
      fd.append('signature', sign.params.signature);
      fd.append('folder', sign.params.folder);
      if (sign.params.tags) fd.append('tags', sign.params.tags);
      if ((sign.params as any).transformation)
        fd.append('transformation', (sign.params as any).transformation);
      if ((sign.params as any).public_id) fd.append('public_id', (sign.params as any).public_id);
      if ((sign.params as any).unique_filename)
        fd.append('unique_filename', String((sign.params as any).unique_filename));
      if ((sign.params as any).overwrite)
        fd.append('overwrite', String((sign.params as any).overwrite));

      const upload = await fetch(sign.upload_url, { method: 'POST', body: fd });
      if (!upload.ok) {
        const err = await upload.json().catch(() => ({}) as any);
        throw new Error(err?.error?.message || 'Direct upload failed');
      }
      const payload = (await upload.json()) as { secure_url?: string };
      if (!payload?.secure_url) throw new Error('Missing secure_url');
      return payload.secure_url;
    } catch (e: unknown) {
      // Fallback to server-side upload to preserve UX if direct upload fails
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload?temp=1', { method: 'POST', body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || ERROR_MESSAGES[language].upload_failed);
        }
        const data = (await res.json()) as { url: string };
        return data.url;
      } catch (e2: unknown) {
        const msg =
          typeof e2 === 'object' && e2 && 'message' in e2
            ? String((e2 as { message?: unknown }).message)
            : ERROR_MESSAGES[language].upload_failed;
        setError(msg);
        return null;
      }
    } finally {
      setLoading(false);
    }
  }

  return { upload, loading, error, setError };
}
