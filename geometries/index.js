import { Dwg_File_Type, LibreDwg } from '../libredwg/libredwg/libredwg-web.js'
import { readFileSync, writeFileSync } from 'node:fs'
import fs from 'fs/promises'
import { join, normalize } from 'node:path'
import objectHash from 'object-hash'

function getArgValue(flag, fallback) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback
}

const folderName = getArgValue('--folder', 'TP 255 Serpentine Gallery Pavilion')
const safeFolderName = folderName.replace(/[^a-z0-9_\-]/gi, '_')
const archive_path = normalize(`../data/${folderName}`)

import path from 'path'
const fileStructurePath = path.resolve(
  `../output/file-structure-${safeFolderName}.json`
)
const fileStructure = JSON.parse(await fs.readFile(fileStructurePath, 'utf8'))

let geometries = {}

await Promise.all(
  fileStructure
    .filter(({ isFile, extension }) => isFile && extension === 'dwg')
    .map(async (file, i, { length }) => await exportLayers(file, i, length))
)

const filteredGeometries = Object.fromEntries(
  Object.entries(geometries)
    .sort((a, b) => b[1].files.length - a[1].files.length)
    .filter(
      ([, { files, vertices }]) => files.length >= 2 && vertices.length > 2
    )
    .slice(0, 500)
)

writeFileSync(
  `../output/geometries-${safeFolderName}.json`,
  JSON.stringify(filteredGeometries, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v
  )
)

async function exportLayers(file, i, length) {
  const libredwg = await LibreDwg.create('../libredwg/libredwg/')
  const path = join(archive_path, file.path)
  console.log(`\x1b[36m${i}/${length}\x1b[0m`, path)
  const fileContent = readFileSync(path)

  const dwg = libredwg.dwg_read_data(fileContent, Dwg_File_Type.DWG)
  const db = libredwg.convert(dwg)

  function verticeToFixed(vertix) {
    return vertix.map((d) => +d.toFixed(2))
  }

  db.entities
    .map((entity) => {
      switch (entity.type) {
        case 'POLYLINE':
        case 'LWPOLYLINE':
          return {
            // entity: entity,
            vertices: entity.vertices.map(({ x, y }) => verticeToFixed([x, y]))
          }
        case 'LINE':
          return {
            // entity: entity,
            vertices: [
              verticeToFixed([entity.startPoint.x, entity.startPoint.y]),
              verticeToFixed([entity.endPoint.x, entity.endPoint.y])
            ]
          }
        case 'TEXT':
        case 'MTEXT':
        case 'INSERT':
        case 'HATCH':
        case 'CIRCLE':
        case 'ARC':
        case 'POINT':
        case '3DFACE':
        case 'DIMENSION':
        case 'SPLINE':
        case 'ELLIPSE':
        case 'LEADER':
        case 'SOLID':
          return

        default:
          console.warn('Unmatched entity type:', entity.type)
      }
    })
    .filter((d) => d != null)
    .forEach((geometry) => {
      const hash = objectHash(geometry)
      if (geometries[hash] == null) {
        geometries[hash] = {
          ...geometry,
          first_used: file.birthtime,
          last_used: file.birthtime,
          files: [i]
        }
      } else {
        geometries[hash].first_used = Math.min(
          geometries[hash].first_used,
          file.birthtime
        )
        geometries[hash].last_used = Math.max(
          geometries[hash].last_used,
          file.birthtime
        )
        geometries[hash].files.includes(i) || geometries[hash].files.push(i)
      }
    })
}
