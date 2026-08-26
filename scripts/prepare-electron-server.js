#!/usr/bin/env node
// Next's `output: "standalone"` build doesn't include `public/` or
// `.next/static` alongside server.js — the docs require copying them in by
// hand. Run after `next build` (via npm run build:electron-server) and
// before `electron-forge package|make`.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standaloneDir = path.join(root, ".next", "standalone");

if (!fs.existsSync(standaloneDir)) {
  console.error(
    `Expected ${standaloneDir} to exist — run "next build" with ELECTRON_BUILD=true first.`
  );
  process.exit(1);
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
  console.log(`Copied ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
}

copyIfExists(path.join(root, "public"), path.join(standaloneDir, "public"));
copyIfExists(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));
