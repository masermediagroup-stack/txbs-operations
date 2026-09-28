# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit-offline.spec.ts >> an offline movement is retained and visibly queued on the device
- Location: design-plans\app-audit-2026-09-08\audit-offline.spec.ts:38:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('1 material lot saved on this device and queued for shared sync.', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('1 material lot saved on this device and queued for shared sync.', { exact: true })

```

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- link "TBS Operations overview":
  - /url: /
  - text: TBS Operations Texas Building Specialties
- text: Operations
- list:
  - listitem:
    - link "Overview":
      - /url: /
  - listitem:
    - button "Inventory" [expanded]
    - list:
      - listitem:
        - link "Dashboard":
          - /url: /inventory
      - listitem:
        - link "Receiving":
          - /url: /inventory/receiving
      - listitem:
        - link "Movements":
          - /url: /inventory/movements
      - listitem:
        - link "Outbound":
          - /url: /inventory/outbound
      - listitem:
        - link "Projects":
          - /url: /inventory/projects
      - listitem:
        - link "Materials":
          - /url: /inventory/materials
      - listitem:
        - link "Storage":
          - /url: /inventory/storage
      - listitem:
        - link "Activity":
          - /url: /inventory/activity
      - listitem:
        - link "Issues":
          - /url: /inventory/issues
  - listitem:
    - link "Reports":
      - /url: /reports
- text: Workspace
- list:
  - listitem:
    - link "Administration":
      - /url: /administration
- text: TBS Operations Lavon · Richardson
- button "Toggle Sidebar"
- main:
  - button "Toggle Sidebar"
  - navigation "Breadcrumb":
    - link "Inventory":
      - /url: /inventory
    - text: Movements
  - search:
    - combobox "Search inventory"
    - text: Ctrl M
  - button "Open yard sync. Offline": Offline
  - button "Open notifications"
  - button "Open user menu": TV Tyler Vea
  - heading "Material movements" [level=1]
  - paragraph: Move complete or partial material lots while preserving source history and quantity.
  - text: Plan a material movement Select active lots, confirm one destination, and record who completed the move. 1 selected
  - group:
    - text: Find material
    - textbox "Find material":
      - /placeholder: Project, material, or location
  - group:
    - text: Site
    - combobox "Site":
      - option "All sites" [selected]
      - option "Lavon Yard"
      - option "Richardson Office & Warehouse"
  - group:
    - text: Project
    - combobox "Project":
      - option "All projects" [selected]
      - option "FW Maudrie Walton"
      - option "Allen ISD"
      - option "Allen Police"
      - option "Pearce ISD"
      - option "FWNW Patrol"
      - option "Douglas ISD"
      - option "Bush ISD"
      - option "Richardson City Hall"
      - option "Chisum ISD"
      - option "Hilton Anatole PH2"
      - option "Denton ISD"
      - option "Naaman Forest GISD"
      - option "Coppell ISD"
      - option "New Boston"
      - option "Lakeview FISD"
      - option "Ramer"
      - option "Sherman Stadium ISD"
      - option "Plano West"
  - group:
    - text: Current location
    - combobox "Current location":
      - option "All locations" [selected]
      - option "Conex 1"
      - option "Conex 2"
      - option "Conex 3"
      - option "Conex 4"
      - option "Conex 5"
      - option "Conex 6"
      - option "Conex 7"
      - option "Conex 8"
      - option "North Yard"
      - option "Middle Yard"
      - option "South Yard"
      - option "Indoor Warehouse"
      - option "Receiving Area"
  - table:
    - rowgroup:
      - row "Material Project Current position Available Move Quantity":
        - columnheader "Material"
        - columnheader "Project"
        - columnheader "Current position"
        - columnheader "Available"
        - columnheader "Move"
        - columnheader "Quantity"
    - rowgroup:
      - row "Marker Boards FW Maudrie Walton Conex 8 Position unknown 8 Loose Select":
        - cell "Marker Boards"
        - cell "FW Maudrie Walton"
        - cell "Conex 8 Position unknown"
        - cell "8 Loose"
        - cell "Select":
          - checkbox "Select" [checked]
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move": "8"
      - row "Marker Boards Allen ISD Conex 4 Position unknown 4 Mixed Select":
        - cell "Marker Boards"
        - cell "Allen ISD"
        - cell "Conex 4 Position unknown"
        - cell "4 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "4"
      - row "Bathroom Accessories Allen ISD South Yard Position unknown 3 Mixed Select":
        - cell "Bathroom Accessories"
        - cell "Allen ISD"
        - cell "South Yard Position unknown"
        - cell "3 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "3"
      - row "Detention Accessories Allen Police Middle Yard Position unknown 6 Mixed Select":
        - cell "Detention Accessories"
        - cell "Allen Police"
        - cell "Middle Yard Position unknown"
        - cell "6 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "6"
      - row "Fire Extinguisher Cabinets Allen Police Conex 2 Position unknown 6 Mixed Select":
        - cell "Fire Extinguisher Cabinets"
        - cell "Allen Police"
        - cell "Conex 2 Position unknown"
        - cell "6 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "6"
      - row "Visual Display Boards Pearce ISD Conex 3 Position unknown 10 Mixed Select":
        - cell "Visual Display Boards"
        - cell "Pearce ISD"
        - cell "Conex 3 Position unknown"
        - cell "10 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "10"
      - row "Toilet Partitions Pearce ISD Conex 3 Position unknown 13 Mixed Select":
        - cell "Toilet Partitions"
        - cell "Pearce ISD"
        - cell "Conex 3 Position unknown"
        - cell "13 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "13"
      - row "Lockers FWNW Patrol Middle Yard Position unknown 5 Mixed Select":
        - cell "Lockers"
        - cell "FWNW Patrol"
        - cell "Middle Yard Position unknown"
        - cell "5 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "5"
      - row "Corner Guards FWNW Patrol Middle Yard Position unknown 4 Mixed Select":
        - cell "Corner Guards"
        - cell "FWNW Patrol"
        - cell "Middle Yard Position unknown"
        - cell "4 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "4"
      - row "Marker Boards Douglas ISD Conex 5 Position unknown 7 Mixed Select":
        - cell "Marker Boards"
        - cell "Douglas ISD"
        - cell "Conex 5 Position unknown"
        - cell "7 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "7"
      - row "Room Signage Douglas ISD Middle Yard Position unknown 10 Mixed Select":
        - cell "Room Signage"
        - cell "Douglas ISD"
        - cell "Middle Yard Position unknown"
        - cell "10 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "10"
      - row "Toilet Accessories Bush ISD Conex 6 Position unknown 8 Mixed Select":
        - cell "Toilet Accessories"
        - cell "Bush ISD"
        - cell "Conex 6 Position unknown"
        - cell "8 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "8"
      - row "Operable Wall Parts Bush ISD Middle Yard Position unknown 9 Mixed Select":
        - cell "Operable Wall Parts"
        - cell "Bush ISD"
        - cell "Middle Yard Position unknown"
        - cell "9 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "9"
      - row "Directories Richardson City Hall Conex 2 Position unknown 7 Mixed Select":
        - cell "Directories"
        - cell "Richardson City Hall"
        - cell "Conex 2 Position unknown"
        - cell "7 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "7"
      - row "Fire Protection Cabinets Richardson City Hall Middle Yard Position unknown 10 Mixed Select":
        - cell "Fire Protection Cabinets"
        - cell "Richardson City Hall"
        - cell "Middle Yard Position unknown"
        - cell "10 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "10"
      - row "Gymnasium Equipment Chisum ISD Middle Yard Position unknown 2 Mixed Select":
        - cell "Gymnasium Equipment"
        - cell "Chisum ISD"
        - cell "Middle Yard Position unknown"
        - cell "2 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "2"
      - row "Marker Boards Chisum ISD Middle Yard Position unknown 2 Mixed Select":
        - cell "Marker Boards"
        - cell "Chisum ISD"
        - cell "Middle Yard Position unknown"
        - cell "2 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "2"
      - row "Wall Protection Hilton Anatole PH2 Conex 7 Position unknown 13 Mixed Select":
        - cell "Wall Protection"
        - cell "Hilton Anatole PH2"
        - cell "Conex 7 Position unknown"
        - cell "13 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "13"
      - row "Hotel Accessories Hilton Anatole PH2 North Yard Position unknown 16 Mixed Select":
        - cell "Hotel Accessories"
        - cell "Hilton Anatole PH2"
        - cell "North Yard Position unknown"
        - cell "16 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "16"
      - row "Athletic Lockers Denton ISD Conex 1 Position unknown 10 Mixed Select":
        - cell "Athletic Lockers"
        - cell "Denton ISD"
        - cell "Conex 1 Position unknown"
        - cell "10 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "10"
      - row "Visual Display Boards Denton ISD Conex 7 Position unknown 11 Mixed Select":
        - cell "Visual Display Boards"
        - cell "Denton ISD"
        - cell "Conex 7 Position unknown"
        - cell "11 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "11"
      - row "Toilet Partitions Naaman Forest GISD Conex 3 Position unknown 6 Mixed Select":
        - cell "Toilet Partitions"
        - cell "Naaman Forest GISD"
        - cell "Conex 3 Position unknown"
        - cell "6 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "6"
      - row "Marker Boards Naaman Forest GISD South Yard Position unknown 6 Mixed Select":
        - cell "Marker Boards"
        - cell "Naaman Forest GISD"
        - cell "South Yard Position unknown"
        - cell "6 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "6"
      - row "Projection Screens Coppell ISD Conex 5 Position unknown 8 Mixed Select":
        - cell "Projection Screens"
        - cell "Coppell ISD"
        - cell "Conex 5 Position unknown"
        - cell "8 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "8"
      - row "Bathroom Accessories Coppell ISD Conex 5 Position unknown 10 Mixed Select":
        - cell "Bathroom Accessories"
        - cell "Coppell ISD"
        - cell "Conex 5 Position unknown"
        - cell "10 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "10"
      - row "Access Panels New Boston Middle Yard Position unknown 4 Mixed Select":
        - cell "Access Panels"
        - cell "New Boston"
        - cell "Middle Yard Position unknown"
        - cell "4 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "4"
      - row "Fire Extinguishers New Boston Middle Yard Position unknown 3 Mixed Select":
        - cell "Fire Extinguishers"
        - cell "New Boston"
        - cell "Middle Yard Position unknown"
        - cell "3 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "3"
      - row "Bleachers Components Lakeview FISD Conex 6 Position unknown 7 Mixed Select":
        - cell "Bleachers Components"
        - cell "Lakeview FISD"
        - cell "Conex 6 Position unknown"
        - cell "7 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "7"
      - row "Lockers Lakeview FISD North Yard Position unknown 8 Mixed Select":
        - cell "Lockers"
        - cell "Lakeview FISD"
        - cell "North Yard Position unknown"
        - cell "8 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "8"
      - row "Cubicle Curtains Ramer Conex 7 Position unknown 6 Mixed Select":
        - cell "Cubicle Curtains"
        - cell "Ramer"
        - cell "Conex 7 Position unknown"
        - cell "6 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "6"
      - row "Room Signage Ramer Middle Yard Position unknown 8 Mixed Select":
        - cell "Room Signage"
        - cell "Ramer"
        - cell "Middle Yard Position unknown"
        - cell "8 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "8"
      - row "Stadium Lockers Sherman Stadium ISD South Yard Position unknown 9 Mixed Select":
        - cell "Stadium Lockers"
        - cell "Sherman Stadium ISD"
        - cell "South Yard Position unknown"
        - cell "9 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "9"
      - row "Athletic Equipment Sherman Stadium ISD Conex 7 Position unknown 7 Mixed Select":
        - cell "Athletic Equipment"
        - cell "Sherman Stadium ISD"
        - cell "Conex 7 Position unknown"
        - cell "7 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "7"
      - row "Marker Boards Plano West Conex 4 Position unknown 6 Mixed Select":
        - cell "Marker Boards"
        - cell "Plano West"
        - cell "Conex 4 Position unknown"
        - cell "6 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "6"
      - row "Wall Protection Plano West North Yard Position unknown 8 Mixed Select":
        - cell "Wall Protection"
        - cell "Plano West"
        - cell "North Yard Position unknown"
        - cell "8 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "8"
      - row "Cubicle Curtains Ramer Indoor Warehouse Position unknown 3 Mixed Select":
        - cell "Cubicle Curtains"
        - cell "Ramer"
        - cell "Indoor Warehouse Position unknown"
        - cell "3 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "3"
      - row "Room Signage Ramer Indoor Warehouse Position unknown 4 Mixed Select":
        - cell "Room Signage"
        - cell "Ramer"
        - cell "Indoor Warehouse Position unknown"
        - cell "4 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "4"
      - row "Marker Boards Plano West Indoor Warehouse Position unknown 4 Mixed Select":
        - cell "Marker Boards"
        - cell "Plano West"
        - cell "Indoor Warehouse Position unknown"
        - cell "4 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "4"
      - row "Wall Protection Plano West Indoor Warehouse Position unknown 5 Mixed Select":
        - cell "Wall Protection"
        - cell "Plano West"
        - cell "Indoor Warehouse Position unknown"
        - cell "5 Mixed"
        - cell "Select":
          - checkbox "Select"
          - text: Select
        - cell:
          - group:
            - text: Quantity to move
            - spinbutton "Quantity to move" [disabled]: "5"
  - text: Destination and evidence Every selected lot uses this destination; exact position applies to each resulting lot.
  - group:
    - text: Search destinations
    - textbox "Search destinations":
      - /placeholder: Conex, yard, or receiving area
  - group:
    - text: Destination location
    - combobox "Destination location":
      - option "Select destination"
      - option "Conex 1 · Lavon Yard" [selected]
      - option "Conex 2 · Lavon Yard"
      - option "Conex 3 · Lavon Yard"
      - option "Conex 4 · Lavon Yard"
      - option "Conex 5 · Lavon Yard"
      - option "Conex 6 · Lavon Yard"
      - option "Conex 7 · Lavon Yard"
      - option "Conex 8 · Lavon Yard"
      - option "North Yard"
      - option "Middle Yard"
      - option "South Yard"
  - group:
    - text: Position
    - combobox "Position":
      - option "Exact"
      - option "General" [selected]
      - option "Unknown"
  - group:
    - text: Depth
    - combobox "Depth" [disabled]:
      - option "Not set" [selected]
      - option "Front"
      - option "Middle"
      - option "Back"
  - group:
    - text: Side
    - combobox "Side" [disabled]:
      - option "Not set" [selected]
      - option "Left"
      - option "Center"
      - option "Right"
  - group:
    - text: Position note
    - textbox "Position note":
      - /placeholder: Aisle, stack, landmark, or access note
  - group:
    - text: Movement reason
    - textbox "Movement reason":
      - /placeholder: Why is this material moving?
      - text: Offline field move
  - group:
    - text: Movement note
    - textbox "Movement note"
  - group:
    - text: Proof photo
    - button "Proof photo"
    - paragraph: Optional. Select up to 3 photos.
  - complementary:
    - text: Confirm movement Review restrictions before material leaves its current position.
    - paragraph: Selected lot handling requirements will appear here.
    - paragraph: Sources
    - paragraph: "1"
    - paragraph: Destination
    - paragraph: Conex 1
    - group:
      - text: Operator name
      - textbox "Operator name": Offline Operator
      - paragraph: Recorded with the authenticated account and preserved as movement evidence.
    - alert: The I/O read operation failed.
    - button "Move 1 lot"
  - text: Movement history Select a movement to review its project, material, quantity, and recorded locations.
  - paragraph: No material movements have been recorded yet.
- alert
```

# Test source

```ts
  1   | import AxeBuilder from "@axe-core/playwright"
  2   | import { expect, test } from "@playwright/test"
  3   |
  4   | function locationFromOption(option: string) {
  5   |   return option.replace(/\s(?:\u00c2)?\u00b7\s.*$/, "")
  6   | }
  7   |
  8   | test("publishes an installable manifest and secured service worker", async ({ request }) => {
  9   |   const manifestResponse = await request.get("/manifest.webmanifest")
  10  |   expect(manifestResponse.ok()).toBeTruthy()
  11  |   const manifest = await manifestResponse.json()
  12  |   expect(manifest).toMatchObject({ name: "TBS Operations Yard Companion", short_name: "TBS Yard", start_url: "/inventory", display: "standalone" })
  13  |   expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
  14  |
  15  |   const workerResponse = await request.get("/sw.js")
  16  |   expect(workerResponse.ok()).toBeTruthy()
  17  |   expect(workerResponse.headers()["content-type"]).toContain("application/javascript")
  18  |   expect(workerResponse.headers()["cache-control"]).toContain("no-store")
  19  |   expect(workerResponse.headers()["service-worker-allowed"]).toBe("/")
  20  | })
  21  |
  22  | test("yard sync sheet prepares storage and remains accessible", async ({ page }) => {
  23  |   await page.goto("/inventory")
  24  |   await page.getByTestId("sync-status-trigger").click()
  25  |   const sheet = page.getByRole("dialog")
  26  |   await expect(sheet.getByRole("heading", { name: "Yard sync" })).toBeVisible()
  27  |   await expect(sheet.getByText("No local-only actions")).toBeVisible()
  28  |   await sheet.getByRole("button", { name: "Prepare this device" }).click()
  29  |   await expect(sheet.getByText(/Prepared/)).toBeVisible()
  30  |
  31  |   const results = await new AxeBuilder({ page })
  32  |     .include('[role="dialog"]')
  33  |     .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
  34  |     .analyze()
  35  |   expect(results.violations).toEqual([])
  36  | })
  37  |
  38  | test("an offline movement is retained and visibly queued on the device", async ({ page, context }) => {
  39  |   await page.goto("/inventory/movements")
  40  |   await context.setOffline(true)
  41  |   await expect(page.getByTestId("sync-status-trigger")).toHaveAttribute("aria-label", /Offline/)
  42  |
  43  |   const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024
  44  |   const lotEntry = isDesktop ? page.locator("table tbody tr").first() : page.locator('input[type="checkbox"]:visible').first().locator("..")
  45  |   const sourceText = await lotEntry.textContent()
  46  |   await lotEntry.getByRole("checkbox").check()
  47  |   if (!isDesktop) await page.getByRole("button", { name: "Review move (1)" }).click()
  48  |   const actionSurface = isDesktop ? page : page.getByRole("dialog")
  49  |   const options = await actionSurface.getByLabel("Destination location").locator("option").allTextContents()
  50  |   const destination = options.find((option) => option !== "Select destination" && !sourceText?.includes(locationFromOption(option)))!
  51  |   await actionSurface.getByLabel("Destination location").selectOption({ label: destination })
  52  |   await actionSurface.getByLabel("Movement reason").fill("Offline field move")
  53  |   await actionSurface.getByLabel("Operator name").fill("Offline Operator")
  54  |   const photoInput = isDesktop
  55  |     ? actionSurface.getByLabel("Proof photo")
  56  |     : actionSurface.getByLabel("Add movement photos 1 of 3")
  57  |   await photoInput.setInputFiles({ name: "offline-yard-proof.jpg", mimeType: "image/jpeg", buffer: Buffer.from("offline yard proof") })
  58  |   await actionSurface.getByRole("button", { name: "Move 1 lot" }).click()
  59  |
  60  |   if (isDesktop) {
> 61  |     await expect(actionSurface.getByText("1 material lot saved on this device and queued for shared sync.", { exact: true })).toBeVisible()
      |                                                                                                                               ^ Error: expect(locator).toBeVisible() failed
  62  |   } else {
  63  |     await expect(page.getByRole("dialog")).toHaveCount(0)
  64  |     await expect(page.locator('[role="alert"]:visible').filter({ hasText: "1 material lot saved on this device and queued for shared sync." })).toBeVisible()
  65  |     await expect(page.getByRole("button", { name: "Toggle Sidebar" })).toBeVisible()
  66  |   }
  67  |   await page.getByTestId("sync-status-trigger").click()
  68  |   const sheet = page.getByRole("dialog")
  69  |   await expect(sheet.getByText("Move material", { exact: true })).toBeVisible()
  70  |   await expect(sheet.getByText("Offline Operator")).toBeVisible()
  71  |   await expect(sheet.getByText("1 photo retained")).toBeVisible()
  72  |   await expect(sheet.getByRole("button", { name: "Sync now" })).toBeDisabled()
  73  |
  74  |   const replay = { command: null as { payload?: { photoUploads?: unknown[] } } | null }
  75  |   await page.route("**/api/inventory/uploads", async (route) => {
  76  |     expect(route.request().headers()["content-type"]).toBe("application/json")
  77  |     expect(route.request().headers()["x-tbs-queued-upload"]).toBe("ticket")
  78  |     expect(route.request().postDataJSON()).toMatchObject({ fileName: "offline-yard-proof.jpg", contentType: "image/jpeg" })
  79  |     await route.fulfill({
  80  |       status: 200,
  81  |       contentType: "application/json",
  82  |       body: JSON.stringify({
  83  |         id: "10000000-0000-4000-8000-000000000099",
  84  |         fileName: "offline-yard-proof.jpg",
  85  |         objectPath: "10000000-0000-4000-8000-000000000001/test/offline-yard-proof.jpg",
  86  |         token: "signed-upload-token",
  87  |         upsert: false,
  88  |       }),
  89  |     })
  90  |   })
  91  |   await page.route("**/storage/v1/object/upload/sign/**", async (route) => {
  92  |     expect(route.request().headers()["content-type"]).toBe("image/jpeg")
  93  |     expect(route.request().postDataBuffer()?.toString()).toBe("offline yard proof")
  94  |     await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "operational-media/offline-yard-proof.jpg" }) })
  95  |   })
  96  |   await page.route("**/api/inventory/commands/v1", async (route) => {
  97  |     replay.command = route.request().postDataJSON() as { payload?: { photoUploads?: unknown[] } }
  98  |     await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ entityId: "10000000-0000-4000-8000-000000000098" }) })
  99  |   })
  100 |   await context.setOffline(false)
  101 |   await expect(sheet.getByText("No local-only actions")).toBeVisible()
  102 |   expect(replay.command?.payload?.photoUploads).toHaveLength(1)
  103 | })
  104 |
  105 | test("offline fallback explains how to continue safely", async ({ page }) => {
  106 |   await page.goto("/offline")
  107 |   await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible()
  108 |   await expect(page.getByRole("button", { name: "Try Inventory again" })).toBeVisible()
  109 | })
  110 |
```