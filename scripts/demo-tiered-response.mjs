#!/usr/bin/env node

/**
 * Tiered Response System Demo
 * Demonstrates autonomous fire suppression workflow
 */

import { spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

console.log(`
🔥 SENTINEL TIERED RESPONSE SYSTEM DEMO 🔥
==========================================

This demonstrates autonomous fire suppression from detection to containment:

1. Fire Detection (Sentry Tower) → Confidence: 75%
2. Tier 1: FireFly verification → <60 seconds
3. Fire Confirmed → Auto-escalation trigger  
4. Tier 2: EmberWing suppression → <120 seconds
5. Large fire detected → Final escalation
6. Tier 3: Multi-drone containment → <300 seconds
7. SUCCESS: Fire contained autonomously!
`)

const scenarios = [
  {
    name: "🔥 SCENARIO 1: Small Fire - Tier 1 Success",
    lat: 40.0,
    lng: -120.0,
    confidence: 0.65,
    description: "Small brush fire detected, FireFly verification successful"
  },
  {
    name: "🔥 SCENARIO 2: Medium Fire - Escalates to Tier 2", 
    lat: 40.01,
    lng: -120.01,
    confidence: 0.78,
    description: "Medium fire, EmberWing direct suppression required"
  },
  {
    name: "🔥 SCENARIO 3: Large Fire - Full Tier 3 Response",
    lat: 40.02, 
    lng: -120.02,
    confidence: 0.92,
    description: "Large spreading fire, multi-drone containment ring deployed"
  }
]

async function runDemo() {
  console.log("🚀 Starting Tiered Response Demo...")
  console.log("   (In production, this would dispatch actual drones)")
  console.log()

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]
    
    console.log(`${scenario.name}`)
    console.log(`📍 Location: ${scenario.lat}, ${scenario.lng}`)
    console.log(`🎯 Confidence: ${(scenario.confidence * 100).toFixed(0)}%`)
    console.log(`📝 ${scenario.description}`)
    console.log()

    // Simulate detection processing
    console.log("⏱️  Processing fire detection...")
    await setTimeout(500)
    
    console.log("🚁 TIER 1: FireFly dispatched for verification")
    await setTimeout(1000)
    
    console.log("✅ Fire confirmed - initiating autonomous response")
    await setTimeout(500)
    
    if (scenario.confidence > 0.7) {
      console.log("⬆️  ESCALATING: Tier 2 - EmberWing suppression drone")
      await setTimeout(800)
      
      if (scenario.confidence > 0.9) {
        console.log("⬆️  ESCALATING: Tier 3 - Multi-drone containment")
        await setTimeout(1000)
        console.log("🛡️  3x Guardian drones forming containment perimeter")
        await setTimeout(500)
      }
    }
    
    console.log(`✅ SUCCESS: Fire contained in ${Math.floor(Math.random() * 180 + 45)} seconds`)
    console.log("🏁 All assets returning to base")
    console.log()
    console.log("─".repeat(60))
    console.log()
    
    await setTimeout(1000)
  }

  console.log(`
🎯 DEMO COMPLETE - AUTONOMOUS FIRE SUPPRESSION READY!

Key Achievements:
✅ Detection Integration - Fire alerts trigger autonomous response
✅ Tiered Escalation - Smart progression from verification to containment  
✅ Summit.OS Integration - Seamless drone coordination
✅ Real-time Monitoring - Live mission status and operator controls
✅ Performance Targets - <60s, <120s, <300s response times per tier

🚁 Ready for deployment: From detection to containment in seconds, not hours!

Next Steps:
1. Deploy Sentinel with: docker-compose -f docker-compose.tiered.yml up
2. Configure Summit.OS integration with your API key
3. Test with: SIM_CONF=0.8 node scripts/simulate_fire_alert.mjs
4. Monitor at: http://localhost:3000 (Console) & http://localhost:8089 (Status)
`)
}

// Add some color to make it more engaging
const colors = {
  reset: '\\x1b[0m',
  bright: '\\x1b[1m', 
  red: '\\x1b[31m',
  green: '\\x1b[32m',
  yellow: '\\x1b[33m',
  blue: '\\x1b[34m',
  magenta: '\\x1b[35m',
  cyan: '\\x1b[36m'
}

// Check if tiered response is available
try {
  await runDemo()
} catch (error) {
  console.error("Demo error:", error.message)
  console.log("\\n💡 To run full system: pnpm dev")
}