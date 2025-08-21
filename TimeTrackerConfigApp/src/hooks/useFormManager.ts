import { useState, useCallback } from 'react';
import { ValidationResult } from '../types/TimeTrackingProvider';

export interface FormField {
  value: string;
  error?: string;
  touched: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

export const useFormManager = (initialValues: Record<string, string> = {}) => {
  const [formState, setFormState] = useState<FormState>(() => {
    const initial: FormState = {};
    Object.entries(initialValues).forEach(([key, value]) => {
      initial[key] = { value, touched: false };
    });
    return initial;
  });

  const setValue = useCallback((field: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
        touched: true,
        error: undefined,
      },
    }));
  }, []);

  const setError = useCallback((field: string, error: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        error,
      },
    }));
  }, []);

  const clearError = useCallback((field: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        error: undefined,
      },
    }));
  }, []);

  const setValues = useCallback((values: Record<string, string>) => {
    setFormState(prev => {
      const newState = { ...prev };
      Object.entries(values).forEach(([key, value]) => {
        newState[key] = {
          ...prev[key],
          value,
          touched: true,
        };
      });
      return newState;
    });
  }, []);

  const validateField = useCallback((
    field: string, 
    validator: (value: string) => ValidationResult
  ) => {
    const fieldState = formState[field];
    if (!fieldState) return false;

    const result = validator(fieldState.value);
    if (!result.isValid) {
      setError(field, result.error || 'Invalid value');
      return false;
    }
    
    clearError(field);
    return true;
  }, [formState, setError, clearError]);

  const validateForm = useCallback((
    validators: Record<string, (value: string) => ValidationResult>
  ) => {
    let isValid = true;
    
    Object.entries(validators).forEach(([field, validator]) => {
      const fieldValid = validateField(field, validator);
      if (!fieldValid) {
        isValid = false;
      }
    });
    
    return isValid;
  }, [validateField]);

  const getFieldValue = useCallback((field: string): string => {
    return formState[field]?.value || '';
  }, [formState]);

  const getFieldError = useCallback((field: string): string | undefined => {
    return formState[field]?.error;
  }, [formState]);

  const hasErrors = useCallback((): boolean => {
    return Object.values(formState).some(field => !!field.error);
  }, [formState]);

  const getValues = useCallback((): Record<string, string> => {
    const values: Record<string, string> = {};
    Object.entries(formState).forEach(([key, field]) => {
      values[key] = field.value;
    });
    return values;
  }, [formState]);

  const reset = useCallback((newValues?: Record<string, string>) => {
    const values = newValues || initialValues;
    const newState: FormState = {};
    Object.entries(values).forEach(([key, value]) => {
      newState[key] = { value, touched: false };
    });
    setFormState(newState);
  }, [initialValues]);

  return {
    formState,
    setValue,
    setError,
    clearError,
    setValues,
    validateField,
    validateForm,
    getFieldValue,
    getFieldError,
    hasErrors,
    getValues,
    reset,
  };
};