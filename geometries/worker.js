// worker.js
import { parentPort, workerData } from 'node:worker_threads'
import { Dwg_File_Type, LibreDwg } from '../libredwg/libredwg/libredwg-web.js'
;(async () => {
  const libredwg = await LibreDwg.create('../libredwg/libredwg/')
  const dwg = libredwg.dwg_read_data(workerData, Dwg_File_Type.DWG)
  const db = libredwg.convert(dwg)
  libredwg.dwg_free(db)
  // const result = libredwg.wasmInstance.dwg_read_file(workerData)
  parentPort.postMessage(db)
})()
