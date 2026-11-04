import { userRepository, islmRepository } from '../server/repositories/index.ts';
import { runMigrations } from '../server/db/migrations.ts';

runMigrations();
const defaultPasswordHash = '$2b$10$49dpOl7qIuncJvpKbScOIu.0Afira2XT/HEZqWqBKCsqZtrl6o/Dq'; // 'Password123!'

userRepository.upsert({
  id: 'STUDENT_001',
  name: 'Mastery Student',
  email: 'student@mastery.ai',
  role: 'student',
  plan: 'Free Plan',
  theme: 'dark',
  streakDays: 5,
  testsCompleted: 3,
  overallMastery: 0.65,
  passwordHash: defaultPasswordHash,
  tokenVersion: 1,
});

userRepository.upsert({
  id: 'TEACHER_001',
  name: 'Mastery Professor',
  email: 'teacher@mastery.ai',
  role: 'teacher',
  plan: 'Campus License',
  theme: 'dark',
  streakDays: 20,
  testsCompleted: 10,
  overallMastery: 0.95,
  passwordHash: defaultPasswordHash,
  tokenVersion: 1,
});

userRepository.upsert({
  id: 'ADMIN_001',
  name: 'System Administrator',
  email: 'admin@mastery.ai',
  role: 'admin',
  plan: 'Enterprise',
  theme: 'dark',
  streakDays: 99,
  testsCompleted: 50,
  overallMastery: 1.0,
  passwordHash: defaultPasswordHash,
  tokenVersion: 1,
});

islmRepository.upsert({
  student_id: 'STUDENT_001',
  name: 'Mastery Student',
  email: 'student@mastery.ai',
  role: 'student',
  course_track: 'Web Application Development',
  overall_mastery: 0.65,
  topic_mastery: { web_apache_docroot: 0.50, os_deadlock_bankers: 0.40 },
  recent_misconceptions: ['DocumentRoot path'],
  scaffolding_tier_required: 1,
  error_count: 2,
  independent_solves: 5,
  scaffolding_fading_index: 0.40,
  time_spent_mins: 90,
  history: [],
});

console.log('Seeded student, teacher, admin accounts into SQLite database successfully.');
