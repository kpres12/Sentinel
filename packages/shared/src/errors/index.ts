/**
 * Comprehensive error handling system for wildfire operations platform
 */

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Device & Communication
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  DEVICE_TIMEOUT = 'DEVICE_TIMEOUT',
  COMMUNICATION_FAILED = 'COMMUNICATION_FAILED',
  MQTT_CONNECTION_LOST = 'MQTT_CONNECTION_LOST',

  // Mission & Operations
  MISSION_FAILED = 'MISSION_FAILED',
  INVALID_WAYPOINT = 'INVALID_WAYPOINT',
  UNSAFE_OPERATION = 'UNSAFE_OPERATION',
  EMERGENCY_STOP_REQUIRED = 'EMERGENCY_STOP_REQUIRED',

  // Data & Processing
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  TRIANGULATION_FAILED = 'TRIANGULATION_FAILED',
  PREDICTION_MODEL_ERROR = 'PREDICTION_MODEL_ERROR',
  SENSOR_FUSION_ERROR = 'SENSOR_FUSION_ERROR',

  // Infrastructure
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // General
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  deviceId?: string;
  missionId?: string;
  userId?: string;
  location?: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  requestId?: string;
  additionalData?: Record<string, any>;
}

export class WildfireError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly statusCode: number;

  constructor(
    code: ErrorCode,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
    isRetryable: boolean = false,
    statusCode: number = 500
  ) {
    super(message);
    this.name = 'WildfireError';
    this.code = code;
    this.severity = severity;
    this.isRetryable = isRetryable;
    this.statusCode = statusCode;
    this.context = {
      timestamp: new Date().toISOString(),
      ...context
    };

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WildfireError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
      isRetryable: this.isRetryable,
      statusCode: this.statusCode,
      stack: this.stack
    };
  }
}

// Specialized error classes
export class DeviceError extends WildfireError {
  constructor(
    code: ErrorCode,
    message: string,
    deviceId: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH
  ) {
    super(code, message, severity, { deviceId }, false, 503);
  }
}

export class MissionError extends WildfireError {
  constructor(
    code: ErrorCode,
    message: string,
    missionId: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH
  ) {
    super(code, message, severity, { missionId }, true, 422);
  }
}

export class ValidationError extends WildfireError {
  constructor(message: string, field?: string) {
    super(
      ErrorCode.VALIDATION_ERROR,
      message,
      ErrorSeverity.LOW,
      { additionalData: { field } },
      false,
      400
    );
  }
}

export class AuthenticationError extends WildfireError {
  constructor(message: string = 'Authentication required') {
    super(
      ErrorCode.UNAUTHORIZED,
      message,
      ErrorSeverity.MEDIUM,
      {},
      false,
      401
    );
  }
}

export class AuthorizationError extends WildfireError {
  constructor(message: string = 'Insufficient permissions') {
    super(
      ErrorCode.FORBIDDEN,
      message,
      ErrorSeverity.MEDIUM,
      {},
      false,
      403
    );
  }
}

// Error handler utility functions
export class ErrorHandler {
  static isRetryable(error: Error): boolean {
    if (error instanceof WildfireError) {
      return error.isRetryable;
    }
    
    // Default retry logic for common errors
    const retryableCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];
    
    return retryableCodes.some(code => error.message.includes(code));
  }

  static shouldAlert(error: Error): boolean {
    if (error instanceof WildfireError) {
      return error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL;
    }
    return true; // Alert on unknown errors
  }

  static getRetryDelay(attemptNumber: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  static formatForLogging(error: Error): Record<string, any> {
    if (error instanceof WildfireError) {
      return error.toJSON();
    }

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }
}

// Retry wrapper function
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  onRetry?: (error: Error, attempt: number) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts || !ErrorHandler.isRetryable(lastError)) {
        throw lastError;
      }

      const delay = ErrorHandler.getRetryDelay(attempt - 1);
      
      if (onRetry) {
        onRetry(lastError, attempt);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Circuit breaker pattern
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new WildfireError(
          ErrorCode.SERVICE_UNAVAILABLE,
          'Circuit breaker is OPEN',
          ErrorSeverity.HIGH,
          {},
          true,
          503
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }
}
