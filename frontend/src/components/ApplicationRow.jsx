import React, { useState } from "react";
import ScoreBadge from "./ScoreBadge";

const statusColors = {
  applied: "#4FC3F7",
  interview: "#81C784",
  offer: "#FFD54F",
  rejected: "#EF9A9A",
  ghosted: "#90A4AE",
};

export default function ApplicationRow({ app, onUpdate, apiUrl = "/api" }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(app.status);
  const [notes, setNotes] = useState(app.notes || "");
  const [showJD, setShowJD] = useState(false);

  const save = async () => {
    await fetch(`${apiUrl}/applications/${app.id}`, {
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
