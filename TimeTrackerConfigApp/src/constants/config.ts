// Configuration constants and default values
export const DEFAULT_VALUES = {
  // WiFi defaults for development (should be removed in production)
  WIFI: {
    SSID: '',
    PASSWORD: '',
  },

  // Project orientations
  PROJECT_ORIENTATIONS: [
    { key: 'faceDown', label: 'Face Down', scanKey: 'face-down' },
    { key: 'leftSide', label: 'Left Side', scanKey: 'left-side' },
    { key: 'rightSide', label: 'Right Side', scanKey: 'right-side' },
    { key: 'frontEdge', label: 'Front Edge', scanKey: 'front-edge' },
    { key: 'backEdge', label: 'Back Edge', scanKey: 'back-edge' },
  ] as const,

  // Default project IDs structure
  PROJECT_IDS: {
    faceDown: '0',
    leftSide: '0',
    rightSide: '0',
    frontEdge: '0',
    backEdge: '0',
  },
};

// Development/Testing configuration (only used in development)
// In a real implementation, these would be loaded from environment variables
// For now, they're empty by default - developers can set them manually if needed
export const TEST_CONFIG = {
  TOGGL: {
    API_TOKEN: '8512ae2df80f50ecaa5a7e0c4c96cc57',
    WORKSPACE_ID: '20181448',
    PROJECT_IDS: {
      faceDown: 212267804,
      leftSide: 212267805,
      rightSide: 212267806,
      frontEdge: 212267807,
      backEdge: 212267809,
    },
  },
  CLOCKIFY: {
    API_KEY: '',
    WORKSPACE_ID: '',
    PROJECT_IDS: {
      faceDown: '0',
      leftSide: '',
      rightSide: '',
      frontEdge: '',
      backEdge: '',
    },
  },
};

// App configuration
export const APP_CONFIG = {
  // Scanning timeouts
  BLE_SCAN_TIMEOUT: 10000,
  CONFIG_SEND_TIMEOUT: 15000,
  
  // Connection delays
  BLE_COMMAND_DELAY: 100,
  DISCONNECT_VERIFICATION_DELAY: 1000,
  CONFIG_COMPLETION_DELAY: 3000,
  
  // Storage keys
  STORAGE_KEYS: {
    PROVIDER_CONFIG: '@timetracker_provider_config',
    MULTI_PROVIDER_CONFIG: '@timetracker_multi_provider_configs',
    SECURE_CREDENTIALS: '@timetracker_secure_credentials',
  },
};

// UI Constants
export const UI_CONSTANTS = {
  COLORS: {
    PRIMARY: '#2196F3',
    SUCCESS: '#4CAF50',
    WARNING: '#FF9500',
    ERROR: '#F44336',
    BACKGROUND: '#F5F5F5',
    WHITE: '#FFFFFF',
    TEXT_PRIMARY: '#333333',
    TEXT_SECONDARY: '#666666',
  },
  
  BUTTON_STATES: {
    DEFAULT: 'default',
    LOADING: 'loading',
    DISABLED: 'disabled',
    SUCCESS: 'success',
    ERROR: 'error',
  },
};