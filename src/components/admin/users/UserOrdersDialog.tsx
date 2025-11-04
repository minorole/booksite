'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { type OrderStatus } from '@/lib/db/enums';
import { fetchUserOrdersApi } from '@/lib/admin/client/users';
import { Bilingual } from '@/components/common/bilingual';

type Order = {
  id: string;
  status: OrderStatus | string;
  total_items: number;
  created_at: string;
  shipping_address: string;
  order_items: Array<{
    book: { title_en: string | null; title_zh: string | null };
    quantity: number;
  }>;
};

export function UserOrdersDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; email?: string | null } | null;
}) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open || !user?.id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchUserOrdersApi(user.id);
        if (!cancelled) setOrders(data as Order[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const title = user?.email ? (
    <Bilingual cnText={`用户 ${user.email} 的订单`} enText={`Orders for ${user.email}`} />
  ) : user?.id ? (
    <Bilingual cnText={`用户 ${user.id} 的订单`} enText={`Orders for ${user.id}`} />
  ) : (
    <Bilingual cnText="订单" enText="Orders" />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          <Bilingual
            cnText="此对话框显示该用户的订单列表。"
            enText="This dialog shows the user's orders."
          />
        </DialogDescription>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-destructive py-4 text-sm">
            <Bilingual cnText="获取订单失败" enText="Failed to fetch orders" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-muted-foreground py-4 text-sm">
            <Bilingual cnText="暂无订单" enText="No orders found." />
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
            {orders.map((order) => (
              <Card key={order.id} className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="text-muted-foreground text-xs">
                      <Bilingual cnText="订单号：" enText="Order ID: " />
                      {order.id}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      <Bilingual cnText="日期：" enText="Date: " />
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    variant={
                      order.status === 'PENDING'
                        ? 'default'
                        : order.status === 'CONFIRMED'
                          ? 'secondary'
                          : order.status === 'SHIPPED'
                            ? 'outline'
                            : order.status === 'COMPLETED'
                              ? 'secondary'
                              : order.status === 'PROCESSING'
                                ? 'secondary'
                                : order.status === 'CANCELLED'
                                  ? 'destructive'
                                  : 'outline'
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {order.order_items.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between">
                      <div>
                        <div className="text-sm">{item.book.title_en || ''}</div>
                        {item.book.title_zh ? (
                          <div className="text-muted-foreground text-xs">{item.book.title_zh}</div>
                        ) : null}
                      </div>
                      <div className="text-sm">x{item.quantity}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t pt-3">
                  <div className="text-muted-foreground text-xs whitespace-pre-line">
                    <Bilingual cnText="收货地址：" enText="Shipping Address: " />
                    {order.shipping_address}
                  </div>
                  <div className="mt-1 text-sm font-medium">
                    <Bilingual cnText="总件数：" enText="Total Items: " />
                    {order.total_items}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
