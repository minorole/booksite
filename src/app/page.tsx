import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <section className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Welcome to Free Marketplace</h1>
            <p className="text-xl text-muted-foreground">
              A platform for sharing and discovering free items in your community
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Browse Items</CardTitle>
                <CardDescription>
                  Discover free items available in your area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/products">
                    View Products
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Share Items</CardTitle>
                <CardDescription>
                  Help others by sharing items you no longer need
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/products/new">
                    Donate Item
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">1. Sign Up</h3>
                <p className="text-muted-foreground">
                  Create an account using your email
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">2. Browse or Share</h3>
                <p className="text-muted-foreground">
                  Find items or share what you don't need
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">3. Connect</h3>
                <p className="text-muted-foreground">
                  Arrange pickup with item owners
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Free Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
