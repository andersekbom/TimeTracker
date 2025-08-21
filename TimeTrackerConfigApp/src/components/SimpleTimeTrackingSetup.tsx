import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { ProviderConfiguration } from '../types/TimeTrackingProvider';
import { providerStorage } from '../services/ProviderStorage';
import { providerRegistry } from '../services/ProviderRegistry';
import { QRCodeScanner } from './QRCodeScanner';
import { InputWithScan } from './ui/InputWithScan';
import { handleQRScanResult, QRScanField } from '../utils/qrScanHandlers';

interface SimpleTimeTrackingSetupProps {
  onComplete: () => void;
  onBack: () => void;
  providerId: string; // Which provider to configure
}

export const SimpleTimeTrackingSetup: React.FC<SimpleTimeTrackingSetupProps> = ({
  onComplete,
  onBack,
  providerId
}) => {
  const [provider, setProvider] = useState<any>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{isValid: boolean; message: string} | null>(null);
  const [projectIds, setProjectIds] = useState({
    faceDown: '0',
    leftSide: '0',
    rightSide: '0',
    frontEdge: '0',
    backEdge: '0',
  });

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanField, setQrScanField] = useState<QRScanField | null>(null);

  // Load provider and set default values
  useEffect(() => {
    const selectedProvider = providerRegistry.getProvider(providerId);
    if (selectedProvider) {
      setProvider(selectedProvider);
      
      // Set default testing values based on provider
      if (providerId === 'toggl') {
        setCredentials({ 
          apiToken: '8512ae2df80f50ecaa5a7e0c4c96cc57',
          workspaceId: '20181448'
        });
        setProjectIds({
          faceDown: '212267804',
          leftSide: '212267805',
          rightSide: '212267806',
          frontEdge: '212267807',
          backEdge: '212267809',
        });
      } else if (providerId === 'clockify') {
        setCredentials({ 
          apiKey: 'your-clockify-api-key-here',
          workspaceId: 'your-workspace-id-here'
        });
        setProjectIds({
          faceDown: '0', // Break time
          leftSide: 'project-id-1',
          rightSide: 'project-id-2',
          frontEdge: 'project-id-3',
          backEdge: 'project-id-4',
        });
      }
    }
  }, [providerId]);

  // QR Scanner handlers
  const handleQRScanRequest = (field: QRScanField) => {
    setQrScanField(field);
    setShowQRScanner(true);
  };

  const updateProjectId = (orientation: keyof typeof projectIds, value: string) => {
    setProjectIds(prev => ({
      ...prev,
      [orientation]: value
    }));
  };

  const onQRScanResult = (data: string) => {
    setShowQRScanner(false);
    
    if (qrScanField) {
      handleQRScanResult(data, qrScanField, {
        setWifiPassword: () => {}, // Not used in setup
        setTogglToken: (value) => setCredentials(prev => ({ ...prev, apiToken: value })),
        setClockifyKey: (value) => setCredentials(prev => ({ ...prev, apiKey: value })),
        setWorkspaceId: (value) => setCredentials(prev => ({ ...prev, workspaceId: value })),
        updateProjectId,
        setProjectIds,
      }, projectIds);
    }
  };

  const handleVerify = async () => {
    if (!provider) {
      Alert.alert('Error', 'Provider not loaded');
      return;
    }

    // Check if required fields are filled
    const configFields = provider.getConfigurationFields();
    const requiredFields = configFields.filter((field: any) => field.required);
    
    for (const field of requiredFields) {
      if (!credentials[field.key] || !credentials[field.key].trim()) {
        Alert.alert('Missing Information', `Please enter ${field.label}`);
        return;
      }
    }

    if (!credentials.workspaceId?.trim()) {
      Alert.alert('Missing Information', 'Please enter Workspace ID');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Validate credentials
      const credentialResult = await provider.validateCredentials(credentials);
      if (!credentialResult.isValid) {
        setVerificationResult({
          isValid: false,
          message: `Credential validation failed: ${credentialResult.error || 'Invalid credentials'}`
        });
        return;
      }

      // Validate workspace
      const workspaceResult = await provider.validateWorkspace(credentials, credentials.workspaceId!);
      if (!workspaceResult.isValid) {
        setVerificationResult({
          isValid: false,
          message: `Workspace validation failed: ${workspaceResult.error || 'Invalid workspace ID'}`
        });
        return;
      }

      // Success
      setVerificationResult({
        isValid: true,
        message: `API connection verified successfully! ${provider.name} credentials and workspace are valid.`
      });

    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        isValid: false,
        message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!provider) {
      Alert.alert('Error', 'Provider not loaded');
      return;
    }

    // Check if required fields are filled
    const configFields = provider.getConfigurationFields();
    const requiredFields = configFields.filter((field: any) => field.required);
    
    for (const field of requiredFields) {
      if (!credentials[field.key] || !credentials[field.key].trim()) {
        Alert.alert('Missing Information', `Please enter ${field.label}`);
        return;
      }
    }

    if (!credentials.workspaceId?.trim()) {
      Alert.alert('Missing Information', 'Please enter Workspace ID');
      return;
    }

    // Check if verification was successful before saving
    if (!verificationResult || !verificationResult.isValid) {
      Alert.alert(
        'Verification Required', 
        'Please verify your connection before saving the configuration.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      return;
    }

    setIsSaving(true);
    try {
      const { workspaceId, ...providerCredentials } = credentials;
      const config: ProviderConfiguration = {
        providerId,
        credentials: providerCredentials,
        workspaceId: workspaceId!,
        projectIds,
      };

      await providerStorage.saveConfiguration(config);
      //Alert.alert('Success', 'Configuration saved successfully!');
      onComplete();
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const orientations = [
    { key: 'faceDown', label: 'Face Down', description: '' },
    { key: 'leftSide', label: 'Left Side', description: '' },
    { key: 'rightSide', label: 'Right Side', description: '' },
    { key: 'frontEdge', label: 'Front Edge', description: '' },
    { key: 'backEdge', label: 'Back Edge', description: '' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Time Tracking Setup</Text>
      </View>

      <ScrollView style={styles.content}>
        {provider && (
          <>
            <Text style={styles.sectionTitle}>{provider.name} Configuration</Text>
            
            {provider.getConfigurationFields().map((field: any) => (
              <InputWithScan
                key={field.key}
                label={field.label + (field.required ? ' *' : '')}
                value={credentials[field.key] || ''}
                onChangeText={(value) => setCredentials(prev => ({ ...prev, [field.key]: value }))}
                placeholder={field.placeholder || `Enter your ${field.label.toLowerCase()}`}
                secureTextEntry={field.type === 'password'}
                keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                onScan={() => handleQRScanRequest(
                  field.key === 'apiToken' ? 'toggl-token' :
                  field.key === 'apiKey' ? 'clockify-key' :
                  'toggl-token'
                )}
                scanButtonText="QR"
              />
            ))}
          </>
        )}

        {/* Verify Button */}
        <TouchableOpacity 
          style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]} 
          onPress={handleVerify}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <View style={styles.verifyingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.verifyButtonText}>Verifying...</Text>
            </View>
          ) : (
            <Text style={styles.verifyButtonText}>🔍 Verify API Connection</Text>
          )}
        </TouchableOpacity>

        {/* Verification Result */}
        {verificationResult && (
          <View style={[
            styles.verificationResult,
            verificationResult.isValid ? styles.verificationSuccess : styles.verificationError
          ]}>
            <Text style={[
              styles.verificationText,
              verificationResult.isValid ? styles.verificationSuccessText : styles.verificationErrorText
            ]}>
              {verificationResult.isValid ? '✅' : '❌'} {verificationResult.message}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Project IDs by Orientation</Text>
        
        <TouchableOpacity
          style={styles.scanAllButton}
          onPress={() => handleQRScanRequest('project-ids')}
        >
          <Text style={styles.scanAllButtonText}>📱 Scan All Project IDs</Text>
        </TouchableOpacity>
        
        {orientations.map(({ key, label, description }) => {
          const qrScanKey = key === 'faceDown' ? 'face-down' :
                           key === 'leftSide' ? 'left-side' :
                           key === 'rightSide' ? 'right-side' :
                           key === 'frontEdge' ? 'front-edge' :
                           key === 'backEdge' ? 'back-edge' : 'face-down';
          
          return (
            <View key={key}>
              <Text style={styles.description}>{description}</Text>
              <InputWithScan
                label={label}
                value={projectIds[key as keyof typeof projectIds]}
                onChangeText={(value) => setProjectIds(prev => ({
                  ...prev,
                  [key]: value
                }))}
                placeholder="Project ID (optional)"
                keyboardType="numeric"
                onScan={() => handleQRScanRequest(qrScanKey as QRScanField)}
                scanButtonText="QR"
              />
            </View>
          );
        })}

        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Configuration</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* QR Code Scanner Modal */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <QRCodeScanner
          onQRScanned={onQRScanResult}
          onClose={() => {
            setShowQRScanner(false);
            setQrScanField(null);
          }}
          title={
            qrScanField === 'toggl-token' ? 'Scan Toggl API Token' :
            qrScanField === 'clockify-key' ? 'Scan Clockify API Key' :
            qrScanField === 'workspace-id' ? 'Scan Workspace ID' :
            qrScanField === 'project-ids' ? 'Scan All Project IDs' :
            qrScanField === 'face-down' ? 'Scan Face Down Project ID' :
            qrScanField === 'left-side' ? 'Scan Left Side Project ID' :
            qrScanField === 'right-side' ? 'Scan Right Side Project ID' :
            qrScanField === 'front-edge' ? 'Scan Front Edge Project ID' :
            qrScanField === 'back-edge' ? 'Scan Back Edge Project ID' :
            'Scan QR Code'
          }
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 20,
    marginBottom: 15,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scanAllButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#FF9500',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationResult: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  verificationSuccess: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  verificationError: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  verificationSuccessText: {
    color: '#2E7D32',
  },
  verificationErrorText: {
    color: '#C62828',
  },
});