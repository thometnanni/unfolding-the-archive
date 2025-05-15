import { readdirSync, writeFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { ignore_files } from './config.js'
import { dateFromName } from './helper/dates.js'
import { removeNull } from './helper/clean.js'
import { fileSize } from './helper/stat.js'

const archive_path = normalize('../data')
const output_path = normalize('../output')

function read_directory(path = '') {
  const entries = readdirSync(join(archive_path, path), {
    withFileTypes: true
  })
    .filter(({ name }) => !ignore_files.includes(name))
    .map((entry) => ({
      name: entry.name,
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
    path: normalize(entry.path.replace(archive_path, '.'))
  }))
  .map(removeNull)

writeFileSync(
  join(output_path, 'file-structure.json'),
  JSON.stringify(archive, null, 2),
  'utf8'
)
console.log(
  `exported structured data for ${archive.length} files and directories`
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
  file.extension = file.name.match(/.([^.]+)$/)[1].toLowerCase()
  file.fileSize = fileSize(file)
  file.dateFromName = dateFromName(file)

  return file
}
