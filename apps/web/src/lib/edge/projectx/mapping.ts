// Contract mapping helpers

import type { ProjectXContract } from '../types';

/**
 * Extract symbol from contract ID
 * e.g., "CON.F.US.MNQ.U25" -> "MNQ"
 */
export function extractSymbol(contractId: string): string {
  const parts = contractId.split('.');
  if (parts.length >= 4) {
    return parts[3]; // e.g., "MNQ" from "CON.F.US.MNQ.U25"
  }
  return contractId;
}

/**
 * Extract expiration from contract ID
 * e.g., "CON.F.US.MNQ.U25" -> "U25" (September 2025)
 */
export function extractExpiration(contractId: string): string {
  const parts = contractId.split('.');
  if (parts.length >= 5) {
    return parts[4]; // e.g., "U25" from "CON.F.US.MNQ.U25"
  }
  return '';
}

/**
 * Get display name for contract
 */
export function getContractDisplayName(contract: ProjectXContract): string {
  return contract.name || contract.id;
}

/**
 * Check if contract is active
 */
export function isActiveContract(contract: ProjectXContract): boolean {
  return contract.activeContract === true;
}

/**
 * Sort contracts: active first, then by name
 */
export function sortContracts(contracts: ProjectXContract[]): ProjectXContract[] {
  return [...contracts].sort((a, b) => {
    if (a.activeContract !== b.activeContract) {
      return a.activeContract ? -1 : 1;
    }
    return (a.name || a.id).localeCompare(b.name || b.id);
  });
}
