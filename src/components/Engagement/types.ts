export type HapticCommand =
  | 'SINGLE_SHORT'
  | 'DOUBLE_SHORT'
  | 'TRIPLE_SHORT'
  | 'LONG'
  | 'SHORT_LONG';

export type SensorSource = 'REAL SENSOR' | 'SIMULATED';

export type EngagementEventType =
  | 'NEED_HELP'
  | 'NEED_HINT'
  | 'NEED_BREAK'
  | 'I_UNDERSTAND'
  | 'TAB_HIDDEN'
  | 'TAB_VISIBLE'
  | 'IDLE_TIMEOUT'
  | 'RAPID_FAILURE'
  | 'MOTION_DETECTED'
  | 'MOTION_IDLE';

export interface EngagementEvent {
  id: string;
  timestamp: string;
  type: EngagementEventType;
  source: SensorSource;
  description: string;
  tierInfluenced?: number;
  hapticSent?: HapticCommand;
  payload?: Record<string, any>;
}

export interface AttentionProxiesState {
  isTabVisible: boolean;
  idleSeconds: number;
  consecutiveFailures: number;
  motionScore: number; // 0 - 100%
  presenceDetected: boolean;
  webcamConsent: boolean;
  webcamActive: boolean;
  tutorNudgeActive: boolean;
  nudgeMessage?: string;
  breakOffered: boolean;
}

export interface VerificationQuestionState {
  isOpen: boolean;
  conceptId: string;
  conceptName: string;
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex?: number;
  isVerified?: boolean;
}

export const MASTERY_BAND_UUIDS = {
  SERVICE: '12345678-1234-5678-1234-56789abcdef0',
  EVENT_CHAR: '12345678-1234-5678-1234-56789abcdef1',
  COMMAND_CHAR: '12345678-1234-5678-1234-56789abcdef2',
} as const;
