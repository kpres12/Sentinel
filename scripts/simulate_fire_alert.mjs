#!/usr/bin/env node
import mqtt from 'mqtt';

const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const TOPIC = process.env.ALERTS_TOPIC || 'wildfire/alerts';

const client = mqtt.connect(MQTT_URL);

client.on('connect', () => {
  console.log('Connected to MQTT');
  const payload = {
    type: 'fire',
    confidence: Number(process.env.SIM_CONF || 0.92),
    latitude: Number(process.env.SIM_LAT || 40.005),
    longitude: Number(process.env.SIM_LON || -119.995),
    metadata: { source: 'simulator' }
  };
  client.publish(TOPIC, JSON.stringify(payload), { qos: 0 }, (err) => {
    if (err) console.error('Publish error', err);
    else console.log(`Published to ${TOPIC}:`, payload);
    client.end();
  });
});

client.on('error', (err) => console.error('MQTT error', err));
