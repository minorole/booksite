'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bilingual } from '@/components/common/bilingual';

type Health = { ok: boolean; latency_ms?: number; model?: string; url?: string; error?: string };

export function ClipHealthCard() {
  const [clip, setClip] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    try {
      setLoading(true);
      const rsp = await fetch('/api/super-admin/clip/health', { cache: 'no-store' });
      const json = await rsp.json().catch(() => ({}));
      if (!rsp.ok || !json?.ok) setClip({ ok: false, error: json?.error || `HTTP ${rsp.status}` });
      else
        setClip({
          ok: true,
          latency_ms: json.latency_ms,
          model: json.details?.model,
          url: json.url,
        });
    } catch (e) {
      setClip({ ok: false, error: (e as Error)?.message || 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void run();
  }, []);

  return (
    <div className="bg-background mb-6 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">
            <Bilingual cnText="CLIP 向量服务健康" enText="CLIP Embeddings Health" />
          </h2>
          <p className="text-muted-foreground text-sm">
            <Bilingual cnText="Cloud Run（CPU 按需）" enText="Cloud Run (CPU on request)" />
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading ? (
            <Bilingual cnText="正在刷新" enText="Refreshing" />
          ) : (
            <Bilingual cnText="刷新" enText="Refresh" />
          )}
        </Button>
      </div>
      <div className="mt-3 text-sm">
        {clip ? (
          clip.ok ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-600" />{' '}
                <Bilingual cnText="在线" enText="Online" />
              </span>
              {typeof clip.latency_ms === 'number' && <span>{clip.latency_ms} ms</span>}
              {clip.model && <span>{clip.model}</span>}
              {clip.url && (
                <a className="underline" href={clip.url} target="_blank" rel="noreferrer">
                  {clip.url}
                </a>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              <span>
                <Bilingual cnText="不可用" enText="Unavailable" />
              </span>
              {clip.error && <span className="text-muted-foreground">({clip.error})</span>}
            </div>
          )
        ) : (
          <span className="text-muted-foreground">
            <Bilingual cnText="正在检测…" enText="Checking…" />
          </span>
        )}
      </div>
    </div>
  );
}
