import React, { useState, useEffect, useCallback } from "react";
import JobCard from "./components/JobCard";
import ApplicationRow from "./components/ApplicationRow";
import FilterBar from "./components/FilterBar";
import Modal from "./components/Modal";
import Toast from "./components/Toast";

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
