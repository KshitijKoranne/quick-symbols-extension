const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const jsonFiles = ['manifest.json', 'data/symbols.json'];
for (const file of jsonFiles) {
  JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
for (const icon of Object.values(manifest.icons || {})) {
  if (!fs.existsSync(path.join(root, icon))) {
    throw new Error(`Missing icon: ${icon}`);
  }
}

const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
if (/gumroad/i.test(popupHtml)) {
  throw new Error('Popup must not load Gumroad.');
}

const scripts = ['config.js', 'license.js', 'popup.js', 'upgrade.js'];
for (const file of scripts) {
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
}

const apiFiles = fs.readdirSync(path.join(root, 'api')).filter((file) => file.endsWith('.js'));
for (const file of apiFiles) {
  new vm.Script(fs.readFileSync(path.join(root, 'api', file), 'utf8'), { filename: file });
}

console.log('Validation passed.');
