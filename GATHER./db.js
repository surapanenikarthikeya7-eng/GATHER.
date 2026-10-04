import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const configuredPath = process.env.DATABASE_PATH || path.join('database', 'recipe_platform.sqlite');
const databasePath = path.isAbsolute(configuredPath) ? configuredPath : path.resolve(projectRoot, configuredPath);

if (databasePath !== ':memory:') {
  mkdirSync(path.dirname(databasePath), { recursive: true });
}

const database = new DatabaseSync(databasePath);
database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
database.exec(readFileSync(path.join(projectRoot, 'database', 'schema.sql'), 'utf8'));

function execute(sql, params = []) {
  const statement = database.prepare(sql);
  if (/^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql) || /\bRETURNING\b/i.test(sql)) {
    return [statement.all(...params)];
  }
  const result = statement.run(...params);
  return [{
    insertId: Number(result.lastInsertRowid),
    affectedRows: result.changes
  }];
}

const connection = {
  execute,
  query: execute,
  beginTransaction() {
    database.exec('BEGIN IMMEDIATE');
  },
  commit() {
    database.exec('COMMIT');
  },
  rollback() {
    database.exec('ROLLBACK');
  },
  release() {}
};

const pool = {
  ...connection,
  getConnection() {
    return connection;
  },
  end() {
    database.close();
  }
};

export default pool;
