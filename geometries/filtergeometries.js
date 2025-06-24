import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const arg = process.argv[2] || 'top1000'
let TARGET_COUNT = arg.startsWith('top') ? arg : Number(arg)

const folderName = "TP 255 Serpentine Gallery Pavilion"

const countsPath = path.resolve(__dirname, `../output/geometries-count-${folderName}.json`)
const geometriesPath = path.resolve(__dirname, `../output/geometries-${folderName}.json`)

const geometryOutputPath = path.resolve(__dirname, `../output/${folderName}-${TARGET_COUNT}.json`)
const filteredCountOutputPath = path.resolve(__dirname, `../output/${folderName}-${TARGET_COUNT}-count.json`)

const countsArr = JSON.parse(await fs.readFile(countsPath, 'utf8'))
const geometries = JSON.parse(await fs.readFile(geometriesPath, 'utf8'))

let filtered = []
if (typeof TARGET_COUNT === 'number') {
  filtered = countsArr.filter(([_, obj]) => obj.count === TARGET_COUNT)
} else if (typeof TARGET_COUNT === 'string' && TARGET_COUNT.startsWith('top')) {
  const topN = Number(TARGET_COUNT.replace('top', ''))
  filtered = countsArr
    .filter(([, obj]) => obj?.count != null)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topN)
}

const filteredGeometries = {}
const filteredCounts = []
for (const [hash, meta] of filtered) {
  if (geometries[hash]) {
    filteredGeometries[hash] = geometries[hash]
    filteredCounts.push([hash, meta])
  }
}

await fs.writeFile(geometryOutputPath, JSON.stringify(filteredGeometries, null, 2))
await fs.writeFile(filteredCountOutputPath, JSON.stringify(filteredCounts, null, 2))

console.log(`✅ Saved ${filteredCounts.length} geometries to:`)
console.log(`  → ${geometryOutputPath}`)
console.log(`  → ${filteredCountOutputPath}`)
