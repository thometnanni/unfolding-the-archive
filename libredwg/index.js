import { Dwg_File_Type, LibreDwg } from './libredwg/libredwg-web.js'

import { readFileSync, writeFileSync } from 'node:fs'
const libredwg = await LibreDwg.create('./libredwg/')

const fileContent = readFileSync('test.dwg')
const dwg = libredwg.dwg_read_data(fileContent, Dwg_File_Type.DWG)

const db = libredwg.convert(dwg)
const json = JSON.stringify(
  db,
  (_, v) => (typeof v === 'bigint' ? v.toString() : v),
  2
)

writeFileSync('out.json', json)

// Affter conversion, 'dwg' isn't needed any more. So you can call
// function 'dwg_free' to free its memory.
libredwg.dwg_free(db)
