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
  // Trim whitespace from credentials
  const trimmedUserName = userName.trim();
  const trimmedApiKey = apiKey.trim();
  
  console.log('Authenticating with ProjectX:', {
    userName: trimmedUserName.substring(0, 3) + '...', // Log partial for security
    apiKeyLength: trimmedApiKey.length,
    apiKeyStartsWith: trimmedApiKey.substring(0, 5) + '...',
  });

  const requestBody = { 
    userName: trimmedUserName, 
    apiKey: trimmedApiKey 
  };
  
  const fullUrl = `${PROJECTX_API_BASE}${PROJECTX_ENDPOINTS.AUTH_LOGIN_KEY}`;
  const requestBodyJson = JSON.stringify(requestBody);
  
  console.log('=== PROJECTX AUTH REQUEST ===');
  console.log('URL:', fullUrl);
  console.log('Method: POST');
  console.log('Headers:', {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  });
  console.log('Body (JSON):', requestBodyJson);
  console.log('Body (parsed):', requestBody);
  console.log('UserName length:', trimmedUserName.length);
  console.log('ApiKey length:', trimmedApiKey.length);
  console.log('============================');

  const response = await fetch(`${PROJECTX_API_BASE}${PROJECTX_ENDPOINTS.AUTH_LOGIN_KEY}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  console.log('=== PROJECTX AUTH RESPONSE ===');
  console.log('HTTP Status:', response.status, response.statusText);
  console.log('Content-Type:', response.headers.get('content-type'));
  console.log('All Headers:', Object.fromEntries(response.headers.entries()));

  let data: any;
  const responseText = await response.text();
  console.log('Response body length:', responseText.length);
  console.log('Response body (raw, full):', responseText);
  console.log('Response body (first 2000 chars):', responseText.substring(0, 2000));
  
  try {
    data = JSON.parse(responseText);
    console.log('Response body (parsed JSON):', JSON.stringify(data, null, 2));
  } catch (parseError) {
    // If not JSON, use the text as error message
    console.error('=== FAILED TO PARSE RESPONSE AS JSON ===');
    console.error('Parse error:', parseError);
    console.error('Response text (full):', responseText);
    console.error('========================================');
    throw new Error(`ProjectX authentication error: ${response.status} - ${responseText || 'Invalid response format'}`);
  }
  
  // Log the full response for debugging
  console.log('=== RESPONSE ANALYSIS ===');
  console.log('Has errorCode:', data.errorCode !== undefined);
  console.log('errorCode:', data.errorCode);
  console.log('errorMessage:', data.errorMessage);
  console.log('Has token:', !!data.token);
  console.log('Token length:', data.token?.length);
  console.log('Has success:', data.success !== undefined);
  console.log('success:', data.success);
  console.log('HTTP Status:', response.status);
  console.log('Response keys:', Object.keys(data));
  console.log('Full response object:', data);
  console.log('========================');

  // Check for API-level errors first (even if HTTP status is 200)
  // The API may return 200 OK but with errorCode in the body
  if (data.errorCode !== undefined && data.errorCode !== 0) {
    const errorMsg = data.errorMessage || `ProjectX authentication error code: ${data.errorCode}`;
    console.error('ProjectX auth error:', {
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      httpStatus: response.status,
      fullResponse: data,
    });
    throw new Error(errorMsg);
  }

  // Check HTTP status if errorCode check passed
  if (!response.ok) {
    throw new Error(`ProjectX authentication HTTP error: ${response.status} - ${data.errorMessage || 'Unknown error'}`);
  }

  if (!data.token) {
    throw new Error('No token received from authentication');
  }

  return data as ProjectXAuthResponse;
}

/**
 * Make authenticated request to ProjectX API
 */
async function projectXRequest<T>(
  endpoint: string,
  body: Record<string, any>,
  token: string
): Promise<T> {
  if (!token) {
    throw new Error('ProjectX token not provided');
  }

  const url = `${PROJECTX_API_BASE}${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  console.log('ProjectX API Request:', {
    url,
    method: 'POST',
    headers: {
      ...headers,
      'Authorization': `Bearer ${token.substring(0, 20)}...` // Log partial token for debugging
    },
    body: JSON.stringify(body, null, 2),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  // Read response as text first (can only be read once)
  const responseText = await response.text();
  
  // Log response for debugging
  console.log('ProjectX API Response:', {
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type'),
    bodyLength: responseText.length,
    bodyPreview: responseText.substring(0, 500),
  });
  
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    // If response is not JSON, use the text as error message
    const errorMessage = responseText.trim() || 'No response body';
    if (!response.ok) {
      throw new Error(`ProjectX API error: ${response.status} ${response.statusText} - ${errorMessage}`);
    }
    throw new Error(`ProjectX API error: Invalid JSON response - ${errorMessage}`);
  }
  
  // Check for API-level errors first (even if HTTP status is 200)
  // The API may return 200 OK but with errorCode in the body
  if (data.errorCode !== undefined && data.errorCode !== 0) {
    const errorMsg = data.errorMessage || `ProjectX API error code: ${data.errorCode}`;
    console.error('ProjectX API error:', {
      endpoint,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      httpStatus: response.status,
    });
    throw new Error(errorMsg);
  }

  // Check HTTP status if errorCode check passed
  if (!response.ok) {
    throw new Error(`ProjectX API HTTP error: ${response.status} - ${data.errorMessage || 'Unknown error'}`);
  }

  return data as T;
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

  console.log('ProjectX searchTrades request body:', JSON.stringify(body, null, 2));

  return projectXRequest<ProjectXTradesResponse>(PROJECTX_ENDPOINTS.TRADE_SEARCH, body, token);
}
