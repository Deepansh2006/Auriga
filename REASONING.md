# BatchRx: Product Reasoning

This document explains the thinking behind BatchRx: the problem it chooses to solve, the safety model behind each workflow, and the trade-offs in the current implementation. The README explains how to use the product; this document explains why the product behaves the way it does.

## 1. The central insight

A pharmacy does not manage “Paracetamol: 94 units.” It manages several physical groups of Paracetamol, each with a different lot, arrival date, quantity, and expiry date.

That distinction is the product’s foundation. If the interface collapses all of those batches into one number, it hides the decision that matters most: **which physical stock should be touched next?**

BatchRx therefore treats the batch as the operational unit and the medicine as the human-facing grouping.

- A **medicine** is what the pharmacist searches for.
- A **batch** is what the pharmacist finds on the shelf.
- A **dispense** is a controlled movement from one or more batches.
- A **Pick Slip** is the bridge between the digital decision and the physical action.

This keeps the screen friendly without sacrificing the inventory reality underneath it.

## 2. Why FEFO is the default

FIFO answers: “Which stock arrived first?”

FEFO answers: “Which stock expires first?”

For medicines, expiry is the stronger safety and waste signal. A newer delivery can expire sooner than an older delivery, so a simple arrival-order strategy can still create avoidable waste.

BatchRx makes FEFO automatic for three reasons:

1. **The pharmacist should not have to mentally sort dates under pressure.**
2. **The same rule should apply consistently to every dispense.**
3. **The UI should make the safe action the easiest action.**

The pure engine in `src/engine/fefo.js` follows a deliberately small sequence:

1. Keep only batches for the requested medicine.
2. Keep only active, positive-quantity, non-expired batches.
3. Sort by expiry date ascending.
4. Walk the sorted list until the request is filled or stock runs out.
5. Return the allocations and any remaining shortfall.

The function does not know about React, modals, or browser storage. That separation matters: the safety rule can be tested independently of the interface.

## 3. Why expired stock is excluded, not silently removed

Expired stock is dangerous if it remains sellable, but deleting it creates a different problem: the system loses evidence that the stock existed and what happened to it.

BatchRx separates two ideas:

- **Sellability:** whether a batch can participate in a dispense.
- **Lifecycle:** where the batch is in its operational history.

An expired active batch is excluded from all sellable calculations immediately. It is still visible in the alert feed. The pharmacist must explicitly move it to `quarantine`, then resolve it as `disposed` or `returned`.

This is intentionally a two-step acknowledgement:

```text
Expired active batch
        ↓ pharmacist acknowledges physical separation
Quarantine
        ↓ final operational decision
Disposed or returned
```

The system does not pretend that an expired batch vanished. It records the decision that closed the loop.

## 4. Why the alert feed is persistent

An alert is not a notification that should disappear because someone clicked it. It represents a physical condition in the pharmacy.

For that reason, the alert feed is part of the dashboard rather than a temporary toast. It groups work by urgency:

- Expired today or earlier: immediate action
- Expiring within 7 days: urgent stock planning
- Expiring within 30 days: early intervention

Only the expired group has a quarantine action. The other groups are warnings, not irreversible state transitions.

This keeps the interface honest: acknowledgement and resolution are different actions.

## 5. Why the Pick Slip exists

A stock system can calculate the right batches and still fail at the counter if the pharmacist has to translate the result manually.

The Pick Slip is the product’s physical action bridge. It answers four questions in a format that can be read quickly:

- What medicine is being dispensed?
- How many units are needed?
- Which batch should be pulled first?
- How many units come from each batch?

The slip is generated before stock is mutated. This is a deliberate confirmation boundary:

```text
Request quantity → calculate allocation → inspect Pick Slip → confirm → mutate stock
```

That sequence gives the pharmacist a chance to catch an incorrect request before inventory changes. It also makes the unique FEFO behavior visible instead of hiding it behind a generic “success” message.

## 6. Why partial fills are explicit

A request for 30 units when only 18 are sellable is not a normal success and not a total failure. It is a partial fill with a shortfall.

Silently dispensing 18 would create a mismatch between the request and the outcome. Silently rejecting the request would discard useful stock. BatchRx shows the shortfall before confirmation and generates a Pick Slip for the 18 units that can safely be dispensed.

The result is intentionally inspectable:

```text
Requested: 30
Sellable: 18
Pick Slip: 18
Shortfall: 12
```

The reducer records the fulfilled quantity, not the requested quantity, so the audit record reflects what physically moved.

## 7. Why health score is medicine-level

A batch has an expiry date, but a medicine card represents a group of batches. The card needs one risk signal that helps the pharmacist decide where to look first.

The health score starts at 100 and combines two signals:

### Earliest expiry

The closest active expiry is the strongest urgency signal. A batch expiring in five days deserves more attention than one expiring in fifty days, even if the quantities are similar.

### Proportion of near-expiry stock

Urgency is also affected by how much of the medicine is exposed. If nearly all sellable units expire within 30 days, the medicine deserves more attention than if only a small remainder does.

The score therefore applies:

- 50 points for an earliest expiry under 7 days
- 30 points for an earliest expiry under 30 days
- 10 points for an earliest expiry under 60 days
- A proportional penalty for sellable quantity expiring within 30 days

The dashboard sorts ascending, putting the lowest score first. This is a “worst first” design: the pharmacist sees the item most likely to become a problem before the healthy stock.

## 8. Why search reports sellable stock only

The fastest pharmacy question is usually not “do we own any of this medicine?” It is “do we have any that I can safely sell?”

Search therefore uses the same sellable-batch calculation as dispensing. It excludes:

- Expired batches
- Quarantined batches
- Disposed or returned batches
- Exhausted batches
- Zero-quantity batches

Using one domain function for both search and FEFO avoids a subtle but serious inconsistency where search claims stock exists but dispensing cannot use it.

## 9. Why batch intake validates early

A malformed batch poisons every downstream view: stock totals, expiry alerts, health scores, and FEFO allocations. Validation at intake protects all later workflows.

The Add Batch flow checks:

- A medicine exists or is created inline.
- The batch code is present and unique for that medicine.
- Quantity is positive.
- Expiry is not in the past.
- A received date is recorded.

The batch stores both current quantity and original quantity. Current quantity supports live inventory. Original quantity supports future reporting, shrinkage analysis, and audit interpretation.

## 10. Why Context plus `useReducer`

The product state is one connected domain object:

```text
medicines + batches + dispense logs
```

A reducer is a good fit because every meaningful state change can be named as a domain action:

- `ADD_BATCH`
- `ADD_MEDICINE`
- `DISPENSE`
- `QUARANTINE`
- `RESOLVE_QUARANTINE`

This is easier to reason about than allowing many components to mutate arrays directly. Components request an action; the reducer owns the state transition.

The Context provides that state to the dashboard and modal workflows without introducing a larger state library for a deliberately local product.

## 11. Why SQLite is the source of truth

The new submission contract requires real persistence, so BatchRx now uses SQLite through Node’s built-in `node:sqlite` module. The database stores users, sessions, medicines, batches, dispense logs, outbox messages, and clock runs in relational tables with foreign keys and uniqueness constraints.

This gives the API a stable source of truth for automated jobs and grading clients. The browser still keeps a local reducer snapshot as a resilience and offline-demo fallback, but the React client hydrates from the API whenever the server is available.

SQLite is a pragmatic fit for this scope:

- It is a real file-backed database with no separate service to install.
- It keeps local development simple.
- It supports transactions for state transitions.
- It can be replaced by PostgreSQL later behind the same service boundary.

## 12. Why authentication is server-backed

The access screen now calls `/auth/register` and `/auth/login`. Passwords are stored as scrypt-derived hashes, and successful authentication creates an expiring session token in the database.

The `admin` / `admin` account is seeded for a predictable demo. This is real persistence and real credential verification for the challenge, while still being intentionally minimal: roles, MFA, secret rotation, account recovery, and production cookie policy remain future security work.

## 13. Why the visual language is restrained

The product is used in a time-pressured clinical environment. The design avoids making the pharmacist decode a decorative interface.

The visual system uses:

- High-contrast ink text for readability
- Mint and teal for safe, active states
- Amber for approaching risk
- Coral for expired or critical states
- Compact cards for repeated medicine comparisons
- A persistent alert rail for work that must not disappear
- A paper-like Pick Slip surface to signal physical action

The experience should feel calm because the information is organized, not because risk is hidden.

## 14. Current boundaries and next engineering steps

The full-stack product now covers the core PRD and submission flows. A production hardening phase would add:

1. Unit tests for FEFO edge cases, health-score boundaries, and reducer transitions.
2. Browser tests for login, search, dispense, quarantine, and refresh persistence.
3. Role-based authorization and identity-aware audit logs.
4. Stronger transaction handling for concurrent dispensing.
5. Explicit stock-location fields if a pharmacy has multiple shelves or rooms.
6. Configurable warning windows and pharmacy-specific units.
7. Import/export and controlled data migration.
8. Regulatory, accessibility, and clinical workflow review.

The important architectural decision is already in place: the safety-critical rules live in pure domain functions, while the UI remains a clear operator for those rules.

## 15. Why the backend was added

The original product could reasonably run as a local browser demo. The new requirements introduce operations that cannot be trusted to a browser tab alone:

- A daily job must process inventory even when nobody is clicking through the UI.
- An import must produce a deterministic report for every input row.
- A Notification Service needs an observable outbox that another process can inspect.

Those are server responsibilities. The architecture therefore now has a small Node API as the authoritative challenge state:

```text
React + Context → API server → domain rules → store
                                                                                                                                                        ↓
                                                                                                                        notification outbox
```

The frontend still keeps a responsive reducer and localStorage fallback, but when the API is running it hydrates from and synchronizes to the server. This lets a human use the polished UI while automated clients grade the same domain state through HTTP.

The current store is a SQLite database for the challenge. A larger deployment could replace it with a hosted transactional database without changing the endpoint contracts or pure domain rules.

## 16. Why `POST /clock` is deterministic

Time-based behavior is hard to grade and hard to debug if every operation reads the machine clock directly. `POST /clock` accepts an explicit date:

```json
{ "date": "2026-09-17" }
```

The job then applies one consistent date to every batch decision:

1. Active batches at or before the date are moved to quarantine.
2. Active batches from one to seven days away are flagged.
3. A clock-run record stores the date and counts.
4. Repeating the same request does not quarantine or count the same batch again.

This makes the automation reproducible. A grader can reset the state, call the clock with a known date, and assert exact counts instead of depending on wall-clock timing.

The clock’s automatic quarantine is intentionally different from the dashboard’s manual alert action. The API automation satisfies the scheduled-job requirement; the UI action remains valuable when a pharmacist wants to acknowledge an alert manually.

## 17. Why messy import is a pipeline, not a form shortcut

Real batch data often arrives from spreadsheets or handwritten exports. It may contain values such as:

```text
"10 units"
17/10/2026
2026-10-17
null
```

Treating that input as if it were already clean creates silent inventory errors. The importer uses explicit stages:

```text
Raw row
        ↓
Trim and identify fields
        ↓
Parse quantity and date
        ↓
Resolve medicine
        ↓
Build duplicate fingerprint
        ↓
Accept, deduplicate, or reject with a reason
```

The three report counters have distinct meanings:

- **Imported:** a valid new batch was added.
- **Deduped:** the row was valid but represented a batch already present in the import or store.
- **Rejected:** the row could not be trusted, such as a missing medicine, invalid quantity, unknown medicine, or expired date.

The importer does not guess when a value is unsafe. A rejected row with a reason is more useful than a silently incorrect batch.

## 18. Why reorder notifications use threshold transitions

It is not enough to check whether stock is below a threshold. If the system emits a notification every time the dashboard loads, the pharmacist receives noise instead of a useful signal.

BatchRx models the important event as a transition:

```text
stock >= threshold  →  stock < threshold
```

The transition is evaluated after operations that can change sellable stock:

- Dispense
- Import
- Clock-driven quarantine

When the transition occurs, the Notification Service writes a `REORDER_REQUIRED` message to the outbox. The message includes:

- Medicine ID and name
- Current sellable quantity
- Reorder threshold
- Creation timestamp
- Pending status

An open pending message prevents duplicates. Once a future replenishment moves stock back above the threshold, a later drop can produce a new notification. This gives the outbox meaningful state-transition semantics rather than a repeated polling alarm.

## 19. Why `/outbox` is observable

The Notification Service is represented by an outbox instead of a real email, SMS, or supplier integration. This is deliberate:

- The domain event can be graded without external credentials.
- Delivery can be retried by a future worker.
- The event is inspectable during local development.
- The pharmacy domain does not need to know how a notification is delivered.

The current `GET /outbox` response is a stable seam for a future consumer. A production worker could claim pending messages, deliver them, and mark them sent without changing the reorder calculation.

## 20. Why FEFO must explain itself

Automation is only useful when the pharmacist can trust it quickly. A Pick Slip that says “pull 10” is operationally incomplete if the user cannot see why that batch was selected.

BatchRx now labels each allocation:

- **Earliest in-date batch** for the first selection
- **Next earliest in-date batch** for spillover allocations

It also states that expired stock was excluded. This is a small interface detail with a large effect: it makes the safety rule visible at the exact moment the pharmacist is about to act.

The product is not trying to replace professional judgment. It is making the system’s judgment legible enough to verify.

## 21. Why the Waste Radar reports units, not money

Expiry risk is easy to hide behind a single “expiring batches” count. Ten units and ten thousand units should not have the same visual weight.

Waste Radar groups sellable units expiring within 30 days by medicine and ranks the groups by quantity. It deliberately reports units rather than estimated financial value because the current model does not contain purchase prices. Inventing a value would create false precision.

This gives the pharmacist a practical prioritization question:

```text
Which medicine has the most safe-to-sell stock at risk of becoming waste?
```

That answer can guide promotions, internal transfer, or earlier dispensing while the stock is still in date.

## 22. Why reorder signals become an action center

An outbox is valuable to an integration, but invisible infrastructure does not help the pharmacist. The Reorder Action Center brings pending `REORDER_REQUIRED` events into the same workspace as expiry alerts.

Each signal shows the current sellable quantity and threshold, then offers a clear next step: create a reorder draft. The draft is intentionally a lightweight handoff for this version rather than a fake supplier integration.

This follows the product’s general design rule:

```text
condition → explanation → next physical or operational action
```

Expiry becomes quarantine. FEFO becomes a Pick Slip. Low stock becomes a reorder draft.

## 23. New endpoint boundaries

The backend exposes these operations:

| Endpoint | Responsibility |
| --- | --- |
| `GET /state` | Read the authoritative pharmacy state |
| `POST /auth/register` | Create a user and session |
| `POST /auth/login` | Verify credentials and create a session |
| `GET /medicines?page=1&pageSize=6&sort=healthScore` | Paginated and sortable medicine inventory |
| `GET /batches?page=1&pageSize=20&sort=expiry` | Paginated batch inventory |
| `POST /clock` | Run deterministic expiry automation |
| `POST /import/batches` | Normalize and import messy rows |
| `POST /dispense` | Apply server-side FEFO and reorder detection |
| `GET /outbox` | Inspect notification events |
| `POST /reset` | Restore a clean deterministic test state |

The same routes are available under `/api/*` for the Vite development proxy. Keeping the API route responsibilities narrow makes each grading requirement independently testable.

## 24. Revised production boundary

The application is now a full-stack challenge product, but it is still not a regulated pharmacy deployment. The SQLite database is durable for local use, not yet a hosted, backed-up operational system. Before production, the next architectural work would be:

1. Move SQLite to a hosted transactional database with backups.
2. Make dispense and reorder evaluation one atomic transaction.
3. Add role-based authorization and hardened session/cookie policy.
4. Add an outbox worker with retry and delivery status.
5. Add unit, API integration, and browser tests in CI.
6. Add formal clinical, regulatory, accessibility, and security review.

## 25. Why the landing page is a product story

The first screen should help a visitor understand the product before asking for credentials. BatchRx now opens with a public landing page that explains the problem, demonstrates the FEFO mental model, and previews the actual dashboard concepts.

The page follows the same sequence as the product:

```text
Find in-date stock → Pull the right batch → Close the risk loop
```

The animated pulse preview gives the page life, but the motion has a job: it makes alerts, FEFO order, and sellable stock feel like a living pharmacy morning check. The page also respects `prefers-reduced-motion` so visual polish never becomes an accessibility tax.

The sections beneath the hero are intentionally tied to implemented features rather than generic marketing claims. Waste Radar, the audit trail, reorder signals, Pick Slips, and quarantine are all real product ideas a reviewer can find after entering the app.

## 26. Why theme and logout belong in the profile menu

Theme is a workspace preference, not a primary inventory action, so it belongs behind the profile control rather than competing with Add Batch or the search bar. Both Light and Dark modes are persisted locally so the pharmacist does not have to reset the display preference on every visit.

Logout is placed in the same menu because it is an account/session action. It clears the client session markers and returns to the public product entry point, making the boundary between the public story and the authenticated pharmacy desk explicit.

The dark theme changes the shared dashboard surfaces, text, borders, inputs, and mint panels while preserving teal, amber, and coral semantics. That is important: theme changes should affect atmosphere and contrast, not the meaning of operational colors.
