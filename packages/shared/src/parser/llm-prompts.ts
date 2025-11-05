/**
 * LLM Prompt Templates for Natural Language Parsing
 *
 * These prompts are optimized for:
 * - phi3:mini (2.3GB, fast structured output)
 * - mistral (4.1GB, more powerful fallback)
 *
 * Approach: Few-shot prompting with strict JSON schema
 */

export const SYSTEM_PROMPT = `You are a structured data extraction assistant for a travel expense tracking app.
Extract information from natural language input and return ONLY valid JSON, no additional text or explanations.
Be precise with numbers, dates, and currencies. Use ISO 8601 format for dates. Use ISO 4217 codes for currencies.
Store amounts in minor units (cents, pence, etc.) except for JPY and KRW which have no minor units.`;

/**
 * Prompt for parsing date/time expressions
 */
export function getDateParserPrompt(input: string, referenceDate: string): string {
  return `Extract date/time information from the following natural language input.

Reference date (today): ${referenceDate}

Input: "${input}"

Return JSON with this exact schema:
{
  "date": "ISO 8601 string (YYYY-MM-DDTHH:MM:SSZ)",
  "hasTime": boolean,
  "isRange": boolean,
  "endDate": "ISO 8601 string or null",
  "confidence": number between 0 and 1,
  "detectedFormat": "absolute" | "relative" | "time" | "range" | "ambiguous",
  "originalText": "${input}"
}

Examples:

Input: "Monday 9am"
Reference: "2024-12-16T00:00:00Z"
Output: {"date": "2024-12-16T09:00:00Z", "hasTime": true, "isRange": false, "endDate": null, "confidence": 0.9, "detectedFormat": "relative", "originalText": "Monday 9am"}

Input: "Dec 15-20"
Reference: "2024-12-01T00:00:00Z"
Output: {"date": "2024-12-15T00:00:00Z", "hasTime": false, "isRange": true, "endDate": "2024-12-20T00:00:00Z", "confidence": 0.85, "detectedFormat": "range", "originalText": "Dec 15-20"}

Input: "next Friday 3pm"
Reference: "2024-12-16T00:00:00Z"
Output: {"date": "2024-12-20T15:00:00Z", "hasTime": true, "isRange": false, "endDate": null, "confidence": 0.9, "detectedFormat": "relative", "originalText": "next Friday 3pm"}

Now extract from: "${input}"`;
}

/**
 * Prompt for parsing expense expressions
 */
export function getExpenseParserPrompt(input: string, defaultCurrency: string): string {
  return `Extract expense information from the following natural language input.

Input: "${input}"
Default currency: ${defaultCurrency}

Return JSON with this exact schema:
{
  "amount": number (in minor units: cents, pence, etc. Except JPY/KRW have no minor units),
  "currency": "ISO 4217 code (EUR, USD, GBP, JPY, etc.)",
  "description": "string",
  "category": "food" | "transport" | "accommodation" | "activity" | "other" | null,
  "payer": "string or null",
  "splitType": "equal" | "custom" | "shares" | "none",
  "splitCount": number or null (for equal splits),
  "participants": ["array", "of", "names"] or null (for equal splits),
  "customSplits": [{"name": "string", "amount": number}] or null (for custom splits in minor units),
  "confidence": number between 0 and 1,
  "originalText": "${input}"
}

Important rules:
- For EUR/USD/GBP: Convert to minor units (€60 = 6000 cents)
- For JPY/KRW: NO conversion, use actual amount (¥2500 = 2500)
- Description should NOT include participant names, amounts, or split keywords
- splitType is "equal" for equal splits, "custom" for specific amounts per person, "none" if no split
- For equal splits: use splitCount and participants fields
- For custom splits: use customSplits array with {name, amount} objects
- participants should only include actual person names, NOT description words like "Dinner", "Lunch", "Hotel"
- customSplits amounts must be in minor units (cents, pence, etc.)

Examples:

Input: "Dinner €60 split 4 ways"
Output: {"amount": 6000, "currency": "EUR", "description": "Dinner", "category": "food", "payer": null, "splitType": "equal", "splitCount": 4, "participants": null, "customSplits": null, "confidence": 0.95, "originalText": "Dinner €60 split 4 ways"}

Input: "Alice paid $120 for hotel, split between Alice, Bob, Carol"
Output: {"amount": 12000, "currency": "USD", "description": "hotel", "category": "accommodation", "payer": "Alice", "splitType": "equal", "splitCount": 3, "participants": ["Alice", "Bob", "Carol"], "customSplits": null, "confidence": 0.9, "originalText": "Alice paid $120 for hotel, split between Alice, Bob, Carol"}

Input: "Taxi £45, Bob owes half"
Output: {"amount": 4500, "currency": "GBP", "description": "Taxi", "category": "transport", "payer": null, "splitType": "equal", "splitCount": 2, "participants": ["Bob"], "customSplits": null, "confidence": 0.85, "originalText": "Taxi £45, Bob owes half"}

Input: "¥2500 lunch split 3 ways"
Output: {"amount": 2500, "currency": "JPY", "description": "lunch", "category": "food", "payer": null, "splitType": "equal", "splitCount": 3, "participants": null, "customSplits": null, "confidence": 0.9, "originalText": "¥2500 lunch split 3 ways"}

Input: "$75 lunch split 3 ways"
Output: {"amount": 7500, "currency": "USD", "description": "lunch", "category": "food", "payer": null, "splitType": "equal", "splitCount": 3, "participants": null, "customSplits": null, "confidence": 0.9, "originalText": "$75 lunch split 3 ways"}

Input: "we got dinner for 50 USD. Steve paid. Trevor owes 40 and Bill owes 20"
Output: {"amount": 5000, "currency": "USD", "description": "dinner", "category": "food", "payer": "Steve", "splitType": "custom", "splitCount": null, "participants": null, "customSplits": [{"name": "Trevor", "amount": 4000}, {"name": "Bill", "amount": 2000}], "confidence": 0.9, "originalText": "we got dinner for 50 USD. Steve paid. Trevor owes 40 and Bill owes 20"}

Input: "€100 hotel room, Tom paid, Jerry owes 60 and Tom keeps 40"
Output: {"amount": 10000, "currency": "EUR", "description": "hotel room", "category": "accommodation", "payer": "Tom", "splitType": "custom", "splitCount": null, "participants": null, "customSplits": [{"name": "Jerry", "amount": 6000}, {"name": "Tom", "amount": 4000}], "confidence": 0.85, "originalText": "€100 hotel room, Tom paid, Jerry owes 60 and Tom keeps 40"}

Input: "Lunch $90 split: Alice 30, Bob 35, Carol 25"
Output: {"amount": 9000, "currency": "USD", "description": "Lunch", "category": "food", "payer": null, "splitType": "custom", "splitCount": null, "participants": null, "customSplits": [{"name": "Alice", "amount": 3000}, {"name": "Bob", "amount": 3500}, {"name": "Carol", "amount": 2500}], "confidence": 0.9, "originalText": "Lunch $90 split: Alice 30, Bob 35, Carol 25"}

Now extract from: "${input}"`;
}
