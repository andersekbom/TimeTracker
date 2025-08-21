import { ValidationResult } from '../types/TimeTrackingProvider';
import { ProjectConfiguration } from '../types/TimeTrackerBLE';

export class ValidationService {
  static validateRequired(value: string, fieldName: string): ValidationResult {
    if (!value?.trim()) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true };
  }

  static validateNumeric(value: string, fieldName: string): ValidationResult {
    const numValue = parseInt(value?.trim() || '');
    if (isNaN(numValue)) {
      return { isValid: false, error: `${fieldName} must be a number` };
    }
    return { isValid: true, details: { numericValue: numValue } };
  }

  static validateProjectId(value: string): ValidationResult {
    return this.validateNumeric(value, 'Project ID');
  }

  static validateWorkspaceId(value: string): ValidationResult {
    return this.validateNumeric(value, 'Workspace ID');
  }

  static validateWiFiConfiguration(ssid: string, password: string): ValidationResult {
    const ssidResult = this.validateRequired(ssid, 'WiFi SSID');
    if (!ssidResult.isValid) return ssidResult;

    const passwordResult = this.validateRequired(password, 'WiFi password');
    if (!passwordResult.isValid) return passwordResult;

    return { isValid: true };
  }

  static validateProviderCredentials(
    credentials: Record<string, string>,
    requiredFields: string[]
  ): ValidationResult {
    for (const field of requiredFields) {
      const result = this.validateRequired(credentials[field], field);
      if (!result.isValid) return result;
    }
    return { isValid: true };
  }

  static validateProjectConfiguration(projectIds: ProjectConfiguration): ValidationResult {
    const hasProjects = Object.values(projectIds).some(id => {
      const numId = typeof id === 'string' ? parseInt(id) : id;
      return numId > 0;
    });
    if (!hasProjects) {
      return { 
        isValid: false, 
        error: 'At least one project ID must be set' 
      };
    }
    return { isValid: true };
  }

  static validateCompleteConfiguration(
    wifiSSID: string,
    wifiPassword: string,
    credentials: Record<string, string>,
    workspaceId: string,
    projectIds: ProjectConfiguration,
    requiredCredentialFields: string[] = []
  ): ValidationResult {
    // Validate WiFi
    const wifiResult = this.validateWiFiConfiguration(wifiSSID, wifiPassword);
    if (!wifiResult.isValid) return wifiResult;

    // Validate credentials
    const credentialsResult = this.validateProviderCredentials(credentials, requiredCredentialFields);
    if (!credentialsResult.isValid) return credentialsResult;

    // Validate workspace
    const workspaceResult = this.validateWorkspaceId(workspaceId);
    if (!workspaceResult.isValid) return workspaceResult;

    // Validate projects
    const projectsResult = this.validateProjectConfiguration(projectIds);
    if (!projectsResult.isValid) return projectsResult;

    return { isValid: true };
  }
}