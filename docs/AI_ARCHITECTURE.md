# PlanIt GenAI Architecture and Workflows

## Overview

PlanIt uses a **hybrid AI architecture** that combines LLM-powered generation with deterministic validation and calculation. This ensures AI provides creative, context-aware recommendations while code guarantees mathematical accuracy and business rule compliance.

## Core Principle: GenAI vs Deterministic Boundaries

### What the LLM Does (Generation & Reasoning)
- **Natural language understanding**: Parse conversational event descriptions
- **Creative generation**: Ideas, invitation copy, risk scenarios
- **Contextual recommendations**: Budget category reasoning, timeline task suggestions
- **Cultural adaptation**: Event-type and city-specific considerations

### What Code Does (Validation & Calculation)
- **Exact arithmetic**: Budget totals, category amounts, savings calculations
- **Date calculations**: Backward scheduling from event date
- **Constraint enforcement**: Locked categories, budget limits, guest minimums
- **Data validation**: Schema compliance, type checking, range validation
- **Fallback provision**: Curated high-quality responses when LLM unavailable

### Why This Separation Matters
- **Reliability**: Code-calculated numbers are always exact (no rounding errors from LLM)
- **Predictability**: Business rules are consistently enforced
- **Testability**: Deterministic logic can be unit tested
- **Graceful degradation**: App works fully without API keys
- **User trust**: Users can verify calculations match their expectations

## Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                         AI Service                          │
│                      (Orchestration)                        │
└────────┬─────────────────────────────────┬──────────────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────────┐         ┌──────────────────────────┐
│   LLM Client        │         │  Fallback Data Service   │
│   (Gemini 2.5)      │         │  (Curated Responses)     │
└──────────┬──────────┘         └────────────┬─────────────┘
           │                                  │
           │                                  │
           └───────────┬──────────────────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │  AI Response          │
           │  Validator            │
           └───────────┬───────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │  Deterministic Math   │
           │  (Calculations)       │
           └───────────────────────┘
```

### 1. AI Service (`ai.service.ts`)
**Responsibility**: Orchestrate AI features, coordinate between LLM and fallback providers

**Key Methods**:
- `extractEventProfile()`: Parse natural language → EventProfile
- `generateBudgetWithReasoning()`: Generate budget categories with explanations
- `generateTimelineWithTasks()`: Create milestone timeline
- `suggestIdeas()`: Generate creative ideas
- `generateInvitations()`: Create invitation messages
- `analyzeRisks()`: Identify and assess risks
- `optimizeBudget()`: Generate cost reduction scenarios

**Pattern**: Try LLM → Validate → Use deterministic math → Fallback if needed

### 2. LLM Client (`llm.client.ts`)
**Responsibility**: Interface with Gemini API

**Features**:
- Connection management and availability checking
- Structured JSON output mode
- Low temperature (0.2) for consistency
- Error handling and timeout management

### 3. Fallback Data Service (`fallback-data.service.ts`)
**Responsibility**: Provide high-quality curated responses when LLM unavailable

**Methods**:
- `extractProfileFromText()`: Pattern-based event profile extraction
- `getCuratedIdeas()`: Event-type specific creative ideas
- `getCuratedInvitations()`: Template-based invitations
- `getCuratedRisks()`: Context-appropriate risk matrix

**Quality**: Fallbacks are not "dummy data" - they're production-quality responses based on event planning best practices.

### 4. AI Response Validator (`ai-response-validator.ts`)
**Responsibility**: Validate LLM outputs before use

**Validation Functions**:
- `validateBudgetCategories()`: Check category structure, percentages sum correctly
- `validateTimelineTasks()`: Verify task fields, priorities, phases
- `validateIdeas()`: Confirm idea structure and effort levels
- `validateRisks()`: Check severity/likelihood values, required fields
- `safeParseJSON()`: Safe JSON parsing with error handling

**Output**: `ValidationResult<T>` with `isValid`, `data`, and `errors` fields

### 5. Deterministic Math (`deterministic-math.ts`)
**Responsibility**: All exact calculations

**Functions**:
- `calculateBudgetSplitFromPercents()`: Convert percentages to exact amounts that sum to total
- `rebalanceBudgetCategories()`: Maintain locked categories while redistributing remainder
- `calculateBackwardsDueDates()`: Schedule tasks backward from event date
- `checkBudgetSanity()`: Validate per-guest costs against regional benchmarks

**Guarantees**: Mathematical correctness, idempotency, no floating-point errors

## Feature Workflows

### 1. Event Intake (Natural Language → Structured Data)

```
User Input: "Plan a wedding in Mumbai for 200 guests with 8 lakh budget in December"
      │
      ▼
[AI Service] → Send to LLM with INTAKE_EXTRACTION_SYSTEM_PROMPT
      │
      ▼
[LLM] → Extract: type=wedding, city=Mumbai, guests=200, budget=800000, date=2026-12
      │
      ▼
[Validator] → Parse JSON, check required fields, validate security
      │
      ▼
[AI Service] → Sanitize extracted data, apply guardrails (min guests, min budget)
      │
      ▼
Output: EventProfile with confidence score and follow-up questions
```

**Fallback**: Pattern matching for event type, budget keywords (lakh/crore), city names, guest counts

### 2. Budget Generation (AI Reasoning + Code Math)

```
EventProfile (type=wedding, city=Mumbai, budget=800000)
      │
      ▼
[AI Service] → Send sanitized profile to LLM with BUDGET_REASONING_SYSTEM_PROMPT
      │
      ▼
[LLM] → Generate categories with percentages and detailed reasoning
      │       Example: {name: "Venue", percent: 28, reasoning: "Premium Mumbai venues..."}
      ▼
[Validator] → Check categories array, verify percentages sum to ~100
      │
      ▼
[Deterministic Math] → Calculate exact amounts from percentages
      │                   Venue: 28% of 800000 = ₹224,000 (exact)
      │                   Adjust rounding so sum equals total precisely
      ▼
Output: BudgetCategory[] with exact amounts and AI reasoning
```

**Key Separation**:
- LLM decides: "Venue should be 28% because Mumbai venues are premium"
- Code ensures: 28% of 800000 = ₹224,000 exactly, all categories sum to ₹800,000

**Fallback**: Event-type template percentages (wedding, birthday, community)

### 3. Timeline Generation (AI Context + Code Dates)

```
EventProfile (type=wedding, date=2026-12-18)
      │
      ▼
[AI Service] → Send profile to LLM with TIMELINE_GENERATION_SYSTEM_PROMPT
      │
      ▼
[LLM] → Generate tasks with offset_days
      │       Example: {title: "Book venue", offset_days: 180, priority: "high"}
      ▼
[Validator] → Check tasks array, validate priorities and phases
      │
      ▼
[Deterministic Math] → Calculate exact due dates backward from event date
      │                   Event: 2026-12-18, Offset: 180 days
      │                   Due date: 2026-06-21 (calculated precisely)
      ▼
Output: Task[] with exact due dates and AI-generated titles/notes
```

**Key Separation**:
- LLM decides: "Venue should be booked 180 days before"
- Code calculates: Event date minus 180 days = exact calendar date

**Fallback**: Event-type milestone templates

### 4. Ideas, Invitations, Risks

**Pattern**: LLM generates creative/contextual content → Validator checks structure → Service formats output

**Ideas**: 
- LLM: Generate themed, culturally-appropriate creative ideas
- Validator: Check category, effort level, structure
- Output: Ideas with event-specific cost ranges

**Invitations**:
- LLM: Write tone-appropriate copy in multiple languages
- Validator: (Currently uses manual structure check)
- Output: Messages with WhatsApp share links

**Risks**:
- LLM: Identify context-specific risks (weather, vendors, timeline)
- Validator: Check severity/likelihood values, required fields
- Output: Risks with mitigation and backup plans

## Prompt Engineering Strategy

### Structure of Enhanced Prompts

Each prompt includes:
1. **Role Definition**: "You are an expert event planner..."
2. **Task Description**: Clear statement of what to generate
3. **Input Specification**: What data is provided
4. **Output Format**: Exact JSON structure with types
5. **Guidelines**: Event-type specific rules and examples
6. **Validation Rules**: Constraints that will be checked
7. **Quality Standards**: What makes a good response
8. **Return Format**: "Return ONLY valid JSON, no markdown"

### Example: Budget Reasoning Prompt

```typescript
BUDGET_REASONING_SYSTEM_PROMPT = `
You are an expert event budget consultant...

TASK: Generate detailed budget breakdown with explanations.

OUTPUT: JSON with exact structure: { categories: [...], strategic_notes: "..." }

ALLOCATION GUIDELINES:
- Wedding: Venue 25-30%, Catering 30-35%, ...
- Birthday: Venue 25-30%, Food 30-40%, ...

CITY-SPECIFIC CONSIDERATIONS:
- Mumbai/Delhi: 15-20% higher costs...

VALIDATION:
- 6-10 categories required
- Percentages must sum to 98-102
- Each reasoning 2-4 sentences

Return ONLY valid JSON, no markdown.
`
```

### Why This Works

1. **Reduces ambiguity**: LLM knows exactly what to generate
2. **Improves consistency**: Structured format yields predictable output
3. **Enables validation**: Clear schema allows programmatic checking
4. **Handles edge cases**: Examples guide model on regional variations
5. **Sets quality bar**: Explicit standards (sentence count, specificity)

## Error Handling and Fallbacks

### Error Handling Flow

```
LLM Request
    │
    ├─ Network Error ───────────┐
    ├─ Timeout ─────────────────┤
    ├─ Rate Limit ──────────────┤
    ├─ Invalid JSON ────────────┤
    ├─ Schema Mismatch ─────────┼──→ Log warning + Use fallback
    ├─ Validation Failure ──────┤
    ├─ Empty Response ──────────┤
    └─ Security Issue ──────────┘
         │
         ▼
    Fallback Service
         │
         ▼
    High-Quality Curated Response
```

### Fallback Quality

Fallbacks are **not** placeholder responses. They are:
- **Event-type specific**: Different data for weddings, birthdays, community events
- **Contextually relevant**: Consider budget, city, guest count
- **Production ready**: Can be used as the primary response path
- **Maintained separately**: Easy to update without touching AI code

### When to Use Fallback

1. **No API key configured**: App works fully offline
2. **API quota exceeded**: Graceful degradation during high traffic
3. **LLM unavailable**: Service outage doesn't break app
4. **Validation fails**: Bad LLM output doesn't corrupt data
5. **Testing**: Deterministic responses for reliable tests

## Validation Strategy

### Three Layers of Validation

1. **Input Sanitization**: Before sending to LLM
   - Remove script tags, SQL patterns
   - Truncate excessively long inputs
   - Validate URL sources

2. **Output Validation**: After receiving from LLM
   - JSON parse safety
   - Schema structure checking
   - Type validation
   - Range checking (percentages 0-100, etc.)

3. **Business Rule Validation**: Before application
   - Budget categories sum to total
   - Dates are present or future
   - Required fields populated

### Validation Result Pattern

```typescript
interface ValidationResult<T> {
  isValid: boolean;
  data?: T;  // Only present if valid
  errors: string[];  // Specific error messages
}

// Usage
const result = validator.validateBudgetCategories(llmOutput);
if (!result.isValid) {
  logger.warn('Validation failed', { errors: result.errors });
  return fallbackService.getDefaultBudget();
}
// Use result.data safely
```

## Testing AI Features

### Unit Tests (Deterministic Logic)

```typescript
// Test budget math independently
test('calculateBudgetSplitFromPercents sums to exact total', () => {
  const categories = calculateBudgetSplitFromPercents(800000, [
    { name: 'Venue', percent: 30, reasoning: 'test' },
    { name: 'Catering', percent: 35, reasoning: 'test' },
    { name: 'Decor', percent: 35, reasoning: 'test' },
  ]);
  
  const sum = categories.reduce((acc, c) => acc + c.amount, 0);
  expect(sum).toBe(800000);  // Exactly, not approximately
});
```

### Service Tests (Mocked LLM)

```typescript
// Test AI service with mocked LLM client
test('generateBudgetWithReasoning uses fallback on LLM failure', async () => {
  vi.mocked(llmClient.isAvailable).mockReturnValue(false);
  
  const result = await aiService.generateBudgetWithReasoning(mockProfile);
  
  expect(result.categories).toHaveLength(10);  // Wedding has 10 categories
  expect(result.categories[0].source).toBe('ai');  // Marked as AI-generated
});
```

### Validation Tests

```typescript
// Test validator catches invalid responses
test('validateBudgetCategories rejects invalid percentages', () => {
  const result = validator.validateBudgetCategories({
    categories: [{ name: 'Venue', percent: 150 }]  // Invalid: >100
  });
  
  expect(result.isValid).toBe(false);
  expect(result.errors).toContain('percent must be between 0 and 100');
});
```

## Configuration and Feature Flags

### Environment Variables

```bash
GEMINI_API_KEY=          # Optional - app works without it
GOOGLE_MAPS_API_KEY=     # Optional - uses curated vendor data as fallback
```

### Checking AI Availability

```typescript
if (llmClient.isAvailable()) {
  // Use live AI generation
} else {
  // Use deterministic fallback
  logger.info('AI unavailable, using curated fallback');
}
```

### Logging AI Usage

```typescript
logger.info('Budget generated', {
  source: llmAvailable ? 'gemini' : 'fallback',
  eventType: profile.type,
  categoryCount: categories.length
});
```

## Best Practices

### DO

✓ Validate all LLM outputs before use
✓ Use code for exact arithmetic
✓ Provide high-quality fallbacks
✓ Log AI usage and failures
✓ Make fallback behavior visible in UI
✓ Test with LLM mocked
✓ Structure prompts clearly
✓ Handle errors gracefully

### DON'T

✗ Trust LLM output without validation
✗ Use LLM for calculations
✗ Fail requests when AI unavailable
✗ Mix business logic into prompt strings
✗ Expose raw LLM errors to users
✗ Test against live AI in CI
✗ Use vague prompt instructions
✗ Silently swallow validation errors

## Future Enhancements

### Potential Improvements

1. **Structured Output API**: Use Gemini's structured output mode for guaranteed schema compliance
2. **Fine-tuning**: Train on curated event planning data for better Indian event understanding
3. **Multi-turn Conversations**: Iterative refinement with follow-up questions
4. **Confidence Scoring**: More sophisticated confidence calculation based on input completeness
5. **A/B Testing**: Compare LLM vs fallback quality metrics
6. **Caching**: Cache AI responses for identical inputs to reduce API calls
7. **Streaming**: Stream long-form content (invitations, ideas) for better UX

### Monitoring Metrics

Track these to understand AI quality:
- LLM availability rate
- Validation failure rate
- Fallback usage percentage  
- Response time (LLM vs fallback)
- User acceptance of AI suggestions (save rate, edit rate)
- Budget variance (AI suggested vs user final)

## Conclusion

PlanIt's AI architecture demonstrates that GenAI and deterministic logic are complementary, not competing approaches. By clearly separating creative generation from exact calculation, the app delivers:

- **Reliability**: Numbers users can trust
- **Flexibility**: Works with or without API keys
- **Quality**: Curated fallbacks ensure consistent experience
- **Testability**: Deterministic logic can be thoroughly tested
- **Scalability**: Validation layer prevents bad outputs from reaching users

This hybrid approach is the recommended pattern for production AI applications where accuracy and reliability are critical.
