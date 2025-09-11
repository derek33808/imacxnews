// Supabase Storage 诊断工具
export const prerender = false;

import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { supabaseAdmin, STORAGE_BUCKET } from '../../../lib/simpleCloudStorage';

export const GET: APIRoute = async ({ request }) => {
  // Authentication - Only admin can access this
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Access denied - Admin only' 
    }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  const diagnosis = {
    timestamp: new Date().toISOString(),
    environment: import.meta.env.MODE,
    checks: {}
  };

  try {
    // 1. Check environment variables
    console.log('🔍 Checking Supabase environment variables...');
    diagnosis.checks.environmentVariables = {
      SUPABASE_URL: {
        configured: !!import.meta.env.SUPABASE_URL,
        value: import.meta.env.SUPABASE_URL ? import.meta.env.SUPABASE_URL.substring(0, 20) + '...' : null
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        configured: !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
        value: import.meta.env.SUPABASE_SERVICE_ROLE_KEY ? 'sk_live_...' + import.meta.env.SUPABASE_SERVICE_ROLE_KEY.slice(-8) : null
      },
      MAX_IMAGE_SIZE: import.meta.env.MAX_IMAGE_SIZE || '10485760',
      MAX_VIDEO_SIZE: import.meta.env.MAX_VIDEO_SIZE || '52428800'
    };

    // 2. Test Supabase connection
    console.log('🔍 Testing Supabase connection...');
    try {
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
      
      if (bucketsError) {
        diagnosis.checks.connection = {
          status: 'error',
          error: bucketsError.message,
          details: bucketsError
        };
      } else {
        diagnosis.checks.connection = {
          status: 'success',
          buckets: buckets.map(b => ({
            name: b.name,
            public: b.public,
            created: b.created_at
          }))
        };
      }
    } catch (connectionError) {
      diagnosis.checks.connection = {
        status: 'error',
        error: connectionError.message,
        details: connectionError
      };
    }

    // 3. Check storage bucket
    console.log(`🔍 Checking storage bucket: ${STORAGE_BUCKET}...`);
    try {
      const { data: bucketInfo, error: bucketError } = await supabaseAdmin.storage.getBucket(STORAGE_BUCKET);
      
      if (bucketError) {
        diagnosis.checks.bucket = {
          status: 'error',
          bucketName: STORAGE_BUCKET,
          error: bucketError.message,
          details: bucketError
        };
      } else {
        diagnosis.checks.bucket = {
          status: 'success',
          bucketName: STORAGE_BUCKET,
          info: bucketInfo
        };
      }
    } catch (bucketError) {
      diagnosis.checks.bucket = {
        status: 'error',
        bucketName: STORAGE_BUCKET,
        error: bucketError.message,
        details: bucketError
      };
    }

    // 4. Check folder structure
    console.log('🔍 Checking folder structure...');
    try {
      const folders = ['images', 'videos'];
      const folderChecks = {};
      
      for (const folder of folders) {
        try {
          const { data: files, error: listError } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .list(folder, { limit: 1 });
          
          if (listError) {
            folderChecks[folder] = {
              status: 'error',
              error: listError.message
            };
          } else {
            folderChecks[folder] = {
              status: 'accessible',
              fileCount: files ? files.length : 0
            };
          }
        } catch (folderError) {
          folderChecks[folder] = {
            status: 'error',
            error: folderError.message
          };
        }
      }
      
      diagnosis.checks.folders = folderChecks;
    } catch (error) {
      diagnosis.checks.folders = {
        status: 'error',
        error: error.message
      };
    }

    // 5. Test small file upload (text file)
    console.log('🔍 Testing small file upload...');
    try {
      const testContent = `Diagnostic test file - ${new Date().toISOString()}`;
      const testFileName = `test-${Date.now()}.txt`;
      const testPath = `images/test/${testFileName}`;
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(testPath, testContent, {
          contentType: 'text/plain',
          upsert: false
        });
      
      if (uploadError) {
        diagnosis.checks.testUpload = {
          status: 'error',
          error: uploadError.message,
          details: uploadError
        };
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(testPath);
        
        diagnosis.checks.testUpload = {
          status: 'success',
          path: testPath,
          publicUrl: publicUrl
        };
        
        // Clean up test file
        try {
          await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .remove([testPath]);
        } catch (cleanupError) {
          console.log('⚠️ Failed to cleanup test file:', cleanupError);
        }
      }
    } catch (testError) {
      diagnosis.checks.testUpload = {
        status: 'error',
        error: testError.message,
        details: testError
      };
    }

    // 6. Check RLS policies (if possible)
    console.log('🔍 Checking storage policies...');
    try {
      // This is a basic check to see if we can list policies
      // Note: This might not work if the service role doesn't have policy read permissions
      diagnosis.checks.policies = {
        note: 'Policy check requires direct database access - check Supabase dashboard',
        recommendation: 'Ensure storage bucket has appropriate RLS policies for your service role'
      };
    } catch (policyError) {
      diagnosis.checks.policies = {
        status: 'info',
        note: 'Could not check policies programmatically'
      };
    }

    // Generate summary
    const summary = {
      overallStatus: 'unknown',
      issues: [],
      recommendations: []
    };

    // Analyze results
    if (!diagnosis.checks.environmentVariables.SUPABASE_URL.configured) {
      summary.issues.push('SUPABASE_URL not configured');
    }
    if (!diagnosis.checks.environmentVariables.SUPABASE_SERVICE_ROLE_KEY.configured) {
      summary.issues.push('SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    if (diagnosis.checks.connection?.status === 'error') {
      summary.issues.push('Cannot connect to Supabase');
    }
    if (diagnosis.checks.bucket?.status === 'error') {
      summary.issues.push(`Storage bucket "${STORAGE_BUCKET}" not accessible`);
    }
    if (diagnosis.checks.testUpload?.status === 'error') {
      summary.issues.push('Test file upload failed');
    }

    if (summary.issues.length === 0) {
      summary.overallStatus = 'healthy';
      summary.recommendations.push('Storage configuration appears to be working correctly');
    } else {
      summary.overallStatus = 'issues_detected';
      summary.recommendations.push('Review the issues listed above');
      summary.recommendations.push('Check Supabase dashboard for bucket settings and RLS policies');
      summary.recommendations.push('Verify environment variables in Netlify dashboard');
    }

    diagnosis.summary = summary;

    return new Response(JSON.stringify(diagnosis, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Diagnosis failed:', error);
    
    return new Response(JSON.stringify({
      error: 'Diagnosis failed',
      message: error.message,
      details: error,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
