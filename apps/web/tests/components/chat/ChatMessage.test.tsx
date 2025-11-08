import { render, screen } from '@testing-library/react'
import { ChatMessage } from '@/components/features/chat/ChatMessage'
import type { ChatMessageData } from '@/app/actions/chat'

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatStr: string) => {
    if (formatStr === 'p') {
      return '3:45 PM'
    }
    return date.toISOString()
  }),
}))

describe('ChatMessage', () => {
  const mockUser = {
    id: 'user-1',
    full_name: 'Alice Smith',
    email: 'alice@example.com',
    avatar_url: null,
  }

  describe('User Messages', () => {
    it('should render user message correctly', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        message_type: 'user',
        content: 'Hello everyone!',
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: mockUser,
      }

      render(<ChatMessage message={message} currentUserId="user-2" />)

      expect(screen.getByText('Hello everyone!')).toBeInTheDocument()
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('3:45 PM')).toBeInTheDocument()
    })

    it('should show "You" for current user messages', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        message_type: 'user',
        content: 'My message',
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: mockUser,
      }

      render(<ChatMessage message={message} currentUserId="user-1" />)

      expect(screen.getByText('You')).toBeInTheDocument()
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
    })

    it('should display user initials in avatar fallback', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        message_type: 'user',
        content: 'Test message',
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: mockUser,
      }

      render(<ChatMessage message={message} currentUserId="user-2" />)

      // Check for avatar fallback with initials
      expect(screen.getByText('AS')).toBeInTheDocument()
    })

    it('should handle missing user name gracefully', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        message_type: 'user',
        content: 'Test',
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          id: 'user-1',
          full_name: null,
          email: 'alice@example.com',
          avatar_url: null,
        },
      }

      render(<ChatMessage message={message} currentUserId="user-2" />)

      // Should fallback to email
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })
  })

  describe('Bot Messages', () => {
    it('should render bot message correctly', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: null,
        message_type: 'bot',
        content: '✅ Added expense: Dinner - €60.00',
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: null,
      }

      render(<ChatMessage message={message} currentUserId="user-1" />)

      expect(screen.getByText('TripThread')).toBeInTheDocument()
      expect(screen.getByText('✅ Added expense: Dinner - €60.00')).toBeInTheDocument()
      expect(screen.getByText('TT')).toBeInTheDocument() // Avatar initials
    })

    it('should display bot messages with primary styling', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: null,
        message_type: 'bot',
        content: 'Bot response',
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: null,
      }

      render(<ChatMessage message={message} currentUserId="user-1" />)

      // Check for primary color styling on bot name
      const botName = screen.getByText('TripThread')
      expect(botName).toHaveClass('text-primary')
    })
  })

  describe('System Messages', () => {
    it('should render system message correctly', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: null,
        message_type: 'system',
        content: 'Alice joined the trip',
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: null,
      }

      render(<ChatMessage message={message} currentUserId="user-1" />)

      expect(screen.getByText('Alice joined the trip')).toBeInTheDocument()
    })

    it('should center system messages', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: null,
        message_type: 'system',
        content: 'System notification',
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: null,
      }

      const { container } = render(<ChatMessage message={message} currentUserId="user-1" />)

      // Check for centered layout
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('flex', 'justify-center')
    })
  })

  describe('Attachments', () => {
    it('should display image attachments', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        message_type: 'user',
        content: 'Check this out',
        attachments: [
          {
            url: 'https://example.com/image.jpg',
            type: 'image',
            name: 'image.jpg',
            size: 1024000,
          },
        ],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: mockUser,
      }

      render(<ChatMessage message={message} currentUserId="user-2" />)

      expect(screen.getByText('Check this out')).toBeInTheDocument()
      // Image would be rendered by ChatAttachmentDisplay component
    })

    it('should display document attachments', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        message_type: 'user',
        content: 'Receipt attached',
        attachments: [
          {
            url: 'https://example.com/receipt.pdf',
            type: 'document',
            name: 'receipt.pdf',
            size: 2048000,
          },
        ],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: mockUser,
      }

      render(<ChatMessage message={message} currentUserId="user-2" />)

      expect(screen.getByText('Receipt attached')).toBeInTheDocument()
    })

    it('should handle multiple attachments', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        message_type: 'user',
        content: 'Multiple files',
        attachments: [
          {
            url: 'https://example.com/image1.jpg',
            type: 'image',
            name: 'image1.jpg',
            size: 1024000,
          },
          {
            url: 'https://example.com/image2.jpg',
            type: 'image',
            name: 'image2.jpg',
            size: 1024000,
          },
        ],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: mockUser,
      }

      render(<ChatMessage message={message} currentUserId="user-2" />)

      expect(screen.getByText('Multiple files')).toBeInTheDocument()
      // Would render 2 ChatAttachmentDisplay components
    })
  })

  describe('Message Styling', () => {
    it('should apply different styling for current user messages', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        message_type: 'user',
        content: 'My message',
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: mockUser,
      }

      const { container } = render(<ChatMessage message={message} currentUserId="user-1" />)

      // Check for right-aligned layout
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('flex-row-reverse')
    })

    it('should apply default styling for other user messages', () => {
      const message: ChatMessageData = {
        id: 'msg-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        message_type: 'user',
        content: 'Other message',
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: mockUser,
      }

      const { container } = render(<ChatMessage message={message} currentUserId="user-2" />)

      // Check for left-aligned layout
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).not.toHaveClass('flex-row-reverse')
    })
  })
})
