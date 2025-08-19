import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';

interface InputWithScanProps extends TextInputProps {
  label: string;
  required?: boolean;
  onScan?: () => void;
  scanButtonText?: string;
  scanButtonIcon?: string;
}

export const InputWithScan: React.FC<InputWithScanProps> = ({
  label,
  required = false,
  onScan,
  scanButtonText = '📱 Scan',
  scanButtonIcon,
  style,
  ...textInputProps
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && '*'}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, style]}
          autoCapitalize="none"
          autoCorrect={false}
          {...textInputProps}
        />
        {onScan && (
          <TouchableOpacity style={styles.scanButton} onPress={onScan}>
            <Text style={styles.scanButtonText}>
              {scanButtonIcon || scanButtonText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
  },
  scanButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});