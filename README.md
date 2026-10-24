# PlanIt — GenAI Event Planning Assistant (Production Refactor)

PlanIt is a contest-ready, production-grade event planning platform that fuses conversational AI intake with deterministic mathematical guarantees. It features exact integer budget allocation, backwards timeline scheduling, vendor discovery with Google Places and curated fallback datasets, proactive risk advisories, and multi-role team collaboration.

---

## Architecture Overview

```mermaid
graph TD
    Client[React SPA Frontend] -->|HTTP / JSON + x-demo-user-id| Router[Express API Router]
    
    subgraph Express Backend
        Router --> Middleware[Security / Rate Limit / Demo User / Zod Validate]
        Middleware --> Controllers[Layered Controllers]
        Controllers --> Services[Domain Services]
        
        subgraph Domain Services
            BudgetService[BudgetService\n(Deterministic Math)]
            TimelineService[TimelineService\n(Backwards Chronology)]
            AIService[AIService\n(Gemini SDK + Curated Fallbacks)]
            PlacesService[PlacesService\n(Google Places API + Local Seed)]
            Scheduler[InProcessScheduler\n(Due Milestones & Alerts)]
        end
        
        Services --> RepoInterfaces[Repository Interfaces\n(IEventRepository, IVendorRepository)]
    end
    
    subgraph In-Memory Data Layer
        RepoInterfaces --> InMemoryEventRepo[InMemoryEventRepository]
        RepoInterfaces --> InMemoryVendorRepo[InMemoryVendorRepository]
        InMemoryEventRepo --> SeedLoader[Seed Loader\n(/data/seed/*.json)]
        InMemoryVendorRepo --> SeedLoader
    end
```

---

## 1. Running with Dummy Data (No Database Required)

This application runs **100% in-memory with zero external database dependencies**.
- No Supabase, Postgres, or cloud database credentials are required.
- On startup, the `InMemoryStore` is initialized and pre-seeded from verified JSON datasets in `/data/seed/`:
  - **Wedding Blueprint**: Aarav & Diya's Royal Ahmedabad Wedding (200 guests, ₹8.00 Lakh, December 18, 2026, dual Jain/Veg menu).
  - **Milestone Birthday**: Arjun's 30th Rooftop Milestone (50 guests, ₹2.00 Lakh, Bandra, Mumbai).
  - **Community Festival**: Navrangpura Eco-Diwali Cultural Mela.
- Curated vendor listings across venues, catering, photography, decor, and music in major Indian event hubs (Ahmedabad, Mumbai, Delhi, Jaipur, Bengaluru).
- **Resetting State**: State can be reset anytime via the header refresh icon or by calling:
  ```bash
  curl -X POST http://localhost:3000/api/dev/reset
  ```

---

## 2. Pluggable Repository Pattern

Controllers and services never interact with storage primitives or data structures directly. They communicate exclusively through strict TypeScript contracts defined in `src/server/repositories/interfaces/`:

```typescript
export interface IEventRepository {
  findAll(): Promise<FullEventPlan[]>;
  findById(id: string): Promise<FullEventPlan | null>;
  create(plan: FullEventPlan): Promise<FullEventPlan>;
  update(id: string, updates: Partial<FullEventPlan>): Promise<FullEventPlan>;
  delete(id: string): Promise<boolean>;
  resetToSeed(seedPlans: FullEventPlan[]): Promise<void>;
}
```

### How to Plug in a Real Database Later:
1. Create a new repository implementation (e.g. `src/server/repositories/postgres/postgres-event.repository.ts`) implementing `IEventRepository`.
2. Swap the instantiation in `src/server/repositories/index.ts`:
   ```typescript
   export const eventRepository: IEventRepository = new PostgresEventRepository();
   ```
3. **Zero changes** are needed in any controller, service, or route.

---

## 3. Layered Folder Structure

```
src/
  server/
    server.ts                   # Thin bootstrap entry point (< 25 lines)
    app.ts                      # Express setup, middleware chains, Vite dev server mount
    config/
      env.ts                    # Zod-validated environment config
      constants.ts              # HTTP codes, timeouts, rate limits, thresholds
    controllers/                # Thin request/response shaping; zero business logic
    services/                   # Pure business logic and mathematical rules
      ai/                       # LLM client wrapper, prompts, schemas, fallbacks
      places/                   # Google Places client with curated fallback
      notifications/            # In-process reminder scheduler and mailer interface
    repositories/
      interfaces/               # Repository contracts (IEventRepository, IVendorRepository)
      in-memory/                # Generic InMemoryStore and repository implementations
      seed-loader.ts            # Bootstraps seed data into in-memory store
      index.ts                  # Central repository exports
    middleware/
      demo-user.ts              # Resolves demo user and enforces role permissions
      error-handler.ts          # Central error mapper to { error: { code, message } }
      rate-limit.ts             # In-memory sliding window rate limiter
      security.ts               # Security headers
      validate.ts               # Zod request body validation
    utils/
      async-handler.ts          # Express async boundary wrapper
      logger.ts                 # Structured logger with severity levels
    errors/
      app-error.ts              # AppError hierarchy (NotFound, Validation, Forbidden...)
  shared/
    types/index.ts              # Canonical domain interfaces (FullEventPlan, Task, BudgetCategory)
    schemas/zod-schemas.ts      # Reusable input & output validation schemas
    utils/
      deterministic-math.ts     # Pure integer budget splits, locked rebalance, backwards dates
      formatters.ts             # INR Lakh/Crore notation, dates, days remaining
      export-utils.ts           # RFC 5545 iCalendar (.ics) and CSV exporters
    styles/tokens.css           # Semantic design tokens (Indigo/Amber/Slate)
  client/
    components/
      ui/                       # Primitives: Button, Card, Input, Badge, Modal, EmptyState
      layout/Header.tsx         # Responsive header, active tab indicator, role switcher
    context/DemoUserContext.tsx # Global role & active user context (Owner / Editor / Viewer)
    hooks/usePlan.ts            # High-level state management hook
    services/api/
      client.ts                 # Fetch wrapper with demo user headers and error parsing
      event-api.ts              # Typed API functions for all endpoints
    App.tsx                     # Main application layout orchestrator
    main.tsx                    # React client entry point
tests/                          # Vitest unit test suite (math, formatters, repos, schemas)
data/seed/                      # Seed JSON files (events, vendors, demo users)
```

---

## 4. Design System & Style Guide

The UI adheres strictly to a semantic, accessible design token system defined in `src/shared/styles/tokens.css`:

### Color Palette & Token Usage
- **Primary (Indigo)**: Brand identification, active navigation states, primary buttons.
  - Token values: `--primary-50` (`#EEF2FF`), `--primary-600` (`#4F46E5`), `--primary-700` (`#4338CA`).
  - Active Tab Rule: Subtle background (`bg-indigo-50`), bold text (`text-indigo-700`), and a 3px bottom indicator. **Red is strictly forbidden for active navigation.**
- **Accent (Warm Amber)**: Festive highlights, badges, creative touchpoints.
  - Token values: `--accent-50` (`#FFFBEB`), `--accent-500` (`#F59E0B`), `--accent-600` (`#D97706`).
- **Neutrals (Slate)**: Backgrounds, cards, dividers, typography.
  - Surface: `--neutral-surface` (`#FFFFFF`), Border: `--neutral-border` (`#E2E8F0`), Headings: `--neutral-text-heading` (`#0F172A`).
- **Semantic Feedback**:
  - Success: `#16A34A` (Paid expenses, completed tasks)
  - Warning: `#D97706` (Budget 80-100% threshold, impending deadlines)
  - Danger: `#DC2626` (Budget > 100% overspend, overdue tasks, delete actions)

### Typography & Numbers
- Display Titles: `clamp(1.75rem, 2.5vw, 2.25rem)`, Weight 700.
- Section Headings (H2): `1.375rem`, Weight 600.
- Numbers & Currencies: Strict `tabular-nums` formatting with Indian numbering system notation (`₹ Lakh / Cr`).
- WCAG AA Compliant: Contrast ratios exceed 4.5:1 for body copy and 3:1 for large UI components.

---

## 5. GenAI Pipeline & Robust Fallbacks

1. **Conversational Intake**: Extracts dates, locations, headcounts, dietary mix, and constraints into structured `EventProfile`.
2. **Deterministic Math Engine**: 
   - Never allows the LLM to perform arithmetic.
   - Exact integer budget breakdown guarantees $\sum \text{Categories} = \text{Total Budget}$ by absorbing rounding differences into contingency funds.
   - Proportional rebalancing locks user-edited categories and redistributes adjustments across unlocked categories only.
3. **Backwards Milestone Scheduling**: Tasks are scheduled backwards from the event date, compressing lead times proportionally if the event is imminent.
4. **Resilient Fallback Mode**: When `GEMINI_API_KEY` or `GOOGLE_MAPS_API_KEY` are unset or throttled, domain services seamlessly transition to verified curated datasets, ensuring uninterrupted testing and end-to-end evaluation.

---

## 6. Scripts & Quality Verification

```bash
# Run full development server with backend and Vite HMR
npm run dev

# Run unit tests (deterministic math, formatters, repositories, schemas)
npm run test

# Run TypeScript static type check
npm run typecheck

# Run linter
npm run lint

# Build production bundle
npm run build
```
