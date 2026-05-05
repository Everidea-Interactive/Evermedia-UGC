# Studio Performance Refactor Design

## Summary

Refactor the protected studio experience to reduce initial client JavaScript, isolate workspace code by mode, remove duplicated client polling, and eliminate obvious async waterfalls in server-rendered paths and route handlers.

The current architecture concentrates most studio behavior in a single large client component that eagerly imports all three workspaces. That shape makes the default studio entry heavier than necessary and duplicates KIE status reads across separate client trees. The refactor should preserve the product's core capabilities while prioritizing runtime performance over strict UX continuity.

## Goals

- Reduce the amount of client code loaded for the initial studio visit.
- Keep the studio on a single route while isolating manual, guided, and ideation workspaces behind smaller boundaries.
- Deduplicate KIE pricing and status reads used by both the header and the active studio workspace.
- Parallelize independent server-side work in pages and route handlers.
- Preserve authentication, persistence, and generation behavior.

## Non-Goals

- Splitting the studio into multiple URLs.
- Replacing Zustand state management.
- Rewriting guided or ideation business logic.
- Broad visual redesign outside changes needed to support the new shell structure.

## Current Problems

### Oversized Client Boundary

`components/dashboard/dashboard-shell.tsx` is a large `'use client'` file that imports manual, guided, and ideation workflow code into one eager bundle. The default studio route therefore pays for all major workspace code paths up front.

### Duplicated Client Polling

`components/layout/kie-credits-chip.tsx` and `lib/generation/use-kie-status.ts` both fetch `/api/kie/status` on separate intervals. The result is duplicate network traffic and multiple sources of truth for the same data.

### Async Waterfalls

Several server-rendered pages and route handlers perform independent awaits sequentially. This adds avoidable latency and directly conflicts with the intended App Router performance model.

## Target Architecture

### Studio Route Shape

The protected studio route remains `app/(protected)/page.tsx`, but it should render a thinner studio entry component instead of a monolithic client shell.

The new studio composition should look like this:

1. Server route verifies access and renders the studio entry.
2. A compact client studio shell owns mode selection and shared chrome.
3. Workspace entry components are mounted per selected mode.
4. Guided and ideation workspace modules are lazy-loaded with `next/dynamic`.
5. Manual mode remains the default fast path and should avoid importing guided and ideation implementation eagerly.

### Workspace Isolation

The studio shell should know only:

- current experience selection
- active image/video tab where relevant
- which workspace entry to mount
- shared cross-workspace indicators that genuinely belong in the shell

The shell should not directly contain manual section rendering, generation submission logic, or guided/ideation workflow implementations.

### Shared Client Data Layer

KIE status and KIE pricing should move behind focused shared hooks or a lightweight provider/cache abstraction that can be consumed by both:

- the authenticated header credit chip
- the active studio workspace

The data layer should provide:

- deduped fetch execution
- interval refresh
- error state
- loading state
- manual refresh trigger when generation events complete

The existing FX rate hook is already a good local example of module-scoped request deduplication. The KIE data path should adopt the same principle.

### Server-Side Parallelization

Independent async operations should be parallelized with `Promise.all` in:

- protected layout user/locale loading where safe
- library page output/ideation loading
- library route output/ideation loading
- generation run route pricing/status loading

Parallelization should not change authorization or error semantics.

## State Design

### Zustand Store

The existing generation store remains the shared state backbone for generation inputs, run state, guided state, and ideation state.

The refactor should not replace the store. Instead, it should reduce broad subscriptions by moving workspace-specific reads closer to the workspace that actually needs them.

### Shell State

Studio shell local state should be limited to UI concerns that are truly shell-specific, such as:

- active experience view
- top-level workspace tab selection if that state is not already kept in Zustand for functional reasons
- lazy-loading fallbacks and mount transitions

### Controller Logic

Manual generation submission and run polling should move into focused hooks or controller modules instead of remaining embedded in a giant render file. This keeps behavior testable and prevents unrelated shell re-renders from owning generation side effects.

## UX Direction

Behavioral change is permitted when it materially improves architecture or perceived performance. The design should still preserve the overall studio concept:

- one protected studio destination
- fast switching among manual, guided, and ideation
- shared authenticated header
- no functional loss in generation, archive, or ideation flows

Permitted improvements include:

- loading placeholders while guided or ideation modules are first requested
- simplified shell composition
- moving nonessential manual-only UI out of the initial shell

## File Plan

### Files to Keep but Simplify

- `app/(protected)/page.tsx`
- `components/dashboard/studio-workspace.tsx`

### Files to Split or Reframe

- `components/dashboard/dashboard-shell.tsx`

This file should be decomposed into smaller units centered on:

- studio shell
- manual workspace entry
- manual workspace sections
- generation controller hook
- shell-level shared UI

### Files to Reuse with New Boundaries

- `components/dashboard/guided-workspace.tsx`
- `components/dashboard/ideation-workspace.tsx`
- `store/use-generation-store.ts`

### Files to Refactor for Shared Data

- `components/layout/kie-credits-chip.tsx`
- `lib/generation/use-kie-status.ts`
- `lib/generation/use-kie-pricing.ts`

### Server Files to Parallelize

- `app/(protected)/layout.tsx`
- `app/(protected)/library/page.tsx`
- `app/api/library/route.ts`
- `app/api/generation/run/route.ts`

## Testing Strategy

### Regression Focus

Add or update tests to cover:

- shared KIE status consumption without duplicate logic paths
- manual generation controller behavior after extraction
- unchanged route behavior after async parallelization

### Structural Assertions

The refactor should be verified structurally by confirming:

- guided and ideation are no longer statically imported into the main studio shell
- lazy boundaries exist through `next/dynamic`
- header and studio no longer own separate KIE status polling implementations

### Completion Checks

Run:

- `npm run lint`
- `npm test`

## Risks and Mitigations

### Risk: Shell Split Causes State Regressions

Mitigation:

- retain the existing Zustand store contract unless a change is unavoidable
- extract behavior behind tests before moving logic

### Risk: Shared KIE Data Layer Changes Refresh Timing

Mitigation:

- preserve interval refresh behavior
- preserve explicit refresh after generation submission/completion events

### Risk: Lazy Loading Hurts Mode Switching Perception

Mitigation:

- keep manual mode fast by default
- use lightweight loading placeholders for guided and ideation
- avoid over-lazy-loading tiny shared primitives

## Success Criteria

The refactor is successful when:

- the initial studio shell no longer eagerly imports all workspace implementations
- guided and ideation code load on demand
- KIE status reads are deduplicated across header and studio
- independent server-side async work is parallelized
- lint and tests pass
- the user-visible studio remains fully functional with acceptable loading transitions
