// Multi-link communication layer for Sentinel
// Provides link abstraction, automatic failover, priority-aware routing, and buffering

import { EventEmitter } from 'events';

export enum LinkType {
  RADIO_MESH = 'radio_mesh',
  CELLULAR = 'cellular',
  SATELLITE = 'satellite',
  WIFI = 'wifi',
}

export enum MessagePriority {
  CRITICAL = 10, // Fire alerts - any available link
  HIGH = 7, // Drone coordination - mesh + cellular
  MEDIUM = 5, // Telemetry - cellular preferred
  LOW = 2, // Diagnostics - cellular only, can delay
}

export type LinkQuality = {
  rssi?: number; // dBm
  latencyMs?: number;
  lossPct?: number;
  throughputKbps?: number;
  lastUpdated: number;
};

export type LinkState = {
  type: LinkType;
  id: string;
  enabled: boolean;
  up: boolean;
  quality: LinkQuality;
  costScore: number; // relative cost (lower is cheaper)
  preferred: boolean;
};

export type MultiLinkConfig = {
  deviceId: string;
  failoverOrder: LinkType[];
  autonomousMode: { enabled: boolean; syncIntervalSec: number; bufferSizeMB: number };
};

export interface SendOptions {
  preferredLink?: LinkType;
  timeoutMs?: number;
}

export class MultiLinkManager extends EventEmitter {
  private config: MultiLinkConfig;
  private links: Map<LinkType, LinkState> = new Map();
  private buffer: { ts: number; topic: string; payload: any; priority: MessagePriority }[] = [];
  private bufferBytes = 0;
  private syncTimer?: NodeJS.Timeout;

  constructor(config: MultiLinkConfig) {
    super();
    this.config = config;
  }

  addOrUpdateLink(state: Omit<LinkState, 'quality'> & { quality?: Partial<LinkQuality> }): void {
    const existing = this.links.get(state.type);
    const merged: LinkState = {
      type: state.type,
      id: state.id,
      enabled: state.enabled,
      up: state.up,
      preferred: state.preferred,
      costScore: state.costScore,
      quality: {
        rssi: state.quality?.rssi ?? existing?.quality.rssi,
        latencyMs: state.quality?.latencyMs ?? existing?.quality.latencyMs,
        lossPct: state.quality?.lossPct ?? existing?.quality.lossPct,
        throughputKbps: state.quality?.throughputKbps ?? existing?.quality.throughputKbps,
        lastUpdated: Date.now(),
      },
    };
    this.links.set(state.type, merged);
    this.emit('linkUpdated', merged);
  }

  setFailoverOrder(order: LinkType[]) {
    this.config.failoverOrder = order;
  }

  start(): void {
    if (this.config.autonomousMode.enabled && !this.syncTimer) {
      this.syncTimer = setInterval(() => this.flushBuffer(), this.config.autonomousMode.syncIntervalSec * 1000);
    }
  }

  stop(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = undefined;
  }

  getLinkState(type: LinkType): LinkState | undefined {
    return this.links.get(type);
  }

  hasWideAreaConnectivity(): boolean {
    // Wide-area defined as CELLULAR or SATELLITE or WIFI
    return [LinkType.CELLULAR, LinkType.SATELLITE, LinkType.WIFI].some((t) => this.links.get(t)?.up);
  }

  async sendMessage(
    topic: string,
    payload: any,
    priority: MessagePriority,
    options?: SendOptions
  ): Promise<void> {
    const link = this.pickLink(priority, options?.preferredLink);

    if (!link) {
      // No link available; buffer if autonomous
      this.bufferMessage(topic, payload, priority);
      this.emit('buffered', { topic, priority });
      return;
    }

    try {
      await this.transmit(link.type, topic, payload, priority, options?.timeoutMs ?? this.defaultTimeout(priority));
    } catch (err) {
      // Mark link degraded and try next in order for high/critical
      this.markDegraded(link.type);
      const alternate = this.pickLink(priority, options?.preferredLink, new Set([link.type]));
      if (alternate) {
        await this.transmit(
          alternate.type,
          topic,
          payload,
          priority,
          options?.timeoutMs ?? this.defaultTimeout(priority)
        );
      } else {
        this.bufferMessage(topic, payload, priority);
        this.emit('buffered', { topic, priority });
      }
    }
  }

  private defaultTimeout(priority: MessagePriority): number {
    if (priority >= MessagePriority.CRITICAL) return 250; // fast failover for alerts
    if (priority >= MessagePriority.HIGH) return 500;
    if (priority >= MessagePriority.MEDIUM) return 1500;
    return 5000;
  }

  private pickLink(
    priority: MessagePriority,
    preferred?: LinkType,
    exclude: Set<LinkType> = new Set()
  ): LinkState | undefined {
    const candidates = this.config.failoverOrder
      .filter((t) => !exclude.has(t))
      .map((t) => this.links.get(t))
      .filter((s): s is LinkState => !!s && s.enabled && s.up);

    // Priority preferences
    const desiredTypes: LinkType[] = this.priorityPreferredTypes(priority, preferred);
    const preferredAvailable = candidates.filter((c) => desiredTypes.includes(c.type));
    const pool = preferredAvailable.length ? preferredAvailable : candidates;

    // Choose by composite score: lower latency/loss and lower cost preferred
    return pool
      .map((s) => ({
        s,
        score:
          (s.quality.latencyMs ?? 999) * 0.5 +
          (s.quality.lossPct ?? 50) * 5 +
          (100000 / Math.max(1, s.quality.throughputKbps ?? 1)) * 0.1 +
          s.costScore * 10,
      }))
      .sort((a, b) => a.score - b.score)[0]?.s;
  }

  private priorityPreferredTypes(priority: MessagePriority, preferred?: LinkType): LinkType[] {
    if (preferred) return [preferred];
    if (priority >= MessagePriority.CRITICAL) return [LinkType.RADIO_MESH, LinkType.CELLULAR, LinkType.SATELLITE, LinkType.WIFI];
    if (priority >= MessagePriority.HIGH) return [LinkType.RADIO_MESH, LinkType.CELLULAR];
    if (priority >= MessagePriority.MEDIUM) return [LinkType.CELLULAR, LinkType.WIFI];
    return [LinkType.CELLULAR];
  }

  private async transmit(
    type: LinkType,
    topic: string,
    payload: any,
    priority: MessagePriority,
    timeoutMs: number
  ): Promise<void> {
    // Placeholder implementations; integrate with real transports/adapters
    // RADIO_MESH: local broadcast over 802.11s mesh (brokerless UDP or mesh-MQTT)
    // CELLULAR/WIFI/SATELLITE: HTTPS/MQTT/WebSocket
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(undefined), Math.min(40, timeoutMs)); // simulate fast mesh
      // In real code, call adapter.send and clear timer on completion or error
      // For now, we just resolve quickly to simulate success
      // If link is marked down, reject
      const state = this.links.get(type);
      if (!state?.up) {
        clearTimeout(timer);
        reject(new Error(`Link ${type} is down`));
      }
    });
    this.emit('sent', { link: type, topic, priority });
  }

  private bufferMessage(topic: string, payload: any, priority: MessagePriority) {
    const serialized = Buffer.from(JSON.stringify({ topic, payload, priority }));
    const size = serialized.byteLength;
    const limitBytes = this.config.autonomousMode.bufferSizeMB * 1024 * 1024;
    // Evict oldest until space
    while (this.bufferBytes + size > limitBytes && this.buffer.length) {
      const evicted = this.buffer.shift();
      if (evicted) {
        this.bufferBytes -= Buffer.from(JSON.stringify(evicted)).byteLength;
      }
    }
    this.buffer.push({ ts: Date.now(), topic, payload, priority });
    this.bufferBytes += size;
  }

  async flushBuffer(): Promise<void> {
    if (!this.hasWideAreaConnectivity() || this.buffer.length === 0) return;
    const pending = [...this.buffer];
    this.buffer = [];
    this.bufferBytes = 0;
    for (const item of pending) {
      try {
        await this.sendMessage(item.topic, item.payload, item.priority);
        this.emit('flushed', { topic: item.topic });
      } catch (e) {
        // Put back if still failing
        this.bufferMessage(item.topic, item.payload, item.priority);
      }
    }
  }

  markUp(type: LinkType, quality?: Partial<LinkQuality>) {
    const s = this.links.get(type);
    if (s) this.addOrUpdateLink({ ...s, up: true, enabled: true, quality });
  }

  markDown(type: LinkType) {
    const s = this.links.get(type);
    if (s) this.addOrUpdateLink({ ...s, up: false, enabled: s.enabled });
  }

  private markDegraded(type: LinkType) {
    const s = this.links.get(type);
    if (s) this.addOrUpdateLink({ ...s, up: s.up, enabled: s.enabled, quality: { lossPct: 50 } });
  }
}
