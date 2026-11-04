import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Database.Database | null = null;
let currentDbPath: string | null = null;

export function getDbPath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const targetDb = path.resolve(dataDir, 'mastery.db');
  const legacyDb = path.resolve(dataDir, 'cognicse.db');
  if (!fs.existsSync(targetDb) && fs.existsSync(legacyDb)) {
    fs.copyFileSync(legacyDb, targetDb);
    try {
      const db = new Database(targetDb);
      db.prepare(`UPDATE users SET email = REPLACE(email, '@cognicse.edu', '@mastery.ai') WHERE email LIKE '%@cognicse.edu'`).run();
      db.close();
    } catch {
      // ignore
    }
  }
  return targetDb;
}

export function initDb(targetPath?: string): Database.Database {
  const chosenPath = targetPath || getDbPath();

  if (dbInstance && currentDbPath === chosenPath) {
    return dbInstance;
  }

  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore close error
    }
  }

  if (chosenPath !== ':memory:') {
    const dir = path.dirname(chosenPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(chosenPath);

  // WAL mode for high concurrency without blocking reads and writes
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 10000');
  db.pragma('synchronous = NORMAL');

  dbInstance = db;
  currentDbPath = chosenPath;

  return db;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore
    }
    dbInstance = null;
    currentDbPath = null;
  }
}
