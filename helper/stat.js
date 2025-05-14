import { statSync } from 'node:fs'

function fileSize(entry) {
  return stat(entry).size //* 0.000001
}

function stat({ path }) {
  return statSync(path)
}

export { fileSize, stat }
