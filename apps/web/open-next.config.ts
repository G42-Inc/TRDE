import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// TRDE's authenticated data is fetched dynamically from Supabase. No ISR or
// persistent Next cache is configured, so no additional R2 resources are needed.
export default defineCloudflareConfig();
