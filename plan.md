# Implementation Plan: BatchRx (Smart FEFO Pharmacy Manager)

This plan is based on the excellent BatchRx Product Requirements Document (PRD) you provided. It is indeed the **perfect product** for this timeframe. It's highly scoped, focuses exactly on the core problems (FEFO, expiry, quick lookup), and the tech stack is ideal for a fast, client-side build.

## User Review Required

> [!IMPORTANT]
> The PRD specifies using **Tailwind CSS**. Our standard web design guidelines usually recommend Vanilla CSS for maximum control unless Tailwind is explicitly requested. 
> 
> Since the PRD requests it, please confirm:
> **Do you want to proceed with Tailwind CSS?** (If yes, I will use Tailwind v3, which is the most stable and standard for this setup). 
> Or would you prefer to use pure Vanilla CSS?

## Proposed Changes

We will build the application in phases in your workspace (`c:\Users\Dell\OneDrive\Desktop\auriga`), strictly following the PRD's time budget.

### Phase 1: Setup & Foundation
- Initialize a new Vite + React project.
- Set up styling (Tailwind CSS or Vanilla CSS based on your feedback).
- Establish the exact folder structure (`src/context`, `src/engine`, `src/components`, `src/pages`, `src/data`).
- Create `src/data/seed.js` with the varied batch states (healthy, expiring soon, expired) to ensure the UI can be tested immediately.

### Phase 2: Core Domain Logic Engine
- **`src/engine/fefo.js`**: Implement the pure algorithm to filter expired batches, sort by expiry date, and walk the list to fulfill dispense requests.
- **`src/engine/healthScore.js`**: Implement the 0-100 scoring logic based on expiry proximity.
- **`src/engine/storage.js`**: Implement robust `localStorage` read/write wrappers.

### Phase 3: State Management
- **`src/context/PharmacyContext.jsx`**: Set up a global state using `useReducer` to handle medicines, batches, and dispense logs, wired to our storage engine.

### Phase 4: UI Construction - Dashboard & Search
- **`SearchBar.jsx`**: Implement real-time fuzzy matching and instant sellable stock calculation.
- **`MedicineCard.jsx`**: Implement the visual health score bar and quick actions.
- Assemble the main `Dashboard.jsx`.

### Phase 5: UI Construction - Modals & Alerts
- **`AddBatchModal.jsx`**: Form to enter new stock.
- **`DispenseModal.jsx` & `PickSlip.jsx`**: The core workflow UI, generating clear instructions for physical box pulling.
- **`AlertFeed.jsx` & `QuarantinePanel.jsx`**: Sidebar for 🔴/🟠/🟡 alerts and the right panel for managing disposed stock.

## Verification Plan

### Manual Verification
Once built, we will run `npm run dev` and perform the following manual checks:
1. **The "Pulse" Check**: Verify the app loads with seed data and the Alert Feed correctly shows 1 expired and 1 expiring batch.
2. **The "FEFO" Check**: Attempt to dispense 30 Paracetamol and verify the Pick Slip correctly pulls 10 from the older batch and 20 from the newer batch, explicitly ignoring any expired batches.
3. **The "Quarantine" Check**: Acknowledge an expired batch, move it to quarantine, and verify it drops off the main sellable stock calculations.
4. **Data Persistence**: Refresh the browser and ensure all actions (dispensations, new batches) survived.
