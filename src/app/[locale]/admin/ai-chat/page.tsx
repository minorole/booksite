"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ChatInterface } from "@/components/admin/ai-chat/chat-interface";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Bilingual } from "@/components/common/bilingual";
import { useLocale } from "@/contexts/LocaleContext";

export default function AdminAIChatPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale } = useLocale();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth/signin`);
    }
  }, [loading, user, router, locale]);

  if (loading) {
    return (
      <div className="p-4">
        <Card className="flex flex-col h-[calc(100vh-10rem)] w-full max-w-4xl mx-auto items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">
            <Bilingual as="span" cnText="正在检查权限…" enText="Checking authorization..." />
          </p>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-4 theme-catppuccin">
      <ChatInterface />
    </div>
  );
}
