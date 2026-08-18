# TBS Operations Product and Accessibility Audit

- Date: 2026-08-17
- Scope: Overview, Inventory dashboard, Receiving, Movements, Outbound, Issues, and Reports at desktop and mobile breakpoints
- User goal: Find, receive, move, issue, outbound, and report on yard material without losing operational context
- Accessibility target: WCAG 2.2 AA-oriented review; screenshots and DOM inspection do not establish full compliance

## Overall verdict

The product has a consistent operational shell, clear terminology, strong responsive reflow, useful empty states, and a disciplined TBS visual language. The most important remaining design work is reducing mobile scroll before the next action, making dense desktop records fully navigable without tiny link targets, and improving repeated-control labels for assistive technology.

## Steps

1. **Overview — Healthy.** Active modules are easy to identify and use one consistent card pattern. Desktop has substantial unused space below the three modules, but it does not block the task.
2. **Inventory dashboard — Healthy.** Search, totals, filters, Conex 8, and project records form a clear hierarchy. The orange internal divider follows the TBS card rule.
3. **Receiving — Healthy with mobile-length risk.** Required material-photo policy and three square upload slots are clear. The long one-page mobile workflow places review actions far below the initial context; later refinement should add a persistent progress/action treatment without changing the workflow.
4. **Reports — Functional with density risk.** Reports load real records, filters and categories work, and unknown values remain explicit. Desktop rows expose only the first cell as the project link rather than the entire navigable record. On mobile, filters and categories push results well below the fold.
5. **Movements — Functional with selection friction.** Desktop table and mobile cards show project, material, location, and quantity. Ten mobile cards appear before destination and confirmation, increasing scroll and making the selected state harder to retain. Repeated controls are announced only as “Select,” without the material/project name.
6. **Outbound — Healthy empty state.** The project-first workflow and disabled action make the required next step clear. The heading divider is consistent with the established rule.
7. **Issues — Healthy empty state.** Record Issue remains prominent, filters are readable, and the empty state explains when to use the feature.
8. **Mobile Inventory — Healthy.** Filters stack cleanly and project cards retain key location and quantity facts.
9. **Mobile Receiving — Healthy with long-form risk.** Labels and inputs remain readable, and the policy alert appears before data entry.
10. **Mobile Movements — Needs refinement.** Cards are touch-friendly, but the destination/confirmation portion is too far below the initial list.
11. **Mobile Reports — Needs refinement.** Summary and filter cards reflow correctly, but the first report record is delayed by a tall filter block and horizontally scrolling category strip.

## Confirmed strengths

- Consistent shell, headings, spacing, cards, badges, and orange internal dividers.
- Desktop tables become mobile cards rather than squeezed tables.
- Receiving distinguishes required material photos from optional evidence.
- Empty states explain what the user should do next.
- Reports preserve `Unknown` rather than presenting missing facts as zero.
- Native headings, labels, tables, links, tab roles, alerts, and skip navigation are present in inspected DOM.

## UX and accessibility risks

- Make each navigable Reports row one semantic link on desktop, matching the existing mobile-card behavior and the application-wide navigation rule.
- Give movement checkboxes contextual accessible names such as “Select Marker Boards for FW Maudrie Walton.”
- Reduce the mobile distance between lot selection and movement destination/confirmation, using a selected-items summary and sticky continuation control.
- Collapse Reports filters into a summary/sheet on small screens after filters are applied, and preserve a visible category-overflow cue.
- Distinguish the two desktop controls currently announced as “Toggle Sidebar” so keyboard and screen-reader users understand their different placements.
- Verify contrast, zoom at 200%, focus order, live-region announcements, and real-device Safari behavior; screenshots alone cannot confirm these.

## Next.js/runtime findings

- Lint, strict TypeScript, 43 unit tests, and the Next.js 16.3 production build passed before remediation.
- The development log exposed Base UI semantic-contract errors for link-styled Buttons and a button-styled menu item.
- Those call sites were corrected with explicit `nativeButton` contracts and verified with no new browser warnings.
- No Swift, SwiftUI, Xcode project, or iOS runtime surface exists in this repository, so a SwiftUI performance diagnosis is not applicable.
