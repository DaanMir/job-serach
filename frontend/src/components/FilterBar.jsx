import React from "react";

export default function FilterBar({ filterRec, setFilterRec, jobs }) {
  return (
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
  );
}
