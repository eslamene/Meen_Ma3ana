#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const enPath = path.join(process.cwd(), 'messages', 'en.json')
const arPath = path.join(process.cwd(), 'messages', 'ar.json')

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(sortObject(obj), null, 2) + '\n', 'utf8')
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function sortObject(obj) {
  if (!isObject(obj)) return obj
  const sorted = {}
  Object.keys(obj).sort().forEach((key) => {
    sorted[key] = isObject(obj[key]) ? sortObject(obj[key]) : obj[key]
  })
  return sorted
}

function collectMissing(base, target, prefix = '') {
  const missing = []
  for (const key of Object.keys(base)) {
    const baseVal = base[key]
    const targetVal = target ? target[key] : undefined
    const full = prefix ? `${prefix}.${key}` : key
    if (isObject(baseVal)) {
      if (!isObject(targetVal)) {
        // whole object missing
        missing.push(full)
      } else {
        missing.push(...collectMissing(baseVal, targetVal, full))
      }
    } else {
      if (targetVal === undefined) missing.push(full)
    }
  }
  return missing
}

function setPath(obj, pathStr, value) {
  const parts = pathStr.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (!isObject(cur[p])) cur[p] = {}
    cur = cur[p]
  }
  cur[parts[parts.length - 1]] = value
}

function getPath(obj, pathStr) {
  const parts = pathStr.split('.')
  let cur = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

function collectExtras(target, base, prefix = '') {
  const extras = []
  for (const key of Object.keys(target)) {
    const targetVal = target[key]
    const baseVal = base ? base[key] : undefined
    const full = prefix ? `${prefix}.${key}` : key
    if (isObject(targetVal)) {
      if (!isObject(baseVal)) {
        extras.push(full)
      } else {
        extras.push(...collectExtras(targetVal, baseVal, full))
      }
    } else {
      if (baseVal === undefined) extras.push(full)
    }
  }
  return extras
}

function main() {
  const mode = process.argv.includes('--check') ? 'check' : 'sync'
  const en = readJson(enPath)
  const ar = readJson(arPath)

  const missingInAr = collectMissing(en, ar)
  const missingInEn = collectMissing(ar, en)
  const extraInAr = collectExtras(ar, en)
  const extraInEn = collectExtras(en, ar)

  console.log('i18n diff:')
  console.log(`- Missing in ar: ${missingInAr.length}`)
  console.log(`- Missing in en: ${missingInEn.length}`)
  console.log(`- Extra in ar:   ${extraInAr.length}`)
  console.log(`- Extra in en:   ${extraInEn.length}`)

  if (mode === 'check') {
    if (missingInAr.length) {
      console.log('\nMissing keys in ar:')
      missingInAr.slice(0, 50).forEach((k) => console.log('  -', k))
      if (missingInAr.length > 50) console.log(`  ...and ${missingInAr.length - 50} more`)
    }
    if (missingInEn.length) {
      console.log('\nMissing keys in en:')
      missingInEn.slice(0, 50).forEach((k) => console.log('  -', k))
      if (missingInEn.length > 50) console.log(`  ...and ${missingInEn.length - 50} more`)
    }
    process.exit((missingInAr.length + missingInEn.length) ? 1 : 0)
  }

  // sync mode: fill missing keys by copying from the other locale
  let arMut = JSON.parse(JSON.stringify(ar))
  for (const key of missingInAr) {
    const val = getPath(en, key)
    setPath(arMut, key, typeof val === 'string' ? val : val)
  }

  let enMut = JSON.parse(JSON.stringify(en))
  for (const key of missingInEn) {
    const val = getPath(ar, key)
    setPath(enMut, key, typeof val === 'string' ? val : val)
  }

  writeJson(arPath, arMut)
  writeJson(enPath, enMut)

  console.log('\n✅ i18n sync complete:')
  console.log(`  → Wrote ${arPath}`)
  console.log(`  → Wrote ${enPath}`)
}

main()

