import { ISLMProfile, DKMNode, ChatSession, UserProfile, PedagogicalEvent } from '../types';

export async function fetchUserStateFromServer() {
  try {
    const res = await fetch('/api/user/state', {
      credentials: 'include',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Network error loading user state from server:', err);
  }
  return null;
}

export async function syncUserStateToServer(params: {
  userProfile?: UserProfile;
  islm?: ISLMProfile;
  dkmNodes?: DKMNode[];
  sessions?: ChatSession[];
}) {
  try {
    const res = await fetch('/api/user/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to sync user state to server store:', err);
    return false;
  }
}

export async function recordPedagogicalEvent(event: {
  type: string;
  conceptId?: string;
  topicId?: string;
  payload?: Record<string, any>;
  synthetic?: boolean;
}) {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.warn('Failed to record event to server events stream:', err);
  }
}

export async function loginUserOnServer(params: {
  email: string;
  password?: string;
}) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      email: params.email,
      password: params.password || 'Password123!',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Login failed with status ${res.status}`);
  }

  return data;
}

export async function registerUserOnServer(params: {
  email: string;
  password?: string;
  name: string;
  degree?: string;
  inviteCode?: string;
}) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      email: params.email,
      password: params.password || 'Password123!',
      name: params.name,
      degree: params.degree,
      inviteCode: params.inviteCode,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Registration failed with status ${res.status}`);
  }

  return data;
}

export async function logoutUserOnServer() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err) {
    console.warn('Logout network error:', err);
  }
}

export async function changePasswordOnServer(currentPassword: string, newPassword: string) {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to change password');
  }
  return data;
}

export async function signOutEverywhereOnServer() {
  const res = await fetch('/api/auth/signout-all', {
    method: 'POST',
    credentials: 'include',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to revoke active sessions');
  }
  return data;
}

export async function deleteAccountOnServer() {
  const res = await fetch('/api/auth/delete-account', {
    method: 'POST',
    credentials: 'include',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to delete account');
  }
  return data;
}

export async function exportUserDataFromServer() {
  const res = await fetch('/api/auth/export-data', {
    credentials: 'include',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error?.message || 'Failed to export personal data');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mastery_user_export_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
