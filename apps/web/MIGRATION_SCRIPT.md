# Quick Migration Script

Run these commands to migrate to the new auth system:

```bash
cd apps/web

# 1. Backup existing files
mkdir -p .migration-backup
cp middleware.ts .migration-backup/
cp src/app/(app)/layout.tsx .migration-backup/
cp src/app/admin/layout.tsx .migration-backup/
cp src/app/admin/page.tsx .migration-backup/
cp src/app/auth-redirect/page.tsx .migration-backup/
cp src/app/pricing/page.tsx .migration-backup/
cp -r src/app/api/admin .migration-backup/api/

# 2. Replace files (remove .new extension)
mv middleware.new.ts middleware.ts
mv src/app/(app)/layout.new.tsx src/app/(app)/layout.tsx
mv src/app/admin/layout.new.tsx src/app/admin/layout.tsx
mv src/app/auth-redirect/page.new.tsx src/app/auth-redirect/page.tsx
mv src/app/pricing/page.new.tsx src/app/pricing/page.tsx
mv src/app/api/admin/entitlements.new.ts src/app/api/admin/entitlements/route.ts
mv src/app/api/admin/search.new.ts src/app/api/admin/search/route.ts
mv src/app/api/admin/sync-profile.new.ts src/app/api/admin/sync-profile/route.ts

# 3. Update admin page to use Clerk
cat > src/app/admin/page.tsx << 'EOF'
import { currentUser } from '@clerk/nextjs/server';
import { AdminPanel } from './AdminPanel';

export default async function AdminPage() {
  const user = await currentUser();
  
  if (!user) {
    return <div>Not authenticated</div>;
  }
  
  return (
    <div className="min-h-screen theme-bg p-6">
      <div className="max-w-7xl mx-auto">
        <AdminPanel adminUserId={user.id} />
      </div>
    </div>
  );
}
EOF

# 4. Test the build
npm run build

# 5. If build succeeds, you can optionally delete old files:
# rm -rf src/lib/auth/admin.dev.ts
# rm -rf src/lib/entitlements/route-protection.tsx
# rm -rf src/app/api/admin/login
# rm -rf src/app/api/admin/logout
# rm -rf src/app/admin/login
```

**IMPORTANT**: Before running, make sure to:
1. Set admin role in Clerk Dashboard for your admin user
2. Test in development first
3. Have a rollback plan ready
