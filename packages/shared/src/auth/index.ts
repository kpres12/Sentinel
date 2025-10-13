/**
 * Authentication and Authorization system for wildfire operations platform
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { WildfireError, ErrorCode, ErrorSeverity } from '../errors';

export enum UserRole {
  ADMIN = 'admin',
  INCIDENT_COMMANDER = 'incident_commander',
  OPERATIONS_CHIEF = 'operations_chief',
  ANALYST = 'analyst',
  OBSERVER = 'observer',
  FIELD_OPERATOR = 'field_operator'
}

export enum Permission {
  // Device management
  DEVICE_VIEW = 'device:view',
  DEVICE_CONTROL = 'device:control',
  DEVICE_EMERGENCY_STOP = 'device:emergency_stop',
  
  // Mission management
  MISSION_CREATE = 'mission:create',
  MISSION_ASSIGN = 'mission:assign',
  MISSION_ABORT = 'mission:abort',
  MISSION_VIEW = 'mission:view',
  
  // Data access
  TELEMETRY_VIEW = 'telemetry:view',
  ALERTS_MANAGE = 'alerts:manage',
  PREDICTIONS_RUN = 'predictions:run',
  
  // System administration
  SYSTEM_ADMIN = 'system:admin',
  USER_MANAGE = 'user:manage',
  CONFIG_MODIFY = 'config:modify',
  
  // Emergency operations
  EMERGENCY_DECLARE = 'emergency:declare',
  EVACUATION_ORDER = 'evacuation:order'
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  metadata?: {
    department?: string;
    badgeNumber?: string;
    certifications?: string[];
  };
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface JWTPayload {
  sub: string; // user ID
  username: string;
  role: UserRole;
  permissions: Permission[];
  iat: number;
  exp: number;
  iss: string;
}

// Role-based permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  
  [UserRole.INCIDENT_COMMANDER]: [
    Permission.DEVICE_VIEW,
    Permission.DEVICE_CONTROL,
    Permission.DEVICE_EMERGENCY_STOP,
    Permission.MISSION_CREATE,
    Permission.MISSION_ASSIGN,
    Permission.MISSION_ABORT,
    Permission.MISSION_VIEW,
    Permission.TELEMETRY_VIEW,
    Permission.ALERTS_MANAGE,
    Permission.PREDICTIONS_RUN,
    Permission.EMERGENCY_DECLARE,
    Permission.EVACUATION_ORDER
  ],
  
  [UserRole.OPERATIONS_CHIEF]: [
    Permission.DEVICE_VIEW,
    Permission.DEVICE_CONTROL,
    Permission.MISSION_CREATE,
    Permission.MISSION_ASSIGN,
    Permission.MISSION_VIEW,
    Permission.TELEMETRY_VIEW,
    Permission.ALERTS_MANAGE,
    Permission.PREDICTIONS_RUN
  ],
  
  [UserRole.ANALYST]: [
    Permission.DEVICE_VIEW,
    Permission.MISSION_VIEW,
    Permission.TELEMETRY_VIEW,
    Permission.ALERTS_MANAGE,
    Permission.PREDICTIONS_RUN
  ],
  
  [UserRole.OBSERVER]: [
    Permission.DEVICE_VIEW,
    Permission.MISSION_VIEW,
    Permission.TELEMETRY_VIEW
  ],
  
  [UserRole.FIELD_OPERATOR]: [
    Permission.DEVICE_VIEW,
    Permission.DEVICE_CONTROL,
    Permission.MISSION_VIEW,
    Permission.TELEMETRY_VIEW,
    Permission.DEVICE_EMERGENCY_STOP
  ]
};

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessTokenExpiry: string = '15m';
  private readonly refreshTokenExpiry: string = '7d';

  constructor(jwtSecret?: string, jwtRefreshSecret?: string) {
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'wildfire-ops-secret';
    this.jwtRefreshSecret = jwtRefreshSecret || process.env.JWT_REFRESH_SECRET || 'wildfire-ops-refresh-secret';
    
    if (!jwtSecret && !process.env.JWT_SECRET) {
      console.warn('Using default JWT secret - not suitable for production!');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateTokens(user: User): AuthToken {
    const payload: JWTPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      iss: 'wildfire-ops'
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry
    });

    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      this.jwtRefreshSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer'
    };
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new WildfireError(
          ErrorCode.TOKEN_EXPIRED,
          'Access token has expired',
          ErrorSeverity.LOW,
          {},
          false,
          401
        );
      }
      throw new WildfireError(
        ErrorCode.UNAUTHORIZED,
        'Invalid access token',
        ErrorSeverity.MEDIUM,
        {},
        false,
        401
      );
    }
  }

  verifyRefreshToken(token: string): { sub: string; type: string } {
    try {
      return jwt.verify(token, this.jwtRefreshSecret) as { sub: string; type: string };
    } catch (error) {
      throw new WildfireError(
        ErrorCode.UNAUTHORIZED,
        'Invalid refresh token',
        ErrorSeverity.MEDIUM,
        {},
        false,
        401
      );
    }
  }

  hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    return userPermissions.includes(requiredPermission) || userPermissions.includes(Permission.SYSTEM_ADMIN);
  }

  hasAnyPermission(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some(permission => this.hasPermission(userPermissions, permission));
  }

  getRolePermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  // Emergency access for critical situations
  canBypassInEmergency(userRole: UserRole, emergencyLevel: 'low' | 'medium' | 'high' | 'critical'): boolean {
    const emergencyBypassRoles = [UserRole.ADMIN, UserRole.INCIDENT_COMMANDER];
    
    if (emergencyLevel === 'critical') {
      return emergencyBypassRoles.includes(userRole) || userRole === UserRole.OPERATIONS_CHIEF;
    }
    
    return emergencyBypassRoles.includes(userRole);
  }
}

// Middleware for Express/FastAPI equivalent
export interface AuthMiddlewareOptions {
  requiredPermissions?: Permission[];
  requiredRole?: UserRole;
  allowEmergencyBypass?: boolean;
  emergencyLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export class AuthMiddleware {
  constructor(private authService: AuthService) {}

  authenticate() {
    return (req: any, res: any, next: any) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new WildfireError(
            ErrorCode.UNAUTHORIZED,
            'Missing or invalid authorization header',
            ErrorSeverity.LOW,
            { requestId: req.id },
            false,
            401
          );
        }

        const token = authHeader.substring(7);
        const payload = this.authService.verifyAccessToken(token);
        
        req.user = payload;
        next();
      } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
      }
    };
  }

  authorize(options: AuthMiddlewareOptions = {}) {
    return (req: any, res: any, next: any) => {
      try {
        const user = req.user as JWTPayload;
        
        if (!user) {
          throw new WildfireError(
            ErrorCode.UNAUTHORIZED,
            'User not authenticated',
            ErrorSeverity.MEDIUM,
            {},
            false,
            401
          );
        }

        // Check role requirement
        if (options.requiredRole && user.role !== options.requiredRole && user.role !== UserRole.ADMIN) {
          // Check emergency bypass
          if (options.allowEmergencyBypass && options.emergencyLevel) {
            if (!this.authService.canBypassInEmergency(user.role, options.emergencyLevel)) {
              throw new WildfireError(
                ErrorCode.FORBIDDEN,
                'Insufficient role permissions',
                ErrorSeverity.MEDIUM,
                { userId: user.sub, requiredRole: options.requiredRole },
                false,
                403
              );
            }
          } else {
            throw new WildfireError(
              ErrorCode.FORBIDDEN,
              'Insufficient role permissions',
              ErrorSeverity.MEDIUM,
              { userId: user.sub, requiredRole: options.requiredRole },
              false,
              403
            );
          }
        }

        // Check permission requirements
        if (options.requiredPermissions && options.requiredPermissions.length > 0) {
          const hasPermission = this.authService.hasAnyPermission(user.permissions, options.requiredPermissions);
          
          if (!hasPermission) {
            // Check emergency bypass
            if (options.allowEmergencyBypass && options.emergencyLevel) {
              if (!this.authService.canBypassInEmergency(user.role, options.emergencyLevel)) {
                throw new WildfireError(
                  ErrorCode.FORBIDDEN,
                  'Insufficient permissions',
                  ErrorSeverity.MEDIUM,
                  { userId: user.sub, requiredPermissions: options.requiredPermissions },
                  false,
                  403
                );
              }
            } else {
              throw new WildfireError(
                ErrorCode.FORBIDDEN,
                'Insufficient permissions',
                ErrorSeverity.MEDIUM,
                { userId: user.sub, requiredPermissions: options.requiredPermissions },
                false,
                403
              );
            }
          }
        }

        next();
      } catch (error) {
        if (error instanceof WildfireError) {
          res.status(error.statusCode).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Authorization failed' });
        }
      }
    };
  }
}

// Rate limiting for security
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (attempt.count >= this.maxAttempts) {
      return false;
    }

    attempt.count++;
    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  getRemainingAttempts(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt || Date.now() > attempt.resetTime) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - attempt.count);
  }
}
