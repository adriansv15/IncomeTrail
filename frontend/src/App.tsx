import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  FileCheck2,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  WalletCards,
  Zap,
} from "lucide-react";
import {
  CoverageRow,
  LatestRecords,
  Metric,
  PanelHeader,
  SourceCard,
  TrackerStep,
  VerificationHeading,
} from "./components/DashboardComponents";
import { AddSourceModal, VerificationModal } from "./components/Modals";
import { initialSources, periods } from "./data/mockData";
import type { Source } from "./types";
import "./App.css";

function App() {
  const [sources, setSources] = useState(initialSources);
  const [period, setPeriod] = useState("Last 6 months");
  const [showAdd, setShowAdd] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [activeView, setActiveView] = useState("Dashboard");

  const activeSources = sources.filter((source) => !source.archived);
  const total = activeSources.reduce((sum, source) => sum + source.income, 0);
  const addSource = (source: Source) => {
    setSources((current) => [...current, source]);
    setShowAdd(false);
  };
  const archiveSource = (id: number) => {
    setSources((current) =>
      current.map((source) =>
        source.id === id ? { ...source, archived: true } : source,
      ),
    );
  };

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="main-content">
        <Topbar activeView={activeView} />
        <div className="page-content">
          <Welcome onAddSource={() => setShowAdd(true)} />
          <SummaryMetrics
            total={total}
            activeSourceCount={activeSources.length}
          />
          <DashboardPanels
            period={period}
            onPeriodChange={setPeriod}
            onReviewEvidence={() => setShowVerification(true)}
          />
          <IncomeSources
            sources={activeSources}
            onAddSource={() => setShowAdd(true)}
            onArchive={archiveSource}
          />
          <BottomPanels onVerify={() => setShowVerification(true)} />
        </div>
      </main>
      {showAdd && (
        <AddSourceModal close={() => setShowAdd(false)} save={addSource} />
      )}
      {showVerification && (
        <VerificationModal close={() => setShowVerification(false)} />
      )}
    </div>
  );
}

type SidebarProps = {
  activeView: string;
  onNavigate: (view: string) => void;
};

function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const navigation = [
    [LayoutDashboard, "Dashboard"],
    [WalletCards, "Income"],
    [ShieldCheck, "Verification"],
    [Activity, "History"],
  ] as const;

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <Zap size={16} fill="currentColor" />
        </span>
        <span>
          <strong>
            Hustle<span>Ledger</span>
          </strong>
          <small>Income, made legible.</small>
        </span>
      </div>
      <p className="eyebrow side-label">Workspace</p>
      <nav className="nav-list" aria-label="Main navigation">
        {navigation.map(([Icon, label]) => (
          <button
            key={label}
            className={`nav-item ${activeView === label ? "active" : ""}`}
            onClick={() => onNavigate(label)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="privacy-note">
        <ShieldCheck size={17} />
        <div>
          <b>Your data, your control</b>
          <small>Evidence is shared only when you choose to verify.</small>
        </div>
      </div>
      <button className="nav-item">
        <Settings size={17} /> Settings
      </button>
      <div className="profile">
        <span className="avatar">AD</span>
        <div>
          <b>Arnav Deshmukh</b>
          <small>Student account</small>
        </div>
        <MoreHorizontal size={17} />
      </div>
    </aside>
  );
}

function Topbar({ activeView }: { activeView: string }) {
  return (
    <header className="topbar">
      <span className="breadcrumb">
        Workspace <b>/</b> {activeView}
      </span>
      <div className="top-actions">
        <label className="search-box">
          <Search size={15} />
          <input aria-label="Search income" placeholder="Search income..." />
        </label>
        <button className="icon-button" aria-label="Help">
          <CircleHelp size={18} />
        </button>
        <span className="avatar">AD</span>
      </div>
    </header>
  );
}

function Welcome({ onAddSource }: { onAddSource: () => void }) {
  return (
    <section className="welcome">
      <div>
        <p className="eyebrow">✦ Income command centre</p>
        <h1>Good afternoon, Arnav.</h1>
        <p className="lede">
          See every income stream in one place, and make your earnings easier to
          understand.
        </p>
      </div>
      <button className="primary-button" onClick={onAddSource}>
        <Plus size={17} /> Add income source
      </button>
    </section>
  );
}

function SummaryMetrics({
  total,
  activeSourceCount,
}: {
  total: number;
  activeSourceCount: number;
}) {
  return (
    <section className="metrics" aria-label="Income summary">
      <Metric
        icon={WalletCards}
        label="Current income"
        value={`$${total.toLocaleString()}`}
        note="September 2026"
        accent="violet"
      />
      <Metric
        icon={Activity}
        label="Income reliability"
        value="82"
        note="/ 100 · Stable pattern"
        accent="green"
        help="Describes the stability of your income pattern. It does not determine creditworthiness."
      />
      <Metric
        icon={FileCheck2}
        label="Evidence coverage"
        value="93%"
        note="of claimed income supported"
        accent="blue"
      />
      <Metric
        icon={BriefcaseBusiness}
        label="Active sources"
        value={activeSourceCount.toString()}
        note="income streams"
        accent="amber"
      />
    </section>
  );
}

type DashboardPanelsProps = {
  period: string;
  onPeriodChange: (period: string) => void;
  onReviewEvidence: () => void;
};

function DashboardPanels({
  period,
  onPeriodChange,
  onReviewEvidence,
}: DashboardPanelsProps) {
  return (
    <div className="dashboard-grid">
      <section className="panel history-panel">
        <PanelHeader
          title="Income history"
          detail="A clear view of your earned income over time"
        >
          <div className="period-select">
            <select
              value={period}
              onChange={(event) => onPeriodChange(event.target.value)}
              aria-label="Select income history period"
            >
              {periods.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </PanelHeader>
        <div className="chart-meta">
          <div>
            <strong>$2,840</strong>
            <span>
              September 2026 <i>+12.4%</i>
            </span>
          </div>
          <span className="chart-legend">
            <i /> Total income
          </span>
        </div>
        <IncomeChart />
      </section>
      <section className="panel coverage-panel">
        <PanelHeader
          title="Evidence coverage"
          detail="How much of your income is supported"
        />
        <div className="coverage-ring">
          <div>
            <strong>
              93<span>%</span>
            </strong>
            <small>supported</small>
          </div>
        </div>
        <div className="coverage-rows">
          <CoverageRow
            label="Transaction-supported"
            value="$2,500"
            width="83%"
            color="violet"
          />
          <CoverageRow
            label="Document-supported"
            value="$300"
            width="10%"
            color="blue"
          />
          <CoverageRow
            label="Self-reported"
            value="$200"
            width="7%"
            color="muted"
          />
        </div>
        <button className="text-button" onClick={onReviewEvidence}>
          Review evidence <ArrowUpRight size={15} />
        </button>
      </section>
    </div>
  );
}

function IncomeChart() {
  return (
    <div className="chart">
      <div className="grid-lines">
        <span>$3k</span>
        <span>$2k</span>
        <span>$1k</span>
        <span>$0</span>
      </div>
      <svg
        viewBox="0 0 680 230"
        preserveAspectRatio="none"
        role="img"
        aria-label="Income trend rising to 2840 dollars"
      >
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#9b7cff" stopOpacity=".34" />
            <stop offset="1" stopColor="#9b7cff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M45 174 C105 160 110 105 165 125 S245 165 285 105 S370 130 405 90 S475 114 520 58 S590 74 645 30 L645 210 L45 210 Z"
          fill="url(#area)"
        />
        <path
          d="M45 174 C105 160 110 105 165 125 S245 165 285 105 S370 130 405 90 S475 114 520 58 S590 74 645 30"
          fill="none"
          stroke="#a58aff"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="645"
          cy="30"
          r="5"
          fill="#0e1017"
          stroke="#b49cff"
          strokeWidth="3"
        />
      </svg>
      <div className="chart-labels">
        <span>Apr 26</span>
        <span>May 26</span>
        <span>Jun 26</span>
        <span>Jul 26</span>
        <span>Aug 26</span>
        <span>Sep 26</span>
      </div>
    </div>
  );
}

function IncomeSources({
  sources,
  onAddSource,
  onArchive,
}: {
  sources: Source[];
  onAddSource: () => void;
  onArchive: (id: number) => void;
}) {
  return (
    <section className="sources-section">
      <PanelHeader
        title="Active income sources"
        detail={`${sources.length} income streams contributing to your record`}
      >
        <button className="secondary-button" onClick={onAddSource}>
          <Plus size={15} /> Add source
        </button>
      </PanelHeader>
      <div className="source-grid">
        {sources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            onArchive={() => onArchive(source.id)}
          />
        ))}
        <button className="empty-source" onClick={onAddSource}>
          <span>
            <Plus size={18} />
          </span>
          <b>Add another income source</b>
          <small>Keep your income record complete</small>
        </button>
      </div>
    </section>
  );
}

function BottomPanels({ onVerify }: { onVerify: () => void }) {
  return (
    <section className="bottom-grid">
      <section className="panel verification-card">
        <VerificationHeading />
        <p className="card-copy">
          Build a portable record by matching your claimed income with
          supporting evidence.
        </p>
        <div className="tracker">
          <TrackerStep label="Draft" done />
          <TrackerStep label="Documents received" />
          <TrackerStep label="Under review" />
          <TrackerStep label="Approved" />
        </div>
        <button className="primary-button" onClick={onVerify}>
          Continue verification <ArrowUpRight size={15} />
        </button>
      </section>
      <section className="panel records-card">
        <PanelHeader title="Latest records" detail="Recent income activity">
          <button className="icon-button" aria-label="View all records">
            <ArrowUpRight size={16} />
          </button>
        </PanelHeader>
        <LatestRecords />
      </section>
    </section>
  );
}

export default App;
