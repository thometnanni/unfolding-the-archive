import { readdirSync, writeFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { ignore_files, file_types } from './config.js'
import { dateFromName } from './helper/dates.js'
import { removeNull } from './helper/clean.js'
import { fileSize, birthtime } from './helper/stat.js'

function getArgValue(flag, fallback) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback
}

const folderName = getArgValue('--folder', 'TP 255 Serpentine Gallery Pavilion')
const archive_path = normalize(`../data/${folderName}`)
const output_path = normalize('../output')

function read_directory(path) {
  path = path ?? archive_path
  const entries = readdirSync(path, {
    withFileTypes: true
  })
    .filter(({ name }) => !ignore_files.includes(name))
    .map((entry) => ({
      name: entry.name,
      parent: entry.parentPath,
      path: join(entry.parentPath, entry.name),
      [getTypeKey(entry)]: true
    }))

  const directories = entries
    .filter(({ isDirectory }) => isDirectory)
    .map(handleDirectories)
  const children = directories.map(({ path }) => read_directory(path)).flat()

  const files = entries.filter(({ isFile }) => isFile).map(handleFiles)

  return [...directories, ...files, ...children]
}

const archive = read_directory()
  .sort((a, b) => {
    const normA = a.path.replace(/\//g, '\u0000')
    const normB = b.path.replace(/\//g, '\u0000')
    if (normA > normB) return 1
    if (normB > normA) return -1
    return 0
  })
  .map((entry) => ({
    ...entry,
    path: normalize(entry.path.replace(archive_path, '.')),
    parent: normalize(entry.parent.replace(archive_path, '.'))
  }))
  .map(removeNull)

const safeFolderName = folderName.replace(/[^a-z0-9_\-]/gi, '_')
const outputFile = join(output_path, `file-structure-${safeFolderName}.json`)

writeFileSync(
  outputFile,
  JSON.stringify(archive, null, 2),
  'utf8'
)
console.log(
  `exported structured data for ${archive.length} files and directories to ${outputFile}`
)

function getTypeKey(entry) {
  if (entry.isDirectory()) return 'isDirectory'
  if (entry.isFile()) return 'isFile'
  return 'isOther'
}

function handleDirectories(directory) {
  return directory
}

function handleFiles(file) {
  file.extension = file.name.match(/.([^.]+)$/)?.[1].toLowerCase()
  file.fileSize = fileSize(file)
  file.birthtime = birthtime(file)
  file.dateFromName = dateFromName(file)
  file.type = file_types[file.extension]

  return file
}