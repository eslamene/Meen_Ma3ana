/**
 * Master Script: Run Full Import Process
 * 
 * This script runs all import steps in sequence:
 * 1. Clear all data
 * 2. Import contributions with users
 * 3. Verify import
 * 
 * Usage:
 *   node scripts/00-run-full-import.js
 * 
 * WARNING: This will delete all existing cases, contributions, and notifications!
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Running: ${scriptName}`)
    console.log('='.repeat(60) + '\n')
    
    const scriptPath = join(__dirname, scriptName)
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: true
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${scriptName} completed successfully\n`)
        resolve()
      } else {
        console.error(`\n❌ ${scriptName} failed with exit code ${code}\n`)
        reject(new Error(`${scriptName} failed with exit code ${code}`))
      }
    })
    
    child.on('error', (error) => {
      console.error(`\n❌ Error running ${scriptName}:`, error.message)
      reject(error)
    })
  })
}

async function runFullImport() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 FULL IMPORT PROCESS')
  console.log('='.repeat(60))
  console.log('\n⚠️  WARNING: This will delete all existing data!')
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n')
  
  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  try {
    // Step 1: Clear all data
    await runScript('01-clear-all-data.js')
    
    // Step 2: Import contributions
    await runScript('02-import-contributions-with-users.js')
    
    // Step 3: Verify import
    await runScript('03-verify-import.js')
    
    console.log('\n' + '='.repeat(60))
    console.log('✨ FULL IMPORT COMPLETED SUCCESSFULLY!')
    console.log('='.repeat(60) + '\n')
    
  } catch (error) {
    console.error('\n' + '='.repeat(60))
    console.error('❌ IMPORT PROCESS FAILED')
    console.error('='.repeat(60))
    console.error(`\nError: ${error.message}\n`)
    console.error('Please check the error messages above and fix any issues.')
    console.error('You may need to run individual scripts manually.\n')
    process.exit(1)
  }
}

runFullImport()

