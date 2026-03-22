/**
 * MQTT topic helpers for edge agent communications.
 */

export const mqttTopics = {
  telemetry: (deviceId: string) => `devices/${deviceId}/telemetry`,
  detections: (deviceId: string) => `devices/${deviceId}/detections`,
  control: (deviceId: string) => `devices/${deviceId}/control`,
  status: (deviceId: string) => `devices/${deviceId}/status`,
  tasks: (deviceId: string) => `devices/${deviceId}/tasks/`,
  alerts: (deviceId: string) => `devices/${deviceId}/alerts/`,
}
