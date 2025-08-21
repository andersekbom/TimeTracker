import { Buffer } from 'buffer';
import { 
  TimeTrackingProvider, 
  ValidationResult, 
  ProjectInfo, 
  WorkspaceInfo, 
  ProviderCredentials,
  ProviderConfiguration,
  ConfigurationField 
} from '../types/TimeTrackingProvider';

export class TogglProvider extends TimeTrackingProvider {
  readonly id = 'toggl';
  readonly name = 'Toggl Track';
  readonly description = 'Professional time tracking with powerful reporting and team collaboration features';

  getConfigurationFields(): ConfigurationField[] {
    return [
      {
        key: 'apiToken',
        label: 'API Token',
        type: 'password',
        placeholder: 'Enter your Toggl API token',
        required: true,
        secure: true,
        validation: {
          minLength: 16,
          maxLength: 64,
          pattern: /^[a-zA-Z0-9]+$/
        }
      },
      {
        key: 'workspaceId',
        label: 'Workspace ID',
        type: 'text',
        placeholder: 'Enter workspace ID (numeric)',
        required: true,
        validation: {
          pattern: /^\d+$/
        }
      }
    ];
  }

  async validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult> {
    // Validate required fields
    const fieldValidation = this.validateRequiredFields(credentials, ['apiToken']);
    if (!fieldValidation.isValid) {
      return fieldValidation;
    }

    const apiToken = String(credentials.apiToken).trim();
    
    // Validate token format
    if (apiToken.length < 16) {
      return { isValid: false, error: 'API token must be at least 16 characters long' };
    }

    // Test API connection
    try {
      const auth = Buffer.from(`${apiToken}:api_token`).toString('base64');
      const response = await fetch('https://api.track.toggl.com/api/v9/me', {
        headers: { 
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const userData = await response.json();
        return { 
          isValid: true, 
          details: { 
            userName: userData.fullname || userData.email,
            userId: userData.id 
          } 
        };
      } else if (response.status === 403 || response.status === 401) {
        return { isValid: false, error: 'Invalid API token - check your Toggl credentials' };
      } else {
        return { isValid: false, error: `Toggl API error: ${response.status}` };
      }
    } catch (err: any) {
      return { isValid: false, error: `Network error: ${err.message || 'Unable to connect to Toggl'}` };
    }
  }

  async validateWorkspace(credentials: ProviderCredentials, workspaceId: string): Promise<ValidationResult> {
    if (!workspaceId || !workspaceId.trim()) {
      return { isValid: false, error: 'Workspace ID is required' };
    }

    const wsId = workspaceId.trim();
    if (!/^\d+$/.test(wsId)) {
      return { isValid: false, error: 'Workspace ID must be numeric' };
    }

    try {
      const apiToken = String(credentials.apiToken);
      const auth = Buffer.from(`${apiToken}:api_token`).toString('base64');
      const response = await fetch(`https://api.track.toggl.com/api/v9/workspaces/${wsId}`, {
        headers: { 
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const workspace = await response.json();
        return { 
          isValid: true, 
          details: { 
            workspaceName: workspace.name,
            workspaceId: workspace.id 
          } 
        };
      } else if (response.status === 403 || response.status === 404) {
        return { isValid: false, error: 'Invalid workspace ID or insufficient permissions' };
      } else {
        return { isValid: false, error: `Workspace validation error: ${response.status}` };
      }
    } catch (err: any) {
      return { isValid: false, error: `Network error: ${err.message}` };
    }
  }

  async validateProjects(credentials: ProviderCredentials, workspaceId: string, projectIds: string[]): Promise<ValidationResult> {
    try {
      const projects = await this.getProjects(credentials, workspaceId);
      const projectMap = new Map(projects.map(p => [p.id, p]));
      
      const invalidProjects: string[] = [];
      const validProjects: ProjectInfo[] = [];

      for (const projectId of projectIds) {
        if (projectId && projectId.trim() !== '') {
          const project = projectMap.get(projectId.trim());
          if (project) {
            validProjects.push(project);
          } else {
            invalidProjects.push(projectId);
          }
        }
      }

      if (invalidProjects.length > 0) {
        return { 
          isValid: false, 
          error: `Invalid project IDs: ${invalidProjects.join(', ')}`,
          details: { invalidProjects, validProjects }
        };
      }

      return { 
        isValid: true, 
        details: { validProjects } 
      };
    } catch (err: any) {
      return { isValid: false, error: `Project validation error: ${err.message}` };
    }
  }

  async getWorkspaces(credentials: ProviderCredentials): Promise<WorkspaceInfo[]> {
    const apiToken = String(credentials.apiToken);
    const auth = Buffer.from(`${apiToken}:api_token`).toString('base64');
    
    const response = await fetch('https://api.track.toggl.com/api/v9/workspaces', {
      headers: { 
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workspaces: ${response.status}`);
    }

    const workspaces = await response.json();
    return workspaces.map((ws: any) => ({
      id: String(ws.id),
      name: ws.name,
      projects: [] // Will be loaded separately when needed
    }));
  }

  async getProjects(credentials: ProviderCredentials, workspaceId: string): Promise<ProjectInfo[]> {
    const apiToken = String(credentials.apiToken);
    const auth = Buffer.from(`${apiToken}:api_token`).toString('base64');
    
    const response = await fetch(`https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/projects`, {
      headers: { 
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }

    const projects = await response.json();
    return projects.map((project: any) => ({
      id: String(project.id),
      name: project.name,
      color: project.color || '#999999',
      clientName: project.client_name
    }));
  }

  buildDeviceConfiguration(config: ProviderConfiguration): Record<string, any> {
    return {
      toggl: {
        apiToken: config.credentials.apiToken,
        workspaceId: config.workspaceId,
      },
      projects: {
        faceDown: parseInt(config.projectIds.faceDown) || 0,
        leftSide: parseInt(config.projectIds.leftSide) || 0,
        rightSide: parseInt(config.projectIds.rightSide) || 0,
        frontEdge: parseInt(config.projectIds.frontEdge) || 0,
        backEdge: parseInt(config.projectIds.backEdge) || 0,
      }
    };
  }

  parseDeviceConfiguration(deviceConfig: Record<string, any>): ProviderConfiguration | null {
    try {
      if (!deviceConfig.toggl || !deviceConfig.projects) {
        return null;
      }

      return {
        providerId: this.id,
        credentials: {
          apiToken: deviceConfig.toggl.apiToken || '',
        },
        workspaceId: String(deviceConfig.toggl.workspaceId || ''),
        projectIds: {
          faceDown: String(deviceConfig.projects.faceDown || ''),
          leftSide: String(deviceConfig.projects.leftSide || ''),
          rightSide: String(deviceConfig.projects.rightSide || ''),
          frontEdge: String(deviceConfig.projects.frontEdge || ''),
          backEdge: String(deviceConfig.projects.backEdge || ''),
        }
      };
    } catch (error) {
      return null;
    }
  }
}