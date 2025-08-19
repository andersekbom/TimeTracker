import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface ProjectIdInputProps {
  label: string;
  value: number;
  onValueChange: (value: string) => void;
  onScan: () => void;
}

export const ProjectIdInput: React.FC<ProjectIdInputProps> = ({
  label,
  value,
  onValueChange,
  onScan,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value.toString()}
          onChangeText={onValueChange}
          placeholder="Project ID"
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.scanButton} onPress={onScan}>
          <Text style={styles.scanButtonText}>📱</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333333',
  },
  scanButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});