import { TimeTrackerConfiguration } from '../types/TimeTrackerBLE';

/**
 * Validation utilities for TimeTracker configuration
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
  if (!wifiSSID.trim()) {
    return { isValid: false, error: 'WiFi SSID is required' };
  }

  if (!wifiPassword.trim()) {
    return { isValid: false, error: 'WiFi password is required' };
  }

  if (!togglToken.trim()) {
    return { isValid: false, error: 'Toggl API token is required' };
  }

  if (!workspaceId.trim()) {
    return { isValid: false, error: 'Workspace ID is required' };
  }

  const workspaceNum = parseInt(workspaceId);
  if (isNaN(workspaceNum)) {
    return { isValid: false, error: 'Workspace ID must be a number' };
  }

  const hasProjects = Object.values(projectIds).some(id => id > 0);
  if (!hasProjects) {
    return { isValid: false, error: 'At least one project ID must be set' };
  }

  return { isValid: true };
};

export const validateProjectId = (value: string): { isValid: boolean; projectId?: number; error?: string } => {
  const projectId = parseInt(value.trim());
  if (isNaN(projectId)) {
    return { isValid: false, error: 'Project ID must be a number' };
  }
  return { isValid: true, projectId };
};

export const validateWorkspaceId = (value: string): { isValid: boolean; workspaceId?: string; error?: string } => {
  const workspaceNum = parseInt(value.trim());
  if (isNaN(workspaceNum)) {
    return { isValid: false, error: 'Workspace ID must be a number' };
  }
  return { isValid: true, workspaceId: value.trim() };
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