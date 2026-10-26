# PlanIt Accessibility Audit - WCAG 2.1 AA

## Initial Findings (Before Fixes)

### ESLint jsx-a11y Automated Scan Results
**Total Issues Found: 48 errors**

| File | Line | Issue | WCAG Criterion | Severity | Fix Required |
|------|------|-------|----------------|----------|--------------|
| Modal.tsx | 48 | Click handler without keyboard listener on backdrop | 2.1.1 Keyboard | Error | Add onKeyDown handler |
| Modal.tsx | 48 | Non-interactive element with click handler | 4.1.2 Name, Role, Value | Error | Add role="button" or use button element |
| Modal.tsx | 54 | Click handler without keyboard listener on modal container | 2.1.1 Keyboard | Error | Add onKeyDown handler |
| Modal.tsx | 54 | Non-interactive element with click handler | 4.1.2 Name, Role, Value | Error | Add role="button" or use button element |
| BudgetOptimizerModal.tsx | 140 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| BudgetView.tsx | 434 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| BudgetView.tsx | 449 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| BudgetView.tsx | 462 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| BudgetView.tsx | 473 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| BudgetView.tsx | 486 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| BudgetView.tsx | 496 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| CollaborationView.tsx | 208 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| CollaborationView.tsx | 220 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| CollaborationView.tsx | 232 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| IntakeChat.tsx | 313 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| IntakeChat.tsx | 324 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| IntakeChat.tsx | 338 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| IntakeChat.tsx | 350 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| IntakeChat.tsx | 360 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| IntakeChat.tsx | 372 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| IntakeChat.tsx | 387 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| IntakeChat.tsx | 397 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| IntakeChat.tsx | 408 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| InvitationsView.tsx | 121 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| InvitationsView.tsx | 136 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| InvitationsView.tsx | 151 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| ReplanModal.tsx | 112 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| ReplanModal.tsx | 123 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| ReplanModal.tsx | 135 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 489 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 502 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 513 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 528 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 539 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 550 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 588 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 600 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 613 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 625 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| TimelineView.tsx | 637 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| VendorsView.tsx | 757 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| VendorsView.tsx | 769 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| VendorsView.tsx | 784 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| VendorsView.tsx | 796 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| VendorsView.tsx | 808 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| VendorsView.tsx | 822 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| VendorsView.tsx | 833 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |
| VendorsView.tsx | 849 | Form label not associated with control | 1.3.1 Info and Relationships | Error | Add htmlFor/id association |

### Additional Manual Inspection Findings

| Page/Component | Issue | WCAG Criterion | Fix Required |
|----------------|-------|----------------|--------------|
| index.html | Has lang="en" | ✓ PASS | None |
| App.tsx | Missing main landmark | 2.4.1 Bypass Blocks | Wrap in <main> with proper ARIA |
| App.tsx | Missing skip-to-content link | 2.4.1 Bypass Blocks | Add skip link |
| App.tsx | No dynamic page title updates | 2.4.2 Page Titled | Add useEffect to update document.title |
| App.tsx | No focus management on tab change | 2.4.3 Focus Order | Focus h1 on tab navigation |
| Header.tsx | Navigation missing aria-current | 4.1.2 Name, Role, Value | Add aria-current="page" to active tab |
| Header.tsx | Icon-only buttons lack aria-label | 4.1.2 Name, Role, Value | Add descriptive aria-label |
| All views | Missing h1 on each view | 1.3.1 Info and Relationships | Add h1 to each tab view |
| All views | Missing heading hierarchy | 1.3.1 Info and Relationships | Ensure logical h2, h3 order |
| Modal.tsx | Missing role="dialog" | 4.1.2 Name, Role, Value | Add dialog role and aria-modal |
| Modal.tsx | Missing aria-labelledby | 4.1.2 Name, Role, Value | Link title to modal |
| Modal.tsx | No focus trap | 2.1.2 No Keyboard Trap | Implement focus trap |
| Modal.tsx | Focus not returned to trigger | 2.4.3 Focus Order | Store and return focus |
| Badge.tsx | Status badges color-only | 1.4.1 Use of Color | Add visible text/icons |
| TimelineView.tsx | Task drag-and-drop keyboard inaccessible | 2.1.1 Keyboard | Add keyboard move buttons |
| VendorsView.tsx | Google Maps without keyboard alternative | 2.1.1 Keyboard | Add list view of vendors |
| BudgetView.tsx | Chart visualization without text alternative | 1.1.1 Non-text Content | Add aria-label and table |
| All forms | Error messages not linked to inputs | 3.3.1 Error Identification | Add aria-describedby |
| All forms | Required fields not marked accessibly | 3.3.2 Labels or Instructions | Add aria-required and visual indicator |
| IntakeChat.tsx | AI streaming not announced | 4.1.3 Status Messages | Add aria-live region |
| NotificationCenter.tsx | Toast notifications not announced | 4.1.3 Status Messages | Add aria-live region |
| All components | No motion reduction support | 2.3.3 Animation from Interactions | Add prefers-reduced-motion |
| All components | Touch targets may be < 44x44px | 2.5.5 Target Size | Verify and increase padding |
| All text | Contrast ratios not verified | 1.4.3 Contrast (Minimum) | Check all text/bg combinations |
| All components | Uses outline:none without replacement | 2.4.7 Focus Visible | Remove or replace with visible focus |

## Summary by WCAG Principle

### Perceivable
- **1.1.1 Non-text Content**: Charts, maps need text alternatives
- **1.3.1 Info and Relationships**: 46 form label issues, missing headings, landmarks
- **1.4.1 Use of Color**: Status badges rely on color only
- **1.4.3 Contrast**: Not yet verified (needs checking)

### Operable
- **2.1.1 Keyboard**: Modal backdrop, drag-and-drop, maps need keyboard support
- **2.1.2 No Keyboard Trap**: Modal needs focus trap
- **2.3.3 Animation**: No motion reduction support
- **2.4.1 Bypass Blocks**: Missing skip link
- **2.4.2 Page Titled**: No dynamic title updates
- **2.4.3 Focus Order**: No focus management on navigation
- **2.4.7 Focus Visible**: Potential outline removal issues
- **2.5.5 Target Size**: Touch targets need verification

### Understandable
- **3.3.1 Error Identification**: Errors not linked to inputs
- **3.3.2 Labels or Instructions**: Required fields not marked

### Robust
- **4.1.2 Name, Role, Value**: Modal, buttons, navigation lack proper ARIA
- **4.1.3 Status Messages**: No aria-live for dynamic content

## Priority Fixes (High to Low)
1. **Critical**: Form label associations (46 instances)
2. **Critical**: Modal accessibility (role, focus trap, keyboard)
3. **High**: Document structure (landmarks, skip link, h1 hierarchy)
4. **High**: Keyboard navigation (drag-and-drop alternatives, modal backdrop)
5. **High**: ARIA labels for icon buttons and status
6. **High**: Dynamic content announcements (aria-live)
7. **Medium**: Color contrast verification and fixes
8. **Medium**: Charts/maps alternatives
9. **Medium**: Motion reduction
10. **Low**: Touch target sizes

## Testing Tools Used
- **ESLint**: eslint-plugin-jsx-a11y (automated)
- **Manual**: Code review for WCAG 2.1 AA criteria
- **Planned**: axe-core automated tests, keyboard walkthrough, screen reader testing
