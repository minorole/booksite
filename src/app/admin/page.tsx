import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { BookOpen, Bot, Package } from "lucide-react"

export default function AdminDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Link href="/admin/manual">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Manual Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manually add or edit book listings with full control over all fields.
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/admin/ai-assistant">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use AI to quickly analyze book covers and generate listings.
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/admin/orders">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View and manage incoming book orders.
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
} 