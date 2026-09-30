import {
  Archive,
  Banknote,
  Check,
  CircleHelp,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { latestRecords, sourceIcons } from "../data/mockData";
import type { Source } from "../types";

type MetricProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  accent: string;
  help?: string;
};

export function Metric({
  icon: Icon,
  label,
  value,
  note,
  accent,
  help,
}: MetricProps) {
  return (
    <article className="metric">
      <div className="metric-label">
        <span className={`metric-icon ${accent}`}>
          <Icon size={16} />
        </span>
        {label}
        {help && (
          <span className="tooltip">
            <CircleHelp size={13} />
            <span>{help}</span>
          </span>
        )}
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

type PanelHeaderProps = {
  title: string;
  detail: string;
  children?: ReactNode;
};

export function PanelHeader({ title, detail, children }: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      {children}
    </div>
  );
}

type CoverageRowProps = {
  label: string;
  value: string;
  width: string;
  color: string;
};

export function CoverageRow({ label, value, width, color }: CoverageRowProps) {
  return (
    <div className="coverage-row">
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="bar">
        <i className={color} style={{ width }} />
      </div>
    </div>
  );
}

type SourceCardProps = {
  source: Source;
  onArchive: () => void;
};

export function SourceCard({ source, onArchive }: SourceCardProps) {
  const Icon = sourceIcons[source.type];

  return (
    <article className="source-card">
      <div className={`source-icon ${source.color}`}>
        <Icon size={19} />
      </div>
      <div className="source-info">
        <span className="source-type">
          {source.type}
          <em>Active</em>
        </span>
        <h3>{source.name}</h3>
        <div className="source-detail">
          <strong>${source.income.toLocaleString()}</strong>
          <span>{source.detail}</span>
        </div>
      </div>
      <button
        className="icon-button archive-button"
        onClick={onArchive}
        aria-label={`Archive ${source.name}`}
        title="Archive income source"
      >
        <Archive size={16} />
      </button>
    </article>
  );
}

export function TrackerStep({
  label,
  done,
}: {
  label: string;
  done?: boolean;
}) {
  return (
    <div className={`tracker-step ${done ? "done" : ""}`}>
      <span>{done ? <Check size={12} /> : ""}</span>
      <small>{label}</small>
    </div>
  );
}

export function LatestRecords() {
  return (
    <>
      {latestRecords.map(([name, amount, date, color]) => (
        <div className="record" key={name}>
          <span className={`record-icon ${color}`}>
            <Banknote size={16} />
          </span>
          <div>
            <b>{name}</b>
            <small>{date} · Income record</small>
          </div>
          <strong>{amount}</strong>
        </div>
      ))}
    </>
  );
}

export function VerificationHeading() {
  return (
    <div className="verification-heading">
      <span className="section-icon">
        <ShieldCheck size={18} />
      </span>
      <div>
        <p className="eyebrow">Verification tracker</p>
        <h2>Income verification</h2>
      </div>
      <span className="status-pill">
        <i /> Draft
      </span>
    </div>
  );
}
