# Promote Overview quick actions

Written against: b46fc30337fbe25e8af59be4811ac1fe3e55e49f

## Evidence chain

- Surface: `/` Operator Overview, rendered by `src/features/overview/components/overview-page.tsx`
- Problem: The four workflow shortcuts render as low-emphasis outline controls at the very bottom of a long operational dashboard, so the actions are visually subordinate and require scrolling despite being described as the workflows used most often.
- Design evidence: The user selected the Quick actions group and explicitly requested that it move to the top and read more clearly as buttons. The existing `Button` primitive in `src/components/ui/button.tsx` provides filled `secondary` styling, focus treatment, active feedback, and link composition without introducing a parallel control pattern. The Overview already uses compact card hierarchy and equal-width responsive grids.
- Owner: `src/features/overview/components/overview-page.tsx`
- Scope and affected surfaces: Operator Overview only; desktop, tablet, and mobile responsive layouts.
- Uncertainty: None. The four actions remain equal-priority shortcuts, so no single action receives unique primary emphasis.

## Design decision

Place Quick actions immediately after the Operator `PageHeader`, before the demo-environment notice and KPI row. Retain the existing card composition, labels, icons, destinations, and equal-priority grid, but change the links from low-emphasis outline buttons to solid secondary buttons with a minimum 44px touch height and left-aligned icon-label composition. This improves discoverability and control affordance without changing navigation behavior or the Overview’s visual identity.

## Reuse

- `Button` from `src/components/ui/button.tsx`, using its existing `secondary` variant and link-render composition.
- `Card`, `CardHeader`, `CardContent`, `CardTitle`, and `CardDescription` from `src/components/ui/card.tsx`.
- Existing Quick actions icons and routes in `src/features/overview/components/overview-page.tsx`.
- Exemplar: the filled TBS action controls already produced by the default/secondary `Button` variants; no new primitive is required.

## Changes

1. `src/features/overview/components/overview-page.tsx`
   - Change: Move the complete Quick actions card from the end of the Operator Overview to immediately below `PageHeader`.
   - Preserve: Keep the action order and destinations: Receive material, Move material, Verify material, Prepare outbound.
   - Verify: The four shortcuts are visible near the top of the page before KPI and analytics content at every supported viewport.

2. `src/features/overview/components/overview-page.tsx`
   - Change: Render all four Quick action links with the existing `Button` `secondary` variant and a shared `min-h-11 justify-start px-4` presentation. Keep the responsive `sm:grid-cols-2 lg:grid-cols-4` grid and use the existing icons at the start of each label.
   - Preserve: Equal visual priority, semantic links, native keyboard behavior, visible focus, and existing route targets.
   - Verify: Each action reads as a solid button rather than a bordered utility link; its full cell is clickable, its touch target is at least 44px high, and the label remains legible without horizontal overflow.

## Scope

- Inherit: Operator Overview on desktop, tablet, installed PWA, Android Chrome, and iPhone Safari.
- Verify: Overview loading/hydrating state and Site-filter layout after the card moves.
- Exclude: Tech Overview, navigation menus, workflow forms, Overview metrics, route behavior, and design-token changes.

## Validation

- Product: Open `/` as an Operator and confirm Receive material, Move material, Verify material, and Prepare outbound are immediately available below the page heading and navigate to their current workflows.
- Interface: Check 390px mobile, 768px tablet, and 1280px desktop widths; confirm one-column/mobile or existing responsive wrapping does not overflow, focus is visible, and every button has at least a 44px target.
- System: Confirm the implementation reuses the existing `Button` secondary variant and does not add a new quick-action component or bespoke color token.
- Repository: `npm run typecheck && npx eslint "src/features/overview/components/overview-page.tsx" && npm run build` → all commands pass.

## Stop conditions

- Stop if moving the card above the demo notice conflicts with a binding compliance requirement that the demo notice must precede all interactive content.

## Design documentation

- After acceptance and validation: none; this is a local Overview hierarchy correction using existing components and tokens.
