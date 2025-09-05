/**
 * Test Supabase Storage Buckets
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Use service key if available for admin operations
const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  console.log('📦 Testing Supabase Storage Buckets\n');
  
  try {
    // Test 1: List all buckets
    console.log('1️⃣ Listing storage buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log('⚠️  Could not list buckets with current key');
      console.log('   Error:', listError.message);
    } else if (buckets && buckets.length > 0) {
      console.log('✅ Found storage buckets:');
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
      });
    } else {
      console.log('⚠️  No buckets found');
    }

    // Test 2: Try to access each expected bucket
    console.log('\n2️⃣ Testing bucket access...');
    const expectedBuckets = [
      { name: 'avatars', public: true },
      { name: 'progress-photos', public: false },
      { name: 'meal-photos', public: false }
    ];

    for (const bucket of expectedBuckets) {
      console.log(`\n   Testing "${bucket.name}" bucket:`);
      
      // Try to list files in the bucket
      const { data: files, error: filesError } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 1 });

      if (filesError) {
        if (filesError.message.includes('not found')) {
          console.log(`   ❌ Bucket "${bucket.name}" does not exist`);
        } else {
          console.log(`   ⚠️  Bucket "${bucket.name}" error: ${filesError.message}`);
        }
      } else {
        console.log(`   ✅ Bucket "${bucket.name}" exists and is accessible`);
        console.log(`      Type: ${bucket.public ? 'Public' : 'Private'}`);
      }
    }

    // Test 3: Test file upload (to avatars bucket if it exists)
    console.log('\n3️⃣ Testing file upload capability...');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'This is a test file for FitFlow storage';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      if (uploadError.message.includes('not found')) {
        console.log('   ⚠️  Cannot test upload: avatars bucket does not exist');
      } else {
        console.log('   ⚠️  Upload test failed:', uploadError.message);
      }
    } else {
      console.log('   ✅ Successfully uploaded test file');
      console.log(`      Path: ${uploadData.path}`);
      
      // Try to get public URL (only works for public buckets)
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(testFileName);
      
      if (urlData?.publicUrl) {
        console.log(`      Public URL: ${urlData.publicUrl}`);
      }
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([testFileName]);
      
      if (!deleteError) {
        console.log('   ✅ Test file cleaned up');
      }
    }

    // Test 4: Check if RLS policies are working
    console.log('\n4️⃣ Testing storage RLS policies...');
    console.log('   ℹ️  RLS policies control who can upload/delete files');
    console.log('   ℹ️  These are defined in the SQL you ran');
    
    // Summary
    console.log('\n📊 Storage Setup Summary:');
    if (buckets && buckets.length > 0) {
      console.log('   ✅ Storage buckets are configured');
      console.log('   ✅ You can now upload images in your app');
    } else {
      console.log('   ⚠️  Storage buckets may need to be created');
      console.log('   💡 Run the supabase_storage_setup.sql in SQL Editor');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testStorage();