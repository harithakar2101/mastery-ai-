import path from 'path';
import fs from 'fs';
import { getDb, getDbPath } from '../db/connection.ts';
import {
  userRepository,
  islmRepository,
  eventRepository,
  attemptRepository,
  interventionRepository,
  sessionRepository,
  studyRepository,
  flashcardRepository,
  studyPlanRepository,
  portfolioRepository,
  cohortRepository,
} from '../repositories/index.ts';

export async function backupDatabase(targetDir?: string): Promise<{
  dbBackupPath: string;
  jsonExportPath: string;
  prunedCount: number;
}> {
  const db = getDb();
  const dbPath = getDbPath();
  const backupsDir = targetDir || path.resolve(process.cwd(), 'backups');

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbBackupPath = path.resolve(backupsDir, `cognicse_backup_${timestamp}.db`);
  const jsonExportPath = path.resolve(backupsDir, `cognicse_export_${timestamp}.json`);

  // 1. Online SQLite Backup
  if (dbPath !== ':memory:') {
    await db.backup(dbBackupPath);
    console.log(`[backup] SQLite database successfully backed up to: ${dbBackupPath}`);
  }

  // 2. Full JSON Export dump
  const fullDump = {
    exportedAt: new Date().toISOString(),
    users: userRepository.listPaginated({ limit: 1000 }).items.map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    }),
    islm: islmRepository.listStudents(),
    events: eventRepository.listAllPaginated({ limit: 5000 }).items,
    attempts: attemptRepository.listAll(),
    interventions: interventionRepository.listAllPaginated({ limit: 1000 }).items,
    studies: studyRepository.findAll(),
    cohorts: cohortRepository.findAll(),
  };

  fs.writeFileSync(jsonExportPath, JSON.stringify(fullDump, null, 2), 'utf-8');
  console.log(`[backup] Full JSON dataset exported to: ${jsonExportPath}`);

  // 3. Prune backups older than 7 days
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let prunedCount = 0;

  const existingFiles = fs.readdirSync(backupsDir);
  for (const file of existingFiles) {
    if (file.startsWith('cognicse_backup_') || file.startsWith('cognicse_export_')) {
      const fullPath = path.resolve(backupsDir, file);
      try {
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > SEVEN_DAYS_MS) {
          fs.unlinkSync(fullPath);
          prunedCount++;
        }
      } catch {
        // ignore
      }
    }
  }

  if (prunedCount > 0) {
    console.log(`[backup] Pruned ${prunedCount} backups older than 7 days.`);
  }

  return {
    dbBackupPath,
    jsonExportPath,
    prunedCount,
  };
}

// Allow direct execution: tsx server/scripts/backupDatabase.ts
if (process.argv[1] && process.argv[1].includes('backupDatabase')) {
  backupDatabase()
    .then(res => {
      console.log('Database backup completed successfully:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('Database backup failed:', err);
      process.exit(1);
    });
}
