import { statSync } from 'node:fs'

function fileSize(entry) {
  return stat(entry).size //* 0.000001
}

function birthtime(entry) {
  return stat(entry).birthtimeMs
}

function stat({ path }) {
  return statSync(path)
}

function times(entry) {
  return {
    ctime: new Date(stat(entry).ctimeMs),
    atime: new Date(stat(entry).atimeMs),
    mtime: new Date(stat(entry).mtimeMs),
    birthtime: new Date(stat(entry).birthtimeMs)
  }
}

export { fileSize, stat, birthtime, times }
