import React, { useState } from "react";
import ScoreBadge from "./ScoreBadge";

const recLabel = {
  STRONG_FIT: { label: "Strong Fit", color: "var(--green)" },
  GOOD_FIT: { label: "Good Fit", color: "var(--yellow)" },
  CONSIDER: { label: "Consider", color: "var(--orange)" },
  SKIP: { label: "Skip", color: "var(--red)" },
};

async function isUrlDead(url) {
  if (!url) return true;
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors", signal: AbortSignal.timeout(5000) });
    return false;
  } catch {
    return true;
  }
}

export default function JobCard({ job, onApply, applied }) {
  const [expanded, setExpanded] = useState(false);
  const [urlDead, setUrlDead] = useState(job.urlStatus === "dead" ? true : null);
  const rec = recLabel[job.recommendation] || recLabel.CONSIDER;

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && urlDead === null && job.url) {
      const dead = await isUrlDead(job.url);
      setUrlDead(dead);
    }
  };

  return (
    <div className={`job-card ${expanded ? "expanded" : ""} ${urlDead ? "url-dead" : ""}`}>
      <div className="job-card-header" onClick={handleExpand}>
        <ScoreBadge score={job.score || 0} baseScore={job.baseScore} qualityBonus={job.qualityBonus} />
        <div className="job-meta">
          <div className="job-title">{job.title}</div>
          <div className="job-company">{job.company}</div>
          <div className="job-tags">
            <span className="tag tag-source">{job.source}</span>
            <span className="tag" style={{ color: rec.color, borderColor: rec.color }}>
              {rec.label}
            </span>
            {urlDead && (
              <span className="tag tag-dead">Vaga expirada</span>
            )}
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
          {urlDead && (
            <div className="url-dead-banner">
              ⚠️ Esta vaga não está mais disponível. O link original retornou 404.
            </div>
          )}

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
            {urlDead ? (
              <span className="btn btn-outline btn-disabled" title="Link inativo">
                Vaga expirada ✕
              </span>
            ) : (
              <a href={job.url} target="_blank" rel="noreferrer" className="btn btn-outline">
                View Job ↗
              </a>
            )}
            {!applied ? (
              <button className="btn btn-primary" onClick={() => onApply(job)} disabled={urlDead}>
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
