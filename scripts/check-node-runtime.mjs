const minimumNode = [24, 22, 0]
// October 15 advisories affect global fetch, including the earlier 7.29.1
// baseline. Check the implementation bundled into Node, not an npm dependency.
const minimumUndici = { 7: [7, 30, 1], 8: [8, 12, 2] }[process.versions.undici?.split(".")[0]]

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
  console.error(`Runtime rejected: Node ${process.versions.node}, bundled Undici ${process.versions.undici ?? "unknown"}. Use Node.js 24.22.0 or a newer supported 24.x release with bundled Undici 7.30.1+ on 7.x or 8.12.2+ on 8.x. npm dependency updates do not patch the Node runtime.`)
  process.exitCode = 1
} else {
  console.log(`Runtime verified: Node ${process.versions.node}, bundled Undici ${process.versions.undici}.`)
}
