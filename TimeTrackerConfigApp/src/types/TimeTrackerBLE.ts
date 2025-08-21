// TimeTracker BLE Service Configuration
export const TIMETRACKER_SERVICE_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Characteristic UUIDs
export const BLE_CHARACTERISTICS = {
  WIFI_SSID: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  WIFI_PASSWORD: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  TOGGL_TOKEN: '6ba7b813-9dad-11d1-80b4-00c04fd430c8',
  WORKSPACE_ID: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
  PROJECT_IDS: '6ba7b815-9dad-11d1-80b4-00c04fd430c8',
  STATUS: '6ba7b816-9dad-11d1-80b4-00c04fd430c8',
} as const;

// Configuration data interfaces
export interface WiFiConfiguration {
  ssid: string;
  password: string;
}

export interface TogglConfiguration {
  apiToken: string;
  workspaceId: string;
}

export interface ProjectConfiguration {
  faceDown: number;
  leftSide: number;
  rightSide: number;
  frontEdge: number;
  backEdge: number;
}

export interface TimeTrackerConfiguration {
  wifi: WiFiConfiguration;
  toggl: TogglConfiguration;
  projects: ProjectConfiguration;
}

// BLE Device interface
export interface TimeTrackerDevice {
  id: string;
  name: string;
  rssi?: number;
  isConnectable: boolean;
}

// Status types from device
export type DeviceStatus = 
  | 'setup_mode'
  | 'ssid_received'
  | 'password_received'
  | 'token_received'
  | 'workspace_received'
  | 'projects_received'
  | 'config_complete'
  | 'config_success'
  | 'error';