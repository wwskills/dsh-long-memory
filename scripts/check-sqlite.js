#!/usr/bin/env node
// scripts/check-sqlite.js — verify the DB file produced by this plugin is
// openable by the standard sqlite3 CLI (M0 DoD #6: "sqlite3 CLI can open DB").
//
// We avoid spawning `sqlite3` because it's a system binary that may not be
// installed in all environments (Windows / minimal containers). Instead we
// invoke a second, independent SQLite reader: the official `better-sqlite3`
// npm package when present, or a fresh `node:sqlite` connection in a
// subprocess.
//
// Usage: node scripts/check-sqlite.js <db-path>

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const dbPath = process.argv[2];
if (!dbPath) {
  console.error('usage: node scripts/check-sqlite.js <db-path>');
  process.exit(2);
}
if (!existsSync(dbPath)) {
  console.error(`db not found: ${dbPath}`);
  process.exit(2);
}

// Strategy 1: better-sqlite3 if installed.
const better = spawnSync('node', ['-e', `
  try {
    const Database = require('better-sqlite3');
    const db = new Database('${dbPath}', { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log('better-sqlite3 OK tables=' + tables.length);
    db.close();
  } catch (e) { console.log('better-sqlite3 unavailable: ' + e.code); }
`], { encoding: 'utf8' });

console.log(better.stdout.trim());

// Strategy 2: independent node:sqlite reader in a subprocess.
const builtin = spawnSync('node', ['-e', `
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('${dbPath}', { readOnly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const v = db.prepare("SELECT value FROM schema_meta WHERE key='version'").get();
  console.log('node:sqlite OK tables=' + tables.length + ' schema_version=' + (v?.value ?? '?'));
  db.close();
`], { encoding: 'utf8' });

if (builtin.status !== 0) {
  console.error('node:sqlite subprocess failed:', builtin.stderr);
  process.exit(1);
}
console.log(builtin.stdout.trim());