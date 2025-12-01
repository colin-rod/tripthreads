'use client'

import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendIcon, PaperclipIcon, BotIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ChatAttachment } from '@/app/actions/chat'
import { MentionAutocomplete, type MentionableUser } from './MentionAutocomplete'
import { mapUsernamesToIds } from '@/lib/chat/parse-user-mentions'

interface ChatInputProps {
  tripId: string
  participants: MentionableUser[]
  onSend: (
    message: string,
    attachments: ChatAttachment[],
    mentionedUserIds?: string[]
  ) => Promise<void>
  onTripThreadMention?: () => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  tripId,
  participants,
  onSend,
  onTripThreadMention,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(0)
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return
    if (isSending) return

    setIsSending(true)

    try {
      // Extract mentioned user IDs from message
      const mentionedUserIds = mapUsernamesToIds(message, participants)

      await onSend(message.trim(), attachments, mentionedUserIds)
      setMessage('')
      setAttachments([])
      setShowMentionAutocomplete(false)

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  // Detect @ mentions and show autocomplete
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = message.slice(0, cursorPos)

    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex === -1) {
      setShowMentionAutocomplete(false)
      return
    }

    // Check if @ is preceded by whitespace or start of string (not part of email)
    const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' '
    if (charBeforeAt !== ' ' && lastAtIndex !== 0) {
      setShowMentionAutocomplete(false)
      return
    }

    // Extract query after @
    const queryText = textBeforeCursor.slice(lastAtIndex + 1)

    // Check if query has spaces (stops @ mention)
    if (queryText.includes(' ')) {
      setShowMentionAutocomplete(false)
      return
    }

    // Check if @TripThread (skip user autocomplete)
    if (queryText.toLowerCase().startsWith('tripthread')) {
      setShowMentionAutocomplete(false)
      return
    }

    // Calculate autocomplete position
    const rect = textarea.getBoundingClientRect()
    setAutocompletePosition({
      top: rect.top - 280, // Position above textarea
      left: rect.left,
    })

    setMentionQuery(queryText)
    setMentionStart(lastAtIndex)
    setShowMentionAutocomplete(true)
  }, [message])

  const handleMentionSelect = (user: MentionableUser) => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Replace @ + query with @username
    const username = user.email.split('@')[0]
    const before = message.slice(0, mentionStart)
    const after = message.slice(textarea.selectionStart)
    const newMessage = `${before}@${username} ${after}`

    setMessage(newMessage)
    setShowMentionAutocomplete(false)

    // Focus textarea and set cursor after mention
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = mentionStart + username.length + 2 // +2 for @ and space
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't send if autocomplete is open (let autocomplete handle Enter)
    if (
      showMentionAutocomplete &&
      (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Escape')
    ) {
      return
    }

    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      const newAttachments: ChatAttachment[] = []

      for (const file of Array.from(files)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large (max 10MB)`)
          continue
        }

        // Validate file type
        const isImage = file.type.startsWith('image/')
        const isDocument =
          file.type === 'application/pdf' ||
          file.type.startsWith('application/vnd.openxmlformats-officedocument')

        if (!isImage && !isDocument) {
          toast.error(`File type not supported: ${file.type}`)
          continue
        }

        // Upload file
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tripId', tripId)

        const response = await fetch('/api/upload-attachment', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          toast.error(`Failed to upload ${file.name}`)
          continue
        }

        const { url } = await response.json()

        newAttachments.push({
          url,
          type: isImage ? 'image' : 'document',
          name: file.name,
          size: file.size,
        })
      }

      setAttachments([...attachments, ...newAttachments])
      toast.success(`Uploaded ${newAttachments.length} file(s)`)
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error('Failed to upload files')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleTripThreadClick = () => {
    if (onTripThreadMention) {
      onTripThreadMention()
    }

    // Insert @TripThread at cursor position
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const before = text.substring(0, start)
    const after = text.substring(end, text.length)

    const mention = '@TripThread '
    const newText = before + mention + after
    setMessage(newText)

    // Set cursor position after @TripThread
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + mention.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  return (
    <div className="border-t bg-background p-4">
      {/* Mention Autocomplete */}
      {showMentionAutocomplete && (
        <MentionAutocomplete
          participants={participants}
          query={mentionQuery}
          onSelect={handleMentionSelect}
          onClose={() => setShowMentionAutocomplete(false)}
          position={autocompletePosition}
        />
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative rounded-lg border bg-muted px-3 py-2 text-xs">
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                ×
              </button>
              <p className="max-w-[200px] truncate">{attachment.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Hint text */}
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <BotIcon className="h-3 w-3" />
        <span>Try: &quot;@TripThread add dinner €60 split 4 ways&quot;</span>
      </div>

      <div className="flex items-end gap-2">
        {/* File upload button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading || isSending}
          className="shrink-0"
        >
          <PaperclipIcon className="h-5 w-5" />
          <span className="sr-only">Attach file</span>
        </Button>

        {/* @TripThread button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTripThreadClick}
          disabled={disabled || isSending}
          className="shrink-0"
        >
          <BotIcon className="mr-2 h-4 w-4" />
          @TripThread
        </Button>

        {/* Message input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className={cn('min-h-[44px] max-h-[200px] resize-none', 'focus-visible:ring-1')}
          rows={1}
        />

        {/* Send button */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={disabled || isSending || (!message.trim() && attachments.length === 0)}
          className="shrink-0"
        >
          <SendIcon className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </div>
  )
}
