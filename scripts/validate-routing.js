#!/usr/bin/env node

/**
 * Next.js Routing Validation Script
 * 
 * This script validates that there are no conflicting dynamic routes
 * and provides a health check for the routing system.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const apiDir = path.join(projectRoot, 'src/app/api');

console.log('🔍 Next.js Routing Validation\n');

async function validateRouting() {
  console.log('📋 Scanning for dynamic routes...\n');
  
  const dynamicRoutes = [];
  
  function scanDirectory(dir, basePath = '') {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (item.startsWith('[') && item.endsWith(']')) {
          // This is a dynamic route directory
          const param = item.slice(1, -1); // Remove [ and ]
          const routePath = path.join(basePath, item);
          
          // Check for route files
          const routeFiles = fs.readdirSync(fullPath);
          for (const file of routeFiles) {
            if (file === 'route.ts' || file === 'page.tsx') {
              dynamicRoutes.push({
                path: routePath,
                param: param,
                file: file,
                fullPath: fullPath
              });
            }
          }
        } else {
          scanDirectory(fullPath, path.join(basePath, item));
        }
      }
    }
  }
  
  scanDirectory(apiDir);
  
  // Group by route pattern
  const routeGroups = {};
  
  for (const route of dynamicRoutes) {
    const pattern = route.path.replace(/\[.*?\]/, '[PARAM]');
    if (!routeGroups[pattern]) {
      routeGroups[pattern] = [];
    }
    routeGroups[pattern].push(route);
  }
  
  console.log('📊 Route Analysis:\n');
  
  let hasConflicts = false;
  let totalRoutes = 0;
  
  for (const [pattern, routes] of Object.entries(routeGroups)) {
    totalRoutes += routes.length;
    
    if (routes.length > 1) {
      const params = routes.map(r => r.param);
      const uniqueParams = [...new Set(params)];
      
      if (uniqueParams.length > 1) {
        hasConflicts = true;
        console.log(`❌ CONFLICT in pattern: ${pattern}`);
        console.log(`   Parameters: ${uniqueParams.join(', ')}`);
        console.log(`   Files:`);
        routes.forEach(r => {
          console.log(`     - ${r.path}/${r.file} (param: ${r.param})`);
        });
        console.log('');
      } else {
        console.log(`✅ Pattern: ${pattern} (${routes.length} routes, param: ${uniqueParams[0]})`);
      }
    } else {
      console.log(`✅ Pattern: ${pattern} (1 route, param: ${routes[0].param})`);
    }
  }
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total dynamic routes: ${totalRoutes}`);
  console.log(`   Unique patterns: ${Object.keys(routeGroups).length}`);
  console.log(`   Conflicts found: ${hasConflicts ? '❌ YES' : '✅ NONE'}`);
  
  if (hasConflicts) {
    console.log('\n⚠️  Action Required:');
    console.log('   Run the routing conflict resolution script to fix these issues.');
    return false;
  } else {
    console.log('\n🎉 All routes are properly configured!');
    return true;
  }
}

async function checkSpecificConflicts() {
  console.log('\n🔍 Checking for known conflict patterns...\n');
  
  const knownIssues = [
    {
      pattern: 'src/app/api/admin/rbac/roles/[roleId]',
      description: 'RoleId parameter conflict',
      check: () => fs.existsSync(path.join(projectRoot, 'src/app/api/admin/rbac/roles/[roleId]'))
    },
    {
      pattern: 'src/app/api/admin/rbac/roles/[id]',
      description: 'Id parameter route',
      check: () => fs.existsSync(path.join(projectRoot, 'src/app/api/admin/rbac/roles/[id]'))
    }
  ];
  
  for (const issue of knownIssues) {
    const exists = issue.check();
    console.log(`${exists ? '✅' : '❌'} ${issue.description}: ${issue.pattern}`);
  }
}

async function main() {
  try {
    const isValid = await validateRouting();
    await checkSpecificConflicts();
    
    if (isValid) {
      console.log('\n✅ Routing validation passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Routing validation failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error during validation:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { validateRouting, checkSpecificConflicts };
