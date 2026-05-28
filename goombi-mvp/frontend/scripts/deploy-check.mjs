import fs from "node:fs";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const REQUIRED_API_URL = (process.env.VITE_API_BASE_URL || "").trim();
const REQUIRED_BASE_PATH = "/goombi-mvp/";
const LEGACY_BASE_PATH = "/goombi/";
const FORBIDDEN_PATTERNS = [/localhost/gi, /127\.0\.0\.1/g];

function fail(message) {
  console.error(`DEPLOY CHECK FAILED: ${message}`);
  process.exit(1);
}

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

if (!REQUIRED_API_URL) {
  fail("VITE_API_BASE_URL is missing. Set it before running deploy:prod.");
}

if (!REQUIRED_API_URL.startsWith("https://")) {
  fail("VITE_API_BASE_URL must be an https URL for production.");
}

if (!fs.existsSync(DIST_DIR)) {
  fail("dist directory not found. Run build:prod first.");
}

const allFiles = listFiles(DIST_DIR).filter((file) => /\.(html|js|css|json|txt)$/i.test(file));
const bundle = allFiles.map((file) => fs.readFileSync(file, "utf-8")).join("\n");

for (const pattern of FORBIDDEN_PATTERNS) {
  if (pattern.test(bundle)) {
    fail(`Bundle contains forbidden localhost reference matching ${pattern}.`);
  }
}

if (!bundle.includes(REQUIRED_API_URL)) {
  fail(`Bundle does not contain required API URL ${REQUIRED_API_URL}.`);
}

if (!bundle.includes(REQUIRED_BASE_PATH)) {
  fail(`Bundle does not contain ${REQUIRED_BASE_PATH} base path. Confirm Vite base is configured.`);
}

if (bundle.includes(LEGACY_BASE_PATH)) {
  fail(`Bundle still contains legacy base path ${LEGACY_BASE_PATH}.`);
}

console.log("Deploy check passed.");
