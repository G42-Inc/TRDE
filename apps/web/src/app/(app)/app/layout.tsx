// Nested layout for /app routes - no additional checks needed (parent handles it)
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
