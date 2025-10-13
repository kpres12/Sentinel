/**
 * Comprehensive monitoring and alerting system for wildfire operations platform
 */

import { EventEmitter } from 'events';
import { WildfireError, ErrorCode, ErrorSeverity } from '../errors';

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
  help?: string;
}

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  labels: Record<string, string>;
  timestamp: number;
  resolved?: boolean;
  resolvedAt?: number;
  metadata?: Record<string, any>;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  timestamp: number;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  // Application metrics
  requestsTotal: number;
  requestDuration: number;
  errorsTotal: number;
  activeConnections: number;

  // Device metrics
  devicesOnline: number;
  devicesOffline: number;
  activeMissions: number;
  completedMissions: number;

  // Data processing metrics
  detectionsPerMinute: number;
  triangulationsPerMinute: number;
  predictionLatency: number;
  dataProcessingErrors: number;

  // Infrastructure metrics
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
}

export class MetricsCollector {
  private metrics: Map<string, Metric> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  // Counter operations
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.updateMetric({
      name,
      type: MetricType.COUNTER,
      value: current + value,
      labels,
      timestamp: Date.now()
    });
  }

  // Gauge operations
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);
    
    this.updateMetric({
      name,
      type: MetricType.GAUGE,
      value,
      labels,
      timestamp: Date.now()
    });
  }

  incrementGauge(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const current = this.gauges.get(key) || 0;
    this.setGauge(name, current + value, labels);
  }

  decrementGauge(name: string, labels?: Record<string, string>, value: number = 1): void {
    this.incrementGauge(name, labels, -value);
  }

  // Histogram operations
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    
    this.updateMetric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      labels,
      timestamp: Date.now()
    });
  }

  // Timing helper
  time<T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T> {
    const start = Date.now();
    return fn().finally(() => {
      const duration = Date.now() - start;
      this.observeHistogram(`${name}_duration_ms`, duration, labels);
    });
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private updateMetric(metric: Metric): void {
    const key = this.getMetricKey(metric.name, metric.labels);
    this.metrics.set(key, metric);
  }

  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  getPrometheusFormat(): string {
    const lines: string[] = [];
    
    for (const metric of this.metrics.values()) {
      const labelStr = metric.labels 
        ? '{' + Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
        : '';
      
      lines.push(`${metric.name}${labelStr} ${metric.value} ${metric.timestamp}`);
    }
    
    return lines.join('\n');
  }

  reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

export class AlertManager extends EventEmitter {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private notificationChannels: NotificationChannel[] = [];

  addRule(rule: AlertRule): void {
    this.rules.set(rule.name, rule);
  }

  removeRule(name: string): void {
    this.rules.delete(name);
  }

  addNotificationChannel(channel: NotificationChannel): void {
    this.notificationChannels.push(channel);
  }

  async evaluateRules(metrics: Metric[]): Promise<void> {
    for (const rule of this.rules.values()) {
      try {
        const shouldAlert = await rule.evaluate(metrics);
        const existingAlert = this.alerts.get(rule.name);

        if (shouldAlert && !existingAlert) {
          // Create new alert
          const alert: Alert = {
            id: `${rule.name}_${Date.now()}`,
            name: rule.name,
            severity: rule.severity,
            message: rule.message,
            labels: rule.labels || {},
            timestamp: Date.now()
          };

          this.alerts.set(rule.name, alert);
          await this.sendAlert(alert);
          this.emit('alert', alert);

        } else if (!shouldAlert && existingAlert && !existingAlert.resolved) {
          // Resolve existing alert
          existingAlert.resolved = true;
          existingAlert.resolvedAt = Date.now();
          
          await this.sendResolution(existingAlert);
          this.emit('resolved', existingAlert);
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.name}:`, error);
      }
    }
  }

  async createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert> {
    const fullAlert: Alert = {
      ...alert,
      id: `${alert.name}_${Date.now()}`,
      timestamp: Date.now()
    };

    this.alerts.set(alert.name, fullAlert);
    await this.sendAlert(fullAlert);
    this.emit('alert', fullAlert);

    return fullAlert;
  }

  async resolveAlert(name: string): Promise<void> {
    const alert = this.alerts.get(name);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      
      await this.sendResolution(alert);
      this.emit('resolved', alert);
    }
  }

  private async sendAlert(alert: Alert): Promise<void> {
    for (const channel of this.notificationChannels) {
      try {
        await channel.sendAlert(alert);
      } catch (error) {
        console.error(`Failed to send alert via ${channel.name}:`, error);
      }
    }
  }

  private async sendResolution(alert: Alert): Promise<void> {
    for (const channel of this.notificationChannels) {
      try {
        await channel.sendResolution(alert);
      } catch (error) {
        console.error(`Failed to send resolution via ${channel.name}:`, error);
      }
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }
}

export interface AlertRule {
  name: string;
  severity: AlertSeverity;
  message: string;
  labels?: Record<string, string>;
  evaluate(metrics: Metric[]): Promise<boolean>;
}

export interface NotificationChannel {
  name: string;
  sendAlert(alert: Alert): Promise<void>;
  sendResolution(alert: Alert): Promise<void>;
}

// Built-in alert rules
export class ThresholdAlertRule implements AlertRule {
  constructor(
    public name: string,
    public severity: AlertSeverity,
    public message: string,
    private metricName: string,
    private threshold: number,
    private operator: '>' | '<' | '>=' | '<=' | '==' | '!=',
    public labels?: Record<string, string>
  ) {}

  async evaluate(metrics: Metric[]): Promise<boolean> {
    const metric = metrics.find(m => m.name === this.metricName);
    if (!metric) return false;

    switch (this.operator) {
      case '>': return metric.value > this.threshold;
      case '<': return metric.value < this.threshold;
      case '>=': return metric.value >= this.threshold;
      case '<=': return metric.value <= this.threshold;
      case '==': return metric.value === this.threshold;
      case '!=': return metric.value !== this.threshold;
      default: return false;
    }
  }
}

export class RateAlertRule implements AlertRule {
  private previousValue?: number;
  private previousTimestamp?: number;

  constructor(
    public name: string,
    public severity: AlertSeverity,
    public message: string,
    private metricName: string,
    private rateThreshold: number, // per second
    public labels?: Record<string, string>
  ) {}

  async evaluate(metrics: Metric[]): Promise<boolean> {
    const metric = metrics.find(m => m.name === this.metricName);
    if (!metric) return false;

    if (this.previousValue === undefined || this.previousTimestamp === undefined) {
      this.previousValue = metric.value;
      this.previousTimestamp = metric.timestamp;
      return false;
    }

    const timeDiff = (metric.timestamp - this.previousTimestamp) / 1000; // seconds
    const valueDiff = metric.value - this.previousValue;
    const rate = valueDiff / timeDiff;

    this.previousValue = metric.value;
    this.previousTimestamp = metric.timestamp;

    return rate > this.rateThreshold;
  }
}

// Notification channels
export class WebhookNotificationChannel implements NotificationChannel {
  constructor(
    public name: string,
    private webhookUrl: string,
    private headers?: Record<string, string>
  ) {}

  async sendAlert(alert: Alert): Promise<void> {
    const payload = {
      type: 'alert',
      alert,
      timestamp: Date.now()
    };

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new WildfireError(
        ErrorCode.EXTERNAL_API_ERROR,
        `Webhook notification failed: ${response.statusText}`,
        ErrorSeverity.MEDIUM
      );
    }
  }

  async sendResolution(alert: Alert): Promise<void> {
    const payload = {
      type: 'resolution',
      alert,
      timestamp: Date.now()
    };

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new WildfireError(
        ErrorCode.EXTERNAL_API_ERROR,
        `Webhook resolution notification failed: ${response.statusText}`,
        ErrorSeverity.MEDIUM
      );
    }
  }
}

export class HealthMonitor {
  private checks: Map<string, HealthCheckFunction> = new Map();
  private results: Map<string, HealthCheck> = new Map();

  addCheck(name: string, check: HealthCheckFunction): void {
    this.checks.set(name, check);
  }

  removeCheck(name: string): void {
    this.checks.delete(name);
    this.results.delete(name);
  }

  async runChecks(): Promise<Map<string, HealthCheck>> {
    const promises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      const start = Date.now();
      try {
        const result = await Promise.race([
          check(),
          new Promise<HealthCheck>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 10000)
          )
        ]);
        
        const healthCheck: HealthCheck = {
          ...result,
          name,
          timestamp: Date.now(),
          responseTime: Date.now() - start
        };
        
        this.results.set(name, healthCheck);
        return [name, healthCheck] as const;
      } catch (error) {
        const healthCheck: HealthCheck = {
          name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
          responseTime: Date.now() - start
        };
        
        this.results.set(name, healthCheck);
        return [name, healthCheck] as const;
      }
    });

    const results = await Promise.all(promises);
    return new Map(results);
  }

  getOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const checks = Array.from(this.results.values());
    
    if (checks.length === 0) return 'unhealthy';
    
    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
    const degraded = checks.filter(c => c.status === 'degraded').length;
    
    if (unhealthy > 0) return 'unhealthy';
    if (degraded > 0) return 'degraded';
    return 'healthy';
  }

  getResults(): HealthCheck[] {
    return Array.from(this.results.values());
  }
}

export type HealthCheckFunction = () => Promise<Omit<HealthCheck, 'name' | 'timestamp' | 'responseTime'>>;

// Built-in health checks
export const databaseHealthCheck: HealthCheckFunction = async () => {
  // This would be implemented with actual database connection
  return {
    status: 'healthy',
    message: 'Database connection successful'
  };
};

export const mqttHealthCheck: HealthCheckFunction = async () => {
  // This would be implemented with actual MQTT connection check
  return {
    status: 'healthy',
    message: 'MQTT broker connection successful'
  };
};

export const summitHealthCheck: HealthCheckFunction = async () => {
  // This would be implemented with actual Summit.OS API check
  return {
    status: 'healthy',
    message: 'Summit.OS API responding'
  };
};

// Monitoring service that ties everything together
export class MonitoringService {
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;
  private healthMonitor: HealthMonitor;
  private interval?: NodeJS.Timeout;

  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.alertManager = new AlertManager();
    this.healthMonitor = new HealthMonitor();
    
    this.setupDefaultRules();
    this.setupDefaultHealthChecks();
  }

  start(intervalMs: number = 30000): void {
    this.interval = setInterval(async () => {
      try {
        // Collect metrics
        const metrics = this.metricsCollector.getMetrics();
        
        // Evaluate alert rules
        await this.alertManager.evaluateRules(metrics);
        
        // Run health checks
        await this.healthMonitor.runChecks();
        
      } catch (error) {
        console.error('Monitoring service error:', error);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private setupDefaultRules(): void {
    // High error rate
    this.alertManager.addRule(new RateAlertRule(
      'high_error_rate',
      AlertSeverity.CRITICAL,
      'High error rate detected',
      'errors_total',
      10 // 10 errors per second
    ));

    // Device offline
    this.alertManager.addRule(new ThresholdAlertRule(
      'devices_offline',
      AlertSeverity.WARNING,
      'Multiple devices offline',
      'devices_offline',
      5,
      '>'
    ));

    // High CPU usage
    this.alertManager.addRule(new ThresholdAlertRule(
      'high_cpu_usage',
      AlertSeverity.WARNING,
      'High CPU usage detected',
      'cpu_usage_percent',
      80,
      '>'
    ));
  }

  private setupDefaultHealthChecks(): void {
    this.healthMonitor.addCheck('database', databaseHealthCheck);
    this.healthMonitor.addCheck('mqtt', mqttHealthCheck);
    this.healthMonitor.addCheck('summit', summitHealthCheck);
  }

  get metrics(): MetricsCollector {
    return this.metricsCollector;
  }

  get alerts(): AlertManager {
    return this.alertManager;
  }

  get health(): HealthMonitor {
    return this.healthMonitor;
  }
}
