# compact-db

A lightweight embedded database inspired from leveldb but operate in sync mode.

[![npm Package Version](https://img.shields.io/npm/v/compact-db.svg?maxAge=2592000)](https://www.npmjs.com/package/compact-db)

## Why compact-db?
To free your code from callback hell and async await.

## What is it not good for?
If your application need to serve for multiple users / concurrent tasks, and you favour average "concurrent performance" over "raw throughput", you may better adopt leveldb or other asynchronous database.

## Features
- [x] sync mode operation
- [x] fully tested (with jest)
- [x] efficient disk space consumption (with auto compaction)
- [x] support atomic, batched operations
- [x] fault tolerant to program crash
- [x] simple interface (similar to Map)
- [x] small code base (~250 loc)

## Usage

Import and create database instance:
```typescript
import { createDB } from 'compact-db'

let db = createDB({ path: 'data' })
```

Database options and supported methods (from dist/db.d.ts):
```typescript
export type Key = string | number

export declare function createDB(options: {
  path: string

  // default 8 MB
  batch_read_size?: number

  // default 2 (compact will occur when the file size of LOG file is twice as DATA file)
  compact_ratio?: number   
}): {
  get: <T>(key: Key) => T | undefined;
  set: (key: Key, value: any) => void;
  del: (key: Key) => void;
  clear: () => void;
  batch: (batch: Batch) => void;
  keys: () => string[];
  entries: () => any[][];
  values: () => any[];
};
```

Type signature of batch operations:
```typescript
export declare type Batch = Op[];
export declare type Op = {
  type: 'del';
  key: Key;
} | {
  type: 'set';
  key: Key;
  value: any;
} | {
  type: 'clear';
};
```

Details refer to the [test spec](./test/db.test.ts)

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
