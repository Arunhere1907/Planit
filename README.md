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

## Problem Statement → Features Mapping

| Problem Statement Requirement | Implementation | Location | Status |
|-------------------------------|----------------|----------|--------|
| **GenAI-powered planning assistant** | Gemini 2.5 Flash LLM integration with structured JSON output | `src/server/services/ai/` | ✅ |
| Organize weddings, birthdays, community events | Three event types with distinct templates & workflows | `ai.service.ts`, seed data | ✅ |
| **Budgets** | AI reasoning + deterministic math, rebalancing, expense tracker | `ai.service.ts`, `BudgetView.tsx` | ✅ |
| **Timelines** | LLM-generated tasks + backwards date calculation | `ai.service.ts`, `TimelineView.tsx` | ✅ |
| **Vendor checklists** | Status pipeline (5 stages), discovery with Google Places fallback | `VendorsView.tsx`, `places.service.ts` | ✅ |
| **Personalized ideas** | LLM-generated based on vibe/culture/budget/guests | `ai.service.ts`, `IdeasView.tsx` | ✅ |
| **Invitation generator** (extra) | Multi-format, multi-tone, WhatsApp integration | `ai.service.ts`, `InvitationsView.tsx` | ✅ |
| **Risk advisor** (extra) | LLM analyzes context-specific risks with mitigation plans | `ai.service.ts`, `RiskAdvisorView.tsx` | ✅ |
| **Budget optimizer** (extra) | What-if scenarios: maintain quality / moderate cuts / aggressive savings | `/api/budget/optimize`, `BudgetOptimizerModal.tsx` | ✅ |
| **Vendor discovery** (extra) | Google Places API with curated fallback dataset | `places.service.ts`, `/api/vendors/search` | ✅ |
| **Collaboration** (extra) | Role-based access (owner/editor/viewer), activity log | Middleware, `CollaborationView.tsx` | ✅ |
| **Reminders** (extra) | In-process scheduler for due date notifications | `scheduler.ts`, `NotificationCenter.tsx` | ✅ |
| **Export** (extra) | Budget CSV, Timeline ICS (RFC 5545), Vendor CSV | `exportUtils.ts`, all views | ✅ |

---

## 3-Minute Demo Script for Judges

**Goal:** Experience all core features across different event types in under 3 minutes.

### Setup (5 seconds)
1. **Load app:** Navigate to `http://localhost:3000` → sees 3 pre-loaded events

### Demo Flow (2 minutes 45 seconds)

**Step 1: Explore Rich Wedding Event (30 sec)**
- Click "Aarav & Diya's Royal Ahmedabad Wedding" from header dropdown
- **Dashboard:** See 200 guests, ₹8 lakh budget, 53 days countdown
- **Budget:** Observe 10 categories with AI reasoning (e.g., "₹2,56,000 for 200 guests with live chaat, dual Jain line")
- **Timeline:** See 10 backward-scheduled tasks (vendor bookings 180 days out → day-of coordination)
- **Run-of-Show:** Hour-by-hour wedding timeline (Baraat 5:15 PM → Pheras 8:00 PM → Bidaai 10:30 PM)

**Step 2: Compare Birthday Event Type (25 sec)**
- Switch to "Arjun's 30th Rooftop Milestone" (Mumbai birthday)
- **Notice differences:**
  - Budget: Only 7 categories (no "Rituals & Attire", added "Entertainment & Games")
  - Vendors: Rooftop lounge, DJ, cake designer (not wedding mandap vendors)
  - Ideas: "Live Saxophone & DJ Set" vs wedding's "Brass Urli Entrance"
  - Invitation: Lighthearted tone ("30s will be legendary!") vs formal wedding

**Step 3: View Community Event (20 sec)**
- Switch to "Navratri Garba Mahotsav" (Ahmedabad community festival)
- **Notice:**
  - Budget: 6 categories prioritizing "Stage/Sound 25%", "Permits & Security 10%"
  - Risks: Crowd management, sound curfew compliance (not wedding-specific)
  - Invitation: Gujarati language, community-focused tone

**Step 4: Test AI-Powered Intake (30 sec)**
- Click "+ New Event" button in header
- **Type:** "Plan a birthday party in Mumbai for 75 guests with ₹3 lakh budget in March"
- **Observe:** AI extracts structured profile (type: birthday, city: Mumbai, guests: 75, budget: ₹300,000)
- Auto-generates budget breakdown and timeline tasks
- **Evidence of GenAI:** See AI reasoning for each budget category

**Step 5: Vendor Discovery (15 sec)**
- Go to **Vendors** tab
- Click "Search Nearby Vendors"
- Search for "Catering" in "Ahmedabad"
- **See:** Google Places integration (or curated fallback) returns relevant vendors

**Step 6: Budget Management (20 sec)**
- Go to **Budget** tab on any event
- Click lock icon on one category (e.g., "Catering")
- Edit another category amount (e.g., increase "Venue" by ₹50,000)
- **Observe:** Other unlocked categories automatically rebalance (deterministic math, sum always equals total)
- **Note overspend warning:** If total expenses > budget, see red alert banner

**Step 7: AI Features Showcase (25 sec)**
- **Ideas:** Click "Generate New Ideas" → LLM creates 4 personalized ideas
- **Invitations:** See 2-3 invitation variants (different tones: formal/casual/festive)
- **Risk Advisor:** View context-specific risks (weather, food safety, timeline delays) with mitigation plans
- **Budget Optimizer:** Open optimizer modal, select "Moderate Cuts" scenario → see optimized 20% reduction strategy

**Step 8: Export & Collaboration (10 sec)**
- **Export:** Click "Export CSV" on budget, "Export ICS" on timeline (downloads calendar file)
- **Collaborators:** See role-based access (Owner/Editor/Viewer), activity log of all changes

---

## How the GenAI Works

### Architecture: LLM for Creativity, Code for Math

PlanIt uses a **hybrid approach** that leverages AI where it excels (natural language, reasoning, creativity) and code where precision matters (arithmetic, dates, validation).

### GenAI Pipeline

```
User Input (Natural Language)
    ↓
[LLM: Gemini 2.5 Flash] ← System Prompt (Role, Constraints, JSON Schema)
    ↓
Structured JSON Output (Validated against Zod schemas)
    ↓
[Code: Deterministic Math] ← Exact calculations (budget sums, backward dates)
    ↓
Guaranteed Correct Result (No hallucinated math, no impossible dates)
```

### Meaningful GenAI Usage (Not Decorative)

| Feature | What LLM Does | What Code Does | Why This Split |
|---------|---------------|----------------|----------------|
| **Intake Extraction** | Parses "I want a wedding in Ahmedabad for 200 guests with 8 lakh budget" → structured EventProfile JSON | Validates extracted values, applies guardrails (min budget, valid dates) | LLM understands conversational language; code enforces constraints |
| **Budget Reasoning** | Explains WHY 30% venue, 32% catering makes sense for this event type/city/guest count | Calculates exact integer amounts so `sum(categories) === total_budget` | LLM provides context-aware reasoning; code guarantees penny-perfect math |
| **Timeline Tasks** | Generates event-specific milestones (venue 180 days out, invitations 28 days, mandap setup 7 days) | Calculates exact due dates backward from event date, compresses if event is imminent | LLM knows planning sequences; code does calendar arithmetic |
| **Ideas** | Creates personalized suggestions based on vibe, culture, budget, guest count | Formats cost ranges as percentages of budget | LLM generates creative ideas; code applies budget context |
| **Invitations** | Writes invitation copy in multiple tones (formal/casual/festive) and languages | Formats dates, inserts placeholders, generates WhatsApp share URLs | LLM handles creative writing; code does string formatting |
| **Risks** | Identifies context-specific risks (December dew in Ahmedabad, rooftop wind in Mumbai) | Categorizes by severity, stores in database | LLM analyzes event context; code structures data |
| **Budget Optimizer** | Suggests where to cut costs (DIY decor, smaller venue, off-peak timing) | Recalculates budget splits, maintains sum integrity | LLM provides optimization strategies; code rebalances numbers |

### Structured Output & Validation

1. **System Prompts:** Each AI feature has a dedicated system prompt defining role, output schema, and constraints
   - Location: `src/server/services/ai/prompts/event-prompts.ts`
   - Example: `BUDGET_REASONING_SYSTEM_PROMPT` specifies percentage ranges for each event type

2. **JSON Schema Enforcement:**
   ```typescript
   const response = await llmClient.generateContent({
     model: 'gemini-2.5-flash',
     config: {
       responseMimeType: 'application/json',  // Forces JSON output
       temperature: 0.2  // Low temperature for consistency
     }
   });
   ```

3. **Zod Validation:** All LLM outputs validated against TypeScript schemas before use
   - Location: `src/shared/types/index.ts` and `src/schemas/zodSchemas.ts`

### Robust Fallbacks

**Every AI feature has a deterministic fallback** for when API keys are absent or rate limits hit:

| Feature | Fallback Mechanism |
|---------|-------------------|
| Intake | Regex-based pattern extractor (detects event type, guest count, budget in lakhs/crores, city names) |
| Budget | Event-type templates (`DEFAULT_BUDGET_SPLITS`) with industry-standard percentages |
| Timeline | Event-type task lists with standard lead times (weddings 180 days, birthdays 60 days) |
| Ideas | Curated library of 4 high-quality ideas per event type |
| Invitations | Template bank with placeholders for personalization |
| Risks | Risk matrix covering common scenarios (weather, vendors, food, timeline) |

**Testing Fallbacks:**
1. Set `GEMINI_API_KEY=` in `.env` (empty or absent)
2. Run app → still fully functional with curated content
3. Log message: `"No valid GEMINI_API_KEY configured. Running with intelligent deterministic fallback."`

### GenAI Best Practices Followed

✅ **Output is schema-validated JSON** - Never raw text, always structured  
✅ **Math in code, not LLM** - Budget sums, date arithmetic done deterministically  
✅ **Results change with inputs** - Same prompt twice = different creative output (temperature 0.2)  
✅ **Follow-ups only for critical gaps** - Intake asks 2-3 questions only if date/budget/city missing  
✅ **LLM not used where plain code suffices** - Date calculations, budget rebalancing, expense tracking all pure code  
✅ **Guardrails prevent hallucination** - Budget percentages must sum to 100, dates can't be in past, guest count min 10  

---

## Running with Dummy Data (No Database Required)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Arunhere1907/Planit.git
cd Planit

# 2. Copy environment template (all keys are optional)
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev

# 5. Open your browser
# Navigate to http://localhost:3000
```

The application will start on port 3000 with:
- Express backend API on `/api/*`
- Vite dev server middleware serving the React frontend
- In-memory data store pre-seeded from `/data/seed/*.json`

### Data Architecture

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
