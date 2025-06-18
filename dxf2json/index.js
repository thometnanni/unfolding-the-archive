import DxfParser from 'dxf-parser'
import { readFileSync, writeFileSync } from 'node:fs'

const file = readFileSync('181004_east elevation.dxf', 'utf-8')

const parsed = new DxfParser().parseSync(file)

writeFileSync('out.json', JSON.stringify(parsed, null, 2))
