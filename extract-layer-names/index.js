import createModule from './node_modules/@mlightcad/libdxfrw-web/dist/libdxfrw.js'
import { readFileSync, writeFileSync } from 'node:fs'
import fileStructure from '../output/file-structure.json' with { type: 'json' }
import { join, normalize } from 'node:path'

const libdxfrw = await createModule()

const archive_path = normalize('../data')
const files = fileStructure
  .filter(
    ({ isFile, extension }) =>
      isFile && (extension === 'dwg' || extension === 'dwg')
  )
  // .filter((_, i) => i >= 0 && i <= 50)
  .map((file) => ({
    ...file,
    layers: exportLayerNames(file)
  }))

writeFileSync('../output/layer-names.json', JSON.stringify(files))

function exportLayerNames(file) {
  const path = join(archive_path, file.path)
  const fileContent = readFileSync(path)

  const database = new libdxfrw.DRW_Database()
  const fileHandler = new libdxfrw.DRW_FileHandler()
  fileHandler.database = database

  if (file.extension == 'dxf') {
    const dxf = new libdxfrw.DRW_DxfRW(fileContent)
    dxf.read(fileHandler, false)
    dxf.delete()
  } else if (file.extension == 'dwg') {
    const dwg = new libdxfrw.DRW_DwgR(fileContent)
    dwg.read(fileHandler, false)
    dwg.delete()
  }

  const layers = listToArray(fileHandler.database.layers, [
    'name',
    'color',
    'visible'
  ]).map((l) => ({
    ...l,
    entityCount: 0
  }))

  console.log(fileHandler.database.layers)

  const layerMap = Object.fromEntries(layers.map((l) => [l.name, l]))

  const entities = listToArray(fileHandler.database.mBlock.entities)
  entities.forEach((entity) => {
    const layerName = entity.layer
    if (layerMap[layerName]) {
      layerMap[layerName].entityCount++
    }
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
