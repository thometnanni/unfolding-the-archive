import { Dwg_File_Type, LibreDwg } from '../libredwg/libredwg/libredwg-web.js'
import { readFileSync, writeFileSync } from 'node:fs'
import fileStructure from '../output/file-structure.json' with { type: 'json' }
import { join, normalize } from 'node:path'
import objectHash from 'object-hash'

const libredwg = await LibreDwg.create('../libredwg/libredwg/')

// const libdxfrw = await createModule()

let geometries = {}

const geometriesCount = {}

const folderName = "TP 255 Serpentine Gallery Pavilion"

const archive_path = normalize(`../data/${folderName}`)
const files = fileStructure
  .filter(({ isFile, extension }) => isFile && extension === 'dwg')
  .filter((_, i) => i >= 0 && i <= 100)
  // .filter(({ name }) => name === '181004_east elevation.dwg')
  .map((file) => ({
    ...file,
    layers: exportLayers(file)
  }))

writeFileSync(
  `../output/geometries-count-${folderName}.json`,
  JSON.stringify(
    Object.entries(geometriesCount).sort((a, b) => b[1].count - a[1].count),
    null,
    2
  )
)

writeFileSync(
  `../output/geometries-${folderName}.json`,
  JSON.stringify(
    geometries,
    (_, v) => (typeof v === 'bigint' ? v.toString() : v),
    2
  )
)

writeFileSync(
  `../output/geometries-files-${folderName}.json`,
  JSON.stringify(files, (_, v) => (typeof v === 'bigint' ? v.toString() : v),
  2
)
)

function exportLayers(file) {
  const path = join(archive_path, file.path)
  console.log(path)
  const fileContent = readFileSync(path)

  const dwg = libredwg.dwg_read_data(fileContent, Dwg_File_Type.DXF)
  const db = libredwg.convert(dwg)
  libredwg.dwg_free(db)

  const hashedEntities = db.entities.map((entry) => [objectHash(entry), entry])
  const entities = Object.fromEntries(hashedEntities)

  const layers = db.tables.LAYER.entries.map((layer) => ({
    ...layer,
    geometries: hashedEntities
      .filter(([, entity]) => layer.name === entity.layer)
      .map(([hash]) => hash)
  }))

  geometries = { ...geometries, ...Object.fromEntries(hashedEntities) }

  Object.keys(entities).forEach((hash) => {
    if (geometriesCount[hash]) {
      geometriesCount[hash].count++
      geometriesCount[hash].files.push(file.path)
    } else {
      geometriesCount[hash] = {
        count: 1,
        files: [file.path]
      }
    }
  })

  return layers
}
