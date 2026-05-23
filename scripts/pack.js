const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const outputName = `quick-symbols-v${manifest.version}.zip`;
const include = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'config.js',
  'license.js',
  'data',
  'icons'
];

for (const entry of include) {
  if (!fs.existsSync(path.join(root, entry))) {
    throw new Error(`Missing pack entry: ${entry}`);
  }
}

fs.rmSync(path.join(root, outputName), { force: true });
const result = spawnSync('zip', ['-qr', outputName, ...include], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) {
  throw new Error('zip command failed.');
}
console.log(`Created ${outputName}`);
