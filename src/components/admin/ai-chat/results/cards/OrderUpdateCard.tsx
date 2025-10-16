"use client";

export function OrderUpdateCard({ data }: { data: { order?: { order_id: string; status?: string | null; tracking_number?: string | null } } | null }) {
  const o = data?.order
  if (!o) return <p className="text-sm text-muted-foreground">No order update.</p>
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Order update</h3>
      <div className="rounded border bg-background p-3 text-sm">
        <div className="flex items-center justify-between">
          <span>ID: {o.order_id}</span>
          {o.status && <span className="text-xs rounded px-2 py-0.5 bg-emerald-100 text-emerald-700">{o.status}</span>}
        </div>
        {o.tracking_number && (
          <div className="mt-1 text-xs text-muted-foreground">Tracking: {o.tracking_number}</div>
        )}
      </div>
    </div>
  )
}

