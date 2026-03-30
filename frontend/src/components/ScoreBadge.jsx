import React from "react";

const scoreColor = (s) => {
  if (s >= 75) return "var(--green)";
  if (s >= 55) return "var(--yellow)";
  if (s >= 35) return "var(--orange)";
  return "var(--red)";
};

export default function ScoreBadge({ score, baseScore, qualityBonus }) {
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
