import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { ignore_files } from './config.js'

const archive_path = normalize('../data')

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
  .sort((a, b) => (a.path > b.path ? 1 : b.path > a.path ? -1 : 0))
  .map((entry) => ({
    ...entry,
    path: normalize(entry.path.replace(archive_path, '.'))
  }))

writeFileSync('archive.json', JSON.stringify(archive, null, 2), 'utf8')
console.log(
  `exported structured data for ${archive.length} files and directories`
)

function getTypeKey(entry) {
  if (entry.isDirectory()) return 'isDirectory'
  if (entry.isFile()) return 'isFile'
  return 'isOther'
}

function handleDirectories(directory) {
  directory.stat = statSync(directory.path)

  return directory
}

function handleFiles(file) {
  file.extension = file.name.match(/.([^.]+)$/)[1]
  file.stat = statSync(file.path)
  return file
}
