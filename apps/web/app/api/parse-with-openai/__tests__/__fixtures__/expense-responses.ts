/**
 * Test Fixtures - OpenAI Expense Parsing Responses
 *
 * Realistic mock responses for expense parsing test cases.
 * Used in expense-parsing.test.ts to avoid real API calls.
 */

import type { ParsedExpense } from '@tripthreads/core'

export interface ExpenseTestCase {
  input: string
  expectedResponse: ParsedExpense
  description: string
  category?:
    | 'simple'
    | 'split'
    | 'named_participants'
    | 'complex'
    | 'multi_currency'
    | 'dated'
    | 'edge_case'
}

/**
 * Simple Expense Test Cases (10+)
 */
export const simpleExpenses: ExpenseTestCase[] = [
  {
    input: '€60 dinner',
    expectedResponse: {
      amount: 6000,
      currency: 'EUR',
      description: 'dinner',
      category: 'food_drink',
      splitType: 'equal',
      originalText: '€60 dinner',
      confidence: 0.95,
    },
    description: 'Simple expense with currency symbol prefix',
    category: 'simple',
  },
  {
    input: 'Lunch $45.50',
    expectedResponse: {
      amount: 4550,
      currency: 'USD',
      description: 'Lunch',
      category: 'food_drink',
      splitType: 'equal',
      originalText: 'Lunch $45.50',
      confidence: 0.95,
    },
    description: 'Simple expense with decimal amount',
    category: 'simple',
  },
  {
    input: 'Taxi £25',
    expectedResponse: {
      amount: 2500,
      currency: 'GBP',
      description: 'Taxi',
      category: 'transportation',
      splitType: 'equal',
      originalText: 'Taxi £25',
      confidence: 0.95,
    },
    description: 'Simple transportation expense',
    category: 'simple',
  },
  {
    input: '100 CHF groceries',
    expectedResponse: {
      amount: 10000,
      currency: 'CHF',
      description: 'groceries',
      category: 'groceries',
      splitType: 'equal',
      originalText: '100 CHF groceries',
      confidence: 0.95,
    },
    description: 'Currency code after amount',
    category: 'simple',
  },
  {
    input: 'Hotel $200',
    expectedResponse: {
      amount: 20000,
      currency: 'USD',
      description: 'Hotel',
      category: 'lodging',
      splitType: 'equal',
      originalText: 'Hotel $200',
      confidence: 0.95,
    },
    description: 'Simple lodging expense',
    category: 'simple',
  },
  {
    input: 'Museum tickets €35',
    expectedResponse: {
      amount: 3500,
      currency: 'EUR',
      description: 'Museum tickets',
      category: 'entertainment',
      splitType: 'equal',
      originalText: 'Museum tickets €35',
      confidence: 0.95,
    },
    description: 'Entertainment category',
    category: 'simple',
  },
  {
    input: 'Coffee £4.50',
    expectedResponse: {
      amount: 450,
      currency: 'GBP',
      description: 'Coffee',
      category: 'food_drink',
      splitType: 'equal',
      originalText: 'Coffee £4.50',
      confidence: 0.95,
    },
    description: 'Small amount with decimal',
    category: 'simple',
  },
  {
    input: 'Gas station $80',
    expectedResponse: {
      amount: 8000,
      currency: 'USD',
      description: 'Gas station',
      category: 'transportation',
      splitType: 'equal',
      originalText: 'Gas station $80',
      confidence: 0.95,
    },
    description: 'Gas/fuel expense',
    category: 'simple',
  },
  {
    input: 'Pharmacy 15 EUR',
    expectedResponse: {
      amount: 1500,
      currency: 'EUR',
      description: 'Pharmacy',
      category: 'other',
      splitType: 'equal',
      originalText: 'Pharmacy 15 EUR',
      confidence: 0.95,
    },
    description: 'Healthcare/pharmacy expense',
    category: 'simple',
  },
  {
    input: 'Parking €12',
    expectedResponse: {
      amount: 1200,
      currency: 'EUR',
      description: 'Parking',
      category: 'transportation',
      splitType: 'equal',
      originalText: 'Parking €12',
      confidence: 0.95,
    },
    description: 'Parking expense',
    category: 'simple',
  },
]

/**
 * Split Expense Test Cases (15+)
 */
export const splitExpenses: ExpenseTestCase[] = [
  {
    input: 'Split $120 dinner 4 ways',
    expectedResponse: {
      amount: 12000,
      currency: 'USD',
      description: 'dinner',
      category: 'food_drink',
      splitType: 'equal',
      splitCount: 4,
      originalText: 'Split $120 dinner 4 ways',
      confidence: 0.95,
    },
    description: 'Equal split with explicit count',
    category: 'split',
  },
  {
    input: 'Dinner €80 split equally 3 people',
    expectedResponse: {
      amount: 8000,
      currency: 'EUR',
      description: 'Dinner',
      category: 'food_drink',
      splitType: 'equal',
      splitCount: 3,
      originalText: 'Dinner €80 split equally 3 people',
      confidence: 0.95,
    },
    description: 'Equal split with "equally" keyword',
    category: 'split',
  },
  {
    input: 'Hotel $400 split 2 ways',
    expectedResponse: {
      amount: 40000,
      currency: 'USD',
      description: 'Hotel',
      category: 'lodging',
      splitType: 'equal',
      splitCount: 2,
      originalText: 'Hotel $400 split 2 ways',
      confidence: 0.95,
    },
    description: 'Equal split for lodging',
    category: 'split',
  },
  {
    input: '€150 groceries split between 5 people',
    expectedResponse: {
      amount: 15000,
      currency: 'EUR',
      description: 'groceries',
      category: 'groceries',
      splitType: 'equal',
      splitCount: 5,
      originalText: '€150 groceries split between 5 people',
      confidence: 0.95,
    },
    description: 'Split with "between" keyword',
    category: 'split',
  },
  {
    input: 'Taxi £45 split in half',
    expectedResponse: {
      amount: 4500,
      currency: 'GBP',
      description: 'Taxi',
      category: 'transportation',
      splitType: 'equal',
      splitCount: 2,
      originalText: 'Taxi £45 split in half',
      confidence: 0.95,
    },
    description: 'Split "in half" implies 2 people',
    category: 'split',
  },
  {
    input: 'Lunch $60 split 3 ways, I paid',
    expectedResponse: {
      amount: 6000,
      currency: 'USD',
      description: 'Lunch',
      category: 'food_drink',
      splitType: 'equal',
      splitCount: 3,
      originalText: 'Lunch $60 split 3 ways, I paid',
      confidence: 0.95,
    },
    description: 'Split with payer indication',
    category: 'split',
  },
  {
    input: 'Split €90 uber 3 people',
    expectedResponse: {
      amount: 9000,
      currency: 'EUR',
      description: 'uber',
      category: 'transportation',
      splitType: 'equal',
      splitCount: 3,
      originalText: 'Split €90 uber 3 people',
      confidence: 0.95,
    },
    description: 'Split at beginning of input',
    category: 'split',
  },
  {
    input: '$200 airbnb split evenly 4 ways',
    expectedResponse: {
      amount: 20000,
      currency: 'USD',
      description: 'airbnb',
      category: 'lodging',
      splitType: 'equal',
      splitCount: 4,
      originalText: '$200 airbnb split evenly 4 ways',
      confidence: 0.95,
    },
    description: 'Split with "evenly" keyword',
    category: 'split',
  },
  {
    input: 'Dinner 120 EUR divide by 6',
    expectedResponse: {
      amount: 12000,
      currency: 'EUR',
      description: 'Dinner',
      category: 'food_drink',
      splitType: 'equal',
      splitCount: 6,
      originalText: 'Dinner 120 EUR divide by 6',
      confidence: 0.9,
    },
    description: 'Split with "divide by" phrasing',
    category: 'split',
  },
  {
    input: '€50 breakfast for 2',
    expectedResponse: {
      amount: 5000,
      currency: 'EUR',
      description: 'breakfast',
      category: 'food_drink',
      splitType: 'equal',
      splitCount: 2,
      originalText: '€50 breakfast for 2',
      confidence: 0.9,
    },
    description: 'Implicit split with "for 2"',
    category: 'split',
  },
]

/**
 * Named Participants Test Cases (10+)
 */
export const namedParticipantsExpenses: ExpenseTestCase[] = [
  {
    input: 'Taxi £45 split with John',
    expectedResponse: {
      amount: 4500,
      currency: 'GBP',
      description: 'Taxi',
      category: 'transportation',
      splitType: 'equal',
      participants: ['John'],
      originalText: 'Taxi £45 split with John',
      confidence: 0.9,
    },
    description: 'Split with one named participant',
    category: 'named_participants',
  },
  {
    input: '€50 taxi to airport split with John',
    expectedResponse: {
      amount: 5000,
      currency: 'EUR',
      description: 'taxi to airport',
      category: 'transportation',
      splitType: 'equal',
      participants: ['John'],
      originalText: '€50 taxi to airport split with John',
      confidence: 0.9,
    },
    description: 'Split with participant (from Linear CRO-847)',
    category: 'named_participants',
  },
  {
    input: 'Dinner $80 split between Alice, Bob, and Carol',
    expectedResponse: {
      amount: 8000,
      currency: 'USD',
      description: 'Dinner',
      category: 'food_drink',
      splitType: 'equal',
      participants: ['Alice', 'Bob', 'Carol'],
      originalText: 'Dinner $80 split between Alice, Bob, and Carol',
      confidence: 0.9,
    },
    description: 'Multiple named participants with commas',
    category: 'named_participants',
  },
  {
    input: 'Groceries €75 split with Sarah and Mike',
    expectedResponse: {
      amount: 7500,
      currency: 'EUR',
      description: 'Groceries',
      category: 'groceries',
      splitType: 'equal',
      participants: ['Sarah', 'Mike'],
      originalText: 'Groceries €75 split with Sarah and Mike',
      confidence: 0.9,
    },
    description: 'Two participants with "and"',
    category: 'named_participants',
  },
  {
    input: 'Hotel $300 for me, Alice, and Bob',
    expectedResponse: {
      amount: 30000,
      currency: 'USD',
      description: 'Hotel',
      category: 'lodging',
      splitType: 'equal',
      participants: ['Alice', 'Bob'],
      originalText: 'Hotel $300 for me, Alice, and Bob',
      confidence: 0.85,
    },
    description: 'Participants with "me" included',
    category: 'named_participants',
  },
  {
    input: 'Lunch £40 split: me, Tom, Jerry',
    expectedResponse: {
      amount: 4000,
      currency: 'GBP',
      description: 'Lunch',
      category: 'food_drink',
      splitType: 'equal',
      participants: ['Tom', 'Jerry'],
      originalText: 'Lunch £40 split: me, Tom, Jerry',
      confidence: 0.85,
    },
    description: 'Participants with colon separator',
    category: 'named_participants',
  },
]

/**
 * Complex Split Test Cases (10+)
 */
export const complexSplitExpenses: ExpenseTestCase[] = [
  {
    input: 'Alice paid $200 for hotel, Bob owes 40%, Carol 30%, I pay the rest',
    expectedResponse: {
      amount: 20000,
      currency: 'USD',
      description: 'hotel',
      category: 'lodging',
      splitType: 'percentage',
      payer: 'Alice',
      percentageSplits: [
        { name: 'Bob', percentage: 40 },
        { name: 'Carol', percentage: 30 },
      ],
      originalText: 'Alice paid $200 for hotel, Bob owes 40%, Carol 30%, I pay the rest',
      confidence: 0.85,
    },
    description: 'Percentage split with payer',
    category: 'complex',
  },
  {
    input: 'Dinner €120, Alice $40, Bob €50, Carol rest',
    expectedResponse: {
      amount: 12000,
      currency: 'EUR',
      description: 'Dinner',
      category: 'food_drink',
      splitType: 'custom',
      customSplits: [
        { name: 'Alice', amount: 4000 },
        { name: 'Bob', amount: 5000 },
        { name: 'Carol', amount: 3000 },
      ],
      originalText: 'Dinner €120, Alice $40, Bob €50, Carol rest',
      confidence: 0.8,
    },
    description: 'Custom amounts for each participant',
    category: 'complex',
  },
  {
    input: 'Split 45 CHF lunch 3 ways yesterday',
    expectedResponse: {
      amount: 4500,
      currency: 'CHF',
      description: 'lunch',
      category: 'food_drink',
      splitType: 'equal',
      splitCount: 3,
      originalText: 'Split 45 CHF lunch 3 ways yesterday',
      confidence: 0.9,
    },
    description: 'Split with date reference (from Linear CRO-847)',
    category: 'complex',
  },
  {
    input: 'I paid $200 for hotel, split between Alice, Bob, Carol',
    expectedResponse: {
      amount: 20000,
      currency: 'USD',
      description: 'hotel',
      category: 'lodging',
      splitType: 'equal',
      participants: ['Alice', 'Bob', 'Carol'],
      originalText: 'I paid $200 for hotel, split between Alice, Bob, Carol',
      confidence: 0.85,
    },
    description: 'Payer explicitly stated with named participants (from Linear CRO-847)',
    category: 'complex',
  },
]

/**
 * Multi-Currency Test Cases (5+)
 */
export const multiCurrencyExpenses: ExpenseTestCase[] = [
  {
    input: '5000¥ sushi dinner',
    expectedResponse: {
      amount: 5000,
      currency: 'JPY',
      description: 'sushi dinner',
      category: 'food_drink',
      splitType: 'equal',
      originalText: '5000¥ sushi dinner',
      confidence: 0.95,
    },
    description: 'Japanese Yen (no decimal)',
    category: 'multi_currency',
  },
  {
    input: 'Train ticket 100 CHF',
    expectedResponse: {
      amount: 10000,
      currency: 'CHF',
      description: 'Train ticket',
      category: 'transportation',
      splitType: 'equal',
      originalText: 'Train ticket 100 CHF',
      confidence: 0.95,
    },
    description: 'Swiss Franc',
    category: 'multi_currency',
  },
  {
    input: 'Dinner 500 SEK',
    expectedResponse: {
      amount: 50000,
      currency: 'SEK',
      description: 'Dinner',
      category: 'food_drink',
      splitType: 'equal',
      originalText: 'Dinner 500 SEK',
      confidence: 0.95,
    },
    description: 'Swedish Krona',
    category: 'multi_currency',
  },
  {
    input: '€80 for groceries',
    expectedResponse: {
      amount: 8000,
      currency: 'EUR',
      description: 'groceries',
      category: 'groceries',
      splitType: 'equal',
      originalText: '€80 for groceries',
      confidence: 0.95,
    },
    description: 'Euro with "for" preposition (from Linear CRO-847)',
    category: 'multi_currency',
  },
  {
    input: 'Paid £80 for groceries',
    expectedResponse: {
      amount: 8000,
      currency: 'GBP',
      description: 'groceries',
      category: 'groceries',
      splitType: 'equal',
      originalText: 'Paid £80 for groceries',
      confidence: 0.95,
    },
    description: 'British Pound with "Paid" prefix (from Linear CRO-847)',
    category: 'multi_currency',
  },
]

/**
 * Edge Cases (10+)
 */
export const edgeCaseExpenses: ExpenseTestCase[] = [
  {
    input: 'Diner €60',
    expectedResponse: {
      amount: 6000,
      currency: 'EUR',
      description: 'Diner',
      category: 'food_drink',
      splitType: 'equal',
      originalText: 'Diner €60',
      confidence: 0.9,
    },
    description: 'Typo in "Dinner" (should still parse)',
    category: 'edge_case',
  },
  {
    input: '60 dinner',
    expectedResponse: {
      amount: 6000,
      currency: 'USD', // default currency
      description: 'dinner',
      category: 'food_drink',
      splitType: 'equal',
      originalText: '60 dinner',
      confidence: 0.75,
    },
    description: 'Missing currency (use default)',
    category: 'edge_case',
  },
  {
    input: 'Split diner 60 euro 4 way',
    expectedResponse: {
      amount: 6000,
      currency: 'EUR',
      description: 'diner',
      category: 'food_drink',
      splitType: 'equal',
      splitCount: 4,
      originalText: 'Split diner 60 euro 4 way',
      confidence: 0.8,
    },
    description: 'Multiple typos but parseable',
    category: 'edge_case',
  },
  {
    input: '$100-120 hotel',
    expectedResponse: {
      amount: 11000, // midpoint
      currency: 'USD',
      description: 'hotel',
      category: 'lodging',
      splitType: 'equal',
      originalText: '$100-120 hotel',
      confidence: 0.7,
    },
    description: 'Ambiguous amount range',
    category: 'edge_case',
  },
  {
    input: 'Alic paid €50 taxi',
    expectedResponse: {
      amount: 5000,
      currency: 'EUR',
      description: 'taxi',
      category: 'transportation',
      splitType: 'equal',
      payer: 'Alic', // keep typo for fuzzy matching later
      originalText: 'Alic paid €50 taxi',
      confidence: 0.85,
    },
    description: 'Typo in participant name',
    category: 'edge_case',
  },
  {
    input: 'Coffee and croissant €8.50',
    expectedResponse: {
      amount: 850,
      currency: 'EUR',
      description: 'Coffee and croissant',
      category: 'food_drink',
      splitType: 'equal',
      originalText: 'Coffee and croissant €8.50',
      confidence: 0.95,
    },
    description: 'Compound description',
    category: 'edge_case',
  },
  {
    input: '25 USD breakfast buffet',
    expectedResponse: {
      amount: 2500,
      currency: 'USD',
      description: 'breakfast buffet',
      category: 'food_drink',
      splitType: 'equal',
      originalText: '25 USD breakfast buffet',
      confidence: 0.95,
    },
    description: 'Amount before currency code',
    category: 'simple',
  },
  {
    input: 'Museum entry 15 EUR split 2 ways',
    expectedResponse: {
      amount: 1500,
      currency: 'EUR',
      description: 'Museum entry',
      category: 'entertainment',
      splitType: 'equal',
      splitCount: 2,
      originalText: 'Museum entry 15 EUR split 2 ways',
      confidence: 0.9,
    },
    description: 'Activity with equal split',
    category: 'split',
  },
  {
    input: 'Groceries £42.75 for supplies',
    expectedResponse: {
      amount: 4275,
      currency: 'GBP',
      description: 'Groceries for supplies',
      category: 'groceries',
      splitType: 'equal',
      originalText: 'Groceries £42.75 for supplies',
      confidence: 0.9,
    },
    description: 'Groceries with additional description',
    category: 'simple',
  },
  {
    input: 'Train tickets $85 between Alice and Bob',
    expectedResponse: {
      amount: 8500,
      currency: 'USD',
      description: 'Train tickets',
      category: 'transportation',
      splitType: 'equal',
      participants: ['Alice', 'Bob'],
      splitCount: 2,
      originalText: 'Train tickets $85 between Alice and Bob',
      confidence: 0.9,
    },
    description: 'Transportation with named participants',
    category: 'named_participants',
  },
  {
    input: 'Parking fee €12',
    expectedResponse: {
      amount: 1200,
      currency: 'EUR',
      description: 'Parking fee',
      category: 'transportation',
      splitType: 'equal',
      originalText: 'Parking fee €12',
      confidence: 0.95,
    },
    description: 'Parking expense',
    category: 'simple',
  },
  {
    input: 'Concert tickets £180 for 3 people',
    expectedResponse: {
      amount: 18000,
      currency: 'GBP',
      description: 'Concert tickets',
      category: 'entertainment',
      splitType: 'equal',
      splitCount: 3,
      originalText: 'Concert tickets £180 for 3 people',
      confidence: 0.9,
    },
    description: 'Entertainment with split count',
    category: 'split',
  },
  {
    input: 'Spa treatment $150 paid by me',
    expectedResponse: {
      amount: 15000,
      currency: 'USD',
      description: 'Spa treatment',
      category: 'activity',
      splitType: 'equal',
      payer: 'me',
      originalText: 'Spa treatment $150 paid by me',
      confidence: 0.9,
    },
    description: 'Activity with "me" as payer',
    category: 'simple',
  },
  {
    input: 'Wine €45, split equally between 3',
    expectedResponse: {
      amount: 4500,
      currency: 'EUR',
      description: 'Wine',
      category: 'food_drink',
      splitType: 'equal',
      splitCount: 3,
      originalText: 'Wine €45, split equally between 3',
      confidence: 0.9,
    },
    description: 'Food/drink with explicit equal split',
    category: 'split',
  },
  {
    input: 'Phone SIM card 20 CHF',
    expectedResponse: {
      amount: 2000,
      currency: 'CHF',
      description: 'Phone SIM card',
      category: 'other',
      splitType: 'equal',
      originalText: 'Phone SIM card 20 CHF',
      confidence: 0.9,
    },
    description: 'Other category expense',
    category: 'simple',
  },
  {
    input: 'Laundry service $18.50',
    expectedResponse: {
      amount: 1850,
      currency: 'USD',
      description: 'Laundry service',
      category: 'other',
      splitType: 'equal',
      originalText: 'Laundry service $18.50',
      confidence: 0.95,
    },
    description: 'Service expense',
    category: 'simple',
  },
]

/**
 * All test cases combined for convenience
 */
export const allExpenseTestCases: ExpenseTestCase[] = [
  ...simpleExpenses,
  ...splitExpenses,
  ...namedParticipantsExpenses,
  ...complexSplitExpenses,
  ...multiCurrencyExpenses,
  ...edgeCaseExpenses,
]

/**
 * Helper to create OpenAI mock response
 */
export function createOpenAIExpenseResponse(testCase: ExpenseTestCase) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify(testCase.expectedResponse),
        },
      },
    ],
    usage: {
      total_tokens: 150, // Typical token count
    },
  }
}

console.log(`Total expense test cases: ${allExpenseTestCases.length}`)
