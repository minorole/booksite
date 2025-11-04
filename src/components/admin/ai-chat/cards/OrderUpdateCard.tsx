'use client';

import { Bilingual } from '@/components/common/bilingual';

export function OrderUpdateCard({
  data,
}: {
  data: {
    order?: { order_id: string; status?: string | null; tracking_number?: string | null };
  } | null;
}) {
  const o = data?.order;
  if (!o)
    return (
      <p className="text-muted-foreground text-sm">
        <Bilingual cnText="没有订单更新。" enText="No order update." />
      </p>
    );
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">
        <Bilingual cnText="订单更新" enText="Order update" />
      </h3>
      <div className="bg-background rounded-xl border p-3 text-sm shadow-sm">
        <div className="flex items-center justify-between">
          <span>
            <Bilingual cnText="编号" enText="ID" />: {o.order_id}
          </span>
          {o.status && (
            <span className="bg-success/10 text-success rounded px-2 py-0.5 text-xs">
              {o.status}
            </span>
          )}
        </div>
        {o.tracking_number && (
          <div className="text-muted-foreground mt-1 text-xs">
            <Bilingual cnText="运单号" enText="Tracking" />: {o.tracking_number}
          </div>
        )}
      </div>
    </div>
  );
}
