/**
 * Integration tests for API Gateway
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { TestEnvironment, MockDataGenerator, TestHelpers } from '../../packages/shared/src/testing/test-utils';
import { AuthService, UserRole, Permission } from '../../packages/shared/src/auth';
import { WildfireError, ErrorCode } from '../../packages/shared/src/errors';

describe('API Gateway Integration Tests', () => {
  let testEnv: TestEnvironment;
  let authService: AuthService;
  let adminToken: string;
  let operatorToken: string;
  let app: any; // Express app instance

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    
    authService = new AuthService();
    
    // Create test users and tokens
    const adminUser = MockDataGenerator.generateUser({
      role: UserRole.ADMIN,
      permissions: Object.values(Permission)
    });
    
    const operatorUser = MockDataGenerator.generateUser({
      role: UserRole.FIELD_OPERATOR,
      permissions: [Permission.DEVICE_VIEW, Permission.DEVICE_CONTROL, Permission.MISSION_VIEW]
    });
    
    const adminTokens = authService.generateTokens(adminUser);
    const operatorTokens = authService.generateTokens(operatorUser);
    
    adminToken = adminTokens.accessToken;
    operatorToken = operatorTokens.accessToken;
    
    // Initialize app (would normally import from main app)
    // app = await createTestApp();
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  beforeEach(async () => {
    // Clear test data before each test
    // await clearTestDatabase();
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/v1/auth/login - successful login', async () => {
      const loginData = {
        username: 'testuser',
        password: 'testpassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        tokenType: 'Bearer'
      });
    });

    test('POST /api/v1/auth/login - invalid credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Invalid credentials')
      });
    });

    test('POST /api/v1/auth/refresh - valid refresh token', async () => {
      const refreshData = {
        refreshToken: 'valid_refresh_token'
      };

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        expiresIn: expect.any(Number)
      });
    });
  });

  describe('Device Management Endpoints', () => {
    test('GET /api/v1/devices - list all devices', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            type: expect.stringMatching(/^(drone|bot|tower)$/),
            status: expect.stringMatching(/^(online|offline|mission|emergency)$/),
            location: expect.objectContaining({
              lat: expect.any(Number),
              lng: expect.any(Number)
            })
          })
        ])
      );
    });

    test('GET /api/v1/devices/:id - get specific device', async () => {
      const deviceId = 'test-device-001';
      
      const response = await request(app)
        .get(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: deviceId,
        name: expect.any(String),
        type: expect.any(String),
        status: expect.any(String),
        battery: expect.any(Number),
        location: expect.objectContaining({
          lat: expect.any(Number),
          lng: expect.any(Number)
        }),
        lastSeen: expect.any(String)
      });
    });

    test('POST /api/v1/devices/:id/emergency-stop - emergency stop device', async () => {
      const deviceId = 'test-device-001';
      
      const response = await request(app)
        .post(`/api/v1/devices/${deviceId}/emergency-stop`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('Emergency stop')
      });
    });

    test('GET /api/v1/devices - unauthorized access', async () => {
      await request(app)
        .get('/api/v1/devices')
        .expect(401);
    });
  });

  describe('Mission Management Endpoints', () => {
    test('POST /api/v1/missions - create new mission', async () => {
      const missionData = {
        type: 'SURVEY_SMOKE',
        priority: 3,
        waypoints: [
          { latitude: 37.7749, longitude: -122.4194, altitude: 100 },
          { latitude: 37.7849, longitude: -122.4294, altitude: 120 }
        ],
        parameters: {
          surveyArea: 'sector-alpha',
          detectionThreshold: 0.8
        }
      };

      const response = await request(app)
        .post('/api/v1/missions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(missionData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        type: 'SURVEY_SMOKE',
        priority: 3,
        status: 'pending',
        waypoints: expect.arrayContaining([
          expect.objectContaining({
            latitude: expect.any(Number),
            longitude: expect.any(Number),
            altitude: expect.any(Number)
          })
        ]),
        createdAt: expect.any(String)
      });
    });

    test('PUT /api/v1/missions/:id/assign - assign mission to device', async () => {
      const missionId = 'test-mission-001';
      const deviceId = 'test-device-001';
      
      const assignmentData = {
        deviceId,
        deviceType: 'drone'
      };

      const response = await request(app)
        .put(`/api/v1/missions/${missionId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        mission: expect.objectContaining({
          id: missionId,
          assignedTo: deviceId,
          status: 'assigned'
        })
      });
    });

    test('DELETE /api/v1/missions/:id - abort mission', async () => {
      const missionId = 'test-mission-001';
      
      const response = await request(app)
        .delete(`/api/v1/missions/${missionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('aborted')
      });
    });
  });

  describe('Telemetry Endpoints', () => {
    test('GET /api/v1/telemetry - get recent telemetry data', async () => {
      const response = await request(app)
        .get('/api/v1/telemetry')
        .set('Authorization', `Bearer ${operatorToken}`)
        .query({
          limit: 100,
          since: new Date(Date.now() - 3600000).toISOString() // Last hour
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            deviceId: expect.any(String),
            timestamp: expect.any(String),
            location: expect.objectContaining({
              lat: expect.any(Number),
              lng: expect.any(Number)
            }),
            status: expect.any(String),
            battery: expect.any(Number)
          })
        ])
      );
    });

    test('POST /api/v1/telemetry - submit telemetry data', async () => {
      const telemetryData = MockDataGenerator.generateTelemetry('test-device-001');
      
      const response = await request(app)
        .post('/api/v1/telemetry')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(telemetryData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        id: expect.any(String)
      });
    });
  });

  describe('Detection Endpoints', () => {
    test('POST /api/v1/detections - report fire detection', async () => {
      const detectionData = MockDataGenerator.generateDetection('test-device-001');
      
      const response = await request(app)
        .post('/api/v1/detections')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(detectionData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        deviceId: 'test-device-001',
        type: expect.stringMatching(/^(smoke|flame|heat)$/),
        confidence: expect.any(Number),
        timestamp: expect.any(String)
      });
    });

    test('GET /api/v1/detections - get recent detections', async () => {
      const response = await request(app)
        .get('/api/v1/detections')
        .set('Authorization', `Bearer ${operatorToken}`)
        .query({
          confidenceMin: 0.7,
          limit: 50
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            deviceId: expect.any(String),
            type: expect.stringMatching(/^(smoke|flame|heat)$/),
            confidence: expect.any(Number),
            timestamp: expect.any(String)
          })
        ])
      );
    });
  });

  describe('Triangulation Endpoints', () => {
    test('POST /api/v1/triangulation - triangulate smoke location', async () => {
      const triangulationData = {
        detectionIds: ['detection-001', 'detection-002', 'detection-003'],
        algorithm: 'bearing_only',
        confidenceThreshold: 0.6
      };

      const response = await request(app)
        .post('/api/v1/triangulation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(triangulationData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        location: expect.objectContaining({
          latitude: expect.any(Number),
          longitude: expect.any(Number),
          altitude: expect.any(Number)
        }),
        confidence: expect.any(Number),
        uncertaintyMeters: expect.any(Number),
        method: 'bearing_only',
        detectionIds: expect.arrayContaining(['detection-001', 'detection-002', 'detection-003'])
      });
    });
  });

  describe('Prediction Endpoints', () => {
    test('POST /api/v1/prediction/spread - predict fire spread', async () => {
      const predictionData = {
        ignitionPoint: {
          latitude: 37.7749,
          longitude: -122.4194
        },
        weatherConditions: {
          windSpeed: 15,
          windDirection: 270,
          temperature: 25,
          humidity: 30
        },
        fuelModel: 5,
        timeHorizon: 3600 // 1 hour
      };

      const response = await request(app)
        .post('/api/v1/prediction/spread')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(predictionData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        ignitionPoint: expect.objectContaining({
          latitude: 37.7749,
          longitude: -122.4194
        }),
        spreadPolygon: expect.any(Object),
        arrivalTimes: expect.any(Object),
        confidence: expect.any(Number),
        model: expect.any(String),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Alert Endpoints', () => {
    test('GET /api/v1/alerts - get active alerts', async () => {
      const response = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${operatorToken}`)
        .query({ status: 'active' })
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            severity: expect.stringMatching(/^(low|medium|high|critical)$/),
            type: expect.any(String),
            message: expect.any(String),
            location: expect.objectContaining({
              lat: expect.any(Number),
              lng: expect.any(Number)
            }),
            timestamp: expect.any(String),
            acknowledged: expect.any(Boolean)
          })
        ])
      );
    });

    test('PUT /api/v1/alerts/:id/acknowledge - acknowledge alert', async () => {
      const alertId = 'test-alert-001';
      
      const response = await request(app)
        .put(`/api/v1/alerts/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        alert: expect.objectContaining({
          id: alertId,
          acknowledged: true,
          acknowledgedBy: expect.any(String),
          acknowledgedAt: expect.any(String)
        })
      });
    });
  });

  describe('Health and Status Endpoints', () => {
    test('GET /health - health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
        uptime: expect.any(Number)
      });
    });

    test('GET /api/v1/system/status - system status', async () => {
      const response = await request(app)
        .get('/api/v1/system/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        services: expect.objectContaining({
          database: expect.any(Boolean),
          redis: expect.any(Boolean),
          mqtt: expect.any(Boolean)
        }),
        metrics: expect.objectContaining({
          activeDevices: expect.any(Number),
          activeMissions: expect.any(Number),
          alertsCount: expect.any(Number)
        })
      });
    });
  });

  describe('Error Handling', () => {
    test('404 - endpoint not found', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Not found')
      });
    });

    test('Rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array.from({ length: 150 }, () =>
        request(app)
          .get('/api/v1/devices')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Invalid JSON payload', async () => {
      const response = await request(app)
        .post('/api/v1/missions')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Invalid JSON')
      });
    });
  });

  describe('Performance Tests', () => {
    test('Concurrent device requests', async () => {
      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .get('/api/v1/devices')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All requests should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // Should complete within reasonable time (adjust based on requirements)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    test('Large telemetry batch processing', async () => {
      const batchSize = 1000;
      const telemetryBatch = Array.from({ length: batchSize }, () =>
        MockDataGenerator.generateTelemetry(`device-${Math.floor(Math.random() * 100)}`)
      );

      const start = Date.now();
      const response = await request(app)
        .post('/api/v1/telemetry/batch')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ telemetry: telemetryBatch })
        .expect(201);

      const duration = Date.now() - start;

      expect(response.body).toMatchObject({
        success: true,
        processed: batchSize,
        errors: 0
      });

      // Should process within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    });
  });
});
