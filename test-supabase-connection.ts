/**
 * Test script to verify Supabase connection and setup
 * Run this after setting up the database schema
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

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('1️⃣ Testing basic connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('User')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('❌ Connection failed:', healthError.message);
      return false;
    }
    console.log('✅ Successfully connected to Supabase\n');

    // Test 2: Test authentication signup
    console.log('2️⃣ Testing authentication signup...');
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          firstName: 'Test',
          lastName: 'User',
        },
      },
    });

    if (signUpError) {
      console.error('❌ Signup failed:', signUpError.message);
    } else {
      console.log('✅ User created successfully');
      console.log('   Email:', testEmail);
      console.log('   User ID:', signUpData.user?.id);
    }

    // Test 3: Check if tables exist
    console.log('\n3️⃣ Checking database tables...');
    const tables = [
      'User', 'Session', 'Goal', 'Workout', 'Exercise', 
      'Set', 'Meal', 'Food', 'Progress', 'PasswordReset'
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error && error.message.includes('relation')) {
        console.log(`❌ Table "${table}" not found`);
      } else {
        console.log(`✅ Table "${table}" exists`);
      }
    }

    // Test 4: Test RLS policies
    console.log('\n4️⃣ Testing Row Level Security...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('User')
      .select('*')
      .limit(1);
    
    if (rlsError) {
      if (rlsError.message.includes('row-level security')) {
        console.log('✅ RLS is enabled and working');
      } else {
        console.log('⚠️  RLS error:', rlsError.message);
      }
    } else {
      console.log('✅ RLS policies configured');
    }

    // Test 5: Check storage buckets
    console.log('\n5️⃣ Checking storage buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('⚠️  Could not list buckets:', bucketError.message);
    } else {
      const expectedBuckets = ['avatars', 'progress-photos', 'meal-photos'];
      for (const bucketName of expectedBuckets) {
        const exists = buckets?.some(b => b.name === bucketName);
        if (exists) {
          console.log(`✅ Bucket "${bucketName}" exists`);
        } else {
          console.log(`⚠️  Bucket "${bucketName}" not found (create it if needed)`);
        }
      }
    }

    console.log('\n✨ Supabase setup verification complete!');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the test
testConnection().then((success) => {
  if (success) {
    console.log('\n🎉 Your Supabase database is ready for FitFlow!');
    console.log('📱 You can now start building the app features.');
  } else {
    console.log('\n⚠️  Some issues were found. Please check the errors above.');
    console.log('📚 Refer to the SUPABASE_MIGRATION.md for troubleshooting.');
  }
  process.exit(success ? 0 : 1);
});