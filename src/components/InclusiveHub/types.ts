export type AccessibilityMode = 'BLIND' | 'DEAF' | 'NON_SPEAKING';

export type WearableRequestType = 'I_NEED_HELP' | 'I_NEED_BREAK' | 'CANCEL' | 'ACKNOWLEDGE';

export type WearableRequestStatus = 'Pending' | 'Acknowledged' | 'Assistance Provided' | 'Resolved' | 'Cancelled';

export type DeviceConnectionStatus = 'connected' | 'disconnected' | 'pairing';

export type DataSource = 'simulation' | 'hardware';

export interface WearableDevice {
  id: string;
  device_id: string;
  student_id: string | null;
  student_name?: string | null;
  device_token: string;
  device_type: string;
  accessibility_mode: AccessibilityMode;
  firmware_version: string;
  status: DeviceConnectionStatus;
  battery_pct: number;
  last_heartbeat: string | null;
  source: DataSource;
  created_at: string;
  updated_at: string;
}

export interface WearableEvent {
  id: string;
  event_id: string;
  device_id: string;
  student_id: string | null;
  student_name?: string | null;
  event_type: string;
  request: WearableRequestType;
  accessibility_mode: AccessibilityMode;
  status: WearableRequestStatus;
  vibration_pattern: string | null;
  led_color: string | null;
  oled_text: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  source: DataSource;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  id: string;
  device_id: string;
  student_id: string | null;
  student_name?: string | null;
  heart_rate: number | null;
  spo2: number | null;
  gsr_eda: number | null;
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  temp_c: number | null;
  is_anomaly: boolean | number;
  review_flag: boolean | number;
  source: DataSource;
  timestamp: string;
  created_at: string;
}

export interface OverviewStats {
  totalStudents: number;
  connectedWearables: number;
  pendingHelpRequests: number;
  activeDeviceAlerts: number;
}
