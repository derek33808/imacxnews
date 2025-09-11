// Storage configuration verification API
export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request }) => {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD
    },
    variables: {},
    supabase: {
      connection: false,
      buckets: [],
      targetBucket: null,
      error: null
    },
    recommendations: []
  };

  try {
    // 1. Check environment variables
    console.log('🔍 Checking Supabase environment variables...');
    
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    const maxImageSize = import.meta.env.MAX_IMAGE_SIZE;
    const maxVideoSize = import.meta.env.MAX_VIDEO_SIZE;
    const enableVideo = import.meta.env.ENABLE_VIDEO_NEWS;
    
    results.variables = {
      SUPABASE_URL: supabaseUrl ? `✅ ${supabaseUrl}` : '❌ Not set',
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? `✅ Set (${supabaseServiceKey.substring(0, 10)}...)` : '❌ Not set',
      MAX_IMAGE_SIZE: maxImageSize || '⚠️ Using default (10MB)',
      MAX_VIDEO_SIZE: maxVideoSize || '⚠️ Using default (50MB)', 
      ENABLE_VIDEO_NEWS: enableVideo || '⚠️ Using default (true)',
    };

    // Add recommendations based on missing variables
    if (!supabaseUrl) {
      results.recommendations.push('Set SUPABASE_URL in Netlify environment variables');
    }
    if (!supabaseServiceKey) {
      results.recommendations.push('Set SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables');
    }

    // 2. Test Supabase connection (only if variables are set)
    if (supabaseUrl && supabaseServiceKey) {
      console.log('🔗 Testing Supabase connection...');
      
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });

        // Test connection by listing buckets
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          results.supabase.error = `Connection failed: ${listError.message}`;
          results.recommendations.push('Check SUPABASE_SERVICE_ROLE_KEY validity');
        } else {
          results.supabase.connection = true;
          results.supabase.buckets = buckets.map(bucket => ({
            name: bucket.name,
            public: bucket.public,
            created_at: bucket.created_at
          }));
          
          // Check for target bucket
          const targetBucket = buckets.find(b => b.name === 'imacx-media');
          if (targetBucket) {
            results.supabase.targetBucket = {
              name: targetBucket.name,
              public: targetBucket.public,
              created_at: targetBucket.created_at,
              status: '✅ Found'
            };
          } else {
            results.supabase.targetBucket = {
              status: '❌ Not found',
              name: 'imacx-media'
            };
            results.recommendations.push('Create "imacx-media" storage bucket in Supabase');
          }

          // Test upload permission
          console.log('🧪 Testing upload permissions...');
          const testPath = `test/config-check-${Date.now()}.txt`;
          const testContent = 'Configuration test file';
          
          const { error: uploadError } = await supabase.storage
            .from('imacx-media')
            .upload(testPath, new Blob([testContent], { type: 'text/plain' }), {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            results.supabase.uploadTest = `❌ Failed: ${uploadError.message}`;
            if (uploadError.message.includes('not found')) {
              results.recommendations.push('Create "imacx-media" storage bucket');
            } else if (uploadError.message.includes('permission') || uploadError.message.includes('policy')) {
              results.recommendations.push('Set up proper RLS policies for storage bucket');
            }
          } else {
            results.supabase.uploadTest = '✅ Success';
            
            // Clean up test file
            await supabase.storage.from('imacx-media').remove([testPath]);
          }
        }
      } catch (connectionError: any) {
        results.supabase.error = `Connection error: ${connectionError.message}`;
        results.recommendations.push('Check network connectivity and Supabase service status');
      }
    } else {
      results.recommendations.push('Configure Supabase environment variables to test connection');
    }

    // 3. Overall status
    const hasRequiredVars = supabaseUrl && supabaseServiceKey;
    const hasConnection = results.supabase.connection;
    const hasBucket = results.supabase.targetBucket?.status === '✅ Found';
    const hasUploadAccess = results.supabase.uploadTest === '✅ Success';

    results.overallStatus = {
      ready: hasRequiredVars && hasConnection && hasBucket && hasUploadAccess,
      score: [hasRequiredVars, hasConnection, hasBucket, hasUploadAccess].filter(Boolean).length,
      maxScore: 4,
      summary: hasRequiredVars && hasConnection && hasBucket && hasUploadAccess 
        ? '✅ All systems ready for file uploads'
        : '⚠️ Configuration incomplete - see recommendations'
    };

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Configuration check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
