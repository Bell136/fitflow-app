# Supabase Migration Guide

## Why Supabase?

Supabase provides a complete backend solution with:
- ✅ Managed PostgreSQL database
- ✅ Built-in authentication with JWT
- ✅ Real-time subscriptions
- ✅ Edge Functions (serverless)
- ✅ Storage for images and files
- ✅ Row Level Security (RLS)
- ✅ Auto-generated APIs

## Migration Steps

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login to your account
3. Click "New Project"
4. Configure:
   - **Project name**: `fitflow`
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to your users
   - **Pricing plan**: Free tier is fine for development

### Step 2: Get Supabase Credentials

After project creation, go to Settings → API:

```env
# Add these to your .env file
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJ... (your anon key)
SUPABASE_SERVICE_KEY=eyJ... (your service role key - keep secret!)
```

### Step 3: Update Prisma Configuration

1. Update your `.env` file with Supabase database URL:
```env
# From Supabase Dashboard → Settings → Database
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

2. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Step 4: Migrate Database Schema

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase
npm run db:push

# Or use migrations for production
npm run db:migrate
```

### Step 5: Enable Row Level Security (RLS)

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordReset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Set" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Meal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Food" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Progress" ENABLE ROW LEVEL SECURITY;

-- Create policies for User table
CREATE POLICY "Users can view own profile" ON "User"
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE USING (auth.uid()::text = id);

-- Create policies for Session table
CREATE POLICY "Users can view own sessions" ON "Session"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own sessions" ON "Session"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own sessions" ON "Session"
  FOR DELETE USING (auth.uid()::text = "userId");

-- Add similar policies for other tables...
```

### Step 6: Migrate Authentication to Supabase Auth

#### Install Supabase Client

```bash
npm install @supabase/supabase-js
```

#### Create Supabase Client

Create `src/services/supabase.client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

#### Update AuthService

Create `src/services/auth.supabase.service.ts`:

```typescript
import { supabase } from './supabase.client'

export class SupabaseAuthService {
  async register(email: string, password: string, metadata?: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    
    if (error) throw error
    return data
  }

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  }

  async loginWithProvider(provider: 'google' | 'apple') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
    })
    
    if (error) throw error
    return data
  }

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) throw error
    return data
  }
}
```

### Step 7: Set Up Storage for Images

1. Go to Supabase Dashboard → Storage
2. Create buckets:
   - `avatars` - for profile pictures
   - `progress-photos` - for progress tracking
   - `meal-photos` - for food images

3. Set bucket policies:

```sql
-- Allow users to upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view avatars
CREATE POLICY "Avatars are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

### Step 8: Update Environment Variables

Complete `.env` for Supabase:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ... # Never expose this to client!

# Database (for Prisma)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### Step 9: Test the Migration

Run your test suite with Supabase:

```bash
# Ensure Supabase connection works
npm test

# Test specific auth features
npm test -- auth.service.test.ts
```

## Benefits After Migration

### What Supabase Handles for You:

1. **Authentication**
   - ✅ JWT token management
   - ✅ Session refresh
   - ✅ Social OAuth (Google, Apple, etc.)
   - ✅ Email verification
   - ✅ Password reset emails
   - ✅ MFA support

2. **Database**
   - ✅ Automatic backups
   - ✅ Connection pooling
   - ✅ SSL certificates
   - ✅ Performance monitoring

3. **Real-time**
   - ✅ Live subscriptions to data changes
   - ✅ Presence (who's online)
   - ✅ Broadcast messages

4. **Security**
   - ✅ Row Level Security (RLS)
   - ✅ Rate limiting
   - ✅ DDoS protection
   - ✅ Encrypted connections

## Migration Checklist

- [ ] Create Supabase project
- [ ] Update environment variables
- [ ] Push Prisma schema to Supabase
- [ ] Enable Row Level Security
- [ ] Create RLS policies
- [ ] Install Supabase client
- [ ] Update AuthService to use Supabase
- [ ] Set up storage buckets
- [ ] Test authentication flow
- [ ] Update tests for Supabase
- [ ] Deploy and test in production

## Code Changes Required

### Files to Update:
1. `src/services/auth.service.ts` → Use Supabase Auth
2. `src/services/supabase.client.ts` → New file
3. `.env` → Add Supabase credentials
4. `package.json` → Add @supabase/supabase-js
5. Tests → Update mocks for Supabase

### Features to Leverage:
1. Replace custom JWT with Supabase Auth
2. Use Supabase Storage for images
3. Enable real-time for live workout tracking
4. Use Edge Functions for AI features
5. Implement Row Level Security

## Rollback Plan

If you need to rollback:
1. Keep original `auth.service.ts` as `auth.service.legacy.ts`
2. Keep local Prisma setup as backup
3. Export data from Supabase if needed
4. Can run locally with Prisma + PostgreSQL

## Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase + React Native](https://supabase.com/docs/guides/getting-started/quickstarts/reactnative)
- [Prisma + Supabase](https://supabase.com/partners/integrations/prisma)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Next Steps**: 
1. Create Supabase project
2. Follow migration steps above
3. Update code to use Supabase Auth
4. Test thoroughly
5. Deploy to production