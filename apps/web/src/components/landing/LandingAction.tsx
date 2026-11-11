'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';

export function LandingAction({ className }: { className?: string }) {
  const { isSignedIn } = useAuth();
  return <Link className={className} href={isSignedIn ? '/app' : '/sign-up'}>{isSignedIn ? 'Open your journal' : 'Get started'}<span aria-hidden="true">↗</span></Link>;
}
