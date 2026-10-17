// Under Passenger (cPanel) nothing passes --env-file, so read backend/.env
// ourselves. Variables already set by the host win; the file only fills gaps.
// Imported first by server.js so it runs before any module reads process.env.
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(new URL('../.env', import.meta.url))
  } catch {
    // no .env file: everything must come from the environment
  }
}
