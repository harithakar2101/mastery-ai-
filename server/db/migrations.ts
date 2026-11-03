import Database from 'better-sqlite3';
import { getDb } from './connection.ts';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: '001_initial_core_schema',
    up: (db: Database.Database) => {
      // 1. Users table
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL DEFAULT 'student',
          plan TEXT NOT NULL DEFAULT 'Free Plan',
          degree TEXT,
          preferred_languages TEXT DEFAULT '[]',
          streak_days INTEGER DEFAULT 1,
          tests_completed INTEGER DEFAULT 0,
          overall_mastery REAL DEFAULT 0.50,
          theme TEXT DEFAULT 'dark',
          password_hash TEXT,
          token_version INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synthetic INTEGER DEFAULT 0
        );
      `);

      // 2. ISLM (Individual Student Learning Model)
      db.exec(`
        CREATE TABLE IF NOT EXISTS islm (
          student_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'student',
          course_track TEXT NOT NULL,
          overall_mastery REAL DEFAULT 0.50,
          topic_mastery TEXT DEFAULT '{}',
          recent_misconceptions TEXT DEFAULT '[]',
          scaffolding_tier_required INTEGER DEFAULT 1,
          error_count INTEGER DEFAULT 0,
          independent_solves INTEGER DEFAULT 0,
          scaffolding_fading_index REAL DEFAULT 0.20,
          time_spent_mins INTEGER DEFAULT 0,
          history TEXT DEFAULT '[]',
          updated_at TEXT NOT NULL,
          synthetic INTEGER DEFAULT 0,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 3. DKM States (Domain Knowledge Map graph per student)
      db.exec(`
        CREATE TABLE IF NOT EXISTS dkm_states (
          student_id TEXT PRIMARY KEY,
          nodes_json TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 4. Events (Append-only pedagogical event bus)
      db.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          type TEXT NOT NULL,
          concept_id TEXT,
          topic_id TEXT,
          payload TEXT DEFAULT '{}',
          synthetic INTEGER DEFAULT 0,
          ts TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      // 5. Attempts (Student code sandbox & lab evaluations)
      db.exec(`
        CREATE TABLE IF NOT EXISTS attempts (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          concept_id TEXT,
          kind TEXT DEFAULT 'code_lab',
          passed INTEGER DEFAULT 0,
          tier_used INTEGER DEFAULT 1,
          hints_requested INTEGER DEFAULT 0,
          duration_sec INTEGER DEFAULT 0,
          error_category TEXT,
          repeated_error INTEGER DEFAULT 0,
          code_snippet TEXT,
          language TEXT,
          details TEXT,
          ts TEXT NOT NULL,
          created_at TEXT NOT NULL,
          synthetic INTEGER DEFAULT 0
        );
      `);

      // 6. Interventions (Socratic tutor & teacher approved interventions)
      db.exec(`
        CREATE TABLE IF NOT EXISTS interventions (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          student_name TEXT,
          concept_id TEXT,
          tier INTEGER DEFAULT 1,
          issue_type TEXT DEFAULT 'CONCEPTUAL_GAP',
          refusal_reason TEXT,
          tutor_message TEXT,
          socratic_question TEXT,
          status TEXT DEFAULT 'suggested',
          outcome TEXT DEFAULT 'pending',
          approved_at TEXT,
          outcome_recorded_at TEXT,
          ts TEXT NOT NULL,
          created_at TEXT NOT NULL,
          synthetic INTEGER DEFAULT 0
        );
      `);

      // 7. Sessions (Chat sessions & interaction histories)
      db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          title TEXT NOT NULL,
          messages_json TEXT NOT NULL DEFAULT '[]',
          ts TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 8. Studies (Empirical comparison study definitions & arms)
      db.exec(`
        CREATE TABLE IF NOT EXISTS studies (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          topic_id TEXT NOT NULL,
          topic_name TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'draft',
          arms_json TEXT NOT NULL DEFAULT '[]',
          items_json TEXT NOT NULL DEFAULT '[]',
          mastery_threshold REAL DEFAULT 90,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 9. Flashcards (SM-2 spaced repetition review cards)
      db.exec(`
        CREATE TABLE IF NOT EXISTS flashcards (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          concept_id TEXT NOT NULL,
          concept_name TEXT NOT NULL,
          track TEXT NOT NULL,
          leitner_box INTEGER DEFAULT 1,
          ease_factor REAL DEFAULT 2.5,
          interval_days INTEGER DEFAULT 1,
          repetitions INTEGER DEFAULT 0,
          due_date TEXT NOT NULL,
          last_reviewed TEXT,
          card_json TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 10. Study Plans (Personalized pacing, syllabus schedules & milestones)
      db.exec(`
        CREATE TABLE IF NOT EXISTS study_plans (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          goals_json TEXT NOT NULL DEFAULT '[]',
          schedule_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 11. Portfolio (Verified coding artifacts, lab completion credentials & certifications)
      db.exec(`
        CREATE TABLE IF NOT EXISTS portfolio (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          artifact_type TEXT NOT NULL,
          title TEXT NOT NULL,
          content_json TEXT NOT NULL,
          verified INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 12. Cohorts (Curriculum groups & department sections)
      db.exec(`
        CREATE TABLE IF NOT EXISTS cohorts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          students_count INTEGER DEFAULT 0,
          average_mastery REAL DEFAULT 0.50,
          active_interventions INTEGER DEFAULT 0,
          track TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    name: '002_performance_indexes',
    up: (db: Database.Database) => {
      // Append-only events indexes strictly required for high-throughput queries
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_events_student_ts ON events(student_id, ts);
        CREATE INDEX IF NOT EXISTS idx_events_concept_ts ON events(concept_id, ts);
        CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
        CREATE INDEX IF NOT EXISTS idx_events_synthetic ON events(synthetic);

        CREATE INDEX IF NOT EXISTS idx_attempts_student_ts ON attempts(student_id, ts);
        CREATE INDEX IF NOT EXISTS idx_attempts_concept ON attempts(concept_id);
        CREATE INDEX IF NOT EXISTS idx_attempts_synthetic ON attempts(synthetic);

        CREATE INDEX IF NOT EXISTS idx_interventions_student ON interventions(student_id, ts);
        CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
        CREATE INDEX IF NOT EXISTS idx_interventions_synthetic ON interventions(synthetic);

        CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions(student_id, ts);
        CREATE INDEX IF NOT EXISTS idx_flashcards_student_due ON flashcards(student_id, due_date);
        CREATE INDEX IF NOT EXISTS idx_study_plans_student ON study_plans(student_id);
        CREATE INDEX IF NOT EXISTS idx_portfolio_student ON portfolio(student_id);
      `);
    },
  },
  {
    version: 3,
    name: 'study_studio_support',
    up: (db: Database.Database) => {
      const cols = db.prepare("PRAGMA table_info(study_plans)").all() as Array<{ name: string }>;
      const hasMeta = cols.some(c => c.name === 'meta_json');
      if (!hasMeta) {
        db.exec("ALTER TABLE study_plans ADD COLUMN meta_json TEXT DEFAULT '{}'");
      }
    },
  },
  {
    version: 4,
    name: '004_rendered_videos_table',
    up: (db: Database.Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS rendered_videos (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          title TEXT NOT NULL,
          concept_id TEXT,
          topic TEXT NOT NULL,
          duration_seconds INTEGER NOT NULL,
          storyboard_json TEXT NOT NULL,
          render_settings_json TEXT DEFAULT '{}',
          video_url TEXT,
          vtt_content TEXT,
          share_token TEXT UNIQUE NOT NULL,
          provider TEXT DEFAULT 'canvas_browser',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rendered_videos_student ON rendered_videos(student_id);
        CREATE INDEX IF NOT EXISTS idx_rendered_videos_share ON rendered_videos(share_token);
      `);
    },
  },
];

export function runMigrations(targetDb?: Database.Database): number {
  const db = targetDb || getDb();

  // Create schema_migrations tracker table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations ORDER BY version ASC').all() as Array<{ version: number }>;
  const appliedVersions = new Set(appliedRows.map(r => r.version));

  for (const m of migrations) {
    if (!appliedVersions.has(m.version)) {
      const runTx = db.transaction(() => {
        m.up(db);
        db.prepare('INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
          .run(m.version, m.name, new Date().toISOString());
      });
      runTx();
    }
  }

  const latest = db.prepare('SELECT MAX(version) as currentVersion FROM schema_migrations').get() as { currentVersion: number | null };
  return latest?.currentVersion || 0;
}
