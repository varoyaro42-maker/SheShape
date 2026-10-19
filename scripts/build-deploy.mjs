#!/usr/bin/env node
// Builds the frontend and assembles a cPanel-ready folder in deploy/.
// Usage: node scripts/build-deploy.mjs [--skip-frontend-build]

import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontend = path.join(root, 'frontend')
const backend = path.join(root, 'backend')
const out = path.join(root, 'deploy')
const dist = path.join(frontend, 'dist')

// Never shipped: dependencies (cPanel installs them), local secrets, tests.
// 'uploads' and 'storage' stay on the server between deploys: customer photos and kept ticket PDFs.
const EXCLUDE = new Set(['node_modules', 'public', 'tests', 'uploads', '.env', '.env.test', '.DS_Store', '.gitignore', 'storage'])

if (!process.argv.includes('--skip-frontend-build')) {
  console.log('Building frontend…')
  execSync('npm run build', { cwd: frontend, stdio: 'inherit', shell: true })
}

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error(`No frontend build found at ${dist}. Run "npm run build" in frontend/ first.`)
  process.exit(1)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out)

for (const entry of readdirSync(backend)) {
  if (EXCLUDE.has(entry)) continue
  cpSync(path.join(backend, entry), path.join(out, entry), { recursive: true })
}

cpSync(dist, path.join(out, 'public'), { recursive: true })

console.log(`\nDeploy folder ready: ${out}`)
console.log('Upload its contents to the Node.js app directory in cPanel, click "Run NPM Install", then restart the app.')
