import { TimeTrackerConfiguration } from '../types/TimeTrackerBLE';
import { ValidationService } from '../services/ValidationService';

/**
 * Legacy validation utilities - now using ValidationService internally
 * @deprecated Use ValidationService directly for new code
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateConfiguration = (
  wifiSSID: string,
  wifiPassword: string,
  togglToken: string,
  workspaceId: string,
  projectIds: { faceDown: number; leftSide: number; rightSide: number; frontEdge: number; backEdge: number }
): ValidationResult => {
  return ValidationService.validateCompleteConfiguration(
    wifiSSID,
    wifiPassword,
    { apiToken: togglToken },
    workspaceId,
    projectIds,
    ['apiToken']
  );
};

export const validateProjectId = (value: string): { isValid: boolean; projectId?: number; error?: string } => {
  const result = ValidationService.validateProjectId(value);
  return {
    isValid: result.isValid,
    projectId: result.details?.numericValue,
    error: result.error,
  };
};

export const validateWorkspaceId = (value: string): { isValid: boolean; workspaceId?: string; error?: string } => {
  const result = ValidationService.validateWorkspaceId(value);
  return {
    isValid: result.isValid,
    workspaceId: result.isValid ? value.trim() : undefined,
    error: result.error,
  };
};

export const buildConfiguration = (
  wifiSSID: string,
  wifiPassword: string,
  togglToken: string,
  workspaceId: string,
  projectIds: { faceDown: number; leftSide: number; rightSide: number; frontEdge: number; backEdge: number }
): TimeTrackerConfiguration => ({
  wifi: {
    ssid: wifiSSID.trim(),
    password: wifiPassword.trim(),
  },
  toggl: {
    apiToken: togglToken.trim(),
    workspaceId: workspaceId.trim(),
  },
  projects: projectIds,
});