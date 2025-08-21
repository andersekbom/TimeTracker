import { 
  ProviderConfiguration, 
  ValidationResult, 
  VerificationState, 
  VerificationStatus,
  TimeTrackingProvider 
} from '../types/TimeTrackingProvider';
import { providerRegistry } from './ProviderRegistry';

export interface ValidationOptions {
  validateCredentials?: boolean;
  validateWorkspace?: boolean;
  validateProjects?: boolean;
  timeout?: number; // milliseconds
}

export class ProviderValidationService {
  private defaultTimeout = 10000; // 10 seconds

  async validateConfiguration(
    config: ProviderConfiguration,
    options: ValidationOptions = {},
    onProgress?: (status: VerificationStatus) => void
  ): Promise<ValidationResult> {
    
    const {
      validateCredentials = true,
      validateWorkspace = true,
      validateProjects = true,
      timeout = this.defaultTimeout
    } = options;

    // Get the provider
    const provider = providerRegistry.getProvider(config.providerId);
    if (!provider) {
      return {
        isValid: false,
        error: `Unknown provider: ${config.providerId}`
      };
    }

    onProgress?.({
      state: VerificationState.IDLE,
      message: 'Starting validation...',
      progress: 0
    });

    try {
      let progress = 0;
      const totalSteps = Number(validateCredentials) + Number(validateWorkspace) + Number(validateProjects);
      const progressIncrement = 100 / totalSteps;

      // Step 1: Validate credentials
      if (validateCredentials) {
        onProgress?.({
          state: VerificationState.VALIDATING_CREDENTIALS,
          message: 'Validating credentials...',
          progress: progress
        });

        const credentialResult = await this.withTimeout(
          provider.validateCredentials(config.credentials),
          timeout
        );

        if (!credentialResult.isValid) {
          onProgress?.({
            state: VerificationState.ERROR,
            message: credentialResult.error || 'Credential validation failed',
            progress: progress
          });
          return credentialResult;
        }

        progress += progressIncrement;
      }

      // Step 2: Validate workspace
      if (validateWorkspace) {
        onProgress?.({
          state: VerificationState.VALIDATING_WORKSPACE,
          message: 'Validating workspace...',
          progress: progress
        });

        const workspaceResult = await this.withTimeout(
          provider.validateWorkspace(config.credentials, config.workspaceId),
          timeout
        );

        if (!workspaceResult.isValid) {
          onProgress?.({
            state: VerificationState.ERROR,
            message: workspaceResult.error || 'Workspace validation failed',
            progress: progress
          });
          return workspaceResult;
        }

        progress += progressIncrement;
      }

      // Step 3: Validate projects
      if (validateProjects) {
        onProgress?.({
          state: VerificationState.VALIDATING_PROJECTS,
          message: 'Validating projects...',
          progress: progress
        });

        const projectIds = Object.values(config.projectIds).filter(id => id && id.trim() !== '');
        
        if (projectIds.length > 0) {
          const projectResult = await this.withTimeout(
            provider.validateProjects(config.credentials, config.workspaceId, projectIds),
            timeout
          );

          if (!projectResult.isValid) {
            onProgress?.({
              state: VerificationState.ERROR,
              message: projectResult.error || 'Project validation failed',
              progress: progress
            });
            return projectResult;
          }
        }

        progress += progressIncrement;
      }

      // Success
      onProgress?.({
        state: VerificationState.SUCCESS,
        message: 'All validations passed successfully!',
        progress: 100
      });

      return {
        isValid: true,
        details: {
          provider: provider.name,
          validatedAt: new Date().toISOString()
        }
      };

    } catch (error: any) {
      const errorMessage = error.message || 'Validation failed due to unexpected error';
      
      onProgress?.({
        state: VerificationState.ERROR,
        message: errorMessage,
        progress: 0
      });

      return {
        isValid: false,
        error: errorMessage
      };
    }
  }

  async quickValidate(config: ProviderConfiguration): Promise<ValidationResult> {
    // Quick validation with shorter timeout and minimal checks
    return this.validateConfiguration(config, {
      validateCredentials: true,
      validateWorkspace: false,
      validateProjects: false,
      timeout: 5000
    });
  }

  async validateProviderCredentials(
    providerId: string, 
    credentials: Record<string, any>
  ): Promise<ValidationResult> {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      return {
        isValid: false,
        error: `Unknown provider: ${providerId}`
      };
    }

    try {
      return await this.withTimeout(
        provider.validateCredentials(credentials),
        this.defaultTimeout
      );
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Credential validation failed'
      };
    }
  }

  async getProviderWorkspaces(
    providerId: string, 
    credentials: Record<string, any>
  ): Promise<{workspaces: any[]; error?: string}> {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      return {
        workspaces: [],
        error: `Unknown provider: ${providerId}`
      };
    }

    try {
      const workspaces = await this.withTimeout(
        provider.getWorkspaces(credentials),
        this.defaultTimeout
      );
      return { workspaces };
    } catch (error: any) {
      return {
        workspaces: [],
        error: error.message || 'Failed to fetch workspaces'
      };
    }
  }

  async getProviderProjects(
    providerId: string, 
    credentials: Record<string, any>, 
    workspaceId: string
  ): Promise<{projects: any[]; error?: string}> {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      return {
        projects: [],
        error: `Unknown provider: ${providerId}`
      };
    }

    try {
      const projects = await this.withTimeout(
        provider.getProjects(credentials, workspaceId),
        this.defaultTimeout
      );
      return { projects };
    } catch (error: any) {
      return {
        projects: [],
        error: error.message || 'Failed to fetch projects'
      };
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  // Utility method to get validation requirements for a provider
  getValidationRequirements(providerId: string): string[] {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      return [];
    }

    return provider.getConfigurationFields()
      .filter(field => field.required)
      .map(field => field.label);
  }

  // Method to check if configuration is complete (all required fields filled)
  isConfigurationComplete(providerId: string, credentials: Record<string, any>): boolean {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      return false;
    }

    const requiredFields = provider.getConfigurationFields()
      .filter(field => field.required)
      .map(field => field.key);

    return requiredFields.every(field => 
      credentials[field] && 
      String(credentials[field]).trim() !== ''
    );
  }
}

// Singleton instance
export const providerValidationService = new ProviderValidationService();