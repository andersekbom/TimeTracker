import { Alert } from 'react-native';

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): ErrorInfo {
    let errorInfo: ErrorInfo;

    if (error instanceof Error) {
      errorInfo = {
        message: error.message,
        code: error.name,
        details: error.stack,
      };
    } else if (typeof error === 'string') {
      errorInfo = {
        message: error,
      };
    } else {
      errorInfo = {
        message: 'Unknown error occurred',
        details: error,
      };
    }

    // Log error for debugging
    const contextMsg = context ? `[${context}]` : '';
    console.error(`${contextMsg} Error:`, errorInfo);

    return errorInfo;
  }

  static showAlert(error: unknown, title: string = 'Error', context?: string): void {
    const errorInfo = this.handle(error, context);
    Alert.alert(title, errorInfo.message);
  }

  static createUserFriendlyMessage(error: unknown): string {
    if (error instanceof Error) {
      // Map common error messages to user-friendly ones
      if (error.message.includes('Network request failed')) {
        return 'Network connection error. Please check your internet connection.';
      }
      if (error.message.includes('timeout')) {
        return 'Request timed out. Please try again.';
      }
      if (error.message.includes('401') || error.message.includes('403')) {
        return 'Authentication failed. Please check your credentials.';
      }
      if (error.message.includes('404')) {
        return 'Resource not found. Please verify your configuration.';
      }
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<{ success: boolean; data?: T; error?: ErrorInfo }> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      const errorInfo = this.handle(error, context);
      return { success: false, error: errorInfo };
    }
  }
}