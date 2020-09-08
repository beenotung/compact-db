#!/usr/bin/env ts-node
import { format_byte } from '@beenotung/tslib/format'
let size = 8 * 1024
for (let i = 0; i < 20; i++) {
  console.log('level', i, format_byte(size))
  size += size
}
