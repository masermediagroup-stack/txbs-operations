const minimumNode = [24, 22, 0]
const minimumUndici = { 7: [7, 29, 1], 8: [8, 10, 2] }[process.versions.undici?.split(".")[0]]

function atLeast(value, minimum) {
  const parts = value?.split(".").map(Number)
  if (!parts || parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return false
  for (let index = 0; index < minimum.length; index += 1) {
    if (parts[index] !== minimum[index]) return parts[index] > minimum[index]
  }
  return true
}

if (process.versions.node.split(".")[0] !== "24"
  || !atLeast(process.versions.node, minimumNode)
  || !minimumUndici
  || !atLeast(process.versions.undici, minimumUndici)) {
  console.error("Use Node.js 24.22.0 or a newer supported 24.x patch with patched bundled Undici (7.29.1+ on 7.x or 8.10.2+ on 8.x). npm dependency updates do not patch the Node runtime.")
  process.exitCode = 1
} else {
  console.log(`Runtime verified: Node ${process.versions.node}, bundled Undici ${process.versions.undici}.`)
}
