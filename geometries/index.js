import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { Worker } from 'node:worker_threads'
import fs from 'fs/promises'
import { join, normalize } from 'node:path'
import objectHash from 'object-hash'
import { UMAP } from 'umap-js'
import { format } from 'd3-format'
import path from 'path'
import { extractDimensions, zScoreNormalize } from './geometryDimensions.js'

const formatNumbers = format('.4~s')

function formatFixedSig(x, sig = 4) {
  if (isNaN(x)) return
  if (x === 0) return '0'

  const absX = Math.abs(x)
  const digits = sig - Math.floor(Math.log10(absX)) - 1
  const fixed = x.toFixed(Math.max(digits, 0))

  // Split into integer and fractional parts
  const [intPart, fracPart] = fixed.split('.')

  // Add spaces every 3 digits in integer part
  const spacedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

  return fracPart ? `${spacedInt}.${fracPart}` : spacedInt
}

function formatFixedSig2(x, sig = 4) {
  const digits = Math.floor(Math.log10(x)) + 1

  const divisor = Math.pow(10, digits - 1)

  const num = +(x / divisor).toFixed(sig - 1) * divisor

  return num
}

function getArgValue(flag, fallback) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback
}

const folderName = getArgValue('--folder', 'TP 255 Serpentine Gallery Pavilion')
const safeFolderName = folderName.replace(/[^a-z0-9_\-]/gi, '_')
const archive_path = normalize(`../data/${folderName}`)

const fileStructurePath = path.resolve(
  `../output/file-structure-${safeFolderName}.json`
)
const fileStructure = JSON.parse(await fs.readFile(fileStructurePath, 'utf8'))

const geometriesTempPath = `../output/geometries-temp-${safeFolderName}.json`
let filteredGeometries = null

let geometries = {}

if (existsSync(geometriesTempPath)) {
  filteredGeometries = JSON.parse(await fs.readFile(geometriesTempPath, 'utf8'))
} else {
  geometries = {}

  // await Promise.all(
  //   fileStructure
  //     .filter(({ isFile, extension }) => isFile && extension === 'dwg')
  //     // .filter(({ name }) => name == 'ENTREE.DWG')
  //     // .filter((_, i) => i >= 21 && i <= 30)
  //     .map(async (file, i, { length }) => await exportLayers(file, i, length))
  // )

  const dwgFiles = fileStructure
    .filter(({ isFile, extension }) => isFile && extension === 'dwg')
    .filter(({ name }) => !/^\./.test(name))
  // .filter(({ name }) => name == 'DOORSNEDE.dwg')
  // .filter(({ name }) => name == 'tent-01.dwg')
  // .filter(({ name }) => name == '3d-2.dwg')
  // .filter(({ name }) => name == 'axonometrie.dwg')
  // .filter(({ name }) => name == 'nl_21.dwg')

  //   .filter((_, i) => i >= 21 && i <= 30)

  // console.log(dwgFiles[321])

  for (let i = 0; i < dwgFiles.length; i++) {
    await exportLayers(dwgFiles[i], i, dwgFiles.length)
  }

  const slice = true
  function sampleOrSlice(arr, limit = 500) {
    return slice ? arr.slice(0, limit) : sampleArray(arr, limit)
  }

  filteredGeometries = sampleOrSlice(
    Object.values(geometries)

      // .sort((a, b) => b.dimensions.area - a.dimensions.area)
      .sort((a, b) => b.files.length - a.files.length)
      // .sort((a, b) => b.vertices.length - a.vertices.length)
      .filter(({ files, vertices, dimensions }) => {
        // console.log(
        //   dimensions.convexityRatio,
        //   dimensions.compactness,
        //   Object.values(dimensions).find((dim) => isNaN(dim) || !isFinite(dim))
        // )
        return (
          // files.length >= 2 &&
          vertices.length > 3 &&
          // vertices[0][0] === vertices[vertices.length - 1][0] &&
          // vertices[0][1] === vertices[vertices.length - 1][1] &&
          Object.values(dimensions).find(
            (dim) => isNaN(dim) || !isFinite(dim)
          ) == null
        )
      }),
    500
  )
  // .slice(0, 500)
  console.log('total unique geometries:', Object.keys(geometries).length)
  console.log('used geometries:', filteredGeometries.length)
  console.log(
    'used geometries, occurances',
    filteredGeometries[0].files.length,
    ' - ',
    filteredGeometries[filteredGeometries.length - 1].files.length
  )
  console.log(
    'used geometries, vertice count',
    filteredGeometries[0].vertices.length,
    ' - ',
    filteredGeometries[filteredGeometries.length - 1].vertices.length
  )
  writeFileSync(
    `../output/geometries-temp-${safeFolderName}.json`,
    JSON.stringify(filteredGeometries, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    )
  )
}

const dimensions = zScoreNormalize(
  filteredGeometries.map(({ dimensions }) => {
    return Object.entries(dimensions)
      .filter(([dim]) => dim !== 'area')
      .map(([dim, value]) => (dim === 'area' ? Math.sqrt(value) : value))
  })
)

if (!dimensions) {
  console.log('No geometries or dimensions to process.')
  writeFileSync(
    `../output/geometries-${safeFolderName}.json`,
    JSON.stringify([])
  )
  process.exit(0)
}

const umap = new UMAP({
  nNeighbors: 40, // keep default
  minDist: 0.8, // more space between points
  spread: 16 // allow clusters to grow apart
  // distanceFn: (x, y) => {
  //   // let result = 0.0
  //   // let normX = 0.0
  //   // let normY = 0.0

  //   // for (let i = 0; i < x.length; i++) {
  //   //   result += x[i] * y[i]
  //   //   normX += x[i] ** 2
  //   //   normY += y[i] ** 2
  //   // }

  //   // if (normX === 0 && normY === 0) {
  //   //   return 0
  //   // } else if (normX === 0 || normY === 0) {
  //   //   return 1.0
  //   // } else {
  //   //   return 1.0 - result / Math.sqrt(normX * normY)
  //   //
  //   return function distance(i, j) {
  //     const x = (Math.abs(i - j) / 500) | 0,
  //       y = Math.abs((i % 500) - (j % 500))
  //     return x + y
  //   }
  // }
})

const embedding = await umap.fitAsync(dimensions, () => {
  // console.log(epochNumber)
})

writeFileSync(
  `../output/geometries-${safeFolderName}.json`,
  JSON.stringify(
    filteredGeometries.map((geometry, i) => ({
      ...geometry,
      embedding: embedding[i]
    })),
    (_, v) => (typeof v === 'bigint' ? v.toString() : v)
  )
)

function sampleArray(arr, n) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

async function exportLayers(file, i, length) {
  // const libredwg = await LibreDwg.create('../libredwg/libredwg/')
  const path = join(archive_path, file.path)
  console.log(`\x1b[36m${i}/${length}\x1b[0m`, path)
  const fileContent = readFileSync(path)

  try {
    const db = await readFileWithTimeout(fileContent)

    // const dwg = libredwg.dwg_read_data(fileContent, Dwg_File_Type.DWG)
    // const db = libredwg.convert(dwg)

    function verticeToFixed(vertix) {
      return vertix.map((d) => +d.toFixed(2))
    }

    db.entities
      .map((entity) => {
        switch (entity.type) {
          case 'POLYLINE':
          case 'LWPOLYLINE': {
            const vertices = entity.vertices.map(({ x, y }) =>
              verticeToFixed([x, y])
            )
            const isClosed =
              (entity.flag & (entity.type === 'POLYLINE' ? 1 : 512)) !== 0

            if (isClosed) vertices.push(vertices[0])

            // if (entity.vertices.length > 10) console.log(entity)
            return {
              // entity: entity,
              vertices
            }
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
          case 'CIRCLE':
          case 'ARC':
          case 'POINT':
          case '3DFACE':
          case 'DIMENSION':
          case 'SPLINE':
          case 'ELLIPSE':
          case 'LEADER':
          case 'SOLID':
          case 'HATCH':
            // console.log(entity.type)
            // console.log(entity)
            return

          default:
            console.warn('Unmatched entity type:', entity.type)
        }
      })
      .filter((d) => d != null)
      .forEach((geometry) => {
        const dimensions = extractDimensions(geometry)
        const hash = objectHash(
          Object.fromEntries(
            Object.entries(dimensions)
              .filter(([dimension]) => {
                return true // dimension != 'aspectRatio'
              })
              .map(([dim, value]) => [
                dim,
                // formatFixedSig(value)
                formatFixedSig2(value, dim === 'area' ? 4 : 2)
              ])
          )
        )

        // const hash = objectHash(geometry)
        if (geometries[hash] == null) {
          geometries[hash] = {
            ...geometry,
            first_used: file.birthtime,
            last_used: file.birthtime,
            files: [i],
            dimensions
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
    // console.log(`some success ${path}`)
  } catch (_) {
    console.log(`error reading file ${path}`)
  }
}

function readFileWithTimeout(file, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', { workerData: file })
    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error('Timeout'))
    }, timeoutMs)

    worker.on('message', (result) => {
      clearTimeout(timer)
      resolve(result)
    })
    worker.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
    })
  })
}
