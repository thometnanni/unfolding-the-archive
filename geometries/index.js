import createModule from './node_modules/@mlightcad/libdxfrw-web/dist/libdxfrw.js'
import { readFileSync, writeFileSync } from 'node:fs'
import fileStructure from '../output/file-structure.json' with { type: 'json' }
import { join, normalize } from 'node:path'
import objectHash from 'object-hash'

const libdxfrw = await createModule()

const geometries = {}

const geometriesCount = {}

const archive_path = normalize('../data/TP 261 Markt Hall')
const files = fileStructure
  .filter(({ isFile, extension }) => isFile && extension === 'dwg')
  // .filter((_, i) => i >= 0 && i <= 10)
  // .filter(({ name }) => name === '181004_east elevation.dwg')
  .map((file) => ({
    ...file,
    layers: exportLayers(file)
  }))

writeFileSync(
  '../output/geometries-count.json',
  JSON.stringify(
    Object.entries(geometriesCount).sort((a, b) => b[1].count - a[1].count)
  )
)

writeFileSync('../output/geometries.json', JSON.stringify(geometries))

writeFileSync('../output/geometries-files.json', JSON.stringify(files))

function exportLayers(file) {
  const path = join(archive_path, file.path)
  const fileContent = readFileSync(path)

  const database = new libdxfrw.DRW_Database()
  const fileHandler = new libdxfrw.DRW_FileHandler()
  fileHandler.database = database

  if (file.extension == 'dxf') {
    const dxf = new libdxfrw.DRW_DxfRW(fileContent)
    // dxf.setDebug(libdxfrw.DRW_Dbg_Level.Debug);
    dxf.read(fileHandler, false)
    dxf.delete()
  } else if (file.extension == 'dwg') {
    const dwg = new libdxfrw.DRW_DwgR(fileContent)
    // dwg.setDebug(libdxfrw.DRW_Dbg_Level.Debug);
    dwg.read(fileHandler, false)
    dwg.delete()
  }

  const layers = listToArray(fileHandler.database.layers, [
    'name',
    'color'
  ]).map((layer) => ({ ...layer, entities: [] }))

  const entities = listToArray(fileHandler.database.mBlock.entities)
    .map((entity) => {
      const layer = entity.layer
      const type = entity.eType.constructor.name

      const vertexList = entity.getVertexList?.()

      const obj = { layer, type }

      if (vertexList && vertexList.size() !== 0) {
        obj.vertices = listToArray(vertexList, ['x', 'y', 'z'])
      } else {
        return null
      }

      const hash = objectHash(obj)
      if (geometriesCount[hash]) {
        geometriesCount[hash].count++
        geometriesCount[hash].files.push(file.name)
      } else {
        geometriesCount[hash] = {
          count: 1,
          files: [file.name]
        }
      }
      geometries[hash] = obj
      return hash
    })
    .filter((d) => d != null)

  entities.forEach((entity) => {
    const layer = geometries[entity].layer
    layers.find(({ name }) => name === layer).entities.push(entity)
  })

  database.delete()
  fileHandler.delete()

  return layers
}

function listToArray(list, keys = null) {
  const array = []
  for (let i = 0; i < list.size(); ++i) {
    let item = list.get(i)
    if (keys != null) {
      item = Object.fromEntries(
        keys.map((key) => [key, item[key]]).filter(([, value]) => value != null)
      )
    }
    array.push(item)
  }
  return array
}
