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
import { useQRScanner } from '../hooks/useQRScanner';
import { useFormManager } from '../hooks/useFormManager';
import { ValidationService } from '../services/ValidationService';
import { ErrorHandler } from '../utils/errorHandler';
import { DEFAULT_VALUES, TEST_CONFIG } from '../constants/config';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{isValid: boolean; message: string} | null>(null);
  const [isFetchingProjects, setIsFetchingProjects] = useState(false);
  // Fetched project names keyed by orientation (faceDown, leftSide, etc.)
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  
  // Use form manager for credentials
  const credentialsForm = useFormManager();
  
  // Use form manager for project IDs
  const projectIdsForm = useFormManager(DEFAULT_VALUES.PROJECT_IDS);

  // Use QR scanner hook
  const qrScanner = useQRScanner({
    setTogglToken: (value) => credentialsForm.setValue('apiToken', value),
    setClockifyKey: (value) => credentialsForm.setValue('apiKey', value),
    setWorkspaceId: (value) => credentialsForm.setValue('workspaceId', value),
    updateProjectId: (orientation, value) => projectIdsForm.setValue(orientation, value),
    setProjectIds: (ids) => projectIdsForm.setValues(ids),
  });

  // Load provider and set default values
  // Load or initialize form defaults when the providerId changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const selectedProvider = providerRegistry.getProvider(providerId);
    if (selectedProvider) {
      setProvider(selectedProvider);
      
    // Load existing saved configuration (if any) before applying development defaults
    (async () => {
      const allConfigs = await providerStorage.loadAllConfigurations();
      const existingConfig = allConfigs[providerId];
      if (existingConfig) {
        credentialsForm.setValues({
          apiToken: existingConfig.credentials.apiToken,
          workspaceId: existingConfig.workspaceId,
        });
        projectIdsForm.setValues(existingConfig.projectIds);
        return;
      }

      // Set default testing values based on provider (only in development)
      if (__DEV__) {
        if (providerId === 'toggl' && TEST_CONFIG.TOGGL.API_TOKEN) {
          credentialsForm.setValues({
            apiToken: TEST_CONFIG.TOGGL.API_TOKEN,
            workspaceId: TEST_CONFIG.TOGGL.WORKSPACE_ID,
          });
          
          const projectIdsAsStrings = Object.fromEntries(
            Object.entries(TEST_CONFIG.TOGGL.PROJECT_IDS).map(([key, value]) => [key, String(value)])
          );
          projectIdsForm.setValues(projectIdsAsStrings);
        } else if (providerId === 'clockify' && TEST_CONFIG.CLOCKIFY.API_KEY) {
          credentialsForm.setValues({
            apiKey: TEST_CONFIG.CLOCKIFY.API_KEY,
            workspaceId: TEST_CONFIG.CLOCKIFY.WORKSPACE_ID,
          });
          
          const projectIdsAsStrings = Object.fromEntries(
            Object.entries(TEST_CONFIG.CLOCKIFY.PROJECT_IDS).map(([key, value]) => [key, String(value)])
          );
          projectIdsForm.setValues(projectIdsAsStrings);
        }
      }
    })();
    }
  }, [providerId]);

  // QR Scanner is handled by the hook
  const onQRScanResult = (data: string) => {
    qrScanner.processQRScanResult(data);
  };

  const handleVerify = async () => {
    if (!provider) {
      ErrorHandler.showAlert('Provider not loaded', 'Error');
      return;
    }

    const credentials = credentialsForm.getValues();
    const { workspaceId, ...providerCredentials } = credentials;

    // Validate required fields using ValidationService
    const configFields = provider.getConfigurationFields();
    const requiredFields = configFields.filter((field: any) => field.required).map((field: any) => field.key);
    
    const credentialsValidation = ValidationService.validateProviderCredentials(credentials, requiredFields);
    if (!credentialsValidation.isValid) {
      ErrorHandler.showAlert(credentialsValidation.error!, 'Missing Information');
      return;
    }

    const workspaceValidation = ValidationService.validateWorkspaceId(workspaceId);
    if (!workspaceValidation.isValid) {
      ErrorHandler.showAlert(workspaceValidation.error!, 'Missing Information');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    const result = await ErrorHandler.handleAsync(async () => {
      // Validate credentials
      const credentialResult = await provider.validateCredentials(providerCredentials);
      if (!credentialResult.isValid) {
        throw new Error(`Credential validation failed: ${credentialResult.error || 'Invalid credentials'}`);
      }

      // Validate workspace
      const workspaceResult = await provider.validateWorkspace(providerCredentials, workspaceId);
      if (!workspaceResult.isValid) {
        throw new Error(`Workspace validation failed: ${workspaceResult.error || 'Invalid workspace ID'}`);
      }

      return { credentialResult, workspaceResult };
    }, 'verification');

    setIsVerifying(false);

    if (result.success) {
      setVerificationResult({
        isValid: true,
        message: `API connection verified successfully! ${provider.name} credentials and workspace are valid.`
      });
    } else {
      const userMessage = ErrorHandler.createUserFriendlyMessage(new Error(result.error?.message || ''));
      setVerificationResult({
        isValid: false,
        message: userMessage
      });
    }
  };

  const handleSave = async () => {
    if (!provider) {
      ErrorHandler.showAlert('Provider not loaded', 'Error');
      return;
    }

    const credentials = credentialsForm.getValues();
    const projectIds = projectIdsForm.getValues();

    // Validate all required fields
    const { workspaceId, ...providerCredentials } = credentials;
    const configFields = provider.getConfigurationFields();
    const requiredFields = configFields.filter((field: any) => field.required).map((field: any) => field.key);
    
    const credentialsValidation = ValidationService.validateProviderCredentials(credentials, requiredFields);
    if (!credentialsValidation.isValid) {
      ErrorHandler.showAlert(credentialsValidation.error!, 'Missing Information');
      return;
    }

    // Check if verification was successful before saving
    if (!verificationResult || !verificationResult.isValid) {
      Alert.alert(
        'Verification Required', 
        'Please verify your connection before saving the configuration.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setIsSaving(true);
    
    const result = await ErrorHandler.handleAsync(async () => {
      const config: ProviderConfiguration = {
        providerId,
        credentials: providerCredentials,
        workspaceId: workspaceId,
        projectIds: {
          faceDown: projectIds.faceDown || '0',
          leftSide: projectIds.leftSide || '0',
          rightSide: projectIds.rightSide || '0',
          frontEdge: projectIds.frontEdge || '0',
          backEdge: projectIds.backEdge || '0',
        },
      };

      await providerStorage.saveConfiguration(config);
      return config;
    }, 'save-configuration');

    setIsSaving(false);

    if (result.success) {
      onComplete();
    } else {
      ErrorHandler.showAlert(result.error?.message || 'Failed to save configuration', 'Save Error');
    }
  };

  const handleFetchProjectNames = async () => {
    if (!verificationResult?.isValid) {
      Alert.alert(
        'Verification Required',
        'Please verify your API token and workspace before fetching project names.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (!provider) {
      Alert.alert('Error', 'Provider not loaded');
      return;
    }
    setIsFetchingProjects(true);
    try {
      const { workspaceId, ...creds } = credentialsForm.getValues();
      const idsMap = projectIdsForm.getValues();
      const projects = await provider.getProjects(creds, workspaceId);
      const namesMap: Record<string, string> = {};
      Object.entries(idsMap).forEach(([key, id]) => {
        const pid = id?.trim();
        if (!pid) {
          namesMap[key] = '';
        } else {
          const found = projects.find((p) => p.id === pid);
          namesMap[key] = found
            ? found.name
            : `No project found for ID ${pid}`;
        }
      });
      setProjectNames(namesMap);
    } catch (err: any) {
      ErrorHandler.showAlert(err.message || 'Failed to fetch project names', 'Error');
    } finally {
      setIsFetchingProjects(false);
    }
  };

  const orientations = DEFAULT_VALUES.PROJECT_ORIENTATIONS;

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
                value={credentialsForm.getFieldValue(field.key)}
                onChangeText={(value) => credentialsForm.setValue(field.key, value)}
                placeholder={field.placeholder || `Enter your ${field.label.toLowerCase()}`}
                secureTextEntry={field.secure ?? (field.type === 'password')}
                keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                onScan={() => qrScanner.openQRScanner(
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
          onPress={() => qrScanner.openQRScanner('project-ids')}
        >
          <Text style={styles.scanAllButtonText}>📱 Scan All Project IDs</Text>
        </TouchableOpacity>
        
        {orientations.map(({ key, label, scanKey }) => (
          <View key={key}>
            <InputWithScan
              label={projectNames[key]
                ? `${label} - ${projectNames[key]}`
                : label
              }
              value={projectIdsForm.getFieldValue(key)}
              onChangeText={(value) => projectIdsForm.setValue(key, value)}
              placeholder="Project ID (optional)"
              keyboardType="numeric"
              onScan={() => qrScanner.openQRScanner(scanKey as any)}
              scanButtonText="QR"
            />
          </View>
        ))}

        {/* Fetch project names for entered IDs */}
        <TouchableOpacity
          style={[styles.scanAllButton, isFetchingProjects && styles.saveButtonDisabled]}
          onPress={handleFetchProjectNames}
          disabled={isFetchingProjects}
        >
          {isFetchingProjects ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.scanAllButtonText}>Fetch Project Names</Text>
          )}
        </TouchableOpacity>

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
        visible={qrScanner.showQRScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <QRCodeScanner
          onQRScanned={onQRScanResult}
          onClose={qrScanner.closeQRScanner}
          title={qrScanner.getQRScannerTitle()}
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
