import { useState } from 'react';
import { Alert } from 'react-native';
import { QRScanField, QRScanHandlers } from '../utils/qrScanHandlers';
import { ValidationService } from '../services/ValidationService';

export const useQRScanner = (handlers: Partial<QRScanHandlers>) => {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanField, setQrScanField] = useState<QRScanField | null>(null);

  const openQRScanner = (field: QRScanField) => {
    setQrScanField(field);
    setShowQRScanner(true);
  };

  const closeQRScanner = () => {
    setShowQRScanner(false);
    setQrScanField(null);
  };

  const processQRScanResult = (data: string) => {
    if (!qrScanField) return;

    try {
      switch (qrScanField) {
        case 'wifi-password':
          handlers.setWifiPassword?.(data);
          Alert.alert('Success', 'WiFi password scanned successfully!');
          break;

        case 'toggl-token':
          handlers.setTogglToken?.(data);
          Alert.alert('Success', 'API token scanned successfully!');
          break;

        case 'clockify-key':
          handlers.setClockifyKey?.(data);
          Alert.alert('Success', 'API key scanned successfully!');
          break;

        case 'workspace-id':
          const workspaceResult = ValidationService.validateWorkspaceId(data);
          if (!workspaceResult.isValid) {
            Alert.alert('Error', workspaceResult.error);
          } else {
            handlers.setWorkspaceId?.(data.trim());
            Alert.alert('Success', 'Workspace ID scanned successfully!');
          }
          break;

        case 'project-ids':
          processMultipleProjectIds(data);
          break;

        default:
          if (qrScanField.includes('-') && handlers.updateProjectId) {
            processSingleProjectId(data, qrScanField);
          }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process scanned data');
    }

    closeQRScanner();
  };

  const processSingleProjectId = (data: string, field: QRScanField) => {
    const result = ValidationService.validateProjectId(data);
    if (!result.isValid) {
      Alert.alert('Error', result.error);
      return;
    }

    const orientationMap: Record<string, string> = {
      'face-down': 'faceDown',
      'left-side': 'leftSide',
      'right-side': 'rightSide',
      'front-edge': 'frontEdge',
      'back-edge': 'backEdge',
    };

    const orientation = orientationMap[field];
    if (orientation && handlers.updateProjectId) {
      handlers.updateProjectId(orientation as any, data.trim());
      Alert.alert('Success', `${field.replace('-', ' ')} project ID scanned successfully!`);
    }
  };

  const processMultipleProjectIds = (data: string) => {
    try {
      let projectArray: number[] = [];
      
      if (data.trim().startsWith('[')) {
        projectArray = JSON.parse(data);
      } else {
        projectArray = data.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }
      
      if (projectArray.length === 0) {
        Alert.alert('Error', 'No valid project IDs found in scanned data');
        return;
      }

      const orientations = ['faceDown', 'leftSide', 'rightSide', 'frontEdge', 'backEdge'];
      const updatedProjectIds: Record<string, number> = {};
      
      orientations.forEach((orientation, index) => {
        if (index < projectArray.length) {
          updatedProjectIds[orientation] = projectArray[index];
        }
      });
      
      // Convert numbers to strings for form manager compatibility
      const projectIdsAsStrings = Object.fromEntries(
        Object.entries(updatedProjectIds).map(([key, value]) => [key, String(value)])
      );
      handlers.setProjectIds?.(projectIdsAsStrings);
      Alert.alert('Success', `${Math.min(projectArray.length, 5)} project IDs scanned successfully!`);
    } catch (error) {
      Alert.alert('Error', 'Could not parse project IDs from scanned data. Expected format: [1234,5678,9012] or 1234,5678,9012');
    }
  };

  const getQRScannerTitle = (): string => {
    const titleMap: Record<QRScanField, string> = {
      'wifi-password': 'Scan WiFi Password',
      'toggl-token': 'Scan API Token',
      'clockify-key': 'Scan API Key',
      'workspace-id': 'Scan Workspace ID',
      'project-ids': 'Scan All Project IDs',
      'face-down': 'Scan Face Down Project ID',
      'left-side': 'Scan Left Side Project ID',
      'right-side': 'Scan Right Side Project ID',
      'front-edge': 'Scan Front Edge Project ID',
      'back-edge': 'Scan Back Edge Project ID',
    };

    return qrScanField ? titleMap[qrScanField] || 'Scan QR Code' : 'Scan QR Code';
  };

  return {
    showQRScanner,
    qrScanField,
    openQRScanner,
    closeQRScanner,
    processQRScanResult,
    getQRScannerTitle,
  };
};