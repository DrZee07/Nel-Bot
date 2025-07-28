import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Phone, Activity } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  medicalContext?: {
    isEmergency?: boolean;
    patientId?: string;
    operationType?: string;
    criticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  retryCount: number;
}

/**
 * Enhanced Error Boundary for Medical Applications
 * 
 * Provides specialized error handling for medical contexts with
 * emergency protocols and recovery strategies.
 */
export class MedicalErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `med-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error with medical context
    this.logMedicalError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to monitoring service (in real implementation)
    this.reportToMonitoring(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logMedicalError(error: Error, errorInfo: ErrorInfo) {
    const { medicalContext } = this.props;
    
    const logData = {
      errorId: this.state.errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      medicalContext,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('🏥 Medical Error Boundary Triggered:', logData);

    // For critical medical contexts, log as emergency
    if (medicalContext?.criticality === 'CRITICAL' || medicalContext?.isEmergency) {
      console.error('🚨 CRITICAL MEDICAL ERROR:', logData);
    }
  }

  private reportToMonitoring(error: Error, errorInfo: ErrorInfo) {
    // In a real implementation, this would send to monitoring service
    // like Sentry, DataDog, or custom medical monitoring system
    
    try {
      // Example monitoring payload
      const monitoringData = {
        errorId: this.state.errorId,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        medicalContext: this.props.medicalContext,
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount
      };

      // Send to monitoring service
      console.log('📊 Sending to monitoring service:', monitoringData);
    } catch (monitoringError) {
      console.error('Failed to report to monitoring:', monitoringError);
    }
  }

  private handleRetry = () => {
    const maxRetries = this.props.medicalContext?.isEmergency ? 5 : 3;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn(`⚠️ Maximum retries (${maxRetries}) reached for error ${this.state.errorId}`);
      return;
    }

    console.log(`🔄 Retrying medical component (attempt ${this.state.retryCount + 1}/${maxRetries})`);

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleEmergencyContact = () => {
    // In a real implementation, this would trigger emergency protocols
    console.log('🚨 Emergency contact initiated');
    
    // Show emergency contact information
    alert('Emergency Contact:\n\nFor immediate medical assistance, call 911\n\nFor technical support, contact your system administrator');
  };

  private getErrorSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const { medicalContext } = this.props;
    
    if (medicalContext?.isEmergency || medicalContext?.criticality === 'CRITICAL') {
      return 'critical';
    } else if (medicalContext?.criticality === 'HIGH') {
      return 'high';
    } else if (medicalContext?.criticality === 'MEDIUM') {
      return 'medium';
    }
    
    return 'low';
  }

  private renderEmergencyFallback() {
    const { errorId, error } = this.state;
    
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg border-2 border-red-200">
          <div className="p-6">
            {/* Emergency Header */}
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-red-800">
                  Medical System Error
                </h1>
                <p className="text-sm text-red-600">
                  Emergency protocols activated
                </p>
              </div>
            </div>

            {/* Error Information */}
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                A critical error has occurred in the medical system. For immediate medical assistance:
              </p>
              
              <div className="bg-red-100 border border-red-300 rounded-md p-3 mb-4">
                <p className="text-red-800 font-semibold">
                  🚨 For Medical Emergencies: Call 911 immediately
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <p>Error ID: <code className="bg-gray-100 px-1 rounded">{errorId}</code></p>
                <p>Time: {new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleEmergencyContact}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center"
              >
                <Phone className="h-4 w-4 mr-2" />
                Emergency Contact
              </button>
              
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry System ({this.state.retryCount}/5)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderCriticalFallback() {
    const { errorId, error } = this.state;
    
    return (
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <Activity className="h-5 w-5 text-orange-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-orange-800">
              Critical Medical System Error
            </h3>
            <div className="mt-2 text-sm text-orange-700">
              <p>
                A critical error has occurred. The system is attempting to recover.
                If this is a medical emergency, please contact emergency services immediately.
              </p>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="bg-orange-100 text-orange-800 px-3 py-1 rounded-md text-sm hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4 inline mr-1" />
                Retry ({this.state.retryCount}/3)
              </button>
              <button
                onClick={this.handleEmergencyContact}
                className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <Phone className="h-4 w-4 inline mr-1" />
                Emergency
              </button>
            </div>
            <div className="mt-2 text-xs text-orange-600">
              Error ID: {errorId}
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderStandardFallback() {
    const { errorId } = this.state;
    
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              System Error
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                An error occurred while loading this component. 
                Please try refreshing or contact support if the problem persists.
              </p>
            </div>
            <div className="mt-4">
              <button
                onClick={this.handleRetry}
                className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-sm hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4 inline mr-1" />
                Try Again ({this.state.retryCount}/3)
              </button>
            </div>
            <div className="mt-2 text-xs text-yellow-600">
              Error ID: {errorId}
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render appropriate fallback based on severity
      const severity = this.getErrorSeverity();
      
      switch (severity) {
        case 'critical':
          return this.props.medicalContext?.isEmergency 
            ? this.renderEmergencyFallback()
            : this.renderCriticalFallback();
        case 'high':
          return this.renderCriticalFallback();
        default:
          return this.renderStandardFallback();
      }
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with medical error boundary
 */
export function withMedicalErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  medicalContext?: Props['medicalContext']
) {
  const WithMedicalErrorBoundary = (props: P) => (
    <MedicalErrorBoundary medicalContext={medicalContext}>
      <WrappedComponent {...props} />
    </MedicalErrorBoundary>
  );

  WithMedicalErrorBoundary.displayName = `withMedicalErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithMedicalErrorBoundary;
}

/**
 * Hook for programmatically triggering error boundary
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    // This will be caught by the nearest error boundary
    throw error;
  };
}

/**
 * Medical-specific error boundary presets
 */
export const MedicalErrorBoundaryPresets = {
  /**
   * For emergency medical components
   */
  Emergency: (props: { children: ReactNode }) => (
    <MedicalErrorBoundary
      medicalContext={{
        isEmergency: true,
        criticality: 'CRITICAL'
      }}
      {...props}
    />
  ),

  /**
   * For critical patient data components
   */
  PatientData: (props: { children: ReactNode; patientId?: string }) => (
    <MedicalErrorBoundary
      medicalContext={{
        criticality: 'CRITICAL',
        operationType: 'PATIENT_DATA',
        patientId: props.patientId
      }}
      {...props}
    />
  ),

  /**
   * For medical consultation components
   */
  MedicalConsultation: (props: { children: ReactNode }) => (
    <MedicalErrorBoundary
      medicalContext={{
        criticality: 'HIGH',
        operationType: 'MEDICAL_CONSULTATION'
      }}
      {...props}
    />
  ),

  /**
   * For general medical information components
   */
  MedicalInfo: (props: { children: ReactNode }) => (
    <MedicalErrorBoundary
      medicalContext={{
        criticality: 'MEDIUM',
        operationType: 'MEDICAL_INFO'
      }}
      {...props}
    />
  )
};
