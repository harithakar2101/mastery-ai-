import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { runMigrations } from '../db/migrations.ts';
import { userRepository, islmRepository } from '../repositories/index.ts';

function generateSecurePassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export function seedAccounts() {
  runMigrations();

  const accounts = [
    {
      id: 'USER_ADMIN_001',
      name: 'System Administrator',
      email: 'admin@mastery.ai',
      role: 'admin' as const,
      password: generateSecurePassword(16),
    },
    {
      id: 'USER_TEACHER_001',
      name: 'Prof. Marcus Vance',
      email: 'teacher@mastery.ai',
      role: 'teacher' as const,
      password: generateSecurePassword(16),
    },
    {
      id: 'USER_STUDENT_001',
      name: 'Alex Rivera',
      email: 'student@mastery.ai',
      role: 'student' as const,
      password: generateSecurePassword(16),
    },
  ];

  console.log('\n===============================================================');
  console.log('       MASTERY.AI - SEED ACCOUNTS (CRYPTOGRAPHIC PASSWORDS)     ');
  console.log('===============================================================');
  console.log('Generated unique one-time random passwords for initial accounts:');
  console.log('---------------------------------------------------------------');

  for (const acc of accounts) {
    const passwordHash = bcrypt.hashSync(acc.password, 10);
    const savedUser = userRepository.upsert({
      id: acc.id,
      name: acc.name,
      email: acc.email,
      role: acc.role,
      passwordHash,
      tokenVersion: 1,
      theme: 'dark',
      degree: acc.role === 'student' ? 'B.Tech in Computer Science & Engineering' : undefined,
    });

    if (acc.role === 'student') {
      islmRepository.upsert({
        student_id: savedUser.id,
        name: acc.name,
        email: acc.email,
        role: 'student',
        current_concept_id: 'web_apache_docroot',
        concept_name: 'Apache DocumentRoot Configuration',
        frequent_cognitive_misconception: 'Confusing MySQL database port (3306) with HTTP web port (80)',
        recent_failure_category: 'Configuration Error',
        course_track: 'Web Application Development',
        overall_mastery: 0.60,
        scaffolding_tier_required: 1,
      });
    }

    console.log(`[${acc.role.toUpperCase()}]`);
    console.log(`  Email:    ${acc.email}`);
    console.log(`  Password: ${acc.password}`);
    console.log('---------------------------------------------------------------');
  }

  console.log('SECURITY NOTICE: Default passwords are NOT stored in git or production.');
  console.log('Store these credentials securely. To reseed, run: npm run seed:accounts\n');
}

if (process.argv[1]?.includes('seedAccounts')) {
  seedAccounts();
}
