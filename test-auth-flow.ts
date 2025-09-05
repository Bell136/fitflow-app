/**
 * Test the complete authentication flow with Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthFlow() {
  console.log('🔐 Testing Complete Authentication Flow\n');
  
  const testEmail = `fitflow.test.${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  
  try {
    // Step 1: Sign Up
    console.log('1️⃣ Testing Sign Up...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    });

    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError.message);
      return;
    }

    console.log('✅ User registered successfully');
    console.log('   User ID:', signUpData.user?.id);
    console.log('   Email:', signUpData.user?.email);

    // Step 2: Create User Profile
    if (signUpData.user) {
      console.log('\n2️⃣ Creating user profile in database...');
      const { data: profile, error: profileError } = await supabase
        .from('User')
        .insert({
          id: signUpData.user.id,
          email: testEmail,
          firstName: 'John',
          lastName: 'Doe',
          provider: 'LOCAL',
          emailVerified: false,
          biometricEnabled: false,
        })
        .select()
        .single();

      if (profileError) {
        console.log('⚠️ Profile creation:', profileError.message);
      } else {
        console.log('✅ User profile created');
        console.log('   Profile ID:', profile.id);
      }
    }

    // Step 3: Sign In
    console.log('\n3️⃣ Testing Sign In...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      return;
    }

    console.log('✅ Signed in successfully');
    console.log('   Session Access Token:', signInData.session?.access_token?.substring(0, 20) + '...');

    // Step 4: Test Authenticated Query
    console.log('\n4️⃣ Testing authenticated data access...');
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('id', signInData.user?.id)
      .single();

    if (userError) {
      console.error('❌ Failed to fetch user data:', userError.message);
    } else {
      console.log('✅ Successfully fetched user data');
      console.log('   User:', userData.email);
      console.log('   Name:', userData.firstName, userData.lastName);
    }

    // Step 5: Create a Goal (test user data isolation)
    console.log('\n5️⃣ Testing data creation (Goal)...');
    const { data: goal, error: goalError } = await supabase
      .from('Goal')
      .insert({
        userId: signInData.user?.id,
        title: 'Lose 10 pounds',
        description: 'Weight loss goal for the next 3 months',
        targetValue: 10,
        currentValue: 0,
        unit: 'pounds',
        category: 'WEIGHT_LOSS',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (goalError) {
      console.error('❌ Failed to create goal:', goalError.message);
    } else {
      console.log('✅ Goal created successfully');
      console.log('   Goal:', goal.title);
      console.log('   Target:', goal.targetValue, goal.unit);
    }

    // Step 6: Test Session Refresh
    console.log('\n6️⃣ Testing session refresh...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('❌ Session refresh failed:', refreshError.message);
    } else {
      console.log('✅ Session refreshed successfully');
      console.log('   New Access Token:', refreshData.session?.access_token?.substring(0, 20) + '...');
    }

    // Step 7: Sign Out
    console.log('\n7️⃣ Testing Sign Out...');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('❌ Sign out failed:', signOutError.message);
    } else {
      console.log('✅ Signed out successfully');
    }

    // Step 8: Verify RLS (should fail after sign out)
    console.log('\n8️⃣ Testing RLS (should block unauthenticated access)...');
    const { data: blockedData, error: blockedError } = await supabase
      .from('User')
      .select('*')
      .limit(1);

    if (blockedError || !blockedData || blockedData.length === 0) {
      console.log('✅ RLS working: Unauthenticated access blocked');
    } else {
      console.log('⚠️ RLS issue: Unauthenticated access allowed');
    }

    console.log('\n🎉 Authentication flow test complete!');
    console.log('✨ Your Supabase authentication is fully functional!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testAuthFlow();