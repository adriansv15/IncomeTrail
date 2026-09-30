import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  ScanSearch,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { api, type EvidenceRecord, type IncomeCredential, type IncomeProfile, type ApiSource, type UploadedDocument } from "./api";
import { confirmRegistration, currentUser, login, logout, register } from "./auth";
import { awsConfig, isAwsAuthConfigured } from "./awsConfig";
import "./App.css";
import "./auth.css";

type View = "profile" | "evidence" | "credential" | "business" | "sources";
type ModalType = "evidence" | "source";
type IncomeSource = { name: string; type: string; monthly?: number; status?: string; initial: string };

const navigation: { id: View; label: string; icon: typeof Activity }[] = [
  { id: "profile", label: "Income profile", icon: BarChart3 },
  { id: "evidence", label: "Evidence & matching", icon: ScanSearch },
  { id: "credential", label: "Income Evidence Credential", icon: FileCheck2 },
  { id: "business", label: "Business verification", icon: Users },
  { id: "sources", label: "Income sources", icon: BriefcaseBusiness },
];

const months = [["Jun", 2140], ["Jul", 2320], ["Aug", 2050], ["Sep", 2480]] as const;
const demoProfile: IncomeProfile = {
  medianMonthlyIncome: 2230,
  supportedIncome: 2180,
  evidenceCoverage: 94,
  continuity: "4/4",
  volatility: 18,
  sourceCount: 3,
  incomeTrend: "Stable",
  monthlyIncome: months.map(([month, income]) => ({ month, income })),
};

function normalizeSource(source: ApiSource, index: number): IncomeSource {
  const name = source.name?.trim() || `Income source ${index + 1}`;
  const type = (source.type || "OTHER").toLowerCase().replaceAll("_", " ");
  return {
    name,
    type: type.charAt(0).toUpperCase() + type.slice(1),
    monthly: source.monthlyIncome == null ? undefined : Number(source.monthlyIncome),
    status: source.status,
    initial: name.charAt(0).toUpperCase(),
  };
}

function App() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof currentUser>>>(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState<View>("profile");
  const [modal, setModal] = useState<ModalType | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [profile, setProfile] = useState<IncomeProfile | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [credential, setCredential] = useState<IncomeCredential | null>(null);
  const [apiError, setApiError] = useState("");
  const [apiErrorAction, setApiErrorAction] = useState<"data" | "credential" | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [reloadData, setReloadData] = useState(0);

  useEffect(() => {
    let active = true;
    void currentUser().then((activeUser) => {
      if (active) setUser(activeUser);
    }).finally(() => {
      if (active) setAuthReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void Promise.all([api.profile(), api.sources(), api.evidence(), api.documents()]).then(([nextProfile, sourceResponse, evidenceResponse, documentResponse]) => {
      if (!active) return;
      const sourceRecords = Array.isArray(sourceResponse) ? sourceResponse : sourceResponse.sources ?? [];
      const evidenceRecords = Array.isArray(evidenceResponse) ? evidenceResponse : evidenceResponse.evidence ?? [];
      const documentRecords = Array.isArray(documentResponse) ? documentResponse : documentResponse.documents ?? [];
      setProfile(nextProfile);
      setSources(sourceRecords.map(normalizeSource));
      setEvidence(evidenceRecords);
      setDocuments(documentRecords);
      setApiError("");
      setApiErrorAction(null);
    }).catch((error: unknown) => {
      if (active) {
        setApiError(error instanceof Error ? error.message : "Unable to load IncomeTrail data.");
        setApiErrorAction("data");
      }
    }).finally(() => {
      if (active) setLoadingData(false);
    });
    return () => { active = false; };
  }, [user, reloadData]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3600);
  };

  const addSource = async (source: IncomeSource) => {
    const apiType = ({
      "Gig platform": "GIG",
      "Casual employment": "EMPLOYMENT",
      "Client income": "FREELANCE",
      "Other income": "OTHER",
    } as Record<string, string>)[source.type] ?? "OTHER";
    await api.addSource({ name: source.name, type: apiType });
    setModal(null);
    setLoadingData(true);
    setReloadData((current) => current + 1);
    showNotice(`${source.name} added to your income sources`);
  };

  const uploadEvidence = async (file: File) => {
    await api.uploadDocument(file);
    setModal(null);
    setLoadingData(true);
    setReloadData((current) => current + 1);
    showNotice(`${file.name} uploaded securely to S3`);
  };

  const createCredential = async () => {
    setApiError("");
    setApiErrorAction(null);
    try {
      const created = await api.createCredential();
      setCredential(created);
      setView("credential");
      showNotice("Income Evidence Credential created");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to create the credential.");
      setApiErrorAction("credential");
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setProfile(null);
    setSources([]);
    setEvidence([]);
    setDocuments([]);
    setCredential(null);
  };

  const retryDataLoad = () => {
    setLoadingData(true);
    setReloadData((current) => current + 1);
  };
  const retryApiAction = () => {
    if (apiErrorAction === "credential") void createCredential();
    else retryDataLoad();
  };

  if (!authReady) return <div className="trail-loading">Loading IncomeTrail…</div>;
  if (!user) return <AuthScreen onLoggedIn={async () => { setLoadingData(true); setUser(await currentUser()); }} />;

  const displayProfile = profile ?? demoProfile;

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
          <div className="trail-user"><b className="trail-avatar">{(user.username || "IT").slice(0, 2).toUpperCase()}</b><div><strong>{user.username}</strong><span>Personal workspace</span></div><button className="trail-signout" aria-label="Sign out" title="Sign out" onClick={handleLogout}><LogOut size={15} /></button></div>
        </div>
      </aside>

      <main className="trail-main">
        <header className="trail-header">
          <button className="trail-icon-button trail-mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="trail-heading"><em>INCOME INFRASTRUCTURE</em><h1>{navigation.find((item) => item.id === view)?.label}</h1></div>
          <button className="trail-primary" onClick={createCredential}><FileCheck2 size={16} /> Generate credential</button>
        </header>
        {apiError && <div className="trail-error-banner"><span><b>API connection:</b> {apiError}</span><button onClick={retryApiAction}>Retry</button></div>}
        {!profile && !loadingData && <div className="trail-api-note"><b>Showing sample profile values</b>Live metrics will appear after the IncomeTrail API returns profile data.</div>}
        <div className="trail-content">
          {view === "profile" && <Profile profile={displayProfile} sources={sources} onAddEvidence={() => setModal("evidence")} />}
          {view === "evidence" && <Evidence evidence={evidence} documents={documents} />}
          {view === "credential" && <Credential credential={credential} profile={displayProfile} onGenerate={createCredential} />}
          {view === "business" && <Business sources={sources} />}
          {view === "sources" && <Sources sources={sources} onAdd={() => setModal("source")} />}
        </div>
      </main>
      {modal && <Dialog type={modal} close={() => setModal(null)} onAddSource={addSource} onUploadFile={uploadEvidence} />}
      {notice && <div className="trail-toast" role="status"><CheckCircle2 size={17} />{notice}</div>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return <article className="trail-metric"><span className="trail-metric-icon"><Icon size={17} /></span><span className="trail-metric-label">{label}</span><b>{value}</b><small>{detail}</small></article>;
}

function AuthScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (needsConfirmation) {
        await confirmRegistration(email, code);
        setNeedsConfirmation(false);
        setMode("login");
        setMessage("Email confirmed. You can now sign in.");
      } else if (mode === "login") {
        const result = await login(email, password);
        if (result.isSignedIn) onLoggedIn();
        else setMessage("Additional Cognito challenge required. Contact your administrator to complete sign-in.");
      } else {
        const result = await register(email, password, name.trim());
        if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          setNeedsConfirmation(true);
          setMessage("Check your email for the confirmation code.");
        } else {
          setMode("login");
          setMessage("Account created. You can now sign in.");
        }
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="trail-auth-page"><section className="trail-auth-card">
    <div className="trail-auth-brand"><span className="trail-brand-mark"><Activity size={19} /></span><span>IncomeTrail<small>Making every income legible.</small></span></div>
    <div className="trail-auth-tabs"><button className={mode === "login" && !needsConfirmation ? "active" : ""} onClick={() => { setMode("login"); setNeedsConfirmation(false); setError(""); }}>Sign in</button><button className={mode === "signup" && !needsConfirmation ? "active" : ""} onClick={() => { setMode("signup"); setNeedsConfirmation(false); setError(""); }}>Create account</button></div>
    <form className="trail-auth-form" onSubmit={submit}>
      {!needsConfirmation && mode === "signup" && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}
      {!needsConfirmation && <><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></label></>}
      {needsConfirmation && <label>Confirmation code<input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" required /></label>}
      {message && <div className="trail-auth-message" role="status">{message}</div>}
      {error && <div className="trail-auth-error" role="alert">{error}</div>}
      <button className="trail-primary trail-full-button" disabled={busy}>{busy ? "Working…" : needsConfirmation ? "Confirm email" : mode === "login" ? "Sign in" : "Create account"}</button>
    </form>
    <p className="trail-auth-help">{isAwsAuthConfigured ? `Secure sign-in through Amazon Cognito · ${awsConfig.region}` : "Cognito is not configured. Copy .env.example to .env.local, then restart the Vite server to enable sign-in."}</p>
  </section></main>;
}

function Panel({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return <section className="trail-panel"><div className="trail-panel-heading"><div><h2>{title}</h2><p>{detail}</p></div></div>{children}</section>;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return <div className="trail-data-row"><span>{label}</span><b>{value}</b></div>;
}

function SourceRow({ source }: { source: IncomeSource }) {
  return <div className="trail-source-row"><span className="trail-source-initial">{source.initial}</span><div className="trail-source-name"><b>{source.name}</b><span>{source.type}</span></div><strong>{source.monthly == null ? "Amount not reported" : `$${source.monthly.toLocaleString()}`}</strong><span className="trail-supported"><Check size={13} /> {source.status || "Connected"}</span></div>;
}

function Profile({ profile, sources, onAddEvidence }: { profile: IncomeProfile; sources: IncomeSource[]; onAddEvidence: () => void }) {
  const history = profile.monthlyIncome?.length ? profile.monthlyIncome : demoProfile.monthlyIncome ?? [];
  const median = Number(profile.medianMonthlyIncome ?? 0);
  const supported = Number(profile.supportedIncome ?? 0);
  const coverage = Number(profile.evidenceCoverage ?? 0);
  const continuity = profile.continuity ?? "—";
  const volatility = Number(profile.volatility ?? 0);
  return <>
    <section className="trail-hero">
      <div className="trail-hero-copy"><em>EVIDENCE-BACKED INCOME</em><h2>Make your income legible, even when it doesn&apos;t come from one employer.</h2><p>IncomeTrail combines fragmented earnings, reconciles them against independent evidence, and creates a portable financial record businesses can verify.</p><button className="trail-primary" onClick={onAddEvidence}><Upload size={16} /> Add income evidence</button></div>
      <div className="trail-credential-peek"><span><ShieldCheck size={16} /> INCOME EVIDENCE CREDENTIAL</span><b>${supported.toLocaleString()} <small>supported / month</small></b><p>{history.length} observed months · {sources.length} sources</p><label><CheckCircle2 size={15} /> Evidence-backed profile</label></div>
    </section>
    <section className="trail-metrics" aria-label="Income summary">
      <Metric icon={Banknote} label="Median monthly income" value={`$${median.toLocaleString()}`} detail={`${history.length}-month period`} />
      <Metric icon={FileCheck2} label="Evidence coverage" value={`${coverage}%`} detail={`$${supported.toLocaleString()} supported`} />
      <Metric icon={Activity} label="Income continuity" value={continuity.replace("/", " / ")} detail="Observed months" />
      <Metric icon={BarChart3} label="Income volatility" value={`${volatility}%`} detail="Month-to-month" />
    </section>
    <div className="trail-grid">
      <Panel title="Income history" detail="Observed income by month"><div className="trail-chart">{history.map(({ month, income }) => <div className="trail-chart-column" key={month}><div className="trail-chart-bar" style={{ height: `${Math.max(24, Math.min(105, income / 30))}px` }}><small>${(income / 1000).toFixed(1)}k</small></div><span>{month}</span></div>)}</div></Panel>
      <Panel title="Income stability profile" detail="Transparent metrics, no opaque score"><DataRow label="Income trend" value={profile.incomeTrend ?? "—"} /><DataRow label="Income sources" value={String(profile.sourceCount ?? sources.length)} /><DataRow label="Evidence-backed months" value={continuity.replace("/", " / ")} /><DataRow label="Income volatility" value={`${volatility}%`} /><div className="trail-callout"><ShieldCheck size={18} /><span><b>No credit score.</b> IncomeTrail provides evidence; the receiving business applies its own policy.</span></div></Panel>
    </div>
    <div className="trail-grid trail-lower-grid">
      <Panel title="Income sources" detail="Connected to your IncomeTrail account">{sources.length ? sources.map((source) => <SourceRow source={source} key={source.name} />) : <p className="trail-empty">No income sources have been added yet.</p>}</Panel>
      <Panel title="Cash-flow context" detail="Historical, not a recommendation"><DataRow label="Median income" value="$2,230" /><DataRow label="Recurring expenses" value="− $1,520" /><div className="trail-surplus"><span>Observed surplus</span><b>$710</b></div><small className="trail-footnote">IncomeTrail does not decide affordability.</small></Panel>
    </div>
  </>;
}

function Intro({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return <section className="trail-intro"><div><em>{eyebrow}</em><h2>{title}</h2><p>{text}</p></div>{children}</section>;
}

function Evidence({ evidence, documents }: { evidence: EvidenceRecord[]; documents: UploadedDocument[] }) {
  return <>
    <Intro eyebrow="RECONCILIATION ENGINE" title="Every important number can be traced back to evidence." text="Claims are compared with source documents and bank activity. Discrepancies are surfaced rather than hidden."><div className="trail-match-count"><b>{evidence.length}</b><span>evidence relationships matched</span></div></Intro>
    <Panel title="Income reconciliation" detail="Claim → source document → bank evidence">{evidence.length ? <div className="trail-reconciliation"><div className="trail-recon-header"><span>Source</span><span>Claimed</span><span>Documented</span><span>Bank-supported</span><span>Status</span></div>{evidence.map((record, index) => <div className="trail-recon-row" key={`${record.source ?? "evidence"}-${index}`}><b>{record.source || "Income source"}</b><span>${Number(record.claimedAmount ?? 0).toLocaleString()}</span><span>${Number(record.documentedAmount ?? 0).toLocaleString()}</span><span>${Number(record.bankSupportedAmount ?? 0).toLocaleString()}</span><label><Check size={13} /> {(record.status || "PENDING").replaceAll("_", " ").toLowerCase()}</label></div>)}</div> : <p className="trail-empty">No evidence records are available for this account.</p>}</Panel>
    <Panel title="Uploaded evidence" detail="Private documents stored in your IncomeTrail account">{documents.length ? <div className="trail-document-list">{documents.map((document) => <div className="trail-document-row" key={document.documentId}><FileText size={17} /><div><b>{document.fileName}</b><span>{document.contentType} · {Math.max(1, Math.round(document.fileSize / 1024))} KB</span></div><label>{document.status}</label></div>)}</div> : <p className="trail-empty">No documents have been uploaded.</p>}</Panel>
    <div className="trail-callout trail-callout-wide"><ShieldCheck size={19} /><span><b>Evidence provenance is built in.</b> Every derived figure can be traced to supporting records.</span></div>
  </>;
}

function Credential({ credential, profile, onGenerate }: { credential: IncomeCredential | null; profile: IncomeProfile; onGenerate: () => void }) {
  const credentialId = credential?.credentialId || "Not generated";
  return <section className="trail-credential-page">
    <div className="trail-credential-copy"><em>SHAREABLE FINANCIAL CREDENTIAL</em><h2>Income Evidence Credential</h2><p>A standardized representation of income that businesses can independently verify without requiring the worker to have a traditional employer.</p><button className="trail-primary" onClick={onGenerate}><FileCheck2 size={16} /> Generate credential</button><div className="trail-trust-list"><span><CheckCircle2 /> Evidence-backed</span><span><CheckCircle2 /> Traceable to source records</span><span><CheckCircle2 /> User-controlled</span></div></div>
    <article className="trail-credential-card"><div className="trail-card-brand"><b>INCOMETRAIL</b><ShieldCheck size={20} /></div><h3>Income Evidence Credential</h3><strong>{credentialId}</strong><small>{credential?.status || "No credential generated"}</small><div className="trail-card-metrics"><span>Median monthly income<b>${Number(credential?.medianMonthlyIncome ?? profile.medianMonthlyIncome ?? 0).toLocaleString()}</b></span><span>Supported income<b>${Number(credential?.supportedIncome ?? profile.supportedIncome ?? 0).toLocaleString()}</b></span><span>Evidence coverage<b>{Number(credential?.evidenceCoverage ?? profile.evidenceCoverage ?? 0)}%</b></span><span>Continuity<b>{credential?.continuity ?? profile.continuity ?? "—"}</b></span><span>Volatility<b>{Number(credential?.volatility ?? profile.volatility ?? 0)}%</b></span><span>Sources<b>{credential?.sourceCount ?? profile.sourceCount ?? 0}</b></span></div><footer>Issued by IncomeTrail · API-backed <b><ShieldCheck size={15} /></b></footer></article>
  </section>;
}

function Business({ sources }: { sources: IncomeSource[] }) {
  const [credentialId, setCredentialId] = useState("");
  const [result, setResult] = useState<IncomeCredential | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    try {
      setResult(await api.verifyCredential(credentialId.trim()));
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Credential verification failed.");
    } finally {
      setBusy(false);
    }
  };
  return <>
    <section className="trail-hero trail-business-hero"><div className="trail-hero-copy"><em>BUSINESS VERIFICATION</em><h2>Verify income without rebuilding the worker&apos;s financial story.</h2><p>A business receives a standardized credential and can inspect evidence when permission is granted.</p></div><div className="trail-credential-peek"><span><ShieldCheck size={16} /> CREDENTIAL VERIFICATION</span><b className="trail-id">{result?.credentialId || "Enter an ID"}</b><p>{result ? (result.current ? "Current credential" : "Credential is not current") : "Verify a credential against the IncomeTrail API"}</p></div></section>
    <div className="trail-grid"><Panel title="Verify credential" detail="Check authenticity and supported income"><form className="trail-verify-form" onSubmit={verify}><label className="trail-form-label">Credential ID<input required value={credentialId} onChange={(event) => setCredentialId(event.target.value)} placeholder="e.g. IT-82A7F4" /></label><button className="trail-primary" disabled={busy}><ShieldCheck size={16} /> {busy ? "Verifying…" : "Verify credential"}</button></form>{error && <div className="trail-auth-error" role="alert">{error}</div>}{result && <><DataRow label="Evidence-backed" value={result.evidenceBacked ? "Yes" : "No"} /><DataRow label="Median monthly income" value={`$${Number(result.medianMonthlyIncome ?? 0).toLocaleString()}`} /><DataRow label="Evidence coverage" value={`${Number(result.evidenceCoverage ?? 0)}%`} /><DataRow label="Continuity" value={result.continuity ?? "—"} /></>}</Panel><Panel title="Income composition" detail="Connected income sources">{sources.length ? sources.map((source) => <SourceRow source={source} key={source.name} />) : <p className="trail-empty">No income sources are available.</p>}</Panel></div>
    <div className="trail-callout trail-callout-wide"><LockKeyhole size={18} /><span><b>IncomeTrail does not make the business decision.</b> The credential provides standardized evidence; the receiving business applies its own rules.</span></div>
  </>;
}

function Sources({ sources, onAdd }: { sources: IncomeSource[]; onAdd: () => void }) {
  return <>
    <Intro eyebrow="MULTI-SOURCE INCOME" title="One financial record across many ways of earning." text="Connect or upload bank records, payslips, gig statements and invoices while preserving their original provenance."><button className="trail-primary" onClick={onAdd}><Plus size={16} /> Add source</button></Intro>
    <div className="trail-source-grid">{sources.map((source, index) => <article className="trail-source-card" key={`${source.name}-${index}`}><span className={`trail-source-initial source-tone-${index % 3}`}>{source.initial}</span><h3>{source.name}</h3><span>{source.type}</span><b>{source.monthly == null ? "Amount not reported" : `$${source.monthly.toLocaleString()}`}<small>{source.monthly == null ? "" : " / mo"}</small></b><label><CheckCircle2 size={15} /> {source.status || "Connected to your account"}</label></article>)}<button className="trail-add-source" onClick={onAdd}><Plus size={19} /><b>Add another source</b></button></div>
  </>;
}

function Dialog({ type, close, onAddSource, onUploadFile }: { type: ModalType; close: () => void; onAddSource: (source: IncomeSource) => Promise<void>; onUploadFile: (file: File) => Promise<void> }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("Gig platform");
  const isSource = type === "source";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitUpload = async () => {
    if (!selectedFile) return;
    setBusy(true);
    setError("");
    try {
      await onUploadFile(selectedFile);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload this document.");
    } finally {
      setBusy(false);
    }
  };
  const submitSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    setBusy(true);
    setError("");
    try {
      await onAddSource({ name: trimmedName, type: sourceType, initial: trimmedName.charAt(0).toUpperCase() });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add this source.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="trail-overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <section className="trail-dialog" role="dialog" aria-modal="true" aria-labelledby="trail-dialog-title"><button className="trail-dialog-close" onClick={close} aria-label="Close dialog"><X size={18} /></button>
      {isSource ? <form onSubmit={submitSource}><span className="trail-dialog-icon"><Plus size={19} /></span><h2 id="trail-dialog-title">Add an income source</h2><p>Keep each income stream connected to its own evidence trail.</p><label className="trail-form-label">Source name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Design clients" /></label><label className="trail-form-label">Source type<select value={sourceType} onChange={(event) => setSourceType(event.target.value)}><option>Gig platform</option><option>Casual employment</option><option>Client income</option><option>Other income</option></select></label>{error && <div className="trail-auth-error" role="alert">{error}</div>}<button className="trail-primary trail-full-button" type="submit" disabled={busy}>{busy ? "Adding…" : "Add source"} <ArrowRight size={16} /></button></form>
        : <><span className="trail-dialog-icon"><Upload size={19} /></span><h2 id="trail-dialog-title">Add income evidence</h2><p>Upload a bank statement, payslip, invoice or platform statement.</p><label className="trail-drop-zone"><Upload size={21} /><b>{selectedFile?.name || "Choose an evidence file"}</b><span>PDF, CSV, JPG, PNG or WebP · Max 10 MB</span><input type="file" accept=".pdf,.csv,.jpg,.jpeg,.png,.webp" onChange={(event) => { setSelectedFile(event.target.files?.[0] ?? null); setError(""); }} /></label>{error && <div className="trail-auth-error" role="alert">{error}</div>}<button className="trail-primary trail-full-button" disabled={!selectedFile || busy} onClick={submitUpload}>{busy ? "Uploading…" : "Upload evidence"}<Upload size={16} /></button><div className="trail-upload-privacy"><LockKeyhole size={14} /> Uploaded to your private IncomeTrail S3 folder.</div></>}
    </section>
  </div>;
}

export default App;