'use client'

import Image from 'next/image'
import { FileIcon, DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '@/app/actions/chat'

interface ChatAttachmentDisplayProps {
  attachment: ChatAttachment
  className?: string
}

export function ChatAttachmentDisplay({ attachment, className }: ChatAttachmentDisplayProps) {
  const { url, type, name, size } = attachment

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
  }

  // Image attachment
  if (type === 'image') {
    return (
      <div className={cn('relative overflow-hidden rounded-lg', className)}>
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <Image
            src={url}
            alt={name}
            width={400}
            height={300}
            className="max-h-64 w-auto rounded-lg object-cover transition-opacity hover:opacity-90"
          />
        </a>
      </div>
    )
  }

  // Document attachment
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border bg-card p-3 text-sm', className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
        <FileIcon className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 overflow-hidden">
        <p className="truncate font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(size)}</p>
      </div>

      <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
        <a href={url} download={name} target="_blank" rel="noopener noreferrer">
          <DownloadIcon className="h-4 w-4" />
          <span className="sr-only">Download {name}</span>
        </a>
      </Button>
    </div>
  )
}
