import { 
  TimeTrackingProvider, 
  ConfigurationField, 
  ValidationResult, 
  ProviderConfiguration,
  ProviderCredentials,
  WorkspaceInfo,
  ProjectInfo 
} from '../types/TimeTrackingProvider';

export class ClockifyProvider extends TimeTrackingProvider {
  readonly id = 'clockify';
  readonly name = 'Clockify';
  readonly description = 'Free time tracking for teams with powerful reporting and project management features';

  getConfigurationFields(): ConfigurationField[] {
    return [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        secure: true,
        placeholder: 'Enter your Clockify API key',
        helpText: 'Generated in Profile Settings → API section'
      },
      {
        key: 'workspaceId',
        label: 'Workspace ID',
        type: 'text',
        required: true,
        secure: false,
        placeholder: 'e.g., 507f1f77bcf86cd799439011',
        helpText: 'Your Clockify workspace identifier'
      }
    ];
  }

  async validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult> {
    const validationResult = this.validateRequiredFields(credentials, ['apiKey']);
    if (!validationResult.isValid) {
      return validationResult;
    }

    try {
      const apiKey = String(credentials.apiKey).trim();
      
      if (apiKey.length < 16) {
        return {
          isValid: false,
          error: 'API key appears to be too short. Please check your Clockify API key.'
        };
      }

      // Test API connection by getting user profile
      const response = await fetch('https://api.clockify.me/api/v1/user', {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return {
          isValid: true,
          message: `Successfully authenticated as ${userData.name || userData.email || 'Clockify user'}`
        };
      } else if (response.status === 401) {
        return {
          isValid: false,
          error: 'Invalid API key. Please check your Clockify API key in Profile Settings.'
        };
      } else if (response.status === 403) {
        return {
          isValid: false,
          error: 'API access forbidden. Please ensure your API key has proper permissions.'
        };
      } else {
        return {
          isValid: false,
          error: `Clockify API error: HTTP ${response.status}. Please try again later.`
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: `Connection failed: ${error instanceof Error ? error.message : 'Network error'}. Please check your internet connection.`
      };
    }
  }

  async validateWorkspace(credentials: ProviderCredentials, workspaceId: string): Promise<ValidationResult> {
    const credentialValidation = await this.validateCredentials(credentials);
    if (!credentialValidation.isValid) {
      return credentialValidation;
    }

    if (!workspaceId?.trim()) {
      return {
        isValid: false,
        error: 'Workspace ID is required'
      };
    }

    try {
      const apiKey = String(credentials.apiKey).trim();
      const wsId = workspaceId.trim();

      // Get workspace details
      const response = await fetch(`https://api.clockify.me/api/v1/workspaces/${wsId}`, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const workspace = await response.json();
        return {
          isValid: true,
          message: `Successfully connected to workspace: ${workspace.name}`
        };
      } else if (response.status === 404) {
        return {
          isValid: false,
          error: 'Workspace not found. Please check your workspace ID.'
        };
      } else if (response.status === 403) {
        return {
          isValid: false,
          error: 'Access denied to workspace. Please check your permissions.'
        };
      } else {
        return {
          isValid: false,
          error: `Failed to access workspace: HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: `Connection failed: ${error instanceof Error ? error.message : 'Network error'}`
      };
    }
  }

  async validateProjects(credentials: ProviderCredentials, workspaceId: string, projectIds: string[]): Promise<ValidationResult> {
    const workspaceValidation = await this.validateWorkspace(credentials, workspaceId);
    if (!workspaceValidation.isValid) {
      return workspaceValidation;
    }

    if (!projectIds || projectIds.length === 0) {
      return {
        isValid: true,
        message: 'No project IDs to validate'
      };
    }

    try {
      const apiKey = String(credentials.apiKey).trim();
      const wsId = workspaceId.trim();
      
      // Get all projects in workspace
      const response = await fetch(`https://api.clockify.me/api/v1/workspaces/${wsId}/projects`, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return {
          isValid: false,
          error: `Failed to fetch projects: HTTP ${response.status}`
        };
      }

      const projects = await response.json();
      const projectIdSet = new Set(projects.map((p: any) => p.id));
      
      const invalidProjects = projectIds.filter(id => id && id !== '0' && !projectIdSet.has(id));
      
      if (invalidProjects.length > 0) {
        return {
          isValid: false,
          error: `Invalid project IDs: ${invalidProjects.join(', ')}`
        };
      }

      return {
        isValid: true,
        message: `All ${projectIds.filter(id => id && id !== '0').length} project IDs are valid`
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Project validation failed: ${error instanceof Error ? error.message : 'Network error'}`
      };
    }
  }

  async getWorkspaces(credentials: ProviderCredentials): Promise<WorkspaceInfo[]> {
    const credentialValidation = await this.validateCredentials(credentials);
    if (!credentialValidation.isValid) {
      throw new Error(credentialValidation.error || 'Invalid credentials');
    }

    try {
      const apiKey = String(credentials.apiKey).trim();
      
      const response = await fetch('https://api.clockify.me/api/v1/workspaces', {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch workspaces: HTTP ${response.status}`);
      }

      const workspaces = await response.json();
      return workspaces.map((ws: any) => ({
        id: ws.id,
        name: ws.name
      }));
    } catch (error) {
      throw new Error(`Failed to get workspaces: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  }

  async getProjects(credentials: ProviderCredentials, workspaceId: string): Promise<ProjectInfo[]> {
    const workspaceValidation = await this.validateWorkspace(credentials, workspaceId);
    if (!workspaceValidation.isValid) {
      throw new Error(workspaceValidation.error || 'Invalid workspace');
    }

    try {
      const apiKey = String(credentials.apiKey).trim();
      const wsId = workspaceId.trim();
      
      const response = await fetch(`https://api.clockify.me/api/v1/workspaces/${wsId}/projects`, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: HTTP ${response.status}`);
      }

      const projects = await response.json();
      return projects
        .filter((project: any) => !project.archived) // Only active projects
        .map((project: any) => ({
          id: project.id,
          name: project.name,
          clientName: project.clientName || undefined
        }));
    } catch (error) {
      throw new Error(`Failed to get projects: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  }

  buildDeviceConfiguration(config: ProviderConfiguration): Record<string, any> {
    return {
      provider: this.id,
      apiKey: config.credentials.apiKey,
      workspaceId: config.workspaceId,
      projectIds: {
        faceDown: config.projectIds.faceDown || '0',
        leftSide: config.projectIds.leftSide || '0',
        rightSide: config.projectIds.rightSide || '0',
        frontEdge: config.projectIds.frontEdge || '0',
        backEdge: config.projectIds.backEdge || '0'
      }
    };
  }

  parseDeviceConfiguration(deviceConfig: Record<string, any>): ProviderConfiguration | null {
    try {
      if (deviceConfig.provider !== this.id) {
        return null;
      }

      return {
        providerId: this.id,
        credentials: {
          apiKey: deviceConfig.apiKey
        },
        workspaceId: deviceConfig.workspaceId,
        projectIds: {
          faceDown: deviceConfig.projectIds?.faceDown || '0',
          leftSide: deviceConfig.projectIds?.leftSide || '0',
          rightSide: deviceConfig.projectIds?.rightSide || '0',
          frontEdge: deviceConfig.projectIds?.frontEdge || '0',
          backEdge: deviceConfig.projectIds?.backEdge || '0'
        }
      };
    } catch (error) {
      console.error('Failed to parse Clockify device configuration:', error);
      return null;
    }
  }
}