import { iterateFileByLine } from '@beenotung/tslib/fs'
import { MB } from '@beenotung/tslib/size'
import fs from 'fs'
import path from 'path'

const defaultConfig = {
  batch_read_size: 8 * MB,
  compact_ratio: 2, // LOG_FILE.size divides DATA_FILE.size
}
export type Key = string | number
export type DB = ReturnType<typeof createDB>

type Cache = Record<Key, string>
export type Op =
  | {
      type: 'del'
      key: Key
    }
  | {
      type: 'set'
      key: Key
      value: any
    }
  | { type: 'clear' }
export type Batch = Op[]
type BatchLine = ['c'] | ['s', Key, any] | ['d', Key]

/**
 * files:
 *    DATA.dat (file1)
 *    LOG.dat (file2)
 *    TMP.dat (file3)
 */
export function createDB(
  options: {
    path: string
  } & Partial<typeof defaultConfig>,
) {
  const config = Object.assign({}, defaultConfig, options)
  const dir = options.path
  fs.mkdirSync(dir, { recursive: true })

  let cache: Cache = {}

  function loadCacheFromFile(file: string): { size: number } {
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
          continue
        }
        if (line.startsWith('d|')) {
          const key = JSON.parse(line.substr(2))
          delete cache[key]
          continue
        }
        if (line.startsWith('c|')) {
          cache = {}
          continue
        }
        if (line.startsWith('b|')) {
          const lines: BatchLine = JSON.parse(line.substr(2))
          for (const line of lines) {
            switch (line[0]) {
              case 'c':
                cache = {}
                break
              case 's': {
                const key = line[1]
                const value = line[2]
                const json = JSON.stringify(value)
                cache[key] = json
                break
              }
              case 'd': {
                const key = line[1]
                delete cache[key]
                break
              }
              default:
                console.error('invalid batch line:', line)
                throw new Error('invalid batch line')
            }
          }
          continue
        }
        console.warn('skip corrupted entry', { file, line })
      }
    }
    return { size }
  }

  const dataFile = path.join(dir, 'DATA.dat')
  const logFile = path.join(dir, 'LOG.dat')
  const tmpFile = path.join(dir, 'TMP.dat')

  function restore() {
    const tmpFileExist = fs.existsSync(tmpFile)
    const logFileExist = fs.existsSync(logFile)
    if (!tmpFileExist) {
      // normal
    }
    if (tmpFileExist && logFileExist) {
      // in the middle of compact (writing to tmpFile)
      fs.unlinkSync(tmpFile)
    }
    if (tmpFileExist && !logFileExist) {
      // in the middle of compact (renaming tmpFile to dataFile)
      fs.renameSync(tmpFile, dataFile)
      fs.writeFileSync(logFile, '')
    }
    const dataFileSize = loadCacheFromFile(dataFile).size
    const logFileSize = loadCacheFromFile(logFile).size
    return { dataFileSize, logFileSize }
  }

  let { dataFileSize, logFileSize } = restore()

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
    fs.unlinkSync(logFile)
    logFileSize = 0
    fs.renameSync(tmpFile, dataFile)
    dataFileSize = size
    fs.writeFileSync(logFile, '')
  }

  function checkCompact() {
    if (logFileSize <= dataFileSize * config.compact_ratio) {
      return
    }
    compact()
  }

  function appendMode(mode: string) {
    const line = mode + '|' + '\n'
    logFileSize += line.length
    fs.appendFileSync(logFile, line)
  }

  function appendData(mode: string, data: any) {
    const line = mode + '|' + JSON.stringify(data) + '\n'
    logFileSize += line.length
    fs.appendFileSync(logFile, line)
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

  function batch(batch: Batch) {
    const lines: BatchLine[] = []
    for (const op of batch) {
      let line: BatchLine
      switch (op.type) {
        case 'clear':
          line = ['c']
          break
        case 'set':
          line = ['s', op.key, op.value]
          break
        case 'del':
          line = ['d', op.key]
          break
        default:
          console.error('invalid op:', op)
          throw new Error('invalid op')
      }
      lines.push(line)
    }
    appendData('b', lines)
    for (const op of batch) {
      switch (op.type) {
        case 'clear':
          cache = {}
          break
        case 'del':
          delete cache[op.key]
          break
        case 'set':
          cache[op.key] = JSON.stringify(op.value)
          break
        default:
          console.error('invalid op:', op)
          throw new Error('invalid op')
      }
    }
    // checkCompact()
  }

  function clear() {
    cache = {}
    appendMode('c')
    checkCompact()
  }

  function keys() {
    return Object.keys(cache)
  }

  function entries() {
    return Object.entries(cache).map(([key, json]) => [key, JSON.parse(json)])
  }

  function values() {
    return Object.values(cache).map(json => JSON.parse(json))
  }

  return {
    get,
    set,
    del,
    clear,
    batch,
    keys,
    entries,
    values,
  }
}
