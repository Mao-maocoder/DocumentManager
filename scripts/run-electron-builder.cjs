const { spawnSync } = require("node:child_process");
const path = require("node:path");

process.env.ELECTRON_MIRROR ||= "https://npmmirror.com/mirrors/electron/";
process.env.ELECTRON_GET_USE_PROXY ||= "true";

const builderCli = path.join(__dirname, "..", "node_modules", "electron-builder", "cli.js");
const result = spawnSync(process.execPath, [builderCli, ...process.argv.slice(2)], {
  env: process.env,
  stdio: "inherit"
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
