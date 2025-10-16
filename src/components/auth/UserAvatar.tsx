"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import type { User } from "@supabase/supabase-js"
import { cn } from "@/lib/utils"

function stringToHslColor(input: string, s = 65, l = 55): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}deg ${s}% ${l}%)`
}

function getInitials(nameOrEmail: string): string {
  const base = (nameOrEmail || "").trim()
  if (!base) return "U"
  const namePart = base.includes("@") ? base.split("@")[0] : base
  const parts = namePart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
  const letters =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0])
      : (parts[0]?.slice(0, 2) ?? "U")
  return letters.toUpperCase()
}

export function UserAvatar({ user, className }: { user: User; className?: string }) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const imageUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof (meta as Record<string, unknown>).picture === 'string' && (meta as Record<string, unknown>).picture as string) ||
    undefined
  const label =
    (typeof meta.name === "string" && meta.name) ||
    user.email ||
    "User"
  const initials = getInitials(label)
  const bg = stringToHslColor(user.email || user.id)

  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {imageUrl ? (
        <AvatarImage
          src={String(imageUrl)}
          alt={label}
          referrerPolicy="no-referrer"
        />
      ) : null}
      <AvatarFallback
        className="text-white font-semibold"
        style={{ backgroundColor: bg }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
