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
import { Picker } from '@react-native-picker/picker';
import { useQRScanner } from '../hooks/useQRScanner';
import { useFormManager } from '../hooks/useFormManager';
import { ValidationService } from '../services/ValidationService';
import { ErrorHandler } from '../utils/errorHandler';
import type { ProjectInfo } from '../types/TimeTrackingProvider';
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{isValid: boolean; message: string} | null>(null);
  // List of available projects fetched after verification
  const [availableProjects, setAvailableProjects] = useState<ProjectInfo[]>([]);
  
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
      console.log('Checking for existing config:', existingConfig ? 'found' : 'not found');
      
      if (existingConfig) {
        console.log('Loading existing configuration for', providerId);
        // Load existing configuration
        credentialsForm.setValues({
          apiToken: String(existingConfig.credentials.apiToken || ''),
          workspaceId: String(existingConfig.workspaceId),
        });
        projectIdsForm.setValues(existingConfig.projectIds);
        
        // Load projects for existing verified configuration
        console.log('About to load projects for existing config...');
        await loadProjectsForExistingConfig(existingConfig, selectedProvider);
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

  // Load projects for existing verified configuration without re-verifying API
  const loadProjectsForExistingConfig = async (config: ProviderConfiguration, selectedProvider: any) => {
    console.log('loadProjectsForExistingConfig called with:', { providerId, selectedProvider: !!selectedProvider });
    
    if (!selectedProvider) {
      console.warn('No provider available yet, cannot load projects');
      return;
    }

    console.log('Loading projects for existing verified configuration for', providerId);
    
    // Set verification result to show the configuration is already verified
    setVerificationResult({
      isValid: true,
      message: `Previously verified ${selectedProvider.name} configuration loaded successfully.`
    });

    // Load available projects
    try {
      setIsVerifying(true);
      console.log('Fetching projects with credentials and workspace:', config.workspaceId);
      const projects = await selectedProvider.getProjects(config.credentials, config.workspaceId);
      setAvailableProjects(projects);
      console.log(`Successfully loaded ${projects.length} projects for project selection:`, projects.map((p: any) => p.name));
    } catch (error) {
      console.error('Could not load projects from saved configuration:', error);
      // If projects can't be loaded, show a message but don't mark verification as failed
      setVerificationResult({
        isValid: true,
        message: `Configuration loaded, but projects couldn't be fetched. You may need to verify the connection manually.`
      });
    } finally {
      setIsVerifying(false);
    }
  };

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
      // Fetch available projects for dropdowns
      try {
        const { workspaceId, ...creds } = credentialsForm.getValues();
        const projs = await provider.getProjects(creds, workspaceId);
        setAvailableProjects(projs);
      } catch (err) {
        // ignore project fetch errors here
      }
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

  const handleDeleteConfiguration = async () => {
    Alert.alert(
      'Delete Configuration',
      `Are you sure you want to delete the ${provider?.name} configuration? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            
            const result = await ErrorHandler.handleAsync(async () => {
              await providerStorage.clearConfiguration(providerId);
            }, 'delete-configuration');

            setIsDeleting(false);

            if (result.success) {
              // Reset form state to restart setup flow
              credentialsForm.setValues({});
              projectIdsForm.setValues(DEFAULT_VALUES.PROJECT_IDS);
              setVerificationResult(null);
              setAvailableProjects([]);
              
              Alert.alert(
                'Configuration Deleted',
                'The provider configuration has been deleted. You can now set up a new configuration.',
                [{ text: 'OK', style: 'default' }]
              );
            } else {
              ErrorHandler.showAlert(result.error?.message || 'Failed to delete configuration', 'Delete Error');
            }
          }
        }
      ]
    );
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
            <Text style={styles.verifyButtonText}>Verify API Connection</Text>
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

        {verificationResult?.isValid && (
          <>
            <Text style={styles.sectionTitle}>Select Projects for Orientations</Text>

            {orientations.map(({ key, label }) => (
              <View key={key} style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>{label}</Text>
                <Picker
                  selectedValue={projectIdsForm.getFieldValue(key)}
                  onValueChange={(value) => projectIdsForm.setValue(key, value)}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Select a project --" value="" />
                  {availableProjects.map((p) => (
                    <Picker.Item key={p.id} label={`${p.id}: ${p.name}`} value={p.id} />
                  ))}
                </Picker>
              </View>
            ))}

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
          </>
        )}

        {/* Delete Configuration Button - always visible if we have any config */}
        {(verificationResult || credentialsForm.getFieldValue('apiToken') || credentialsForm.getFieldValue('workspaceId')) && (
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
            onPress={handleDeleteConfiguration}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <View style={styles.deletingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.deleteButtonText}>Deleting...</Text>
              </View>
            ) : (
              <Text style={styles.deleteButtonText}>Delete Configuration</Text>
            )}
          </TouchableOpacity>
        )}
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
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
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
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  deleteButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deletingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
