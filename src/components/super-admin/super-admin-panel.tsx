"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { type Role } from '@/lib/db/enums'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  email: string
  name: string | null
  role: Role
  created_at: string
}

export function SuperAdminPanel() {
  const { user, isSuperAdmin, loading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const { toast } = useToast()
  const [updating, setUpdating] = useState<string | null>(null)
  const router = useRouter()

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setUsers(data.users)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users"
      })
    }
  }, [toast])

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push('/')
      return
    }
    if (!loading && isSuperAdmin) {
      fetchUsers()
    }
  }, [loading, isSuperAdmin, router, fetchUsers])

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdating(userId)
    try {
      const response = await fetch('/api/users/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: newRole }),
      })
      
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))
      
      toast({
        title: "Success",
        description: "User role updated successfully"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update role"
      })
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return null

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.name || '-'}</TableCell>
              <TableCell>
                <Select
                  disabled={
                    updating === user.id || 
                    user.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL
                  }
                  value={user.role}
                  onValueChange={(value: Role) => handleRoleChange(user.id, value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {new Date(user.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 
