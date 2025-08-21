import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
// Removed Picker import - using simple TouchableOpacity buttons instead
import { 
  ProviderConfiguration, 
  VerificationState, 
  VerificationStatus,
  ConfigurationField 
} from '../types/TimeTrackingProvider';
import { providerRegistry } from '../services/ProviderRegistry';
import { providerStorage } from '../services/ProviderStorage';
import { providerValidationService } from '../services/ProviderValidationService';

interface TimeTrackingSetupProps {
  onComplete: () => void;
  onBack: () => void;
}

export const TimeTrackingSetup: React.FC<TimeTrackingSetupProps> = ({
  onConfigurationSaved,
  onCancel,
  initialConfig
}) => {
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    initialConfig?.providerId || 'toggl'
  );
  const [credentials, setCredentials] = useState<Record<string, string>>(
    initialConfig?.credentials || {}
  );
  const [workspaceId, setWorkspaceId] = useState<string>(
    initialConfig?.workspaceId || ''
  );
  const [projectIds, setProjectIds] = useState({
    faceDown: initialConfig?.projectIds.faceDown || '',
    leftSide: initialConfig?.projectIds.leftSide || '',
    rightSide: initialConfig?.projectIds.rightSide || '',
    frontEdge: initialConfig?.projectIds.frontEdge || '',
    backEdge: initialConfig?.projectIds.backEdge || '',
  });
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    state: VerificationState.IDLE
  });
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState<string | null>(null);

  const availableProviders = providerRegistry.getAvailableProviders();
  const currentProvider = providerRegistry.getProvider(selectedProviderId);

  useEffect(() => {
    // Reset form when provider changes
    if (!initialConfig || selectedProviderId !== initialConfig.providerId) {
      setCredentials({});
      setWorkspaceId('');
      setProjectIds({
        faceDown: '',
        leftSide: '',
        rightSide: '',
        frontEdge: '',
        backEdge: '',
      });
    }
    setAvailableWorkspaces([]);
    setAvailableProjects([]);
  }, [selectedProviderId]);

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  const handleProjectIdChange = (orientation: string, projectId: string) => {
    setProjectIds(prev => ({ ...prev, [orientation]: projectId }));
  };

  const handleVerifyCredentials = async () => {
    if (!currentProvider) return;

    try {
      setVerificationStatus({
        state: VerificationState.VALIDATING_CREDENTIALS,
        message: 'Verifying credentials...',
        progress: 0
      });

      const result = await providerValidationService.validateProviderCredentials(
        selectedProviderId,
        credentials
      );

      if (result.isValid) {
        setVerificationStatus({
          state: VerificationState.SUCCESS,
          message: 'Credentials verified successfully!',
          progress: 100
        });

        // Load workspaces
        const { workspaces, error } = await providerValidationService.getProviderWorkspaces(
          selectedProviderId,
          credentials
        );

        if (error) {
          Alert.alert('Warning', `Credentials valid but couldn't load workspaces: ${error}`);
        } else {
          setAvailableWorkspaces(workspaces);
        }
      } else {
        setVerificationStatus({
          state: VerificationState.ERROR,
          message: result.error || 'Credential verification failed',
          progress: 0
        });
      }
    } catch (error: any) {
      setVerificationStatus({
        state: VerificationState.ERROR,
        message: error.message || 'Verification failed',
        progress: 0
      });
    }
  };

  const handleLoadProjects = async () => {
    if (!workspaceId || !currentProvider) return;

    try {
      const { projects, error } = await providerValidationService.getProviderProjects(
        selectedProviderId,
        credentials,
        workspaceId
      );

      if (error) {
        Alert.alert('Error', `Failed to load projects: ${error}`);
      } else {
        setAvailableProjects(projects);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to load projects: ${error.message}`);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!currentProvider) return;

    const config: ProviderConfiguration = {
      providerId: selectedProviderId,
      credentials,
      workspaceId,
      projectIds,
    };

    try {
      setVerificationStatus({
        state: VerificationState.VALIDATING_CREDENTIALS,
        message: 'Validating complete configuration...',
        progress: 0
      });

      const result = await providerValidationService.validateConfiguration(
        config,
        {
          validateCredentials: true,
          validateWorkspace: true,
          validateProjects: false, // Optional since some orientations might not have projects
        },
        setVerificationStatus
      );

      if (result.isValid) {
        await providerStorage.saveConfiguration(config);
        setVerificationStatus({
          state: VerificationState.SUCCESS,
          message: 'Configuration saved successfully!',
          progress: 100
        });
        
        setTimeout(() => {
          onConfigurationSaved?.(config);
        }, 1000);
      } else {
        Alert.alert('Validation Error', result.error || 'Configuration validation failed');
      }
    } catch (error: any) {
      Alert.alert('Save Error', error.message || 'Failed to save configuration');
    }
  };

  const renderCredentialFields = () => {
    if (!currentProvider) return null;

    const fields = currentProvider.getConfigurationFields();
    
    return fields.map((field: ConfigurationField) => (
      <View key={field.key} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={styles.textInput}
          value={credentials[field.key] || ''}
          onChangeText={(value) => handleCredentialChange(field.key, value)}
          placeholder={field.placeholder}
          secureTextEntry={field.type === 'password'}
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        />
      </View>
    ));
  };

  const renderProjectIdField = (orientation: string, label: string) => (
    <View key={orientation} style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.projectInputContainer}>
        <TextInput
          style={[styles.textInput, styles.projectInput]}
          value={projectIds[orientation as keyof typeof projectIds]}
          onChangeText={(value) => handleProjectIdChange(orientation, value)}
          placeholder="Enter project ID or select"
          keyboardType="numeric"
        />
        {availableProjects.length > 0 && (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowProjectPicker(orientation)}
          >
            <Text style={styles.selectButtonText}>Select</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const isFormValid = () => {
    if (!currentProvider) return false;
    
    const requiredFields = currentProvider.getConfigurationFields()
      .filter(field => field.required)
      .map(field => field.key);
    
    const hasRequiredCredentials = requiredFields.every(field =>
      credentials[field] && credentials[field].trim() !== ''
    );
    
    return hasRequiredCredentials && workspaceId.trim() !== '';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Time Tracking Setup</Text>
        <Text style={styles.subtitle}>
          Configure your time tracking service for the TimeTracker device
        </Text>
      </View>

      {/* Provider Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Time Tracking Service</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedProviderId}
            onValueChange={setSelectedProviderId}
            style={styles.picker}
          >
            {availableProviders.map(provider => (
              <Picker.Item
                key={provider.id}
                label={provider.name}
                value={provider.id}
              />
            ))}
          </Picker>
        </View>
        {currentProvider && (
          <Text style={styles.providerDescription}>
            {currentProvider.description}
          </Text>
        )}
      </View>

      {/* Credentials Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Credentials</Text>
        {renderCredentialFields()}
        
        <TouchableOpacity
          style={[
            styles.verifyButton,
            !providerValidationService.isConfigurationComplete(selectedProviderId, credentials) && 
            styles.buttonDisabled
          ]}
          onPress={handleVerifyCredentials}
          disabled={!providerValidationService.isConfigurationComplete(selectedProviderId, credentials)}
        >
          {verificationStatus.state === VerificationState.VALIDATING_CREDENTIALS ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>Verify Credentials</Text>
          )}
        </TouchableOpacity>

        {verificationStatus.message && (
          <View style={[
            styles.statusContainer,
            verificationStatus.state === VerificationState.SUCCESS && styles.successStatus,
            verificationStatus.state === VerificationState.ERROR && styles.errorStatus
          ]}>
            <Text style={styles.statusText}>{verificationStatus.message}</Text>
          </View>
        )}
      </View>

      {/* Workspace Section */}
      {availableWorkspaces.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workspace</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={workspaceId}
              onValueChange={(value) => {
                setWorkspaceId(value);
                setAvailableProjects([]); // Clear projects when workspace changes
              }}
              style={styles.picker}
            >
              <Picker.Item label="Select workspace..." value="" />
              {availableWorkspaces.map(workspace => (
                <Picker.Item
                  key={workspace.id}
                  label={workspace.name}
                  value={workspace.id}
                />
              ))}
            </Picker>
          </View>
          
          {workspaceId && (
            <TouchableOpacity
              style={styles.loadProjectsButton}
              onPress={handleLoadProjects}
            >
              <Text style={styles.buttonText}>Load Projects</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Manual Workspace Entry */}
      {availableWorkspaces.length === 0 && verificationStatus.state === VerificationState.SUCCESS && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workspace ID</Text>
          <TextInput
            style={styles.textInput}
            value={workspaceId}
            onChangeText={setWorkspaceId}
            placeholder="Enter workspace ID"
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Project IDs Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Project Assignment</Text>
        <Text style={styles.sectionDescription}>
          Assign project IDs to each cube orientation. Leave empty for orientations you don't want to track.
        </Text>
        
        {renderProjectIdField('faceDown', 'Face Down (Project 1)')}
        {renderProjectIdField('leftSide', 'Left Side (Project 2)')}
        {renderProjectIdField('rightSide', 'Right Side (Project 3)')}
        {renderProjectIdField('frontEdge', 'Front Edge (Project 4)')}
        {renderProjectIdField('backEdge', 'Back Edge (Project 5)')}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.saveButton, !isFormValid() && styles.buttonDisabled]}
          onPress={handleSaveConfiguration}
          disabled={!isFormValid()}
        >
          {verificationStatus.state === VerificationState.VALIDATING_WORKSPACE ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>Save Configuration</Text>
          )}
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Project Selection Modal */}
      <Modal
        visible={showProjectPicker !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProjectPicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Project</Text>
            <ScrollView style={styles.projectList}>
              {availableProjects.map(project => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectItem}
                  onPress={() => {
                    if (showProjectPicker) {
                      handleProjectIdChange(showProjectPicker, project.id);
                      setShowProjectPicker(null);
                    }
                  }}
                >
                  <Text style={styles.projectName}>{project.name}</Text>
                  {project.clientName && (
                    <Text style={styles.projectClient}>{project.clientName}</Text>
                  )}
                  <Text style={styles.projectId}>ID: {project.id}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowProjectPicker(null)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
  },
  providerDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  projectInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectInput: {
    flex: 1,
    marginRight: 8,
  },
  selectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  loadProjectsButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  successStatus: {
    backgroundColor: '#E8F5E8',
  },
  errorStatus: {
    backgroundColor: '#FFE5E5',
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
  },
  actionButtons: {
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '70%',
    minWidth: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  projectList: {
    maxHeight: 300,
  },
  projectItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  projectClient: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  projectId: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
});