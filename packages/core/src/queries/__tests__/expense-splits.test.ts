import { calculateExpenseShares } from '../../utils/expense-splits'

describe('calculateExpenseShares', () => {
  it('distributes remainders on equal splits to the first participant', () => {
    const shares = calculateExpenseShares({
      totalAmount: 301,
      splitType: 'equal',
      participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
    })

    expect(shares).toEqual([
      { userId: 'user-1', shareAmount: 151, shareType: 'equal' },
      { userId: 'user-2', shareAmount: 150, shareType: 'equal' },
    ])
  })

  it('validates amount splits sum to the total amount', () => {
    expect(() =>
      calculateExpenseShares({
        totalAmount: 100,
        splitType: 'amount',
        participants: [
          { userId: 'user-1', shareValue: 40 },
          { userId: 'user-2', shareValue: 30 },
        ],
      })
    ).toThrow('Participant shares (70) do not sum to expense total (100)')
  })
})
