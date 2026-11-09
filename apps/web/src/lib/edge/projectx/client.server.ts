// Server-only ProjectX API client

import { PROJECTX_API_BASE, PROJECTX_ENDPOINTS } from '../constants';
import type {
  ProjectXBarsResponse,
  ProjectXContractsResponse,
  ProjectXTradesResponse,
  ProjectXAccountsResponse,
  ProjectXAuthResponse,
  ProjectXContract,
} from '../types';
import { fetchWithTimeout } from '@/lib/api/fetch-with-timeout';

/**
 * Authenticate with ProjectX API using userName and apiKey
 */
export async function authenticateWithApiKey(
  userName: string,
  apiKey: string
): Promise<ProjectXAuthResponse> {
  const response = await fetchWithTimeout(`${PROJECTX_API_BASE}${PROJECTX_ENDPOINTS.AUTH_LOGIN_KEY}`, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: userName.trim(), apiKey: apiKey.trim() }),
    cache: 'no-store',
  });

  // Provider responses can include credentials or tokens. Never log or echo them.
  const data = await readProjectXResponse<ProjectXAuthResponse>(response, 'authentication');
  if (typeof data.token !== 'string' || !data.token) {
    throw new Error('No token received from ProjectX authentication');
  }
  return data;
}

async function readProjectXResponse<T>(response: Response, operation: string): Promise<T> {
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(`ProjectX ${operation} returned an invalid response (HTTP ${response.status})`);
  }
  if (!data || typeof data !== 'object') {
    throw new Error(`ProjectX ${operation} returned an invalid response`);
  }
  if (!response.ok || data.success === false || (data.errorCode !== undefined && data.errorCode !== 0)) {
    // An untrusted errorMessage could echo API credentials; expose status only.
    throw new Error(`ProjectX ${operation} failed (HTTP ${response.status}). Check your connection and credentials.`);
  }
  return data as T;
}

/** Make authenticated requests without leaking credentials or private records. */
async function projectXRequest<T>(
  endpoint: string,
  body: Record<string, any>,
  token: string
): Promise<T> {
  if (!token) throw new Error('ProjectX token not provided');
  const response = await fetchWithTimeout(`${PROJECTX_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return readProjectXResponse<T>(response, 'request');
}

/**
 * Search for contracts
 */
export async function searchContracts(
  searchText: string,
  live: boolean,
  token: string
): Promise<ProjectXContractsResponse> {
  return projectXRequest<ProjectXContractsResponse>(
    PROJECTX_ENDPOINTS.CONTRACT_SEARCH,
    { searchText, live },
    token
  );
}

/**
 * Get contract by ID
 */
export async function getContractById(
  contractId: string,
  live: boolean,
  token: string
): Promise<ProjectXContract | null> {
  const response = await projectXRequest<ProjectXContractsResponse>(
    PROJECTX_ENDPOINTS.CONTRACT_SEARCH_BY_ID,
    { contractId, live },
    token
  );
  return response.contracts?.[0] || null;
}

/**
 * Get available contracts
 */
export async function getAvailableContracts(
  live: boolean,
  token: string
): Promise<ProjectXContractsResponse> {
  return projectXRequest<ProjectXContractsResponse>(
    PROJECTX_ENDPOINTS.CONTRACT_AVAILABLE,
    { live },
    token
  );
}

/**
 * Retrieve historical bars
 */
export async function retrieveBars(
  params: {
    contractId: string;
    live: boolean;
    startTime: string; // ISO timestamp
    endTime: string; // ISO timestamp
    unit: number; // 1=Second, 2=Minute, 3=Hour, 4=Day, 5=Week, 6=Month
    unitNumber: number;
    limit?: number;
    includePartialBar?: boolean;
  },
  token: string
): Promise<ProjectXBarsResponse> {
  return projectXRequest<ProjectXBarsResponse>(
    PROJECTX_ENDPOINTS.HISTORY_BARS,
    {
      contractId: params.contractId,
      live: params.live,
      startTime: params.startTime,
      endTime: params.endTime,
      unit: params.unit,
      unitNumber: params.unitNumber,
      limit: params.limit ?? 20000,
      includePartialBar: params.includePartialBar ?? false,
    },
    token
  );
}

/**
 * Search for accounts
 */
export async function searchAccounts(
  onlyActiveAccounts: boolean,
  token: string
): Promise<ProjectXAccountsResponse> {
  return projectXRequest<ProjectXAccountsResponse>(
    PROJECTX_ENDPOINTS.ACCOUNT_SEARCH,
    { onlyActiveAccounts },
    token
  );
}

/**
 * Search for trades
 */
export async function searchTrades(
  params: {
    accountId: string | number;
    startTimestamp: string; // ISO timestamp
    endTimestamp?: string; // ISO timestamp (optional)
  },
  token: string
): Promise<ProjectXTradesResponse> {
  const body: Record<string, any> = {
    accountId: params.accountId,
    startTimestamp: params.startTimestamp,
  };
  
  if (params.endTimestamp) {
    body.endTimestamp = params.endTimestamp;
  }


  return projectXRequest<ProjectXTradesResponse>(PROJECTX_ENDPOINTS.TRADE_SEARCH, body, token);
}
