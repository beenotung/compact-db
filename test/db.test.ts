import fs from 'fs'
import { createDB, DB } from '../src/db'

describe('DB TestSuit', function () {
  const dir = 'data'
  if (fs.existsSync(dir)) {
    // fs.rmdirSync(dir, { recursive: true })
  }
  const db: DB = createDB({ path: dir })
  it('should set and get values', function () {
    db.set('num', 42)
    db.set('str', 'Hello world')
    db.set('escaped string', `I'm good`)
    db.set('user', { name: 'Alice', age: 20 })

    expect(db.get('num')).toEqual(42)
    expect(db.get('str')).toEqual('Hello world')
    expect(db.get('escaped string')).toEqual(`I'm good`)
    expect(db.get('user')).toEqual({ name: 'Alice', age: 20 })
  })
  it('should delete values', function () {
    db.set('num', 42)
    expect(db.get('num')).toEqual(42)
    db.del('num')
    expect(db.get('num')).toBeUndefined()
  })
  it('should clear all values', function () {
    db.set(1, 1)
    db.set(2, 2)
    db.clear()
    expect(db.get(1)).toBeUndefined()
    expect(db.get(2)).toBeUndefined()
  })
  it('should load data of previous session', function () {
    for (let i = 0; i < 12; i++) {
      const db1 = createDB({ path: dir })
      const value = Math.random()
      db1.set('num', value)
      const db2 = createDB({ path: dir })
      expect(db2.get('num')).toEqual(value)
    }
  })
  it('should support batch update', function () {
    db.batch([
      { type: 'set', key: 1, value: 1 },
      { type: 'set', key: 2, value: 2 },
      { type: 'clear' },
      { type: 'set', key: 3, value: 3 },
      { type: 'set', key: 4, value: 4 },
      { type: 'del', key: 4 },
    ])
    expect(db.get(1)).toBeUndefined()
    expect(db.get(2)).toBeUndefined()
    expect(db.get(3)).toEqual(3)
    expect(db.get(4)).toBeUndefined()
  })
  it('should get all keys', function () {
    db.clear()
    db.set('a', 1)
    db.set('b', 1)
    db.set('c', 1)
    expect(db.keys()).toEqual(['a', 'b', 'c'])
  })
  it('should get all entries', function () {
    db.clear()
    db.set('a', 1)
    db.set('b', 2)
    db.set('c', 3)
    expect(db.entries()).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
  })
  it('should get all values', function () {
    db.clear()
    db.set('a', 1)
    db.set('b', 2)
    db.set('c', 3)
    expect(db.values()).toEqual([1, 2, 3])
  })
})
