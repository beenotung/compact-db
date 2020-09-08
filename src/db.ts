import { iterateFileByLine } from '@beenotung/tslib/fs'
import { MB } from '@beenotung/tslib/size'
import fs from 'fs'
import path from 'path'

export const config = {
  batch_read_size: 8 * MB,
}
export type Key = string | number
export type DB = ReturnType<typeof createDB>
type FileCache = {
  file: string
  size: number
}
type Cache = Record<Key, string>

/**
 * files:
 *    DATA.dat (file1)
 *    LOG.dat (file2)
 *    TMP.dat (file3)
 */
export function createDB(options: {
  path: string
  onError?: (err: any) => void
}) {
  const dir = options.path
  fs.mkdirSync(dir, { recursive: true })

  let cache: Cache = {}

  function loadCacheFromFile(file: string): FileCache {
    let size = 0
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '')
    } else {
      for (const line of iterateFileByLine(file, {
        batchSize: config.batch_read_size,
      })) {
        size += line.length + 1 // +1 for line feed
        // console.log('load', {line})
        if (line.startsWith('s|')) {
          const [key, json] = JSON.parse(line.substr(2))
          const value = JSON.stringify(json)
          cache[key] = value
        } else if (line.startsWith('d|')) {
          const key = JSON.parse(line.substr(2))
          delete cache[key]
        } else if (line.startsWith('c|')) {
          cache = {}
        } else {
          console.warn('skip corrupted entry', { file, line })
        }
      }
    }
    return { file, size }
  }

  const dataFile: FileCache = loadCacheFromFile(path.join(dir, 'DATA.dat'))
  const logFile: FileCache = loadCacheFromFile(path.join(dir, 'LOG.dat'))
  const tmpFile = path.join(dir, 'TMP.dat')

  function compact() {
    let size = 0
    fs.writeFileSync(tmpFile, '')
    Object.entries(cache).forEach(([key, json]) => {
      const value = JSON.parse(json)
      const data = [key, value]
      const line = 's|' + JSON.stringify(data) + '\n'
      size += line.length
      fs.appendFileSync(tmpFile, line)
    })
    fs.unlinkSync(logFile.file)
    logFile.size = 0
    fs.renameSync(tmpFile, dataFile.file)
    dataFile.size = size
    fs.writeFileSync(logFile.file, '')
  }

  function checkCompact() {
    if (logFile.size <= dataFile.size) {
      return
    }
    compact()
  }

  function appendMode(mode: string) {
    const line = mode + '|' + '\n'
    logFile.size += line.length
    fs.appendFileSync(logFile.file, line)
  }

  function appendData(mode: string, data: any) {
    const line = mode + '|' + JSON.stringify(data) + '\n'
    logFile.size += line.length
    fs.appendFileSync(logFile.file, line)
  }

  function del(key: Key) {
    appendData('d', key)
    delete cache[key]
  }

  function set(key: Key, value: any) {
    const json = JSON.stringify(value)
    if (cache[key] === json) {
      return
    }
    appendData('s', [key, value])
    cache[key] = json
    checkCompact()
  }

  function get<T>(key: Key): T | undefined {
    if (key in cache) {
      return JSON.parse(cache[key])
    }
    return undefined
  }

  function clear() {
    cache = {}
    appendMode('c')
    checkCompact()
  }

  return { get, set, del, clear }
}
