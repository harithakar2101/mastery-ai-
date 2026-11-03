import { UserProfile, ChatSession } from '../types';

export const STORAGE_KEY_ACTIVE_USER = 'cognicse_active_user_session';
export const STORAGE_KEY_UI_THEME = 'cognicse_theme_preference';

export const INITIAL_PROFILE: UserProfile = {
  id: 'CSE_STU_8810',
  name: 'Haritha Karthikkumar',
  email: 'haritha.k@university.edu',
  role: 'student',
  degree: 'B.Tech in Computer Science & Engineering',
  plan: 'Free Plan',
  streakDays: 7,
  testsCompleted: 3,
  overallMastery: 0.60,
  theme: 'dark',
  preferredLanguages: ['python', 'javascript', 'cpp', 'php'],
  targetMajor: 'Systems & Artificial Intelligence',
};

export const DEFAULT_CHAT_SESSION: ChatSession = {
  id: 'chat_default_welcome',
  studentId: 'CSE_STU_8810',
  title: 'Socratic Welcome Orientation',
  timestamp: 'Today',
  messages: [
    {
      id: 'msg_welcome_1',
      sender: 'assistant',
      text: 'Hello! I am CogniCSE, your 1-on-1 Socratic Engineering Tutor. What topic or challenge would you like to master today?',
      timestamp: 'Just now',
    },
  ],
};

export function exportOfflinePackFile(content: any, filename = 'cognicse_offline_bundle.json') {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
