import fs from 'fs';
import path from 'path';

// Minimal DOM mock
global.window = {
  addEventListener: () => {},
  location: { reload: () => {} }
};
global.document = {
  createElement: () => ({ relList: { supports: () => true } }),
  querySelectorAll: () => [],
  getElementById: (id) => ({ id }),
  body: { appendChild: () => {} }
};
global.navigator = { serviceWorker: { register: async () => ({}) } };
global.fetch = async () => ({});

const file = fs.readdirSync('dist/assets').find(f => f.startsWith('index-') && f.endsWith('.js'));
console.log("Testing:", file);

try {
  await import('file://' + path.resolve('dist/assets', file));
  console.log("No top-level error!");
} catch (e) {
  console.error("ERROR CAUGHT:", e);
}
