#!/usr/bin/env node

/**
 * Script to fix Next.js routing conflict between [id] and [roleId] dynamic routes
 * 
 * This script:
 * 1. Identifies conflicting dynamic route files
 * 2. Removes the duplicate [roleId] version
 * 3. Ensures consistency across the codebase
 * 4. Updates any references if needed
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const apiDir = path.join(projectRoot, 'src/app/api');

console.log('🔍 Analyzing routing conflicts...\n');

// Check for conflicting routes
const conflictingRoutes = [
  {
    path: 'src/app/api/admin/rbac/roles/[roleId]/permissions/route.ts',
    duplicate: 'src/app/api/admin/rbac/roles/[id]/permissions/route.ts',
    shouldKeep: 'id', // Keep the [id] version for consistency
    shouldRemove: 'roleId'
  }
];

async function fixRoutingConflicts() {
  let hasConflicts = false;
  
  for (const conflict of conflictingRoutes) {
    const roleIdPath = path.join(projectRoot, conflict.path);
    const idPath = path.join(projectRoot, conflict.duplicate);
    
    const roleIdExists = fs.existsSync(roleIdPath);
    const idExists = fs.existsSync(idPath);
    
    if (roleIdExists && idExists) {
      hasConflicts = true;
      console.log(`❌ Found conflict: ${conflict.path} and ${conflict.duplicate}`);
      
      // Compare file contents
      const roleIdContent = fs.readFileSync(roleIdPath, 'utf8');
      const idContent = fs.readFileSync(idPath, 'utf8');
      
      // Check if files are essentially identical (ignoring parameter names in comments)
      const roleIdNormalized = roleIdContent
        .replace(/\[roleId\]/g, '[id]')
        .replace(/roleId/g, 'id')
        .replace(/\s+/g, ' ')
        .trim();
      
      const idNormalized = idContent
        .replace(/\s+/g, ' ')
        .trim();
      
      if (roleIdNormalized === idNormalized) {
        console.log(`✅ Files are identical - removing duplicate: ${conflict.path}`);
        
        try {
          // Remove the duplicate file
          fs.unlinkSync(roleIdPath);
          console.log(`🗑️  Removed: ${conflict.path}`);
          
          // Remove the directory if it's empty
          const roleIdDir = path.dirname(roleIdPath);
          if (fs.readdirSync(roleIdDir).length === 0) {
            fs.rmdirSync(roleIdDir);
            console.log(`🗑️  Removed empty directory: ${path.relative(projectRoot, roleIdDir)}`);
          }
          
        } catch (error) {
          console.error(`❌ Error removing file: ${error.message}`);
          return false;
        }
      } else {
        console.log(`⚠️  Files differ - manual review needed`);
        console.log(`   RoleId file: ${conflict.path}`);
        console.log(`   Id file: ${conflict.duplicate}`);
      }
    } else if (roleIdExists && !idExists) {
      console.log(`⚠️  Only ${conflict.path} exists - no conflict`);
    } else if (!roleIdExists && idExists) {
      console.log(`✅ Only ${conflict.duplicate} exists - no conflict`);
    }
  }
  
  if (!hasConflicts) {
    console.log('✅ No routing conflicts found!');
  }
  
  return true;
}

async function checkForOtherConflicts() {
  console.log('\n🔍 Checking for other potential routing conflicts...\n');
  
  // Find all dynamic route files
  const dynamicRouteFiles = [];
  
  function findDynamicRoutes(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (item.startsWith('[') && item.endsWith(']')) {
          // This is a dynamic route directory
          const routeFiles = fs.readdirSync(fullPath);
          for (const file of routeFiles) {
            if (file === 'route.ts' || file === 'page.tsx') {
              dynamicRouteFiles.push({
                path: path.relative(projectRoot, fullPath),
                param: item.slice(1, -1), // Remove [ and ]
                file: file
              });
            }
          }
        } else {
          findDynamicRoutes(fullPath);
        }
      }
    }
  }
  
  findDynamicRoutes(apiDir);
  
  // Group by route pattern
  const routeGroups = {};
  
  for (const route of dynamicRouteFiles) {
    const pattern = route.path.replace(/\[.*?\]/, '[PARAM]');
    if (!routeGroups[pattern]) {
      routeGroups[pattern] = [];
    }
    routeGroups[pattern].push(route);
  }
  
  // Check for conflicts
  for (const [pattern, routes] of Object.entries(routeGroups)) {
    if (routes.length > 1) {
      const params = routes.map(r => r.param);
      const uniqueParams = [...new Set(params)];
      
      if (uniqueParams.length > 1) {
        console.log(`❌ Potential conflict in pattern: ${pattern}`);
        console.log(`   Parameters: ${uniqueParams.join(', ')}`);
        console.log(`   Files: ${routes.map(r => `${r.path}/${r.file}`).join(', ')}`);
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting Next.js routing conflict resolution...\n');
  
  try {
    const success = await fixRoutingConflicts();
    if (success) {
      await checkForOtherConflicts();
      
      console.log('\n✅ Routing conflict resolution completed!');
      console.log('\n📋 Next steps:');
      console.log('1. Restart your Next.js development server');
      console.log('2. Test the affected routes to ensure they work correctly');
      console.log('3. Check that all API calls are using the correct parameter names');
      
    } else {
      console.log('\n❌ Failed to resolve conflicts');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error during conflict resolution:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { fixRoutingConflicts, checkForOtherConflicts };
