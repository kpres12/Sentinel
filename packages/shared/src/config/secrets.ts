/**
 * Production secrets management system
 */

import * as fs from 'fs';
import * as path from 'path';
import { WildfireError, ErrorCode, ErrorSeverity } from '../errors';

export interface SecretsConfig {
  // Database
  DATABASE_URL: string;
  DATABASE_PASSWORD: string;
  REDIS_URL: string;
  REDIS_PASSWORD?: string;

  // Authentication
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ENCRYPTION_KEY: string;

  // External APIs
  WEATHER_API_KEY: string;
  SATELLITE_API_KEY: string;
  LIGHTNING_API_KEY: string;
  ARCGIS_API_KEY?: string;

  // MQTT & Messaging
  MQTT_USERNAME: string;
  MQTT_PASSWORD: string;
  MQTT_BROKER_URL: string;

  // Summit.OS Integration
  SUMMIT_API_KEY: string;
  SUMMIT_API_URL: string;
  SUMMIT_WEBHOOK_SECRET: string;

  // Monitoring & Alerting
  PROMETHEUS_PASSWORD?: string;
  GRAFANA_ADMIN_PASSWORD?: string;
  ALERT_WEBHOOK_URL?: string;
  SMTP_PASSWORD?: string;

  // Cloud Storage
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  AZURE_STORAGE_KEY?: string;

  // Emergency Contacts
  EMERGENCY_NOTIFICATION_KEY: string;
  SMS_API_KEY?: string;
}

export enum SecretSource {
  ENVIRONMENT = 'environment',
  FILE = 'file',
  VAULT = 'vault',
  K8S_SECRET = 'k8s_secret',
  AWS_SECRETS_MANAGER = 'aws_secrets_manager',
  AZURE_KEY_VAULT = 'azure_key_vault'
}

export interface SecretProviderConfig {
  source: SecretSource;
  path?: string;
  region?: string;
  vaultUrl?: string;
  namespace?: string;
}

export abstract class SecretProvider {
  abstract async getSecret(key: string): Promise<string | undefined>;
  abstract async setSecret(key: string, value: string): Promise<void>;
  abstract async deleteSecret(key: string): Promise<void>;
  abstract async listSecrets(): Promise<string[]>;
}

export class EnvironmentSecretProvider extends SecretProvider {
  async getSecret(key: string): Promise<string | undefined> {
    return process.env[key];
  }

  async setSecret(key: string, value: string): Promise<void> {
    process.env[key] = value;
  }

  async deleteSecret(key: string): Promise<void> {
    delete process.env[key];
  }

  async listSecrets(): Promise<string[]> {
    return Object.keys(process.env);
  }
}

export class FileSecretProvider extends SecretProvider {
  constructor(private secretsPath: string = '/etc/wildfire-secrets') {}

  async getSecret(key: string): Promise<string | undefined> {
    try {
      const filePath = path.join(this.secretsPath, key);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8').trim();
      }
      return undefined;
    } catch (error) {
      throw new WildfireError(
        ErrorCode.STORAGE_ERROR,
        `Failed to read secret ${key}: ${error}`,
        ErrorSeverity.HIGH
      );
    }
  }

  async setSecret(key: string, value: string): Promise<void> {
    try {
      const filePath = path.join(this.secretsPath, key);
      const dir = path.dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
      
      fs.writeFileSync(filePath, value, { mode: 0o600 });
    } catch (error) {
      throw new WildfireError(
        ErrorCode.STORAGE_ERROR,
        `Failed to write secret ${key}: ${error}`,
        ErrorSeverity.HIGH
      );
    }
  }

  async deleteSecret(key: string): Promise<void> {
    try {
      const filePath = path.join(this.secretsPath, key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new WildfireError(
        ErrorCode.STORAGE_ERROR,
        `Failed to delete secret ${key}: ${error}`,
        ErrorSeverity.MEDIUM
      );
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.secretsPath)) {
        return [];
      }
      return fs.readdirSync(this.secretsPath);
    } catch (error) {
      throw new WildfireError(
        ErrorCode.STORAGE_ERROR,
        `Failed to list secrets: ${error}`,
        ErrorSeverity.MEDIUM
      );
    }
  }
}

export class K8sSecretProvider extends SecretProvider {
  constructor(private namespace: string = 'wildfire-ops') {}

  async getSecret(key: string): Promise<string | undefined> {
    try {
      // In a real implementation, this would use the Kubernetes API
      // For now, we'll check for mounted secrets
      const secretPath = `/var/run/secrets/kubernetes.io/wildfire-ops/${key}`;
      if (fs.existsSync(secretPath)) {
        return fs.readFileSync(secretPath, 'utf8').trim();
      }
      return undefined;
    } catch (error) {
      throw new WildfireError(
        ErrorCode.EXTERNAL_API_ERROR,
        `Failed to read K8s secret ${key}: ${error}`,
        ErrorSeverity.HIGH
      );
    }
  }

  async setSecret(key: string, value: string): Promise<void> {
    throw new WildfireError(
      ErrorCode.FORBIDDEN,
      'Cannot set secrets through K8s provider - use kubectl',
      ErrorSeverity.MEDIUM
    );
  }

  async deleteSecret(key: string): Promise<void> {
    throw new WildfireError(
      ErrorCode.FORBIDDEN,
      'Cannot delete secrets through K8s provider - use kubectl',
      ErrorSeverity.MEDIUM
    );
  }

  async listSecrets(): Promise<string[]> {
    try {
      const secretDir = '/var/run/secrets/kubernetes.io/wildfire-ops';
      if (!fs.existsSync(secretDir)) {
        return [];
      }
      return fs.readdirSync(secretDir);
    } catch (error) {
      return [];
    }
  }
}

export class SecretsManager {
  private providers: Map<SecretSource, SecretProvider> = new Map();
  private cache: Map<string, { value: string; expiry: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(configs: SecretProviderConfig[]) {
    this.initializeProviders(configs);
  }

  private initializeProviders(configs: SecretProviderConfig[]): void {
    for (const config of configs) {
      switch (config.source) {
        case SecretSource.ENVIRONMENT:
          this.providers.set(config.source, new EnvironmentSecretProvider());
          break;
        case SecretSource.FILE:
          this.providers.set(config.source, new FileSecretProvider(config.path));
          break;
        case SecretSource.K8S_SECRET:
          this.providers.set(config.source, new K8sSecretProvider(config.namespace));
          break;
        default:
          console.warn(`Unsupported secret source: ${config.source}`);
      }
    }
  }

  async getSecret(key: string, sources?: SecretSource[]): Promise<string> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }

    const searchSources = sources || Array.from(this.providers.keys());
    
    for (const source of searchSources) {
      const provider = this.providers.get(source);
      if (!provider) continue;

      try {
        const value = await provider.getSecret(key);
        if (value !== undefined) {
          // Cache the value
          this.cache.set(key, {
            value,
            expiry: Date.now() + this.cacheTimeout
          });
          return value;
        }
      } catch (error) {
        console.warn(`Failed to get secret ${key} from ${source}:`, error);
      }
    }

    throw new WildfireError(
      ErrorCode.STORAGE_ERROR,
      `Secret ${key} not found in any configured source`,
      ErrorSeverity.HIGH
    );
  }

  async getSecrets(): Promise<SecretsConfig> {
    const secrets: Partial<SecretsConfig> = {};
    const requiredSecrets: (keyof SecretsConfig)[] = [
      'DATABASE_URL',
      'DATABASE_PASSWORD',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'WEATHER_API_KEY',
      'MQTT_USERNAME',
      'MQTT_PASSWORD',
      'MQTT_BROKER_URL',
      'SUMMIT_API_KEY',
      'SUMMIT_API_URL',
      'SUMMIT_WEBHOOK_SECRET',
      'EMERGENCY_NOTIFICATION_KEY'
    ];

    const optionalSecrets: (keyof SecretsConfig)[] = [
      'REDIS_URL',
      'REDIS_PASSWORD',
      'SATELLITE_API_KEY',
      'LIGHTNING_API_KEY',
      'ARCGIS_API_KEY',
      'PROMETHEUS_PASSWORD',
      'GRAFANA_ADMIN_PASSWORD',
      'ALERT_WEBHOOK_URL',
      'SMTP_PASSWORD',
      'S3_ACCESS_KEY',
      'S3_SECRET_KEY',
      'AZURE_STORAGE_KEY',
      'SMS_API_KEY'
    ];

    // Load required secrets
    for (const key of requiredSecrets) {
      try {
        secrets[key] = await this.getSecret(key);
      } catch (error) {
        throw new WildfireError(
          ErrorCode.STORAGE_ERROR,
          `Required secret ${key} is missing`,
          ErrorSeverity.CRITICAL
        );
      }
    }

    // Load optional secrets
    for (const key of optionalSecrets) {
      try {
        secrets[key] = await this.getSecret(key);
      } catch (error) {
        console.warn(`Optional secret ${key} not found, continuing...`);
      }
    }

    return secrets as SecretsConfig;
  }

  async validateSecrets(): Promise<{ valid: boolean; missing: string[]; errors: string[] }> {
    const missing: string[] = [];
    const errors: string[] = [];

    try {
      await this.getSecrets();
    } catch (error) {
      if (error instanceof WildfireError) {
        if (error.message.includes('is missing')) {
          missing.push(error.message.split(' ')[2]);
        } else {
          errors.push(error.message);
        }
      }
    }

    return {
      valid: missing.length === 0 && errors.length === 0,
      missing,
      errors
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Utility method to generate secure secrets
  static generateSecret(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Utility method to rotate secrets
  async rotateSecret(key: string, newValue?: string): Promise<string> {
    const value = newValue || SecretsManager.generateSecret();
    
    // Try to update in all providers
    for (const [source, provider] of this.providers) {
      try {
        await provider.setSecret(key, value);
        console.log(`Rotated secret ${key} in ${source}`);
      } catch (error) {
        console.warn(`Failed to rotate secret ${key} in ${source}:`, error);
      }
    }

    // Clear from cache to force reload
    this.cache.delete(key);
    
    return value;
  }
}

// Default secrets manager configuration
export function createSecretsManager(): SecretsManager {
  const configs: SecretProviderConfig[] = [];

  // Determine environment and configure appropriate providers
  if (process.env.KUBERNETES_SERVICE_HOST) {
    // Running in Kubernetes
    configs.push({ source: SecretSource.K8S_SECRET });
    configs.push({ source: SecretSource.ENVIRONMENT }); // Fallback
  } else if (process.env.NODE_ENV === 'production') {
    // Production environment
    configs.push({ source: SecretSource.FILE });
    configs.push({ source: SecretSource.ENVIRONMENT }); // Fallback
  } else {
    // Development environment
    configs.push({ source: SecretSource.ENVIRONMENT });
  }

  return new SecretsManager(configs);
}
