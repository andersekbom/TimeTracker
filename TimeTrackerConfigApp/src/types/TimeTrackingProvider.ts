// Abstract time tracking provider interface for extensible service support

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: Record<string, any>;
}

export interface ProjectInfo {
  id: string;
  name: string;
  color?: string;
  clientName?: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  projects: ProjectInfo[];
}

export interface ProviderCredentials {
  [key: string]: string | number | boolean;
}

export interface ProviderConfiguration {
  providerId: string;
  credentials: ProviderCredentials;
  workspaceId: string;
  projectIds: {
    faceDown: string;
    leftSide: string;
    rightSide: string;
    frontEdge: string;
    backEdge: string;
  };
}

export interface ConfigurationField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select';
  placeholder?: string;
  required?: boolean;
  secure?: boolean; // For sensitive fields like API tokens
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
  options?: Array<{label: string; value: string}>; // For select fields
}

export abstract class TimeTrackingProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  
  // Configuration form definition
  abstract getConfigurationFields(): ConfigurationField[];
  
  // Validation methods
  abstract validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult>;
  abstract validateWorkspace(credentials: ProviderCredentials, workspaceId: string): Promise<ValidationResult>;
  abstract validateProjects(credentials: ProviderCredentials, workspaceId: string, projectIds: string[]): Promise<ValidationResult>;
  
  // Data retrieval methods
  abstract getWorkspaces(credentials: ProviderCredentials): Promise<WorkspaceInfo[]>;
  abstract getProjects(credentials: ProviderCredentials, workspaceId: string): Promise<ProjectInfo[]>;
  
  // Configuration methods
  abstract buildDeviceConfiguration(config: ProviderConfiguration): Record<string, any>;
  abstract parseDeviceConfiguration(deviceConfig: Record<string, any>): ProviderConfiguration | null;
  
  // Helper method for credential validation
  protected validateRequiredFields(credentials: ProviderCredentials, requiredFields: string[]): ValidationResult {
    for (const field of requiredFields) {
      if (!credentials[field] || String(credentials[field]).trim() === '') {
        return {
          isValid: false,
          error: `${field} is required`
        };
      }
    }
    return { isValid: true };
  }
}

// Provider registry interface
export interface ProviderRegistry {
  register(provider: TimeTrackingProvider): void;
  getProvider(id: string): TimeTrackingProvider | undefined;
  getAllProviders(): TimeTrackingProvider[];
  getAvailableProviders(): Array<{id: string; name: string; description: string}>;
}

// Storage interface for provider configurations
export interface ProviderStorage {
  saveConfiguration(config: ProviderConfiguration): Promise<void>;
  loadConfiguration(): Promise<ProviderConfiguration | null>;
  clearConfiguration(): Promise<void>;
  hasConfiguration(): Promise<boolean>;
}

// Verification states for UI feedback
export enum VerificationState {
  IDLE = 'idle',
  VALIDATING_CREDENTIALS = 'validating_credentials',
  VALIDATING_WORKSPACE = 'validating_workspace',
  VALIDATING_PROJECTS = 'validating_projects',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface VerificationStatus {
  state: VerificationState;
  message?: string;
  progress?: number; // 0-100 for progress indicators
  details?: Record<string, any>;
}