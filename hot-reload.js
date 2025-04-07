// hot-reload.js
const chokidar = require('chokidar');
const path = require('path');

function reloadModule(filePath) {
  const resolved = require.resolve(filePath);
  delete require.cache[resolved];
  return require(filePath);
}

function watchAllModules(exclude = [], onReload = () => {}) {
  const rootPath = path.resolve(__dirname);
  const watcher = chokidar.watch(`${rootPath}/**/*.js`, {
    ignored: [
      `${rootPath}/node_modules/**`,
      `${rootPath}/events/scheduler.js`,
      `${rootPath}/monitor.js`
    ],
    ignoreInitial: true
  });

  console.log('👀 Watching for changes in:', rootPath);

  watcher.on('change', (file) => {
    console.log(`📂 File changed: ${file}`);
    const base = path.basename(file);

    if (exclude.includes(base)) {
      console.log(`🚫 Skipped reload: ${base}`);
      return;
    }

    try {
      const updated = reloadModule(file);
      onReload(base, updated);
      console.log(`🔁 Reloaded: ${base}`);
    } catch (err) {
      console.error(`❌ Failed to reload ${base}:`, err);
    }
  });
}

module.exports = watchAllModules;