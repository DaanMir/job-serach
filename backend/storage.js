import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "data.json");

function loadDB() {
  if (!existsSync(DB_PATH)) {
    return { scans: [], applications: [] };
  }
  try {
    return JSON.parse(readFileSync(DB_PATH, "utf-8"));
  } catch {
    return { scans: [], applications: [] };
  }
}

function saveDB(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function saveScannedJobs(jobs) {
  const db = loadDB();

  // Ordena vagas por score (maior primeiro) antes de salvar
  const sortedJobs = [...jobs].sort((a, b) => (b.score || 0) - (a.score || 0));

  const scan = {
    id: Date.now(),
    scannedAt: new Date().toISOString(),
    jobCount: sortedJobs.length,
    jobs: sortedJobs,
  };
  db.scans.unshift(scan); // mais recente primeiro
  if (db.scans.length > 10) db.scans = db.scans.slice(0, 10); // guarda últimas 10 sessões
  saveDB(db);
  return scan;
}

export function getLatestScan() {
  const db = loadDB();
  return db.scans[0] || null;
}

export function getAllScans() {
  const db = loadDB();
  return db.scans.map((s) => ({
    id: s.id,
    scannedAt: s.scannedAt,
    jobCount: s.jobCount,
  }));
}

export function getScanById(id) {
  const db = loadDB();
  return db.scans.find((s) => s.id === Number(id)) || null;
}

export function saveApplication(application) {
  const db = loadDB();
  const app = {
    id: Date.now(),
    appliedAt: new Date().toISOString(),
    status: "applied",
    ...application,
  };
  db.applications.unshift(app);
  saveDB(db);
  return app;
}

export function updateApplication(id, updates) {
  const db = loadDB();
  const idx = db.applications.findIndex((a) => a.id === Number(id));
  if (idx === -1) return null;
  db.applications[idx] = { ...db.applications[idx], ...updates };
  saveDB(db);
  return db.applications[idx];
}

export function getAllApplications() {
  const db = loadDB();
  return db.applications;
}
