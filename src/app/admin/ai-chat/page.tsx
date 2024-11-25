"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ChatInterface } from "@/components/admin/ai-chat/chat-interface";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AdminAIChatPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="p-4">
        <Card className="flex flex-col h-[calc(100vh-10rem)] w-full max-w-4xl mx-auto items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Checking authorization...</p>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <ChatInterface />
    </div>
  );
}
