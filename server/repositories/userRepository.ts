import { getDb } from '../db/connection.ts';
import { StoreUser, UserRole } from '../store.ts';
import { PaginationOptions, PaginatedResult, encodeCursor, decodeCursor, sanitizeLimit } from '../utils/pagination.ts';

function rowToUser(row: any): StoreUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    plan: row.plan,
    degree: row.degree || undefined,
    preferredLanguages: row.preferred_languages ? JSON.parse(row.preferred_languages) : [],
    streakDays: row.streak_days ?? 1,
    testsCompleted: row.tests_completed ?? 0,
    overallMastery: row.overall_mastery ?? 0.50,
    theme: row.theme || 'dark',
    passwordHash: row.password_hash || undefined,
    tokenVersion: row.token_version ?? 1,
    retentionDays: row.retention_days ?? 180,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const userRepository = {
  findById(id: string): StoreUser | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? rowToUser(row) : null;
  },

  findByEmail(email: string): StoreUser | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    return row ? rowToUser(row) : null;
  },

  create(user: StoreUser & { synthetic?: boolean }): StoreUser {
    const db = getDb();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (
        id, name, email, role, plan, degree, preferred_languages,
        streak_days, tests_completed, overall_mastery, theme,
        password_hash, token_version, retention_days, created_at, updated_at, synthetic
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      user.id,
      user.name,
      user.email.toLowerCase().trim(),
      user.role,
      user.plan || (user.role === 'teacher' ? 'Campus License' : 'Free Plan'),
      user.degree || null,
      JSON.stringify(user.preferredLanguages || []),
      user.streakDays ?? 1,
      user.testsCompleted ?? 0,
      user.overallMastery ?? 0.50,
      user.theme || 'dark',
      user.passwordHash || null,
      user.tokenVersion ?? 1,
      user.retentionDays ?? 180,
      user.createdAt || now,
      user.updatedAt || now,
      user.synthetic ? 1 : 0
    );

    return this.findById(user.id)!;
  },

  upsert(user: Partial<StoreUser> & { id: string; email: string; name?: string; role?: UserRole; synthetic?: boolean }): StoreUser {
    const existing = this.findById(user.id) || this.findByEmail(user.email);
    if (existing) {
      return this.update(existing.id, user)!;
    }
    return this.create({
      id: user.id,
      name: user.name || 'User',
      email: user.email,
      role: user.role || 'student',
      plan: user.plan || (user.role === 'teacher' ? 'Campus License' : 'Free Plan'),
      degree: user.degree,
      preferredLanguages: user.preferredLanguages || [],
      streakDays: user.streakDays ?? 1,
      testsCompleted: user.testsCompleted ?? 0,
      overallMastery: user.overallMastery ?? 0.50,
      theme: user.theme || 'dark',
      passwordHash: user.passwordHash,
      tokenVersion: user.tokenVersion ?? 1,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      synthetic: user.synthetic,
    });
  },

  update(id: string, updates: Partial<StoreUser>): StoreUser | null {
    const db = getDb();
    const current = this.findById(id);
    if (!current) return null;

    const updated: StoreUser = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = db.prepare(`
      UPDATE users SET
        name = ?,
        email = ?,
        role = ?,
        plan = ?,
        degree = ?,
        preferred_languages = ?,
        streak_days = ?,
        tests_completed = ?,
        overall_mastery = ?,
        theme = ?,
        password_hash = ?,
        token_version = ?,
        retention_days = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.email.toLowerCase().trim(),
      updated.role,
      updated.plan,
      updated.degree || null,
      JSON.stringify(updated.preferredLanguages || []),
      updated.streakDays ?? 1,
      updated.testsCompleted ?? 0,
      updated.overallMastery ?? 0.50,
      updated.theme || 'dark',
      updated.passwordHash || null,
      updated.tokenVersion ?? 1,
      updated.retentionDays ?? 180,
      updated.updatedAt,
      id
    );

    return this.findById(id);
  },

  incrementTokenVersion(id: string): number {
    const db = getDb();
    db.prepare('UPDATE users SET token_version = token_version + 1, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
    const row = db.prepare('SELECT token_version FROM users WHERE id = ?').get(id) as { token_version: number } | undefined;
    return row?.token_version || 1;
  },

  delete(id: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return res.changes > 0;
  },

  listPaginated(options?: PaginationOptions): PaginatedResult<StoreUser> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM users';
    const params: any[] = [];

    if (cursor) {
      query += ' WHERE created_at < ? OR (created_at = ? AND id < ?)';
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    query += ' ORDER BY created_at DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToUser);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.createdAt || '', id: last.id });
    }

    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  deleteSynthetic(): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM users WHERE synthetic = 1').run();
    return res.changes;
  },

  count(): number {
    const db = getDb();
    const res = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    return res?.count || 0;
  },
};
