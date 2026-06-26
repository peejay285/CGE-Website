import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");

function readLocalEnv() {
  if (!fs.existsSync(envPath)) return {};
  const map = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    map[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return map;
}

const localEnv = readLocalEnv();

function env(name) {
  const processValue = process.env[name];
  if (processValue) return processValue;
  return localEnv[name] ?? "";
}

const required = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYSTACK_SECRET_KEY",
  "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
];

const publicLaunchFlags = {
  NEXT_PUBLIC_BETA_MODE: "false",
  NEXT_PUBLIC_SITE_PHASE: "production",
  NEXT_PUBLIC_ALLOW_INDEXING: "true",
};

const optionalFeatureKeys = [
  "MODAL_AI_ENDPOINT",
  "MODAL_AUTH_TOKEN",
  "TERMII_API_KEY",
  "TERMII_SENDER_ID",
];

let failed = false;

console.log("Public launch environment check\n");

for (const key of required) {
  const value = env(key);
  if (!value) {
    failed = true;
    console.log(`FAIL ${key}: missing`);
  } else {
    console.log(`PASS ${key}: set`);
  }
}

console.log("");

for (const [key, expected] of Object.entries(publicLaunchFlags)) {
  const value = env(key);
  if (value !== expected) {
    failed = true;
    console.log(`FAIL ${key}: expected ${expected}, found ${value || "missing"}`);
  } else {
    console.log(`PASS ${key}: ${expected}`);
  }
}

console.log("");

const paystackSecret = env("PAYSTACK_SECRET_KEY");
const paystackPublic = env("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY");
if (paystackSecret.startsWith("sk_test_") || paystackPublic.startsWith("pk_test_")) {
  failed = true;
  console.log("FAIL Paystack keys: test keys are configured");
} else if (paystackSecret.startsWith("sk_live_") && paystackPublic.startsWith("pk_live_")) {
  console.log("PASS Paystack keys: live key prefixes detected");
} else {
  failed = true;
  console.log("FAIL Paystack keys: could not confirm live key prefixes");
}

console.log("");

for (const key of optionalFeatureKeys) {
  console.log(`${env(key) ? "PASS" : "WARN"} ${key}: ${env(key) ? "set" : "not set"}`);
}

if (failed) {
  console.error("\nLaunch env check failed.");
  process.exit(1);
}

console.log("\nLaunch env check passed.");
