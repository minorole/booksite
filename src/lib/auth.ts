import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase.generated';
import { env } from '@/lib/config/env';
import type { Role } from '@/lib/db/enums';

export const LINK_EXPIRY_MS = 15 * 60 * 1000;

export function isSafePath(p?: string): boolean {
  if (!p) return false;
  if (!p.startsWith('/') || p.startsWith('//')) return false;
  return true;
}

export function buildCallbackUrl(origin: string, returnTo?: string): string {
  const qp = new URLSearchParams();
  if (isSafePath(returnTo)) qp.set('returnTo', returnTo!);
  qp.set('ts', String(Date.now()));
  return `${origin}/api/auth/callback?${qp.toString()}`;
}

export function linkExpired(tsParam?: string | null): boolean {
  if (!tsParam) return false;
  const ts = Number(tsParam);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts > LINK_EXPIRY_MS;
}

export function deriveUserRole(email?: string | null): Role {
  return email === env.superAdminEmail() ? 'SUPER_ADMIN' : 'USER';
}

export async function finalizePostLogin(
  supabase: SupabaseClient<Database>,
  user: User,
  role: Role,
): Promise<void> {
  await supabase.auth.updateUser({ data: { role } });
  const meta = (user.user_metadata ?? null) as Record<string, unknown> | null;
  const name = typeof meta?.name === 'string' ? (meta.name as string) : null;
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      name,
      role,
    },
    { onConflict: 'id' },
  );
  if (error) {
    console.error('Profile upsert error:', error);
  }

  // Opportunistically ensure a Cloudinary-hosted avatar for Google users.
  // Idempotent: use deterministic public_id per user to avoid duplicates.
  // Never block login if this fails.
  try {
    const provider = (user.app_metadata as Record<string, unknown> | null | undefined)?.provider as
      | string
      | undefined;
    const umeta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const candidate =
      (typeof umeta.avatar_url === 'string' && (umeta.avatar_url as string)) ||
      (typeof (umeta as Record<string, unknown>).picture === 'string' &&
        ((umeta as Record<string, unknown>).picture as string)) ||
      undefined;

    // Only allow HTTPS avatar sources to avoid mixed content/SSRF risks
    const isHttpsCandidate = (() => {
      try {
        const u = new URL(candidate || '');
        return u.protocol === 'https:';
      } catch {
        return false;
      }
    })();

    if (provider === 'google' && candidate && isHttpsCandidate) {
      // Ensure Cloudinary env exists; SDK reads CLOUDINARY_URL
      env.cloudinaryUrl();
      const cloudinary = (await import('cloudinary')).v2;

      // Deterministic public id to avoid duplicates across logins
      const publicId = `avatars/${user.id}`;

      // Always verify existence of the canonical avatar resource.
      // This recovers gracefully if the Cloudinary asset was deleted manually.
      let finalUrl: string | null = null;
      try {
        const res = await cloudinary.api.resource(publicId).catch(() => null as any);
        if (res && typeof res.secure_url === 'string') {
          finalUrl = cloudinary.url(publicId, {
            secure: true,
            transformation: [
              {
                width: 256,
                height: 256,
                crop: 'thumb',
                gravity: 'face',
                quality: 'auto:good',
                fetch_format: 'auto',
              },
            ],
          });
        }
      } catch {}

      if (!finalUrl) {
        // Upload once with stable public_id; overwrite to refresh while avoiding new duplicates
        const uploaded = await cloudinary.uploader.upload(candidate, {
          folder: 'avatars',
          public_id: user.id,
          unique_filename: false,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            {
              width: 256,
              height: 256,
              crop: 'thumb',
              gravity: 'face',
              quality: 'auto:good',
              fetch_format: 'auto',
            },
          ],
        });
        finalUrl = uploaded.secure_url;
      }

      if (finalUrl) {
        await supabase.auth.updateUser({
          data: {
            avatar_url: finalUrl,
            avatar_provider: 'google',
            avatar_uploaded_at: new Date().toISOString(),
          },
        });
      }
    }
  } catch (e) {
    console.error('Avatar ensure failed:', e);
  }
}

export function computeRedirect(returnTo: string | undefined, origin: string): URL {
  return isSafePath(returnTo) ? new URL(returnTo!, origin) : new URL('/', origin);
}
