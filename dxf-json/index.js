import DxfParser from 'dxf-json'
import { readFileSync, writeFileSync } from 'node:fs'

const file = readFileSync('test.dxf', 'utf-8')

const parser = new DxfParser()

const parsed = parser.parseSync(file)

writeFileSync('out.json', stringify(parsed))

function stringify(obj) {
  let cache = []
  let str = JSON.stringify(
    obj,
    function (key, value) {
      if (typeof value === 'object' && value !== null) {
        if (cache.indexOf(value) !== -1) {
          // Circular reference found, discard key
          return
        }
        // Store value in our collection
        cache.push(value)
      }
      return value
    },
    2
  )
  cache = null // reset the cache
  return str
}
