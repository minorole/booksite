"use client"

import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InventoryManagement } from './inventory-management'
import { OrderManagement } from './order-management'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BookManagement } from './book-management'

export function AdminPanel() {
  const { isAdmin, isSuperAdmin, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin && !isSuperAdmin) {
      router.push('/')
    }
  }, [loading, isAdmin, isSuperAdmin, router])

  if (loading || (!isAdmin && !isSuperAdmin)) return null

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventory Management</TabsTrigger>
          <TabsTrigger value="books">Book Listings</TabsTrigger>
          <TabsTrigger value="orders">Order Management</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory">
          <InventoryManagement />
        </TabsContent>
        <TabsContent value="books">
          <BookManagement />
        </TabsContent>
        <TabsContent value="orders">
          <OrderManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
} 