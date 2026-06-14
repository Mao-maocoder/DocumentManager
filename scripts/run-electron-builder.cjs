const { spawnSync } = require("node:child_process");
const path = require("node:path");

process.env.ELECTRON_MIRROR ||= "https://npmmirror.com/mirrors/electron/";
process.env.ELECTRON_GET_USE_PROXY ||= "true";

const executable = process.platform === "win32" ? "electron-builder.cmd" : "electron-builder";
const builderBin = path.join(__dirname, "..", "node_modules", ".bin", executable);
const result = spawnSync(builderBin, process.argv.slice(2), {
  env: process.env,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
