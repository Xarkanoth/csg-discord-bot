// hot-reload.js
const chokidar = require('chokidar');
const path = require('path');

function reloadModule(filePath) {
  const resolved = require.resolve(filePath);
  delete require.cache[resolved];
  return require(filePath);
}

function watchAllModules(exclude = [], onReload = () => {}) {
  const watcher = chokidar.watch(['./**/*.js'], {
    ignored: [
      '**/node_modules/**',
      './events/scheduler.js',
      './monitor.js'
    ],
    ignoreInitial: true
  });

  console.log('👀 Watching for changes...');

  watcher.on('change', (file) => {
    const base = path.basename(file);

    if (exclude.includes(base)) {
      console.log(`🚫 Skipped reload: ${base}`);
      return;
    }

    try {
      const updated = reloadModule(path.resolve(file));
      onReload(base, updated);
      console.log(`🔁 Reloaded: ${base}`);
    } catch (err) {
      console.error(`❌ Failed to reload ${base}:`, err);
    }
  });
}

module.exports = watchAllModules;