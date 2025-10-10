/**
 * Edge agent for wildfire operations platform.
 * Simulates robot/drone behavior and publishes telemetry/detections via MQTT.
 */

import { EdgeAgent } from './EdgeAgent'
import { Logger } from './Logger'
import { Config } from './Config'

const logger = new Logger('EdgeAgent')
const config = new Config()

async function main() {
  try {
    logger.info('Starting edge agent...')
    
    const agent = new EdgeAgent(config)
    await agent.start()
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...')
      await agent.stop()
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...')
      await agent.stop()
      process.exit(0)
    })
    
  } catch (error) {
    logger.error('Failed to start edge agent:', error)
    process.exit(1)
  }
}

main()
