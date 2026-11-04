import fs from 'fs';
import path from 'path';

const ROOT = 'C:/Users/harit/Desktop/mastery-ai-';

const filesToUpdate = [
  '.github/workflows/ci.yml',
  'Dockerfile',
  'docker-compose.yml',
  'README.md',
  'index.html',
  'metadata.json',
  'public/sw.js',
  'firmware/MasteryBand/MasteryBand.ino',
  'firmware/MasteryBand/README.md',
  'server.ts',
  'server/auth.ts',
  'server/authRoutes.ts',
  'server/db/connection.ts',
  'server/fallbacks.ts',
  'server/gemini.ts',
  'server/logger.ts',
  'server/portfolioRoutes.ts',
  'server/promptSecurity.ts',
  'server/scripts/backupDatabase.ts',
  'server/scripts/validateEnv.ts',
  'server/store.ts',
  'server/teacherRoutes.ts',
  'server/videoRoutes.ts',
  'src/components/Auth/LoginPage.tsx',
  'src/components/Chat/VisionSolveChat.tsx',
  'src/components/CodeSandbox/CodeSandbox.tsx',
  'src/components/ComparisonView/ComparisonView.tsx',
  'src/components/Engagement/EngagementPanel.tsx',
  'src/components/Legal/PrivacyPolicyPage.tsx',
  'src/components/Legal/ResponsibleAIPage.tsx',
  'src/components/LibraryVault/LibraryVault.tsx',
  'src/components/LibraryVault/VisionLibraryVault.tsx',
  'src/components/Navigation/AppShell.tsx',
  'src/components/Navigation/Navbar.tsx',
  'src/components/Navigation/VisionSidebar.tsx',
  'src/components/Portfolio/LearnerPortfolioView.tsx',
  'src/components/Portfolio/PublicPortfolioPage.tsx',
  'src/components/Showcase/ShowcaseLandingPage.tsx',
  'src/components/StudyStudio/StudyStudioView.tsx',
  'src/components/UI/CommandPalette.tsx',
  'src/context/TutorContext.tsx',
  'src/context/tutorDefaults.ts',
  'src/context/tutorSync.ts',
  'src/services/videoRenderer.ts',
  'src/styles/tokens.ts',
  'src/utils/i18n.ts',
  'tests/aiVideo.test.ts',
  'tests/authSecurity.test.ts',
  'tests/databaseRepository.test.ts',
  'tests/portfolioShowcase.test.ts',
  'tests/quotasAudit.test.ts',
  'tests/sseLiveClass.test.ts',
  'tests/studyStudio.test.ts',
];

const replacements: [RegExp, string][] = [
  // Emails
  [/@cognicse\.edu/g, '@mastery.ai'],
  [/cognicse\.edu/g, 'mastery.ai'],

  // Uppercase Tokens
  [/COGNICSE AI/g, 'MASTERY.AI'],
  [/COGNICSE/g, 'MASTERY.AI'],

  // Title / Brand Names
  [/CogniCSE/g, 'Mastery.ai'],

  // Database
  [/cognicse\.db/g, 'mastery.db'],
  [/cognicse-backup-/g, 'mastery-backup-'],

  // Services & Docker
  [/cognicse-engine/g, 'mastery-engine'],
  [/cognicse_pedagogical_engine/g, 'mastery_pedagogical_engine'],
  [/cognicse-app/g, 'mastery-app'],
  [/cognicse:rc-1\.0\.0/g, 'mastery:rc-1.0.0'],

  // Storage Keys & Cookies
  [/cognicse_ui_lang/g, 'mastery_ui_lang'],
  [/cognicse_theme_preference/g, 'mastery_theme_preference'],
  [/cognicse_active_user_session/g, 'mastery_active_user_session'],
  [/cognicse_user_export_/g, 'mastery_user_export_'],
  [/cognicse_offline_bundle\.json/g, 'mastery_offline_bundle.json'],
  [/cognicse_session/g, 'mastery_session'],
  [/cognicse-v1/g, 'mastery-v1'],

  // Any remaining lowercase cognicse
  [/cognicse/g, 'mastery-ai'],
];

for (const relPath of filesToUpdate) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${relPath}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  for (const [regex, rep] of replacements) {
    content = content.replace(regex, rep);
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated: ${relPath}`);
  } else {
    console.log(`No changes needed: ${relPath}`);
  }
}

console.log('Renaming complete.');
