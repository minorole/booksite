'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OrderStatus } from '@prisma/client'

type Order = {
  id: string
  status: OrderStatus
  total_items: number
  created_at: string
  shipping_address: string
  order_items: Array<{
    book: {
      title_en: string
      title_zh: string
    }
    quantity: number
  }>
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders/user')
        if (!response.ok) throw new Error('Failed to fetch orders')
        const data = await response.json()
        setOrders(data.orders)
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchOrders()
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Order ID: {order.id}
                  </p>
                  <p className="text-sm text-gray-500">
                    Date: {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={
                  order.status === 'PENDING' ? 'default' :
                  order.status === 'CONFIRMED' ? 'secondary' :
                  order.status === 'SHIPPED' ? 'outline' :
                  order.status === 'COMPLETED' ? 'secondary' :
                  'destructive'
                }>
                  {order.status}
                </Badge>
              </div>

              <div className="space-y-2">
                {order.order_items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <p>{item.book.title_en}</p>
                      <p className="text-sm text-gray-500">{item.book.title_zh}</p>
                    </div>
                    <p>x{item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Shipping Address: {order.shipping_address}
                </p>
                <p className="text-sm font-medium">
                  Total Items: {order.total_items}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 