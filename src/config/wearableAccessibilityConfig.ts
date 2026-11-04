import wearableConfigJson from '../../shared/wearable_config.json';

export type AccessibilityMode = 'BLIND' | 'DEAF' | 'NON_SPEAKING';
export type WearableRequestType = 'I_NEED_HELP' | 'I_NEED_BREAK' | 'CANCEL' | 'ACKNOWLEDGE';
export type WearableRequestStatus = 'Pending' | 'Acknowledged' | 'Assistance Provided' | 'Resolved' | 'Cancelled';
export type DataSource = 'simulation' | 'hardware';

export const WEARABLE_CONFIG = wearableConfigJson;

export function getVibrationPattern(key: keyof typeof wearableConfigJson.vibrationPatterns): number[] {
  return wearableConfigJson.vibrationPatterns[key]?.patternMs || [200];
}

export function getLedColor(status: WearableRequestStatus | 'FAILURE' | 'IDLE'): string {
  const mapping: Record<string, keyof typeof wearableConfigJson.ledColors> = {
    'Pending': 'PENDING',
    'Acknowledged': 'ACKNOWLEDGED',
    'Assistance Provided': 'ASSISTANCE_PROVIDED',
    'Resolved': 'RESOLVED',
    'Cancelled': 'CANCELLED',
    'FAILURE': 'FAILURE',
    'IDLE': 'IDLE',
  };
  const configKey = mapping[status] || 'IDLE';
  return wearableConfigJson.ledColors[configKey]?.hex || '#475569';
}

export function getOledText(mode: AccessibilityMode, status: WearableRequestStatus | 'IDLE' | 'FAILURE'): string {
  const mapping: Record<string, string> = {
    'Pending': 'PENDING',
    'Acknowledged': 'ACKNOWLEDGED',
    'Assistance Provided': 'ASSISTANCE_PROVIDED',
    'Resolved': 'RESOLVED',
    'Cancelled': 'CANCELLED',
    'FAILURE': 'FAILURE',
    'IDLE': 'IDLE',
  };
  const key = mapping[status] || 'IDLE';
  return (wearableConfigJson.oledMessages as any)[mode]?.[key] || '';
}

export function triggerHapticFeedback(pattern: number[]) {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }
}
