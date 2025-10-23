"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { ReactNode } from "react"

type Props = {
  src: string
  alt: string
  title?: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
  contentClassName?: string
  containerClassName?: string
  imageClassName?: string
  sizes?: string
  priority?: boolean
  unoptimized?: boolean
}

export function ImagePreviewDialog({
  src,
  alt,
  title,
  description,
  open,
  onOpenChange,
  children,
  contentClassName,
  containerClassName,
  imageClassName,
  sizes,
  priority,
  unoptimized,
}: Props) {
  const name = title || alt || "Image preview"
  const desc = description || "Full-size image preview."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className={cn(contentClassName)}>
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <DialogDescription className="sr-only">{desc}</DialogDescription>
        <div className={cn("relative w-full h-[80vh]", containerClassName)}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            unoptimized={unoptimized}
            className={cn("object-contain", imageClassName)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ImagePreviewDialog

