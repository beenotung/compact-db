import { format_time_duration } from '@beenotung/tslib/format'
import { Random } from '@beenotung/tslib/random'
import { createDB } from '../src/db'

const db = createDB({ path: 'data' })
db.clear()
let n = 0

function create(key: number) {
  db.set(key, 1)
}

function update(key: number) {
  let count = db.get<number>(key) || 0
  count++
  db.set(key, count)
}

let tick = 0

function loop() {
  tick++
  if (n === 0 || Math.random() > 0.9) {
    n++
    create(n - 1)
  } else {
    update(Random.nextInt(n))
  }
}

const start = Date.now()

function report() {
  const now = Date.now()
  const passed = now - start
  console.log(
    `tick=${tick.toLocaleString()}, n=${n.toLocaleString()}, passed=${format_time_duration(
      passed,
    )}, TPS=${(tick / (passed / 1000)).toLocaleString()}`,
  )
}

const batch = 200
for (;;) {
  report()
  for (let i = 0; i < batch; i++) {
    loop()
  }
}
