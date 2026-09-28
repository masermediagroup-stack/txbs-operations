# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit-offline.spec.ts >> an offline movement is retained and visibly queued on the device
- Location: design-plans\app-audit-2026-09-08\audit-offline.spec.ts:38:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('dialog')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('dialog')
    13 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link [ref=e2]:
    - /url: "#main-content"
    - text: Skip to main content
  - main [ref=e4]:
    - generic [ref=e5]:
      - button [ref=e6]:
        - generic [ref=e7]: Toggle Sidebar
      - navigation [ref=e8]:
        - generic [ref=e9]: Movements
      - generic [ref=e11]:
        - link [ref=e12]:
          - /url: /inventory#inventory-project-search
        - button [ref=e16]
        - button [ref=e17]
        - button [ref=e18]:
          - generic [ref=e19]: TV
    - generic [ref=e23]:
      - generic [ref=e24]:
        - heading [level=1] [ref=e25]: Material movements
        - paragraph [ref=e26]: Move complete or partial material lots while preserving source history and quantity.
      - generic [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e31]:
            - generic [ref=e32]:
              - generic [ref=e33]: Plan a material movement
              - generic [ref=e34]: Select active lots, confirm one destination, and record who completed the move.
            - generic [ref=e35]: 1 selected
          - generic [ref=e36]:
            - generic [ref=e37]:
              - group [ref=e38]:
                - generic [ref=e39]: Find material
                - textbox [ref=e44]:
                  - /placeholder: Project, material, or location
              - generic [ref=e45]:
                - paragraph [ref=e46]: All sites · All projects · All locations
                - button [ref=e47]: Filters
            - generic [ref=e48]:
              - generic [ref=e49] [cursor=pointer]:
                - checkbox [checked] [ref=e50]
                - generic [ref=e51]:
                  - generic [ref=e52]:
                    - generic [ref=e53]:
                      - heading [level=3] [ref=e54]: Marker Boards
                      - paragraph [ref=e55]: FW Maudrie Walton
                    - generic [ref=e56]: 8 Loose
                  - generic [ref=e57]: Conex 8
              - generic [ref=e59] [cursor=pointer]:
                - checkbox [ref=e60]
                - generic [ref=e61]:
                  - generic [ref=e62]:
                    - generic [ref=e63]:
                      - heading [level=3] [ref=e64]: Marker Boards
                      - paragraph [ref=e65]: Allen ISD
                    - generic [ref=e66]: 4 Mixed
                  - generic [ref=e67]: Conex 4
              - generic [ref=e69] [cursor=pointer]:
                - checkbox [ref=e70]
                - generic [ref=e71]:
                  - generic [ref=e72]:
                    - generic [ref=e73]:
                      - heading [level=3] [ref=e74]: Bathroom Accessories
                      - paragraph [ref=e75]: Allen ISD
                    - generic [ref=e76]: 3 Mixed
                  - generic [ref=e77]: South Yard
              - generic [ref=e79] [cursor=pointer]:
                - checkbox [ref=e80]
                - generic [ref=e81]:
                  - generic [ref=e82]:
                    - generic [ref=e83]:
                      - heading [level=3] [ref=e84]: Detention Accessories
                      - paragraph [ref=e85]: Allen Police
                    - generic [ref=e86]: 6 Mixed
                  - generic [ref=e87]: Middle Yard
              - generic [ref=e89] [cursor=pointer]:
                - checkbox [ref=e90]
                - generic [ref=e91]:
                  - generic [ref=e92]:
                    - generic [ref=e93]:
                      - heading [level=3] [ref=e94]: Fire Extinguisher Cabinets
                      - paragraph [ref=e95]: Allen Police
                    - generic [ref=e96]: 6 Mixed
                  - generic [ref=e97]: Conex 2
              - generic [ref=e99] [cursor=pointer]:
                - checkbox [ref=e100]
                - generic [ref=e101]:
                  - generic [ref=e102]:
                    - generic [ref=e103]:
                      - heading [level=3] [ref=e104]: Visual Display Boards
                      - paragraph [ref=e105]: Pearce ISD
                    - generic [ref=e106]: 10 Mixed
                  - generic [ref=e107]: Conex 3
              - generic [ref=e109] [cursor=pointer]:
                - checkbox [ref=e110]
                - generic [ref=e111]:
                  - generic [ref=e112]:
                    - generic [ref=e113]:
                      - heading [level=3] [ref=e114]: Toilet Partitions
                      - paragraph [ref=e115]: Pearce ISD
                    - generic [ref=e116]: 13 Mixed
                  - generic [ref=e117]: Conex 3
              - generic [ref=e119] [cursor=pointer]:
                - checkbox [ref=e120]
                - generic [ref=e121]:
                  - generic [ref=e122]:
                    - generic [ref=e123]:
                      - heading [level=3] [ref=e124]: Lockers
                      - paragraph [ref=e125]: FWNW Patrol
                    - generic [ref=e126]: 5 Mixed
                  - generic [ref=e127]: Middle Yard
              - generic [ref=e129] [cursor=pointer]:
                - checkbox [ref=e130]
                - generic [ref=e131]:
                  - generic [ref=e132]:
                    - generic [ref=e133]:
                      - heading [level=3] [ref=e134]: Corner Guards
                      - paragraph [ref=e135]: FWNW Patrol
                    - generic [ref=e136]: 4 Mixed
                  - generic [ref=e137]: Middle Yard
              - generic [ref=e139] [cursor=pointer]:
                - checkbox [ref=e140]
                - generic [ref=e141]:
                  - generic [ref=e142]:
                    - generic [ref=e143]:
                      - heading [level=3] [ref=e144]: Marker Boards
                      - paragraph [ref=e145]: Douglas ISD
                    - generic [ref=e146]: 7 Mixed
                  - generic [ref=e147]: Conex 5
              - button [ref=e149]: Show 10 more lots
        - button [expanded] [ref=e151]: Review move (1)
      - generic [ref=e152]:
        - generic [ref=e153]:
          - generic [ref=e154]: Movement history
          - generic [ref=e155]: Select a movement to review its project, material, quantity, and recorded locations.
        - paragraph [ref=e157]: No material movements have been recorded yet.
  - alert [ref=e158]
  - dialog [ref=e162]:
    - generic [ref=e163]:
      - heading "Review selected material" [level=2] [ref=e165]
      - paragraph [ref=e166]: Confirm quantities, one destination, and movement evidence.
    - generic [ref=e167]:
      - generic [ref=e169]:
        - generic [ref=e171]:
          - generic [ref=e172]:
            - generic [ref=e173]:
              - paragraph [ref=e174]: Marker Boards
              - paragraph [ref=e175]: FW Maudrie Walton · Conex 8
            - button "Remove" [ref=e176]
          - group [ref=e177]:
            - generic [ref=e178]: Quantity to move
            - spinbutton "Quantity to move" [ref=e179]: "8"
        - group [ref=e180]:
          - generic [ref=e181]: Search destinations
          - textbox "Search destinations" [ref=e182]:
            - /placeholder: Conex, yard, or receiving area
        - group [ref=e183]:
          - generic [ref=e184]: Destination location
          - combobox "Destination location" [ref=e186]:
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
        - generic [ref=e187]:
          - group [ref=e188]:
            - generic [ref=e189]: Position
            - combobox "Position" [ref=e191]:
              - option "Exact"
              - option "General" [selected]
              - option "Unknown"
          - group [ref=e192]:
            - generic [ref=e193]: Depth
            - generic [ref=e194]:
              - combobox "Depth" [disabled]:
                - option "Not set" [selected]
                - option "Front"
                - option "Middle"
                - option "Back"
          - group [ref=e195]:
            - generic [ref=e196]: Side
            - generic [ref=e197]:
              - combobox "Side" [disabled]:
                - option "Not set" [selected]
                - option "Left"
                - option "Center"
                - option "Right"
        - group [ref=e198]:
          - generic [ref=e199]: Position note
          - textbox "Position note" [ref=e200]
        - group [ref=e201]:
          - generic [ref=e202]: Movement reason
          - textbox "Movement reason" [ref=e203]:
            - /placeholder: Why is this material moving?
            - text: Offline field move
        - group [ref=e204]:
          - generic [ref=e205]: Movement note
          - textbox "Movement note" [ref=e206]
        - group [ref=e207]:
          - generic [ref=e208]: Movement photos
          - group "Movement photos" [ref=e212]:
            - generic [ref=e213]:
              - button "Replace movement photos 1 of 3" [ref=e214]
              - generic [ref=e215] [cursor=pointer]: Replace movement photos 1
              - button "Remove movement photos 1" [ref=e217]
            - generic [ref=e221]:
              - button "Add movement photos 2 of 3" [ref=e222]
              - generic [ref=e223] [cursor=pointer]: Add photo 2
            - generic [ref=e226]:
              - button "Add movement photos 3 of 3" [ref=e227]
              - generic [ref=e228] [cursor=pointer]: Add photo 3
          - paragraph [ref=e231]: Optional. Add up to three photos from the camera or photo library.
        - generic [ref=e232]:
          - generic [ref=e233]:
            - paragraph [ref=e234]: Sources
            - paragraph [ref=e235]: "1"
          - generic [ref=e238]:
            - paragraph [ref=e239]: Destination
            - paragraph [ref=e240]: Conex 1
        - group [ref=e241]:
          - generic [ref=e242]: Operator name
          - textbox "Operator name" [ref=e243]: Offline Operator
        - paragraph [ref=e244]: 1 lots selected. 8 known packages. 0 quantities unknown. Destination Conex 1.
        - alert [ref=e245]: The I/O read operation failed.
      - button "Move 1 lot" [ref=e247]
    - button "Close" [ref=e248]
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
  61  |     await expect(actionSurface.getByText("1 material lot saved on this device and queued for shared sync.", { exact: true })).toBeVisible()
  62  |   } else {
> 63  |     await expect(page.getByRole("dialog")).toHaveCount(0)
      |                                            ^ Error: expect(locator).toHaveCount(expected) failed
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