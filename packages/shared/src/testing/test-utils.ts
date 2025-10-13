/**
 * Comprehensive testing utilities for wildfire operations platform
 */

import { jest } from '@jest/globals';
import { WildfireError, ErrorCode } from '../errors';
import { User, UserRole, Permission } from '../auth';

// Mock data generators
export class MockDataGenerator {
  static generateUser(overrides: Partial<User> = {}): User {
    return {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      username: `testuser_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      role: UserRole.ANALYST,
      permissions: [Permission.DEVICE_VIEW, Permission.MISSION_VIEW],
      isActive: true,
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  static generateTelemetry(deviceId: string = 'test_device') {
    return {
      deviceId,
      timestamp: new Date().toISOString(),
      location: {
        lat: 37.7749 + (Math.random() - 0.5) * 0.1,
        lng: -122.4194 + (Math.random() - 0.5) * 0.1,
        altitude: 100 + Math.random() * 50
      },
      status: 'online' as const,
      battery: Math.floor(Math.random() * 100),
      speed: Math.random() * 10,
      heading: Math.random() * 360,
      sensors: {
        temperature: 20 + Math.random() * 15,
        humidity: 30 + Math.random() * 40,
        windSpeed: Math.random() * 20,
        windDirection: Math.random() * 360,
        smoke: Math.random() > 0.8,
        co2: 400 + Math.random() * 100
      }
    };
  }

  static generateDetection(deviceId: string = 'test_device') {
    return {
      id: `detection_${Math.random().toString(36).substr(2, 9)}`,
      deviceId,
      timestamp: new Date().toISOString(),
      type: ['smoke', 'flame', 'heat'][Math.floor(Math.random() * 3)] as 'smoke' | 'flame' | 'heat',
      confidence: 0.5 + Math.random() * 0.5,
      position: {
        latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
        altitude: 100 + Math.random() * 50
      },
      bearing: Math.random() * 360,
      mediaRef: `media_${Date.now()}`,
      source: Math.random() > 0.5 ? 'edge' : 'cloud' as 'edge' | 'cloud'
    };
  }

  static generateMission(deviceId?: string) {
    return {
      id: `mission_${Math.random().toString(36).substr(2, 9)}`,
      type: ['SURVEY_SMOKE', 'BUILD_LINE', 'CLEAR_VEGETATION'][Math.floor(Math.random() * 3)] as any,
      priority: Math.floor(Math.random() * 5) + 1,
      waypoints: Array.from({ length: 3 }, () => ({
        latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
        altitude: 100 + Math.random() * 50
      })),
      parameters: {},
      assignedTo: deviceId || `device_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  static generateEnvironmentalData() {
    return {
      latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
      timestamp: new Date().toISOString(),
      fuel_model: Math.floor(Math.random() * 13) + 1,
      slope_deg: Math.random() * 45,
      aspect_deg: Math.random() * 360,
      canopy_cover: Math.random(),
      soil_moisture: Math.random(),
      fuel_moisture: Math.random(),
      temperature_c: 15 + Math.random() * 20,
      relative_humidity: 30 + Math.random() * 40,
      wind_speed_mps: Math.random() * 15,
      wind_direction_deg: Math.random() * 360,
      elevation_m: 100 + Math.random() * 500,
      lightning_strikes_24h: Math.floor(Math.random() * 10),
      historical_ignitions: Math.floor(Math.random() * 5)
    };
  }
}

// Test helpers
export class TestHelpers {
  static async expectAsyncError(
    asyncFn: () => Promise<any>,
    expectedError?: typeof WildfireError | ErrorCode
  ): Promise<WildfireError> {
    try {
      await asyncFn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedError) {
        if (typeof expectedError === 'string') {
          expect(error).toBeInstanceOf(WildfireError);
          expect((error as WildfireError).code).toBe(expectedError);
        } else {
          expect(error).toBeInstanceOf(expectedError);
        }
      }
      return error as WildfireError;
    }
  }

  static createMockResponse(data: any, status: number = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(JSON.stringify(data)),
      headers: new Headers(),
      url: 'http://test.com',
      redirected: false,
      type: 'basic',
      body: null,
      bodyUsed: false,
      clone: jest.fn(),
      arrayBuffer: jest.fn(),
      blob: jest.fn(),
      formData: jest.fn()
    } as any;
  }

  static mockFetch(responses: Array<{ url?: string; response: any; status?: number }>) {
    const mockFetch = jest.fn();
    
    responses.forEach(({ url, response, status = 200 }, index) => {
      if (url) {
        mockFetch.mockImplementationOnce((requestUrl: string) => {
          if (requestUrl.includes(url)) {
            return Promise.resolve(this.createMockResponse(response, status));
          }
          return Promise.reject(new Error(`Unexpected URL: ${requestUrl}`));
        });
      } else {
        mockFetch.mockResolvedValueOnce(this.createMockResponse(response, status));
      }
    });

    global.fetch = mockFetch;
    return mockFetch;
  }

  static mockConsole() {
    const originalConsole = { ...console };
    const mockConsole = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };

    Object.assign(console, mockConsole);

    return {
      restore: () => Object.assign(console, originalConsole),
      mocks: mockConsole
    };
  }

  static mockTimers() {
    jest.useFakeTimers();
    return {
      advance: (ms: number) => jest.advanceTimersByTime(ms),
      advanceToNext: () => jest.advanceTimersToNextTimer(),
      restore: () => jest.useRealTimers()
    };
  }

  static createMockWebSocket() {
    const mockWS = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: 1, // OPEN
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3
    };

    return mockWS;
  }

  static createMockMQTTClient() {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
      connected: true
    };
  }
}

// Integration test helpers
export class IntegrationTestHelpers {
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeoutMs) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  static async retryAssertion(
    assertion: () => void | Promise<void>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<void> {
    let lastError: Error | undefined;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        await assertion();
        return;
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    throw lastError;
  }

  static createTestDatabase() {
    // This would create a test database instance
    return {
      setup: jest.fn(),
      teardown: jest.fn(),
      clear: jest.fn(),
      seed: jest.fn()
    };
  }

  static createTestMQTTBroker() {
    // This would create a test MQTT broker
    return {
      start: jest.fn(),
      stop: jest.fn(),
      getMessages: jest.fn().mockReturnValue([]),
      clearMessages: jest.fn()
    };
  }
}

// Performance testing utilities
export class PerformanceTestHelpers {
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    return { result, duration };
  }

  static async loadTest(
    operation: () => Promise<any>,
    concurrency: number = 10,
    duration: number = 10000
  ): Promise<{ totalRequests: number; successfulRequests: number; averageLatency: number; errors: Error[] }> {
    const results: Array<{ success: boolean; latency: number; error?: Error }> = [];
    const startTime = Date.now();
    
    const workers = Array.from({ length: concurrency }, async () => {
      while (Date.now() - startTime < duration) {
        const { result, duration: latency } = await this.measureExecutionTime(operation).catch(error => ({
          result: null,
          duration: 0,
          error
        }));
        
        results.push({
          success: !result.error,
          latency,
          error: result.error
        });
      }
    });
    
    await Promise.all(workers);
    
    const successful = results.filter(r => r.success);
    const errors = results.filter(r => r.error).map(r => r.error!);
    const averageLatency = successful.reduce((sum, r) => sum + r.latency, 0) / successful.length;
    
    return {
      totalRequests: results.length,
      successfulRequests: successful.length,
      averageLatency,
      errors
    };
  }
}

// Custom Jest matchers
export const customMatchers = {
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toBeValidCoordinate(received: { lat: number; lng: number }) {
    const latValid = received.lat >= -90 && received.lat <= 90;
    const lngValid = received.lng >= -180 && received.lng <= 180;
    const pass = latValid && lngValid;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid coordinate`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid coordinate`,
        pass: false,
      };
    }
  },

  toHaveValidTimestamp(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  }
};

// Test environment setup
export class TestEnvironment {
  private cleanupFunctions: Array<() => void | Promise<void>> = [];

  async setup() {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/wildfire_test';
  }

  async teardown() {
    // Run all cleanup functions
    await Promise.all(this.cleanupFunctions.map(fn => fn()));
    this.cleanupFunctions = [];
  }

  addCleanup(fn: () => void | Promise<void>) {
    this.cleanupFunctions.push(fn);
  }

  static async withTestEnvironment<T>(testFn: (env: TestEnvironment) => Promise<T>): Promise<T> {
    const env = new TestEnvironment();
    await env.setup();
    
    try {
      return await testFn(env);
    } finally {
      await env.teardown();
    }
  }
}
