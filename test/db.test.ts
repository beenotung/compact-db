import { createDB, DB } from '../src/db'

describe('DB TestSuit', function () {
  const dir = 'data'
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
    for (let i = 0; i < 100; i++) {
      const db1 = createDB({ path: dir })
      const value = Math.random()
      db1.set('num', value)
      const db2 = createDB({ path: dir })
      expect(db2.get('num')).toEqual(value)
    }
  })
})
