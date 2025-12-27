import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactionBar, type Reaction } from '@/components/features/chat/ReactionBar'
import { addReaction } from '@/app/actions/chat'

// Mock the server action
jest.mock('@/app/actions/chat', () => ({
  addReaction: jest.fn(),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}))

describe('ReactionBar - Layout and Spacing', () => {
  const mockReactions: Reaction[] = [
    { emoji: '👍', count: 3, userIds: ['user-1', 'user-2', 'user-3'] },
    { emoji: '❤️', count: 2, userIds: ['user-4', 'user-5'] },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Spacing', () => {
    it('should have proper container spacing with reactions', () => {
      const { container } = render(
        <ReactionBar messageId="msg-1" reactions={mockReactions} currentUserId="user-1" />
      )

      const reactionContainer = container.firstChild as HTMLElement
      expect(reactionContainer).toHaveClass('mt-2') // Proper margin-top
      expect(reactionContainer).toHaveClass('gap-1.5') // Proper gap
      expect(reactionContainer).toHaveClass('max-w-full') // Max width constraint
      expect(reactionContainer).toHaveClass('flex-wrap') // Allow wrapping
    })

    it('should have consistent pill spacing', () => {
      render(<ReactionBar messageId="msg-1" reactions={mockReactions} currentUserId="user-1" />)

      const reactionButtons = screen
        .getAllByRole('button')
        .filter(btn => btn.textContent?.match(/[0-9]/)) // Exclude add button

      reactionButtons.forEach(button => {
        expect(button).toHaveClass('gap-1.5') // Internal spacing
        expect(button).toHaveClass('px-2.5') // Horizontal padding
        expect(button).toHaveClass('py-1') // Vertical padding
        expect(button).toHaveClass('rounded-full') // Pill shape
        expect(button).toHaveClass('border') // Has border
        expect(button).toHaveClass('text-xs') // Text size
      })
    })

    it('should have proper add button sizing', () => {
      render(<ReactionBar messageId="msg-1" reactions={mockReactions} currentUserId="user-1" />)

      const addButton = screen.getByTitle('Add reaction')
      expect(addButton).toHaveClass('h-7') // Height
      expect(addButton).toHaveClass('min-w-7') // Min width
      expect(addButton).toHaveClass('px-2') // Padding
      expect(addButton).toHaveClass('shrink-0') // No shrinking
    })

    it('should apply correct styling to user-reacted pills', () => {
      render(<ReactionBar messageId="msg-1" reactions={mockReactions} currentUserId="user-1" />)

      const thumbsUpButton = screen
        .getAllByRole('button')
        .find(btn => btn.textContent?.includes('👍'))

      expect(thumbsUpButton).toHaveClass('border-primary')
      expect(thumbsUpButton).toHaveClass('bg-primary/10')
      expect(thumbsUpButton).toHaveClass('text-primary')
    })

    it('should apply correct styling to non-reacted pills', () => {
      render(<ReactionBar messageId="msg-1" reactions={mockReactions} currentUserId="user-1" />)

      const heartButton = screen.getAllByRole('button').find(btn => btn.textContent?.includes('❤️'))

      expect(heartButton).toHaveClass('border-border')
      expect(heartButton).toHaveClass('bg-background')
    })
  })

  describe('Empty State', () => {
    it('should have proper empty state spacing', () => {
      const { container } = render(
        <ReactionBar messageId="msg-1" reactions={[]} currentUserId="user-1" />
      )

      const emptyContainer = container.firstChild as HTMLElement
      expect(emptyContainer).toHaveClass('mt-2')
      expect(emptyContainer).toHaveClass('gap-1.5')
      expect(emptyContainer).toHaveClass('flex')
      expect(emptyContainer).toHaveClass('items-center')
    })

    it('should have proper empty state button styling', () => {
      render(<ReactionBar messageId="msg-1" reactions={[]} currentUserId="user-1" />)

      const addButton = screen.getByText('Add reaction').closest('button')
      expect(addButton).toHaveClass('h-7')
      expect(addButton).toHaveClass('px-2.5')
      expect(addButton).toHaveClass('text-xs')
    })

    it('should call onShowPicker when empty state button clicked', async () => {
      const user = userEvent.setup()
      const mockShowPicker = jest.fn()

      render(
        <ReactionBar
          messageId="msg-1"
          reactions={[]}
          currentUserId="user-1"
          onShowPicker={mockShowPicker}
        />
      )

      await user.click(screen.getByText('Add reaction'))
      expect(mockShowPicker).toHaveBeenCalledTimes(1)
    })
  })

  describe('Responsive Behavior', () => {
    it('should wrap reactions on narrow containers', () => {
      const manyReactions: Reaction[] = Array.from({ length: 10 }, (_, i) => ({
        emoji: `${i}️⃣`,
        count: 1,
        userIds: ['user-1'],
      }))

      const { container } = render(
        <ReactionBar messageId="msg-1" reactions={manyReactions} currentUserId="user-1" />
      )

      const reactionContainer = container.firstChild as HTMLElement
      expect(reactionContainer).toHaveClass('flex-wrap') // Enables wrapping
      expect(reactionContainer).toHaveClass('max-w-full') // Constrains width
    })
  })

  describe('Interaction', () => {
    it('should call addReaction when reaction pill clicked', async () => {
      const user = userEvent.setup()
      ;(addReaction as jest.Mock).mockResolvedValue({ success: true })

      render(<ReactionBar messageId="msg-1" reactions={mockReactions} currentUserId="user-1" />)

      const thumbsUpButton = screen
        .getAllByRole('button')
        .find(btn => btn.textContent?.includes('👍'))

      await user.click(thumbsUpButton!)
      expect(addReaction).toHaveBeenCalledWith('msg-1', '👍')
    })

    it('should call onShowPicker when add button clicked', async () => {
      const user = userEvent.setup()
      const mockShowPicker = jest.fn()

      render(
        <ReactionBar
          messageId="msg-1"
          reactions={mockReactions}
          currentUserId="user-1"
          onShowPicker={mockShowPicker}
        />
      )

      await user.click(screen.getByTitle('Add reaction'))
      expect(mockShowPicker).toHaveBeenCalledTimes(1)
    })

    it('should disable interactions when no currentUserId', () => {
      render(<ReactionBar messageId="msg-1" reactions={mockReactions} currentUserId={null} />)

      const reactionButtons = screen
        .getAllByRole('button')
        .filter(btn => btn.textContent?.match(/[0-9]/))

      reactionButtons.forEach(button => {
        expect(button).toBeDisabled()
        expect(button).toHaveClass('cursor-not-allowed')
        expect(button).toHaveClass('opacity-50')
      })
    })

    it('should prevent multiple simultaneous clicks', async () => {
      const user = userEvent.setup()
      ;(addReaction as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      render(<ReactionBar messageId="msg-1" reactions={mockReactions} currentUserId="user-1" />)

      const thumbsUpButton = screen
        .getAllByRole('button')
        .find(btn => btn.textContent?.includes('👍'))

      // Click multiple times rapidly
      user.click(thumbsUpButton!)
      user.click(thumbsUpButton!)
      user.click(thumbsUpButton!)

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should only be called once
      expect(addReaction).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ReactionBar messageId="msg-1" reactions={mockReactions} currentUserId="user-1" />)

      const addButton = screen.getByTitle('Add reaction')
      expect(addButton).toHaveAccessibleName('Add reaction')
    })

    it('should show reaction count in title attribute', () => {
      render(<ReactionBar messageId="msg-1" reactions={mockReactions} currentUserId="user-1" />)

      const thumbsUpButton = screen
        .getAllByRole('button')
        .find(btn => btn.textContent?.includes('👍'))

      expect(thumbsUpButton).toHaveAttribute('title', '3 reactions')
    })

    it('should handle singular reaction count', () => {
      const singleReaction: Reaction[] = [{ emoji: '👍', count: 1, userIds: ['user-1'] }]

      render(<ReactionBar messageId="msg-1" reactions={singleReaction} currentUserId="user-1" />)

      const thumbsUpButton = screen
        .getAllByRole('button')
        .find(btn => btn.textContent?.includes('👍'))

      expect(thumbsUpButton).toHaveAttribute('title', '1 reaction')
    })
  })
})
