/**
 * QR Scan handling utilities
 * @deprecated Use useQRScanner hook for new components
 */

import { ProjectConfiguration } from '../types/TimeTrackerBLE';

export type QRScanField = 
  | 'wifi-password' 
  | 'toggl-token'
  | 'clockify-key'
  | 'workspace-id' 
  | 'project-ids' 
  | 'face-down' 
  | 'left-side' 
  | 'right-side' 
  | 'front-edge' 
  | 'back-edge';

export interface QRScanHandlers {
  setWifiPassword?: (value: string) => void;
  setTogglToken?: (value: string) => void;
  setClockifyKey?: (value: string) => void;
  setWorkspaceId?: (value: string) => void;
  updateProjectId?: (orientation: keyof ProjectConfiguration, value: string) => void;
  setProjectIds?: (ids: any) => void;
}

// Re-export the legacy function for backward compatibility
// New code should use useQRScanner hook instead
export const handleQRScanResult = (
  data: string,
  field: QRScanField,
  handlers: QRScanHandlers,
  currentProjectIds: any
): void => {
  // This function is maintained for backward compatibility
  // Implementation moved to useQRScanner hook
  console.warn('handleQRScanResult is deprecated. Use useQRScanner hook instead.');
};
