#!/usr/bin/env ts-node
import { createDB } from '../src/db'

let db = createDB({ path: 'data' })
console.log(db.entries())
