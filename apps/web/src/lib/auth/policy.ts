/** Only Clerk's server-controlled public metadata grants administrator access. */
export function hasAdminMetadata(metadata: Record<string, unknown> | null | undefined): boolean {
  return metadata?.role === 'admin' || metadata?.isAdmin === true || metadata?.admin === true;
}

/** Reject absent scheduler configuration instead of exposing the retry queue. */
export function hasRetryAuthorization(configuredKey: string | undefined, suppliedKey: string | null): boolean {
  return !!configuredKey && suppliedKey === configuredKey;
}
