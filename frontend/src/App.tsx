import { useState, type FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  FileCheck2,
  Link2,
  LockKeyhole,
  Menu,
  Plus,
  ScanSearch,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import "./App.css";

type View = "profile" | "evidence" | "credential" | "business" | "sources";
type ModalType = "share" | "evidence" | "source";
type IncomeSource = { name: string; type: string; monthly: number; initial: string };

const navigation: { id: View; label: string; icon: typeof Activity }[] = [
  { id: "profile", label: "Income profile", icon: BarChart3 },
  { id: "evidence", label: "Evidence & matching", icon: ScanSearch },
  { id: "credential", label: "Income Evidence Credential", icon: FileCheck2 },
  { id: "business", label: "Business verification", icon: Users },
  { id: "sources", label: "Income sources", icon: BriefcaseBusiness },
];

const months = [["Jun", 2140], ["Jul", 2320], ["Aug", 2050], ["Sep", 2480]] as const;

function App() {
  const [view, setView] = useState<View>("profile");
  const [modal, setModal] = useState<ModalType | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [sources, setSources] = useState<IncomeSource[]>([
    { name: "Uber", type: "Gig platform", monthly: 1310, initial: "U" },
    { name: "Retail employer", type: "Casual employment", monthly: 760, initial: "R" },
    { name: "Freelance design", type: "Client income", monthly: 410, initial: "F" },
  ]);

  const completeAction = (message: string) => {
    setModal(null);
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3600);
  };
  const addSource = (source: IncomeSource) => {
    setSources((current) => [...current, source]);
    completeAction(`${source.name} added to your income sources`);
  };

  return (
    <div className="trail-app">
      {mobileNavOpen && <button className="trail-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`trail-sidebar ${mobileNavOpen ? "is-open" : ""}`}>
        <button className="trail-brand" onClick={() => setView("profile")}>
          <span className="trail-brand-mark"><Activity size={19} /></span><span>IncomeTrail</span>
        </button>
        <small className="trail-side-label">WORKSPACE</small>
        <nav className="trail-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`trail-nav-item ${view === id ? "active" : ""}`} onClick={() => { setView(id); setMobileNavOpen(false); }}>
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="trail-sidebar-bottom">
          <div className="trail-privacy"><LockKeyhole size={16} /><div><b>User-controlled sharing</b><span>Share only what is needed.</span></div></div>
          <div className="trail-user"><b className="trail-avatar">AD</b><div><strong>Arnav</strong><span>Personal workspace</span></div></div>
        </div>
      </aside>

      <main className="trail-main">
        <header className="trail-header">
          <button className="trail-icon-button trail-mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="trail-heading"><em>INCOME INFRASTRUCTURE</em><h1>{navigation.find((item) => item.id === view)?.label}</h1></div>
          <button className="trail-primary" onClick={() => setModal("share")}><Link2 size={16} /> Share credential</button>
        </header>
        <div className="trail-content">
          {view === "profile" && <Profile sources={sources} onAddEvidence={() => setModal("evidence")} />}
          {view === "evidence" && <Evidence />}
          {view === "credential" && <Credential onShare={() => setModal("share")} />}
          {view === "business" && <Business sources={sources} onReview={() => setView("evidence")} />}
          {view === "sources" && <Sources sources={sources} onAdd={() => setModal("source")} />}
        </div>
      </main>
      {modal && <Dialog type={modal} close={() => setModal(null)} onComplete={completeAction} onAddSource={addSource} />}
      {notice && <div className="trail-toast" role="status"><CheckCircle2 size={17} />{notice}</div>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return <article className="trail-metric"><span className="trail-metric-icon"><Icon size={17} /></span><span className="trail-metric-label">{label}</span><b>{value}</b><small>{detail}</small></article>;
}

function Panel({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return <section className="trail-panel"><div className="trail-panel-heading"><div><h2>{title}</h2><p>{detail}</p></div></div>{children}</section>;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return <div className="trail-data-row"><span>{label}</span><b>{value}</b></div>;
}

function SourceRow({ source }: { source: IncomeSource }) {
  return <div className="trail-source-row"><span className="trail-source-initial">{source.initial}</span><div className="trail-source-name"><b>{source.name}</b><span>{source.type}</span></div><strong>${source.monthly.toLocaleString()}</strong><span className="trail-supported"><Check size={13} /> Supported</span></div>;
}

function Profile({ sources, onAddEvidence }: { sources: IncomeSource[]; onAddEvidence: () => void }) {
  return <>
    <section className="trail-hero">
      <div className="trail-hero-copy"><em>EVIDENCE-BACKED INCOME</em><h2>Make your income legible, even when it doesn&apos;t come from one employer.</h2><p>IncomeTrail combines fragmented earnings, reconciles them against independent evidence, and creates a portable financial record businesses can verify.</p><button className="trail-primary" onClick={onAddEvidence}><Upload size={16} /> Add income evidence</button></div>
      <div className="trail-credential-peek"><span><ShieldCheck size={16} /> INCOME EVIDENCE CREDENTIAL</span><b>$2,180 <small>supported / month</small></b><p>June — September 2026 · 3 sources</p><label><CheckCircle2 size={15} /> Evidence-backed</label></div>
    </section>
    <section className="trail-metrics" aria-label="Income summary">
      <Metric icon={Banknote} label="Median monthly income" value="$2,230" detail="4-month period" />
      <Metric icon={FileCheck2} label="Evidence coverage" value="94%" detail="$8,510 supported" />
      <Metric icon={Activity} label="Income continuity" value="4 / 4" detail="Observed months" />
      <Metric icon={BarChart3} label="Income volatility" value="18%" detail="Month-to-month" />
    </section>
    <div className="trail-grid">
      <Panel title="Income history" detail="Observed income by month"><div className="trail-chart">{months.map(([month, amount]) => <div className="trail-chart-column" key={month}><div className="trail-chart-bar" style={{ height: `${amount / 30}px` }}><small>${(amount / 1000).toFixed(1)}k</small></div><span>{month}</span></div>)}</div></Panel>
      <Panel title="Income stability profile" detail="Transparent metrics, no opaque score"><DataRow label="Income trend" value="Stable" /><DataRow label="Largest source" value="53%" /><DataRow label="Income sources" value={String(sources.length)} /><DataRow label="Evidence-backed months" value="4 / 4" /><div className="trail-callout"><ShieldCheck size={18} /><span><b>No credit score.</b> IncomeTrail provides evidence; the receiving business applies its own policy.</span></div></Panel>
    </div>
    <div className="trail-grid trail-lower-grid">
      <Panel title="Income sources" detail="September">{sources.map((source) => <SourceRow source={source} key={source.name} />)}</Panel>
      <Panel title="Cash-flow context" detail="Historical, not a recommendation"><DataRow label="Median income" value="$2,230" /><DataRow label="Recurring expenses" value="− $1,520" /><div className="trail-surplus"><span>Observed surplus</span><b>$710</b></div><small className="trail-footnote">IncomeTrail does not decide affordability.</small></Panel>
    </div>
  </>;
}

function Intro({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: React.ReactNode }) {
  return <section className="trail-intro"><div><em>{eyebrow}</em><h2>{title}</h2><p>{text}</p></div>{children}</section>;
}

function Evidence() {
  const records = [["Uber", "$1,420", "$1,390", "$1,386"], ["Retail", "$760", "$760", "$760"], ["Freelance", "$410", "$410", "$410"]];
  return <>
    <Intro eyebrow="RECONCILIATION ENGINE" title="Every important number can be traced back to evidence." text="Claims are compared with source documents and bank activity. Discrepancies are surfaced rather than hidden."><div className="trail-match-count"><b>12</b><span>evidence relationships matched</span></div></Intro>
    <Panel title="September reconciliation" detail="Claim → source document → bank evidence"><div className="trail-reconciliation"><div className="trail-recon-header"><span>Source</span><span>Claimed</span><span>Documented</span><span>Bank-supported</span><span>Status</span></div>{records.map(([name, claimed, documented, bank]) => <div className="trail-recon-row" key={name}><b>{name}</b><span>{claimed}</span><span>{documented}</span><span>{bank}</span><label><Check size={13} /> Reconciled</label></div>)}</div></Panel>
    <div className="trail-callout trail-callout-wide"><ShieldCheck size={19} /><span><b>Evidence provenance is built in.</b> Every derived figure can be traced to supporting records.</span></div>
  </>;
}

function Credential({ onShare }: { onShare: () => void }) {
  return <section className="trail-credential-page">
    <div className="trail-credential-copy"><em>SHAREABLE FINANCIAL CREDENTIAL</em><h2>Income Evidence Credential</h2><p>A standardized representation of income that businesses can independently verify without requiring the worker to have a traditional employer.</p><button className="trail-primary" onClick={onShare}><Link2 size={16} /> Generate secure share</button><div className="trail-trust-list"><span><CheckCircle2 /> Evidence-backed</span><span><CheckCircle2 /> Traceable to source records</span><span><CheckCircle2 /> User-controlled</span></div></div>
    <article className="trail-credential-card"><div className="trail-card-brand"><b>INCOMETRAIL</b><ShieldCheck size={20} /></div><h3>Income Evidence Credential</h3><strong>ARNAV DESHMUKH</strong><small>IT-82A7F4 · June — September 2026</small><div className="trail-card-metrics"><span>Median monthly income<b>$2,230</b></span><span>Supported income<b>$2,180</b></span><span>Evidence coverage<b>94%</b></span><span>Continuity<b>4 / 4 months</b></span><span>Volatility<b>18%</b></span><span>Sources<b>3</b></span></div><ul><li>Bank evidence</li><li>Gig platform statement</li><li>Employer payslip</li><li>Client invoice</li></ul><footer>Issued by IncomeTrail · Evidence-backed <b>▦</b></footer></article>
  </section>;
}

function Business({ sources, onReview }: { sources: IncomeSource[]; onReview: () => void }) {
  return <>
    <section className="trail-hero trail-business-hero"><div className="trail-hero-copy"><em>BUSINESS VERIFICATION</em><h2>Verify income without rebuilding the worker&apos;s financial story.</h2><p>A business receives a standardized credential and can inspect evidence when permission is granted.</p></div><div className="trail-credential-peek"><span><ShieldCheck size={16} /> CREDENTIAL VERIFIED</span><b className="trail-id">IT-82A7F4</b><p>Authentic · Evidence-backed · Current</p></div></section>
    <div className="trail-grid"><Panel title="Applicant income" detail="Credential summary"><div className="trail-business-income">$2,230 <small>median monthly income</small></div><DataRow label="Supported income" value="$2,180" /><DataRow label="Evidence coverage" value="94%" /><DataRow label="Continuity" value="4 / 4 months" /><DataRow label="Volatility" value="18%" /><button className="trail-primary trail-full-button" onClick={onReview}><FileCheck2 size={16} /> View supporting evidence</button></Panel><Panel title="Income composition" detail="September">{sources.map((source) => <SourceRow source={source} key={source.name} />)}</Panel></div>
    <div className="trail-callout trail-callout-wide"><LockKeyhole size={18} /><span><b>IncomeTrail does not make the business decision.</b> The credential provides standardized evidence; the receiving business applies its own rules.</span></div>
  </>;
}

function Sources({ sources, onAdd }: { sources: IncomeSource[]; onAdd: () => void }) {
  return <>
    <Intro eyebrow="MULTI-SOURCE INCOME" title="One financial record across many ways of earning." text="Connect or upload bank records, payslips, gig statements and invoices while preserving their original provenance."><button className="trail-primary" onClick={onAdd}><Plus size={16} /> Add source</button></Intro>
    <div className="trail-source-grid">{sources.map((source, index) => <article className="trail-source-card" key={source.name}><span className={`trail-source-initial source-tone-${index % 3}`}>{source.initial}</span><h3>{source.name}</h3><span>{source.type}</span><b>${source.monthly.toLocaleString()}<small> / mo</small></b><label><CheckCircle2 size={15} /> {index === 0 ? "Bank + platform statement" : "Supporting evidence matched"}</label></article>)}<button className="trail-add-source" onClick={onAdd}><Plus size={19} /><b>Add another source</b></button></div>
  </>;
}

function Dialog({ type, close, onComplete, onAddSource }: { type: ModalType; close: () => void; onComplete: (message: string) => void; onAddSource: (source: IncomeSource) => void }) {
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [sourceType, setSourceType] = useState("Gig platform");
  const isShare = type === "share";
  const isSource = type === "source";
  const submitSource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    onAddSource({ name: trimmedName, type: sourceType, monthly: Number(amount), initial: trimmedName.charAt(0).toUpperCase() });
  };

  return <div className="trail-overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <section className="trail-dialog" role="dialog" aria-modal="true" aria-labelledby="trail-dialog-title"><button className="trail-dialog-close" onClick={close} aria-label="Close dialog"><X size={18} /></button>
      {isShare ? <><span className="trail-dialog-icon"><Link2 size={19} /></span><h2 id="trail-dialog-title">Create secure credential share</h2><p>Select what a business can access. Raw documents are not automatically exposed.</p><div className="trail-share-options">{["Income history", "Supported income", "Evidence coverage", "Income source breakdown", "Raw bank transactions"].map((item, index) => <label key={item}><input type="checkbox" defaultChecked={index < 4} />{item}</label>)}</div><button className="trail-primary trail-full-button" onClick={() => onComplete("Secure credential share created")}>Generate secure share <ArrowRight size={16} /></button></>
        : isSource ? <form onSubmit={submitSource}><span className="trail-dialog-icon"><Plus size={19} /></span><h2 id="trail-dialog-title">Add an income source</h2><p>Keep each income stream connected to its own evidence trail.</p><label className="trail-form-label">Source name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Design clients" /></label><label className="trail-form-label">Source type<select value={sourceType} onChange={(event) => setSourceType(event.target.value)}><option>Gig platform</option><option>Casual employment</option><option>Client income</option><option>Other income</option></select></label><label className="trail-form-label">Monthly income<input required min="0" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 850" /></label><button className="trail-primary trail-full-button" type="submit">Add source <ArrowRight size={16} /></button></form>
        : <><span className="trail-dialog-icon"><Upload size={19} /></span><h2 id="trail-dialog-title">Add income evidence</h2><p>Upload a bank statement, payslip, invoice or platform statement.</p><label className="trail-drop-zone"><Upload size={21} /><b>{fileName || "Choose an evidence file"}</b><span>PDF, CSV or image · Demo upload</span><input type="file" accept=".pdf,.csv,image/*" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></label><button className="trail-primary trail-full-button" disabled={!fileName} onClick={() => onComplete(`${fileName} added for review`)}>Process evidence</button></>}
    </section>
  </div>;
}

export default App;