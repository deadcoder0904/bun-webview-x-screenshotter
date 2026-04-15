#!/usr/bin/env bun
import path from 'node:path'
import { takeScreenshots } from './automation'
import tweets from './examples.json'

async function main() {
  const tweetsDir = path.join(process.cwd(), 'tweets')
  
  console.log('--- Bun Tweet Screenshotter ---')
  console.log(`Working directory: ${process.cwd()}`)
  console.log(`Saving to: ${tweetsDir}`)
  console.log('-------------------------------\n')

  try {
    const result = await takeScreenshots({
      urls: tweets,
      tweetsDir,
      useXcancel: true, // Recommended for stability and less bot protection
    })

    console.log('-------------------------------')
    console.log(`🎉 Success! Captured ${result.count} screenshots in ${(result.timeMs / 1000).toFixed(2)}s`)
  } catch (error) {
    console.error('\n❌ Fatal error during screenshot capture:')
    console.error(error)
    process.exit(1)
  }
}

main()
