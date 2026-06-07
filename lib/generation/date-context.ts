const relativeDatePattern =
  /\b(today|tomorrow|yesterday|tonight|this week|this month|this year|next week|next month|next year|last week|last month|last year)\b/i
const explicitDatePattern =
  /\b((?:19|20)\d{2}|(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?)|(?:\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(?:\s+\d{4})?))\b/i

function formatPromptDateReference(currentDate: Date) {
  return currentDate.toISOString().slice(0, 10)
}

export function hasDateSensitiveContent(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .some(
      (value) => relativeDatePattern.test(value) || explicitDatePattern.test(value),
    )
}

export function buildCurrentDateContextLine(currentDate: Date) {
  const dateReference = formatPromptDateReference(currentDate)
  return `Current date context: ${dateReference}. Use this only when prompt, template, base panel, or requested copy strongly indicates date-sensitive content. Resolve relative date words against this date and preserve any explicit dates exactly as written. Do not add or emphasize dates when source instructions are not date-driven.`
}
