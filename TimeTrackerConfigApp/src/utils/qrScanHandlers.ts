import { Alert } from 'react-native';
import { validateProjectId, validateWorkspaceId } from './configValidation';

export type QRScanField = 
  | 'wifi-password' 
  | 'toggl-token' 
  | 'workspace-id' 
  | 'project-ids' 
  | 'face-down' 
  | 'left-side' 
  | 'right-side' 
  | 'front-edge' 
  | 'back-edge';

export interface QRScanHandlers {
  setWifiPassword: (value: string) => void;
  setTogglToken: (value: string) => void;
  setWorkspaceId: (value: string) => void;
  updateProjectId: (orientation: string, value: string) => void;
  setProjectIds: (ids: any) => void;
}

export const handleQRScanResult = (
  data: string,
  field: QRScanField,
  handlers: QRScanHandlers,
  currentProjectIds: any
): void => {
  try {
    switch (field) {
      case 'wifi-password':
        handlers.setWifiPassword(data);
        Alert.alert('Success', 'WiFi password scanned successfully!');
        break;

      case 'toggl-token':
        handlers.setTogglToken(data);
        Alert.alert('Success', 'Toggl API token scanned successfully!');
        break;

      case 'workspace-id':
        const workspaceResult = validateWorkspaceId(data);
        if (!workspaceResult.isValid) {
          Alert.alert('Error', workspaceResult.error);
        } else {
          handlers.setWorkspaceId(workspaceResult.workspaceId!);
          Alert.alert('Success', 'Workspace ID scanned successfully!');
        }
        break;

      case 'face-down':
        handleSingleProjectId(data, 'faceDown', handlers.updateProjectId, 'Face Down');
        break;

      case 'left-side':
        handleSingleProjectId(data, 'leftSide', handlers.updateProjectId, 'Left Side');
        break;

      case 'right-side':
        handleSingleProjectId(data, 'rightSide', handlers.updateProjectId, 'Right Side');
        break;

      case 'front-edge':
        handleSingleProjectId(data, 'frontEdge', handlers.updateProjectId, 'Front Edge');
        break;

      case 'back-edge':
        handleSingleProjectId(data, 'backEdge', handlers.updateProjectId, 'Back Edge');
        break;

      case 'project-ids':
        handleMultipleProjectIds(data, handlers.setProjectIds, currentProjectIds);
        break;

      default:
        Alert.alert('Error', 'Unknown scan field');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to process scanned data');
  }
};

const handleSingleProjectId = (
  data: string,
  orientation: string,
  updateProjectId: (orientation: string, value: string) => void,
  displayName: string
): void => {
  const result = validateProjectId(data);
  if (!result.isValid) {
    Alert.alert('Error', result.error);
  } else {
    updateProjectId(orientation, data.trim());
    Alert.alert('Success', `${displayName} project ID scanned successfully!`);
  }
};

const handleMultipleProjectIds = (
  data: string,
  setProjectIds: (ids: any) => void,
  currentProjectIds: any
): void => {
  try {
    let projectArray: number[] = [];
    
    // Try parsing as JSON first
    if (data.trim().startsWith('[')) {
      projectArray = JSON.parse(data);
    } else {
      // Try parsing as comma-separated values
      projectArray = data.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }
    
    if (projectArray.length === 0) {
      Alert.alert('Error', 'No valid project IDs found in scanned data');
      return;
    }

    const orientations = ['faceDown', 'leftSide', 'rightSide', 'frontEdge', 'backEdge'];
    const updatedProjectIds = { ...currentProjectIds };
    
    orientations.forEach((orientation, index) => {
      if (index < projectArray.length) {
        updatedProjectIds[orientation] = projectArray[index];
      }
    });
    
    setProjectIds(updatedProjectIds);
    Alert.alert('Success', `${Math.min(projectArray.length, 5)} project IDs scanned successfully!`);
  } catch (error) {
    Alert.alert('Error', 'Could not parse project IDs from scanned data. Expected format: [1234,5678,9012] or 1234,5678,9012');
  }
};