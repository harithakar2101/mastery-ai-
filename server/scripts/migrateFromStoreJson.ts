import fs from 'fs';
import path from 'path';
import { runMigrations } from '../db/migrations.ts';
import {
  userRepository,
  islmRepository,
  dkmStateRepository,
  eventRepository,
  attemptRepository,
  interventionRepository,
  sessionRepository,
  studyRepository,
  cohortRepository,
} from '../repositories/index.ts';
import { getDemoStore } from '../store.ts';

export async function migrateFromStoreJson(filePath?: string): Promise<{
  migrated: boolean;
  users: number;
  islm: number;
  events: number;
  attempts: number;
  interventions: number;
  sessions: number;
  studies: number;
  cohorts: number;
}> {
  // Ensure schema migrations are up to date
  runMigrations();

  const candidates = [
    filePath,
    path.resolve(process.cwd(), 'data', 'store.json'),
    path.resolve(process.cwd(), 'server', 'store.json'),
    path.resolve(process.cwd(), 'store.json'),
  ].filter(Boolean) as string[];

  let targetPath: string | null = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      targetPath = c;
      break;
    }
  }

  let sourceData: any = null;
  if (targetPath) {
    try {
      const raw = fs.readFileSync(targetPath, 'utf-8');
      sourceData = JSON.parse(raw);
      console.log(`[migration] Found JSON store at: ${targetPath}`);
    } catch (err) {
      console.warn(`[migration] Failed to parse ${targetPath}, falling back to demo template:`, err);
    }
  }

  if (!sourceData) {
    console.log('[migration] No existing store.json found; initializing from demo template.');
    sourceData = getDemoStore();
  }

  let usersCount = 0;
  let islmCount = 0;
  let eventsCount = 0;
  let attemptsCount = 0;
  let interventionsCount = 0;
  let sessionsCount = 0;
  let studiesCount = 0;
  let cohortsCount = 0;

  // 1. Users
  if (Array.isArray(sourceData.users)) {
    for (const u of sourceData.users) {
      const existing = userRepository.findById(u.id);
      if (!existing) {
        userRepository.create(u);
        usersCount++;
      }
    }
  }

  // 2. ISLM
  if (Array.isArray(sourceData.islm)) {
    for (const i of sourceData.islm) {
      islmRepository.upsert(i);
      islmCount++;
    }
  }

  // 3. DKM States
  if (sourceData.dkmStates && typeof sourceData.dkmStates === 'object') {
    for (const [studentId, nodes] of Object.entries(sourceData.dkmStates)) {
      if (Array.isArray(nodes)) {
        dkmStateRepository.upsert(studentId, nodes);
      }
    }
  }

  // 4. Events
  if (Array.isArray(sourceData.events)) {
    for (const e of sourceData.events) {
      const existing = eventRepository.findById(e.id);
      if (!existing) {
        eventRepository.append({
          id: e.id,
          studentId: e.studentId || e.student_id,
          type: e.type,
          conceptId: e.conceptId || e.concept_id,
          topicId: e.topicId || e.topic_id,
          payload: e.payload,
          synthetic: Boolean(e.synthetic),
          ts: e.ts || e.timestamp,
        });
        eventsCount++;
      }
    }
  }

  // 5. Attempts
  if (Array.isArray(sourceData.attempts)) {
    for (const a of sourceData.attempts) {
      const existing = attemptRepository.findById(a.id);
      if (!existing) {
        attemptRepository.create(a);
        attemptsCount++;
      }
    }
  }

  // 6. Interventions
  if (Array.isArray(sourceData.interventions)) {
    for (const i of sourceData.interventions) {
      const existing = interventionRepository.findById(i.id);
      if (!existing) {
        interventionRepository.create(i);
        interventionsCount++;
      }
    }
  }

  // 7. Sessions
  if (Array.isArray(sourceData.sessions)) {
    for (const s of sourceData.sessions) {
      sessionRepository.upsert(s);
      sessionsCount++;
    }
  }

  // 8. Studies
  if (Array.isArray(sourceData.studies) || Array.isArray(sourceData.studyDefinitions)) {
    const studiesList = sourceData.studyDefinitions || sourceData.studies;
    for (const s of studiesList) {
      const existing = studyRepository.findById(s.id);
      if (!existing) {
        studyRepository.create({
          id: s.id,
          title: s.title,
          topicId: s.topicId || s.topic_id || 'general',
          topicName: s.topicName || s.topic_name || s.title,
          description: s.description,
          status: s.status,
          arms: s.arms,
          items: s.items,
          masteryThreshold: s.masteryThreshold,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        });
        studiesCount++;
      }
    }
  }

  // 9. Cohorts
  if (Array.isArray(sourceData.cohorts)) {
    for (const c of sourceData.cohorts) {
      cohortRepository.upsert(c);
      cohortsCount++;
    }
  }

  console.log(`[migration] Migration complete. Users: ${usersCount}, ISLM: ${islmCount}, Events: ${eventsCount}`);

  return {
    migrated: true,
    users: usersCount,
    islm: islmCount,
    events: eventsCount,
    attempts: attemptsCount,
    interventions: interventionsCount,
    sessions: sessionsCount,
    studies: studiesCount,
    cohorts: cohortsCount,
  };
}

// Allow direct execution: tsx server/scripts/migrateFromStoreJson.ts
if (process.argv[1] && process.argv[1].includes('migrateFromStoreJson')) {
  migrateFromStoreJson()
    .then(res => {
      console.log('Migration finished successfully:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
