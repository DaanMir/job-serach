import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

const API = "/api";

const scoreColor = (s) => {
  if (s >= 75) return "var(--green)";
  if (s >= 55) return "var(--yellow)";
  if (s >= 35) return "var(--orange)";
  return "var(--red)";
};

const recLabel = {
  STRONG_FIT: { label: "Strong Fit", color: "var(--green)" },
  GOOD_FIT: { label: "Good Fit", color: "var(--yellow)" },
  CONSIDER: { label: "Consider", color: "var(--orange)" },
  SKIP: { label: "Skip", color: "var(--red)" },
};

const statusColors = {
  applied: "#4FC3F7",
  interview: "#81C784",
  offer: "#FFD54F",
  rejected: "#EF9A9A",
  ghosted: "#90A4AE",
};

// ─── DEDUP DEFENSIVO (frontend) ──────────────────────────────────────────────
// Last-resort guard against duplicates that slip through the backend.
// Deduplicates by normalized(title) + normalized(company), keeping the
// highest-score entry when two jobs collide on the same key.
function dedupByTitleCompany(jobs) {
  const normalize = (s = "") =>
    s.toLowerCase()
      .replace(/\s*[-–]\s*(crypto|web3|ai|ml|fintech|b2b|saas|remote|europe|eu|uk|usa|global|cet)[^-–]*/gi, "")
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const map = new Map();
  for (const job of jobs) {
    const key = `${normalize(job.title)}_${normalize(job.company)}`;
    const existing = map.get(key);
    if (!existing || (job.score || 0) > (existing.score || 0)) {
      map.set(key, job);
    }
  }
  return Array.from(map.values());
}

function ScoreBadge({ score, baseScore, qualityBonus }) {
  return (
    <div className="score-badge" style={{ "--sc": scoreColor(score) }} title={baseScore != null ? `Base: ${baseScore} + Quality: ${qualityBonus ?? 0}` : ""}>
      <svg viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1a1a2e" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke={scoreColor(score)} strokeWidth="3"
          strokeDasharray={`${score} 100`}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span>{score}</span>
    </div>
  );
}

function JobCard({ job, onApply, applied }) {
  const [expanded, setExpanded] = useState(false);
  const rec = recLabel[job.recommendation] || recLabel.CONSIDER;

  return (
    <div className={`job-card ${expanded ? "expanded" : ""}`}>
      <div className="job-card-header" onClick={() => setExpanded(!expanded)}>
        <ScoreBadge score={job.score || 0} baseScore={job.baseScore} qualityBonus={job.qualityBonus} />
        <div className="job-meta">
          <div className="job-title">{job.title}</div>
          <div className="job-company">{job.company}</div>
          <div className="job-tags">
            <span className="tag tag-source">{job.source}</span>
            <span className="tag" style={{ color: rec.color, borderColor: rec.color }}>
              {rec.label}
            </span>
            {job.locationAssessment && (
              <span className="tag tag-loc">{job.locationAssessment.replace("_", " ")}</span>
            )}
            {job.salary && <span className="tag tag-salary">💰 {job.salary}</span>}
          </div>
        </div>
        <div className="job-actions">
          <span className="expand-icon">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="job-details">
          {job.summary && <p className="job-summary">{job.summary}</p>}

          {job.baseScore != null && (
            <div className="score-breakdown">
              <span>Base score: <strong>{job.baseScore}</strong></span>
              <span>Quality bonus: <strong>+{job.qualityBonus ?? 0}</strong></span>
              <span>Final: <strong>{job.score}</strong></span>
            </div>
          )}

          {job.scoreBreakdown?.length > 0 && (
            <div className="score-breakdown-detail">
              {job.scoreBreakdown.map((entry, i) => (
                <span key={i} className={entry.pts < 0 ? "breakdown-penalty" : "breakdown-positive"}>
                  {entry.pts > 0 ? "+" : ""}{entry.pts} {entry.rule}
                </span>
              ))}
            </div>
          )}

          <div className="details-grid">
            {job.highlights?.length > 0 && (
              <div className="detail-block">
                <h4>✶ Highlights</h4>
                <ul>{job.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
              </div>
            )}
            {job.matchedSkills?.length > 0 && (
              <div className="detail-block">
                <h4>⟟ Matched Skills</h4>
                <div className="skill-chips">
                  {job.matchedSkills.map((s, i) => <span key={i} className="skill-chip">{s}</span>)}
                </div>
              </div>
            )}
            {job.redFlags?.length > 0 && (
              <div className="detail-block">
                <h4>⚠ Red Flags</h4>
                <ul className="red">{job.redFlags.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
            )}
          </div>

          <div className="job-card-footer">
            <a href={job.url} target="_blank" rel="noreferrer" className="btn btn-outline">
              View Job ↗
            </a>
            {!applied ? (
              <button className="btn btn-primary" onClick={() => onApply(job)}>
                Mark as Applied ✓
              </button>
            ) : (
              <span className="applied-badge">✓ Applied</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationRow({ app, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(app.status);
  const [notes, setNotes] = useState(app.notes || "");
  const [showJD, setShowJD] = useState(false);

  const save = async () => {
    await fetch(`${API}/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    onUpdate();
    setEditing(false);
  };

  return (
    <div className="app-row">
      <div className="app-row-main">
        <div className="app-info">
          <div className="app-title">{app.title}</div>
          <div className="app-company">{app.company}</div>
          <div className="app-date">{new Date(app.appliedAt).toLocaleDateString("en-GB")}</div>
        </div>
        <div className="app-score">
          <ScoreBadge score={app.score || 0} />
        </div>
        <div className="app-status-area">
          {editing ? (
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="status-select">
              {Object.keys(statusColors).map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          ) : (
            <span className="status-pill" style={{ background: statusColors[status] + "22", color: statusColors[status], border: `1px solid ${statusColors[status]}` }}>
              {status}
            </span>
          )}
        </div>
        <div className="app-actions">
          {editing ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowJD(!showJD)}>JD</button>
              {app.url && <a href={app.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">↗</a>}
            </>
          )}
        </div>
      </div>
      {editing && (
        <textarea
          className="notes-input"
          placeholder="Notes (interview date, contact, impressions...)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      )}
      {showJD && (
        <div className="jd-preview">
          <h4>Job Summary</h4>
          <p>{app.summary}</p>
          {app.highlights?.length > 0 && (
            <>
              <h4>Highlights</h4>
              <ul>{app.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </>
          )}
          {app.description && (
            <>
              <h4>Full Description</h4>
              <pre className="jd-text">{app.description}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("scan");
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState(null);
  const [scans, setScans] = useState([]);
  const [applications, setApplications] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [applyModal, setApplyModal] = useState(null);
  const [applyNotes, setApplyNotes] = useState("");
  const [filterRec, setFilterRec] = useState("ALL");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadLatestScan = useCallback(async () => {
    try {
      const res = await fetch(`${API}/scans/latest`);
      if (res.ok) setScan(await res.json());
    } catch {}
  }, []);

  const loadScans = useCallback(async () => {
    try {
      const res = await fetch(`${API}/scans`);
      if (res.ok) setScans(await res.json());
    } catch {}
  }, []);

  const loadApplications = useCallback(async () => {
    try {
      const res = await fetch(`${API}/applications`);
      if (res.ok) {
        const apps = await res.json();
        setApplications(apps);
        setAppliedIds(new Set(apps.map((a) => a.jobId).filter(Boolean)));
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadLatestScan();
    loadScans();
    loadApplications();
  }, [loadLatestScan, loadScans, loadApplications]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API}/scan`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await loadLatestScan();
        await loadScans();
        showToast(`Scan complete — ${data.jobCount} relevant jobs found`);
      }
    } catch (e) {
      showToast("Scan failed: " + e.message, "error");
    }
    setScanning(false);
  };

  const openApplyModal = (job) => {
    setApplyModal(job);
    setApplyNotes("");
  };

  const confirmApply = async () => {
    if (!applyModal) return;
    const res = await fetch(`${API}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: applyModal.id,
        title: applyModal.title,
        company: applyModal.company,
        url: applyModal.url,
        score: applyModal.score,
        description: applyModal.description,
        summary: applyModal.summary,
        highlights: applyModal.highlights,
        matchedSkills: applyModal.matchedSkills,
        salary: applyModal.salary,
        notes: applyNotes,
      }),
    });
    if (res.ok) {
      setAppliedIds((prev) => new Set([...prev, applyModal.id]));
      await loadApplications();
      showToast(`Application logged for ${applyModal.company}`);
    }
    setApplyModal(null);
  };

  // Filtra ON_SITE, aplica dedup defensivo, ordena por score desc
  const jobs = dedupByTitleCompany(
    (scan?.jobs || [])
      .filter((j) => j.locationAssessment !== "ON_SITE")
      .sort((a, b) => (b.score || 0) - (a.score || 0))
  );

  const filteredJobs = filterRec === "ALL"
    ? jobs
    : jobs.filter((j) => j.recommendation === filterRec);

  const stats = {
    total: jobs.length,
    strong: jobs.filter((j) => j.recommendation === "STRONG_FIT").length,
    good: jobs.filter((j) => j.recommendation === "GOOD_FIT").length,
    applications: applications.length,
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">JOB<br />SCOUT</span>
        </div>
        <nav className="nav">
          {[
            { id: "scan", icon: "⟟", label: "Rankings" },
            { id: "applications", icon: "◎", label: "Applications" },
            { id: "history", icon: "▷", label: "History" },
          ].map((n) => (
            <button
              key={n.id}
              className={`nav-item ${tab === n.id ? "active" : ""}`}
              onClick={() => setTab(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-stats">
          <div className="stat-item"><span>{stats.total}</span><label>Jobs Found</label></div>
          <div className="stat-item"><span style={{ color: "var(--green)" }}>{stats.strong}</span><label>Strong Fit</label></div>
          <div className="stat-item"><span style={{ color: "#4FC3F7" }}>{stats.applications}</span><label>Applied</label></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            {tab === "scan" && "Job Rankings"}
            {tab === "applications" && "Applications Tracker"}
            {tab === "history" && "Scan History"}
          </div>
          <div className="topbar-right">
            {scan && (
              <span className="last-scan">
                Last scan: {new Date(scan.scannedAt).toLocaleString("en-GB")}
              </span>
            )}
            <button className={`btn btn-primary ${scanning ? "loading" : ""}`} onClick={runScan} disabled={scanning}>
              {scanning ? (
                <><span className="spinner" /> Scanning...</>
              ) : (
                "▶ Run Scan"
              )}
            </button>
          </div>
        </header>

        {tab === "scan" && (
          <div className="tab-content">
            {jobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◈</div>
                <h2>No jobs scanned yet</h2>
                <p>Click "Run Scan" to fetch and score jobs from all sources.</p>
              </div>
            ) : (
              <>
                <div className="filter-bar">
                  {["ALL", "STRONG_FIT", "GOOD_FIT", "CONSIDER"].map((f) => (
                    <button
                      key={f}
                      className={`filter-btn ${filterRec === f ? "active" : ""}`}
                      onClick={() => setFilterRec(f)}
                    >
                      {f.replace(/_/g, " ")}
                      <span className="filter-count">
                        {f === "ALL" ? jobs.length : jobs.filter((j) => j.recommendation === f).length}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="jobs-list">
                  {filteredJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      applied={appliedIds.has(job.id)}
                      onApply={openApplyModal}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "applications" && (
          <div className="tab-content">
            {applications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◎</div>
                <h2>No applications yet</h2>
                <p>Mark jobs as applied from the Rankings tab to track them here.</p>
              </div>
            ) : (
              <div className="apps-list">
                <div className="apps-header">
                  <span>Position</span>
                  <span>Score</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {applications.map((app) => (
                  <ApplicationRow key={app.id} app={app} onUpdate={loadApplications} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="tab-content">
            {scans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">▷</div>
                <h2>No scan history</h2>
                <p>Run your first scan to start building history.</p>
              </div>
            ) : (
              <div className="history-list">
                {scans.map((s) => (
                  <div key={s.id} className="history-card" onClick={async () => {
                    const res = await fetch(`${API}/scans/${s.id}`);
                    if (res.ok) { setScan(await res.json()); setTab("scan"); }
                  }}>
                    <div className="history-date">{new Date(s.scannedAt).toLocaleString("en-GB")}</div>
                    <div className="history-count"><span>{s.jobCount}</span> jobs</div>
                    <div className="history-arrow">→</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {applyModal && (
        <div className="modal-overlay" onClick={() => setApplyModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Log Application</h3>
            <p className="modal-job">{applyModal.title} at <strong>{applyModal.company}</strong></p>
            <textarea
              className="notes-input"
              placeholder="Notes (optional): contact name, application method, impressions..."
              value={applyNotes}
              onChange={(e) => setApplyNotes(e.target.value)}
              rows={4}
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setApplyModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmApply}>✓ Confirm Application</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
