import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  FileText,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { sourceIcons } from "../data/mockData";
import type { Source, SourceType } from "../types";

type AddSourceModalProps = {
  close: () => void;
  save: (source: Source) => void;
};

export function AddSourceModal({ close, save }: AddSourceModalProps) {
  const [type, setType] = useState<SourceType>("Gig Work");
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const types: SourceType[] = [
    "Shift Work",
    "Casual Work",
    "Gig Work",
    "Freelancing",
    "Other",
  ];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save({
      id: Date.now(),
      type,
      name: name || "New income source",
      income: Number(income) || 0,
      detail:
        type === "Casual Work"
          ? "Actual recorded shifts · added today"
          : "Monthly income · added today",
      color:
        type === "Gig Work"
          ? "violet"
          : type === "Freelancing"
            ? "amber"
            : "blue",
    });
  };

  return (
    <ModalShell close={close}>
      <p className="eyebrow">New income source</p>
      <h2>What type of income do you receive?</h2>
      <div className="type-grid">
        {types.map((item) => {
          const Icon = sourceIcons[item];
          return (
            <button
              type="button"
              key={item}
              className={type === item ? "selected" : ""}
              onClick={() => setType(item)}
            >
              <Icon size={17} />
              {item}
            </button>
          );
        })}
      </div>
      <form onSubmit={submit}>
        <label>
          {type === "Freelancing"
            ? "Client name"
            : type === "Gig Work"
              ? "Platform"
              : "Employer / source"}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={type === "Gig Work" ? "e.g. Uber" : "e.g. ABC Retail"}
            required
          />
        </label>
        <label>
          {type === "Casual Work" ? "Actual amount earned" : "Income recorded"}
          <input
            type="number"
            min="0"
            value={income}
            onChange={(event) => setIncome(event.target.value)}
            placeholder="e.g. 1280"
            required
          />
        </label>
        {type === "Shift Work" && (
          <div className="form-split">
            <label>
              Hourly rate
              <input type="number" placeholder="$24.00" />
            </label>
            <label>
              Hours / week
              <input type="number" placeholder="20" />
            </label>
          </div>
        )}
        <p className="form-note">
          <ShieldCheck size={15} /> Evidence can be added separately in
          verification.
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={close}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Save source <Check size={15} />
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function VerificationModal({ close }: { close: () => void }) {
  const documents = [
    "Bank statement",
    "Payslip or income statement",
    "Gig platform earning statement",
    "Invoice or payment evidence",
  ];

  return (
    <ModalShell close={close}>
      <p className="eyebrow">Income verification</p>
      <h2>Build your evidence pack</h2>
      <p className="modal-copy">
        Upload documents that support your income record. This prototype
        represents the future workflow; no automated verification is performed.
      </p>
      <div className="document-list">
        {documents.map((document) => (
          <div className="document-row" key={document}>
            <FileText size={17} />
            <b>{document}</b>
            <button className="upload-button">
              <Upload size={14} /> Upload
            </button>
          </div>
        ))}
      </div>
      <div className="evidence-summary">
        <span>
          Claimed income <b>$3,000</b>
        </span>
        <span>
          Supported income <b>$2,800</b>
        </span>
        <span>
          Coverage <b>93%</b>
        </span>
      </div>
      <p className="form-note">
        <ShieldCheck size={15} /> Government/tax identifier where applicable.
        Never required by default.
      </p>
      <div className="modal-actions">
        <button className="secondary-button" onClick={close}>
          Save for later
        </button>
        <button className="primary-button" onClick={close}>
          Continue <ArrowUpRight size={15} />
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  close,
  children,
}: {
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <button
          className="close-button"
          onClick={close}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
