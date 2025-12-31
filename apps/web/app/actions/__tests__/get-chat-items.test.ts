import { getItineraryItemForChat, getExpenseForChat } from '../get-chat-items'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('getItineraryItemForChat', () => {
  const mockTripId = 'trip-123'
  const mockItemId = 'item-123'
  const mockItem = {
    id: 'item-123',
    trip_id: 'trip-123',
    item_type: 'transport',
    title: 'Flight to Boston',
    description: 'Evening flight',
    start_date: '2024-12-25',
    created_by_user: {
      id: 'user-1',
      full_name: 'John Doe',
      avatar_url: null,
    },
    itinerary_participants: [
      {
        participant: {
          id: 'user-1',
          full_name: 'John Doe',
          avatar_url: null,
        },
      },
    ],
  }

  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns item for valid ID and trip participant', async () => {
    mockSupabase.single.mockResolvedValue({ data: mockItem, error: null })

    const result = await getItineraryItemForChat(mockItemId, mockTripId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.item.id).toBe('item-123')
      expect(result.item.title).toBe('Flight to Boston')
    }

    expect(mockSupabase.from).toHaveBeenCalledWith('itinerary_items')
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockItemId)
    expect(mockSupabase.eq).toHaveBeenCalledWith('trip_id', mockTripId)
  })

  it('returns not_found error for deleted item', async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    })

    const result = await getItineraryItemForChat(mockItemId, mockTripId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('not_found')
    }
  })

  it('returns permission_denied error for non-participant', async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST403', message: 'Permission denied' },
    })

    const result = await getItineraryItemForChat(mockItemId, mockTripId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('permission_denied')
    }
  })

  it('handles database errors gracefully', async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: 'DB_ERROR', message: 'Database error' },
    })

    const result = await getItineraryItemForChat(mockItemId, mockTripId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('permission_denied')
    }
  })
})

describe('getExpenseForChat', () => {
  const mockTripId = 'trip-123'
  const mockExpenseId = 'expense-123'
  const mockExpense = {
    id: 'expense-123',
    trip_id: 'trip-123',
    description: 'Dinner',
    amount: 6000,
    currency: 'EUR',
    date: '2024-12-25',
    category: 'dining',
    payer: 'user-1',
    payer_profile: {
      id: 'user-1',
      full_name: 'John Doe',
      avatar_url: null,
    },
    expense_participants: [
      {
        participant: {
          id: 'user-1',
          full_name: 'John Doe',
          avatar_url: null,
        },
        amount: 3000,
        percentage: 50,
      },
      {
        participant: {
          id: 'user-2',
          full_name: 'Jane Smith',
          avatar_url: null,
        },
        amount: 3000,
        percentage: 50,
      },
    ],
  }

  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns expense with full details', async () => {
    mockSupabase.single.mockResolvedValue({ data: mockExpense, error: null })

    const result = await getExpenseForChat(mockExpenseId, mockTripId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.expense.id).toBe('expense-123')
      expect(result.expense.description).toBe('Dinner')
      expect(result.expense.amount).toBe(6000)
      expect(result.expense.currency).toBe('EUR')
      expect(result.expense.payer_profile).toBeDefined()
      expect(result.expense.expense_participants).toHaveLength(2)
    }

    expect(mockSupabase.from).toHaveBeenCalledWith('expenses')
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockExpenseId)
    expect(mockSupabase.eq).toHaveBeenCalledWith('trip_id', mockTripId)
  })

  it('returns not_found error for deleted expense', async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    })

    const result = await getExpenseForChat(mockExpenseId, mockTripId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('not_found')
    }
  })

  it('returns permission_denied error for non-participant', async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST403', message: 'Permission denied' },
    })

    const result = await getExpenseForChat(mockExpenseId, mockTripId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('permission_denied')
    }
  })
})
