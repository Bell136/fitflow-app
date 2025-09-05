#!/usr/bin/env node

/**
 * FitFlow Error Monitor
 * Automatically monitors and debugs errors from Expo development server
 * Run this alongside your Expo dev server to catch and fix errors in real-time
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Track unique errors to avoid duplicates
const seenErrors = new Set();
const errorSolutions = new Map();

// Common error patterns and their solutions
const errorPatterns = [
  {
    pattern: /Could not find.*table.*'(.+)'/i,
    type: 'MISSING_TABLE',
    getSolution: (match) => ({
      error: `Missing table: ${match[1]}`,
      solution: `Create table ${match[1]} in Supabase SQL Editor`,
      sql: `CREATE TABLE IF NOT EXISTS "${match[1]}" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text);`
    })
  },
  {
    pattern: /column (.+)\.(.+) does not exist/i,
    type: 'MISSING_COLUMN',
    getSolution: (match) => ({
      error: `Missing column: ${match[1]}.${match[2]}`,
      solution: `Add column ${match[2]} to table ${match[1]}`,
      sql: `ALTER TABLE "${match[1]}" ADD COLUMN IF NOT EXISTS "${match[2]}" TEXT;`
    })
  },
  {
    pattern: /Could not find a relationship between '(.+)' and '(.+)'/i,
    type: 'MISSING_RELATIONSHIP',
    getSolution: (match) => ({
      error: `Missing relationship: ${match[1]} -> ${match[2]}`,
      solution: `Add foreign key from ${match[1]} to ${match[2]}`,
      sql: `ALTER TABLE "${match[1]}" ADD CONSTRAINT "${match[1]}_${match[2]}_fkey" FOREIGN KEY ("${match[2].toLowerCase()}Id") REFERENCES "${match[2]}"("id");`
    })
  },
  {
    pattern: /Cannot read properties of undefined \(reading '(.+)'\)/i,
    type: 'UNDEFINED_PROPERTY',
    getSolution: (match) => ({
      error: `Undefined property: ${match[1]}`,
      solution: `Check if object exists before accessing property '${match[1]}'`,
      code: `if (object && object.${match[1]}) { /* use object.${match[1]} */ }`
    })
  }
];

// Start monitoring
console.log(`${colors.cyan}${colors.bold}🔍 FitFlow Error Monitor Started${colors.reset}`);
console.log(`${colors.yellow}Monitoring for errors...${colors.reset}\n`);

// Start Expo server
const expo = spawn('npx', ['expo', 'start', '--port', '8082', '--clear'], {
  cwd: __dirname,
  env: { ...process.env, FORCE_COLOR: '1' }
});

// Error log file
const errorLogPath = path.join(__dirname, 'error-log.json');
const sqlFixPath = path.join(__dirname, 'AUTO_FIX.sql');

// Initialize files
fs.writeFileSync(errorLogPath, JSON.stringify({ errors: [], timestamp: new Date().toISOString() }, null, 2));
fs.writeFileSync(sqlFixPath, '-- Auto-generated SQL fixes\n-- Run this in Supabase SQL Editor\n\n');

// Process output
expo.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  checkForErrors(output);
});

expo.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  checkForErrors(output);
});

function checkForErrors(output) {
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (line.includes('ERROR') || line.includes('error')) {
      processError(line);
    }
  }
}

function processError(errorLine) {
  // Skip if we've seen this exact error
  if (seenErrors.has(errorLine)) return;
  seenErrors.add(errorLine);
  
  // Try to match error patterns
  for (const { pattern, type, getSolution } of errorPatterns) {
    const match = errorLine.match(pattern);
    if (match) {
      const solution = getSolution(match);
      
      console.log(`\n${colors.red}${colors.bold}❌ ERROR DETECTED${colors.reset}`);
      console.log(`${colors.red}Type: ${type}${colors.reset}`);
      console.log(`${colors.yellow}Error: ${solution.error}${colors.reset}`);
      console.log(`${colors.green}Solution: ${solution.solution}${colors.reset}`);
      
      if (solution.sql) {
        console.log(`${colors.cyan}SQL Fix:${colors.reset}`);
        console.log(`${colors.blue}${solution.sql}${colors.reset}`);
        
        // Append to SQL fix file
        fs.appendFileSync(sqlFixPath, `\n-- Fix for: ${solution.error}\n${solution.sql}\n`);
      }
      
      if (solution.code) {
        console.log(`${colors.cyan}Code Fix:${colors.reset}`);
        console.log(`${colors.blue}${solution.code}${colors.reset}`);
      }
      
      // Log to file
      const errorLog = JSON.parse(fs.readFileSync(errorLogPath, 'utf8'));
      errorLog.errors.push({
        timestamp: new Date().toISOString(),
        type,
        error: solution.error,
        solution: solution.solution,
        fix: solution.sql || solution.code
      });
      fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
      
      // Track solution
      errorSolutions.set(solution.error, solution);
      break;
    }
  }
}

// Generate fix summary periodically
setInterval(() => {
  if (errorSolutions.size > 0) {
    console.log(`\n${colors.magenta}${colors.bold}📊 ERROR SUMMARY${colors.reset}`);
    console.log(`${colors.yellow}Found ${errorSolutions.size} unique errors${colors.reset}`);
    
    const sqlFixes = Array.from(errorSolutions.values()).filter(s => s.sql);
    if (sqlFixes.length > 0) {
      console.log(`\n${colors.cyan}${colors.bold}🔧 SQL FIXES NEEDED:${colors.reset}`);
      console.log(`${colors.green}Run the contents of AUTO_FIX.sql in Supabase${colors.reset}`);
    }
  }
}, 30000); // Every 30 seconds

// Handle exit
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Stopping error monitor...${colors.reset}`);
  
  if (errorSolutions.size > 0) {
    console.log(`\n${colors.cyan}${colors.bold}FINAL REPORT:${colors.reset}`);
    console.log(`${colors.yellow}Total unique errors found: ${errorSolutions.size}${colors.reset}`);
    console.log(`${colors.green}Check AUTO_FIX.sql for database fixes${colors.reset}`);
    console.log(`${colors.green}Check error-log.json for full details${colors.reset}`);
  }
  
  expo.kill();
  process.exit();
});

console.log(`${colors.green}✅ Monitor is running. Press Ctrl+C to stop.${colors.reset}\n`);