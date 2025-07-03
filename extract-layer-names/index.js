import createModule from './node_modules/@mlightcad/libdxfrw-web/dist/libdxfrw.js'
import { readFileSync, writeFileSync } from 'node:fs'
import fs from 'fs/promises'
import DxfParser from 'dxf-parser'
import { join, normalize, resolve } from 'node:path'

function getArgValue(flag, fallback) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback
}

const folderName = getArgValue('--folder', 'TP 255 Serpentine Gallery Pavilion')
const safeFolderName = folderName.replace(/[^a-z0-9_\-]/gi, '_')
const archive_path = normalize(`../data/${folderName}`)

const fileStructurePath = resolve(`../output/file-structure-${safeFolderName}.json`)
const fileStructure = JSON.parse(await fs.readFile(fileStructurePath, 'utf8'))

const libdxfrw = await createModule()

const files = fileStructure
  .filter(
    ({ isFile, extension }) =>
      isFile && (extension === 'dwg' || extension === 'dxf')
  )
  // .filter((_, i) => i >= 0 && i <= 50)
  .map((file) => ({
    ...file,
    layers: exportLayerNames(file)
  }))

writeFileSync(`../output/layer-names-${safeFolderName}.json`, JSON.stringify(files))

function exportLayerNames(file) {
  const path = join(archive_path, file.path)
  const fileContent = readFileSync(path)
  let layers = []

  if (file.extension === 'dxf') {
    try {
      const text = fileContent.toString('utf8')
      const parsed = new DxfParser().parseSync(text)
      const entries = parsed.tables?.layer?.entries || parsed.tables?.layer?.layers || {}
      const map = {}

      console.log( parsed.header);
      

      for (const l of Object.values(entries)) {
        map[l.name] = {
          name: l.name,
          color: l.colorIndex ?? null,
          lWeight: l.lineWeight ?? null,
          linetype: l.lineTypeName ?? null,
          entityCount: 0,
          typeCounts: {}
        }
      }
      for (const e of parsed.entities || []) {
        const ln = e.layer
        if (!map[ln]) {
          map[ln] = { name: ln, color: null, lWeight: null, linetype: null, entityCount: 0, typeCounts: {} }
        }
        const info = map[ln]
        info.entityCount++
        const type = e.type || e.constructor.name || 'UNKNOWN'
        info.typeCounts[type] = (info.typeCounts[type] || 0) + 1
      }
      layers = Object.values(map)
    } catch (err) {
      console.error(`Error parsing DXF ${path}:`, err.message)
      layers = []
    }

  } else if (file.extension === 'dwg') {
    const database = new libdxfrw.DRW_Database()
    const fileHandler = new libdxfrw.DRW_FileHandler()
    fileHandler.database = database

    const dwg = new libdxfrw.DRW_DwgR(fileContent)
    dwg.read(fileHandler, false)
    dwg.delete()
    layers = listToArray(database.layers, [
      'name', 'color', 'color24', 'lineType', 'lWeight'
    ]).map(l => (
  
    // console.log(l),
    {
    name:    l.name,
    color:   l.color,
    // color24: l.color24,
    lWeight: l.lWeight,  
    // lTypeH:  l.lTypeH,   
    // plotF:   l.plotF,
    linetype: l.lineType,
    entityCount: 0,
    typeCounts:  {}
  }));

   const layerMap = Object.fromEntries(layers.map((l) => [l.name, l]))
    const entities = listToArray(fileHandler.database.mBlock.entities)
    entities.forEach((entity) => {
    const layerName = entity.layer
    const layerObj = layerMap[layerName]
    if (!layerObj) return

    layerObj.entityCount++

    const type =
      entity.type ||
      entity.__proto__.constructor.name ||
      'UNKNOWN'
    layerObj.typeCounts[type] = (layerObj.typeCounts[type] || 0) + 1
  })

    database.delete()
    fileHandler.delete()
  }

  return layers
}

function listToArray(list, keys = null) {
  const array = []
  for (let i = 0; i < list.size(); ++i) {
    let item = list.get(i)
    if (keys != null) {
      item = Object.fromEntries(
        keys
          .map((key) => [key, item[key]])
          .filter(([, value]) => value != null)
      )
    }
    array.push(item)
  }
  return array
}
