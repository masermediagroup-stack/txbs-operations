// @vitest-environment node
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { expect, it } from "vitest"

const script = readFileSync(new URL("../scripts/check-node-runtime.mjs", import.meta.url), "utf8")

it.each([
  ["24.22.0", "7.29.1", false],
  ["24.22.0", "7.30.0", false],
  ["24.22.0", "7.30.1", true],
  ["24.22.0", "8.10.2", false],
  ["24.22.0", "8.12.1", false],
  ["24.22.0", "8.12.2", true],
  ["24.21.0", "7.30.1", false],
  ["25.0.0", "8.12.2", false],
  ["24.22.0", undefined, false],
  ["24.22.0", "9.0.0", false],
  ["24.22.0", "7.30.1-rc.1", false],
  ["24.22.0.1", "7.30.1", false],
  ["24.23.0", "7.30.1", true],
])("enforces the current bundled-fetch boundary for Node %s / Undici %s", (node, undici, supported) => {
  const runtime = { versions: { node, undici }, exitCode: undefined as number | undefined }
  const output: string[] = []
  runInNewContext(script, { process: runtime, console: {
    log: (message: string) => output.push(message),
    error: (message: string) => output.push(message),
  } })
  expect(runtime.exitCode ?? 0).toBe(supported ? 0 : 1)
  expect(output.some(message => message.startsWith("Runtime verified:"))).toBe(supported)
})
