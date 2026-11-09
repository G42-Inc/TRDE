/**
 * App Routes Layout (Server Component)
 * 
 * Server-side route protection for all app routes.
 * Replaces client-side EntitlementGate to prevent race conditions.
 */

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { DevTools } from '@/components/DevTools';

// App routes layout with server-side protection
export default function AppRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredPlan="basic">
      <AppShell>{children}</AppShell>
      <DevTools />
    </ProtectedRoute>
  );
}
