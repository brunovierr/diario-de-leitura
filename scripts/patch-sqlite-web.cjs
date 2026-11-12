const fs = require('node:fs');
const path = require('node:path');

const workerPath = path.join(path.dirname(require.resolve('expo-sqlite/package.json')), 'web', 'worker.ts');
const source = fs.readFileSync(workerPath, 'utf8');
const marker = '// Diario: share and retry SQLite web initialization.';
if (!source.includes(marker)) {
  const declaration = 'async function maybeInitAsync(): Promise<{';
  if (!source.includes(declaration)) {
    throw new Error('SQLite web changed: review the initialization patch before installing.');
  }
  const wrapper = `${marker}
let diarioInitialization: ReturnType<typeof initializeSQLiteAsync> | undefined;

function maybeInitAsync(): ReturnType<typeof initializeSQLiteAsync> {
  return diarioInitialization ??= initializeSQLiteAsync().catch(error => {
    _sqlite3 = null;
    _vfs = null;
    _vfsMemory = null;
    diarioInitialization = undefined;
    throw error;
  });
}

async function initializeSQLiteAsync(): Promise<{`;
  fs.writeFileSync(workerPath, source.replace(declaration, wrapper));
}
console.log('SQLite web: initialization patch applied.');
