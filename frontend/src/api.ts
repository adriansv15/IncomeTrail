import { accessToken } from "./auth";
import { awsConfig } from "./awsConfig";

export type ApiSource = {
  name?: string;
  type?: string;
  status?: string;
  monthlyIncome?: number;
  income?: number;
  amount?: number;
};

export type IncomeProfile = {
  medianMonthlyIncome?: number;
  supportedIncome?: number;
  evidenceCoverage?: number;
  continuity?: string;
  volatility?: number;
  sourceCount?: number;
  incomeTrend?: string;
  monthlyIncome?: { month: string; income: number }[];
};

export type EvidenceRecord = {
  source?: string;
  claimedAmount?: number;
  documentedAmount?: number;
  bankSupportedAmount?: number;
  status?: string;
};

export type IncomeCredential = {
  credentialId?: string;
  medianMonthlyIncome?: number;
  supportedIncome?: number;
  evidenceCoverage?: number;
  continuity?: string;
  volatility?: number;
  sourceCount?: number;
  evidenceBacked?: boolean;
  current?: boolean;
  status?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!awsConfig.apiUrl) {
    throw new Error("API Gateway is not configured. Set VITE_API_URL in .env.local.");
  }

  const token = await accessToken();
  const response = await fetch(`${awsConfig.apiUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  const data: unknown = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return { message: text };
    }
  })();

  if (!response.ok) {
    const body = data as { message?: string; error?: string } | null;
    throw new Error(body?.message || body?.error || `API request failed (${response.status})`);
  }

  return data as T;
}

export const api = {
  profile: () => request<IncomeProfile>("/income-profile"),
  sources: () => request<{ sources?: ApiSource[] } | ApiSource[]>("/income-sources"),
  evidence: () => request<{ evidence?: EvidenceRecord[] } | EvidenceRecord[]>("/evidence"),
  createCredential: () => request<IncomeCredential>("/credentials", { method: "POST", body: "{}" }),
  verifyCredential: (credentialId: string) =>
    request<IncomeCredential>(`/verify/${encodeURIComponent(credentialId)}`),
  addSource: (source: { name: string; type: string }) =>
    request<{ source?: ApiSource } | ApiSource>("/income-sources", {
      method: "POST",
      body: JSON.stringify(source),
    }),
};