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
    layers: exportLayers(file)
  }))

writeFileSync('../output/layers.json', JSON.stringify(files))

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

  const entities = listToArray(fileHandler.database.mBlock.entities).map(
    (entity) => {
      const layer = entity.layer
      const type = entity.eType.constructor.name

      const vertexList = entity.getVertexList?.()
      if (!vertexList || vertexList.size() === 0) return { layer, type }

      const vertices = listToArray(vertexList, ['x', 'y', 'z'])
      // if (vertices.z) console.log('has z')

      return { layer, type, vertices }
    }
  )

  entities.forEach((entity) => {
    const layer = entity.layer
    delete entity.layer
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
