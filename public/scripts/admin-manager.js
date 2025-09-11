// 🚀 Enhanced Global Cache Management with Sync Manager

// 🔧 Global error handlers for unhandled promises
window.addEventListener('unhandledrejection', function(event) {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  console.error('Promise:', event.promise);
  
  // Prevent the default behavior (logging to console)
  event.preventDefault();
  
  // Show user-friendly message for certain errors
  if (event.reason && typeof event.reason === 'object') {
    if (event.reason.message && event.reason.message.includes('timeout')) {
      console.warn('⚠️ Request timeout detected - this is usually temporary');
    } else if (event.reason.message && event.reason.message.includes('fetch')) {
      console.warn('⚠️ Network error detected - check connection');
    }
  }
});

window.addEventListener('error', function(event) {
  console.error('🚨 Global Error:', event.error || event.message);
});

// This will be handled by the Cache Sync Manager - legacy function for compatibility
window.clearAllArticleCaches = function() {
  window.debugLog && window.debugLog('🧹 Legacy cache clear function called - delegating to Cache Sync Manager...');
  
  if (window.cacheSyncManager) {
    window.cacheSyncManager.clearAllCaches();
  } else {
    // Fallback to old implementation
    window.debugLog && window.debugLog('⚠️ Cache Sync Manager not available, using fallback...');
    
    const cacheKeys = [
      'imacx_articles',
      'imacx_articles_cache', 
      'category_articles_cache',
      'category_articles_cache_time'
    ];
    
    cacheKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Cleared cache: ${key}`);
      } catch (e) {
        console.warn(`⚠️ Failed to clear cache: ${key}`, e);
      }
    });
    
    if ('caches' in window) {
      caches.delete('api-cache').catch(() => {});
      caches.delete('articles-cache').catch(() => {});
    }
  }
  
  console.log('✨ All article caches cleared successfully');
};

// 🚀 Global force refresh utility for Admin Manager
window.forceRefreshAdminList = async function() {
  console.log('🔄 Global force refresh Admin Manager list triggered...');
  
  // Clear all caches first
  window.clearAllArticleCaches();
  
  // Force refresh if Admin Manager is open
  if (typeof loadArticlesList === 'function') {
    await loadArticlesList(true);
    console.log('✅ Admin Manager list force refreshed');
  } else {
    console.warn('⚠️ loadArticlesList function not available');
  }
};

// Admin Article Manager functionality
// 🔧 立即执行的调试函数
(function() {
  console.log('🚀 Admin Manager Script Loading...');
  
  // 确保全局函数立即可用
  window.debugMediaCenter = function() {
    console.log('🔍 Debug Media Center:');
    console.log('- Media tab exists:', !!document.querySelector('[data-tab="media"]'));
    console.log('- Media tab content exists:', !!document.getElementById('mediaTab'));
    console.log('- Tab system initialized:', !!window.initializeTabSystem);
    console.log('- Media center initialized:', !!window.initializeMediaCenter);
  };
  
  // 立即可用的Media Center点击处理
  window.forceMediaCenterInit = function() {
    console.log('🎯 Force Media Center initialization...');
    setTimeout(() => {
      const mediaTab = document.getElementById('mediaTab');
      if (mediaTab) {
        mediaTab.classList.add('active');
        console.log('✅ Media tab activated');
      }
      
      if (window.initializeMediaCenter) {
        window.initializeMediaCenter();
        console.log('✅ Media center initialized');
      } else {
        console.log('❌ initializeMediaCenter not found');
      }
    }, 100);
  };
})();

document.addEventListener('DOMContentLoaded', function() {
  // 🎨 Initialize enhanced upload animations
  addUploadAnimations();
  
  // 📏 Fetch upload limits from server
  fetchUploadLimits();
  
  const adminManagerModal = document.getElementById('adminManagerModal');
  const closeAdminManagerModalBtn = document.getElementById('closeAdminManagerModal');
  const articlesList = document.getElementById('articlesList');
  const createArticleBtn = document.getElementById('createArticleBtn');

  // Cache mechanism
  let articlesCache = null;
  let cacheTimestamp = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Create/Edit modal elements (created once and reused)
  let formModal;
  let formEl;
  let formTitleEl;
  let submitBtnEl;
  let isEditing = false;
  let editingId = null;
  
  // 📏 Dynamic upload limits (fetched from server)
  let uploadLimits = {
    maxImageSize: 10 * 1024 * 1024, // 10MB default
    maxVideoSize: 50 * 1024 * 1024, // 50MB default (Supabase limit)
    maxImageSizeMB: 10,
    maxVideoSizeMB: 50
  };
  
  // 🔄 Fetch upload limits from server
  async function fetchUploadLimits() {
    try {
      const response = await fetch('/api/media/upload-limits', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          uploadLimits = result.data;
          console.log('📏 Upload limits updated:', uploadLimits);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch upload limits, using defaults:', error);
    }
  }
  // Confirm modal elements
  let confirmModal;
  let confirmResolve;
  
  function ensureFormModal() {
    if (formModal && formTitleEl && formEl && submitBtnEl) {
      console.log('✅ Modal already initialized');
      return; // All elements already initialized
    }
    
    console.log('🔧 Initializing form modal...');
    
    if (formModal) {
      // Modal exists but elements may not be initialized
      console.log('🔄 Re-initializing modal elements...');
      // Clear existing modal to rebuild it properly
      if (document.body.contains(formModal)) {
        document.body.removeChild(formModal);
      }
    }
    
    // Always create fresh modal
    formModal = document.createElement('div');
    formModal.className = 'admin-manager-modal-overlay';
    formModal.innerHTML = `
      <div class="admin-manager-modal">
        <div class="modal-header">
          <h2 id="formTitle">
            <svg style="width:20px;height:20px;display:inline;margin-right:8px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <path d="m9 9 3 3"/>
            </svg>New Article</h2>
          <button class="close-modal" id="closeFormModal" aria-label="Close form modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form id="articleForm" enctype="multipart/form-data">
          <div class="form-section">
            <div class="section-header">
              <svg style="width:19px;height:19px;display:inline;margin-right:10px;" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="9"/>
                <line x1="9" y1="13" x2="15" y2="13"/>
                <line x1="9" y1="17" x2="13" y2="17"/>
              </svg>
              Basic Information
            </div>
            <div class="form-grid">
              <label>
                <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="m18 2 4 4-13 13H5v-4L18 2Z"/>
                  <path d="m9 7 6 6"/>
                </svg>Title
                <input name="title" required placeholder="Enter an engaging title..." />
              </label>
              <label>
                <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>Author
                <input name="author" required placeholder="Author name" />
              </label>
              <label>
                <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>Category
                <div class="custom-select-wrapper">
                  <select name="category" required class="custom-select">
                    <option value="TodayNews">Today News</option>
                    <option value="PastNews">Past News</option>
                  </select>
                  <div class="custom-select-display">
                    <span class="selected-text">Today News</span>
                    <svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                  </div>
                  <div class="custom-options">
                    <div class="custom-option" data-value="TodayNews">
                      <svg class="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      <span>Today News</span>
                    </div>
                    <div class="custom-option" data-value="PastNews">
                      <svg class="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span>Past News</span>
                    </div>
                  </div>
                </div>
              </label>
              <label>
                <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>Publish Date
                <div class="datetime-picker-wrapper">
                  <div class="datetime-input-group">
                    <input type="text" name="publishDate" readonly placeholder="Click to select date and time" class="datetime-picker-input" />
                    <button type="button" class="datetime-picker-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </button>
                  </div>
                  <div class="datetime-picker-dropdown">
                    <div class="datetime-picker-header">
                      <h4>Select Date & Time</h4>
                      <button type="button" class="datetime-picker-close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <div class="datetime-picker-content">
                      <div class="date-section">
                        <input type="date" class="date-input" />
                      </div>
                      <div class="time-section">
                        <input type="time" class="time-input" />
                      </div>
                      <div class="datetime-actions">
                        <button type="button" class="btn-now">Now</button>
                        <button type="button" class="btn-clear">Clear</button>
                        <button type="button" class="btn-confirm">Confirm</button>
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          <div class="form-section">
            <div class="section-header">
              <svg style="width:19px;height:19px;display:inline;margin-right:10px;" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              Media Settings
            </div>
            
            <!-- Media Type Selection -->
            <div class="media-type-selection">
              <label class="media-type-label">
                <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>Content Type
              </label>
              <div class="media-type-options">
                <label class="media-type-option media-type-option-active">
                  <input type="radio" name="mediaType" value="IMAGE" checked>
                  <div class="media-option-content">
                    <svg class="media-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="9" cy="9" r="2"/>
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                    </svg>
                    <span class="media-option-text">Image Article</span>
                  </div>
                </label>
                <label class="media-type-option">
                  <input type="radio" name="mediaType" value="VIDEO">
                  <div class="media-option-content">
                    <svg class="media-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m23 7-6 5 6 5V7z" fill="none"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none"/>
                      <circle cx="8.5" cy="12" r="3" fill="none"/>
                    </svg>
                    <span class="media-option-text">Video Article</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Image Upload Section -->
            <div id="imageUploadSection" class="media-upload-section">
            <label>
              <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>Image URL
              <div style="display:flex; gap:12px; align-items:stretch;">
                <input name="image" placeholder="/images/placeholder.svg" style="flex:1;" />
                  <button type="button" class="upload-media-btn" data-type="image" style="white-space:nowrap; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">Upload Image...</button>
              </div>
                <small style="color:#6b7280;font-size:13px;margin-top:8px;display:block;">Supports JPG, PNG, GIF, WebP (max 10MB)</small>
            </label>
            </div>

            <!-- Video Upload Section -->
            <div id="videoUploadSection" class="media-upload-section" style="display: none;">
              <label>
                <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="m23 7-6 5 6 5V7z" fill="none"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none"/>
                  <circle cx="8.5" cy="12" r="3" fill="none"/>
                </svg>Video URL
                
                <div style="display:flex; gap:12px; align-items:stretch;">
                  <input name="videoUrl" placeholder="Paste video URL or upload file..." style="flex:1; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px;" />
                  <button type="button" class="upload-media-btn" data-type="video" style="white-space:nowrap; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">Upload Video...</button>
                </div>
                
                <small style="color:#6b7280;font-size:13px;margin-top:8px;display:block;">Supports MP4, WebM, OGG (max 50MB) or YouTube/Vimeo URLs</small>
              </label>
              
              <label style="margin-top: 12px;">
                <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>Video Poster (Thumbnail)
                <div style="display:flex; gap:12px; align-items:stretch; margin-top:8px;">
                  <input name="videoPoster" placeholder="Auto-generated from video or custom URL" style="flex:1;" />
                  <button type="button" class="upload-poster-btn" style="white-space:nowrap; background: linear-gradient(135deg, #06b6d4, #0891b2); border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">Upload Poster...</button>
                </div>
                <small style="color:#6b7280;font-size:13px;margin-top:8px;display:block;">Poster image will be auto-generated or you can specify a custom one or upload your own</small>
              </label>
              
              <label style="margin-top: 12px;">
                <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="10,8 16,12 10,16 10,8"/>
                </svg>Video Duration (seconds)
                <input name="videoDuration" type="number" placeholder="Auto-detected from video" style="width: 100%;" />
                <small style="color:#6b7280;font-size:13px;margin-top:8px;display:block;">Duration will be auto-detected during upload</small>
              </label>
              </div>

            <!-- Video Preview -->
            <div id="videoPreviewWrap" style="display:none; gap:16px; align-items:center; margin-top: 16px; padding: 16px; background: rgba(139, 92, 246, 0.05); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);">
              <div id="videoPreview" style="width:160px;height:90px;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#1e293b;">
                <span style="color:#64748b;font-size:12px;">No video selected</span>
              </div>
              <div id="videoPreviewInfo" style="flex: 1;">
                <div id="videoPreviewTitle" style="font-weight: 600; color: #f8fafc; margin-bottom: 4px;">Video Preview</div>
                <div id="videoPreviewDetails" style="font-size: 12px; color: #94a3b8;"></div>
                <button type="button" id="clearVideoBtn" style="margin-top: 8px; padding: 4px 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">Clear Video</button>
              </div>
            </div>
            
            <!-- Poster Preview -->
            <div id="posterPreviewWrap" style="display:none; gap:16px; align-items:center; margin-top: 16px; padding: 16px; background: rgba(6, 182, 212, 0.05); border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.2);">
              <div id="posterPreview" style="width:160px;height:90px;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#1e293b;">
                <span style="color:#64748b;font-size:12px;">No poster selected</span>
              </div>
              <div id="posterPreviewInfo" style="flex: 1;">
                <div id="posterPreviewTitle" style="font-weight: 600; color: #f8fafc; margin-bottom: 4px;">Poster Preview</div>
                <div id="posterPreviewDetails" style="font-size: 12px; color: #94a3b8;"></div>
                <button type="button" id="clearPosterBtn" style="margin-top: 8px; padding: 4px 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">Clear Poster</button>
              </div>
            </div>
            
            <!-- Legacy Media Preview (HIDDEN - replaced by dedicated video/poster previews) -->
            <div id="mediaPreviewWrap" style="display:none !important; gap:16px; align-items:center; margin-top: 16px; padding: 16px; background: rgba(139, 92, 246, 0.05); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);">
              <div id="mediaPreview" style="width:160px;height:90px;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#1e293b;">
                <span style="color:#64748b;font-size:12px;">No media selected</span>
              </div>
              <div id="mediaPreviewInfo" style="flex: 1;">
                <div id="mediaPreviewTitle" style="font-weight: 600; color: #f8fafc; margin-bottom: 4px;"></div>
                <div id="mediaPreviewDetails" style="font-size: 12px; color: #94a3b8;"></div>
                <button type="button" id="clearMediaBtn" style="margin-top: 8px; padding: 4px 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">Clear Media</button>
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <div class="section-header">
              <svg style="width:19px;height:19px;display:inline;margin-right:10px;" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="12" y1="17" x2="8" y2="17"/>
              </svg>
              Content Summary
            </div>
            <label>
              <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>Excerpt
              <textarea name="excerpt" rows="3" required placeholder="Write a compelling short summary..."></textarea>
            </label>
          </div>
          
          <div class="form-section">
            <div class="section-header">
              <svg style="width:19px;height:19px;display:inline;margin-right:10px;" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                <line x1="10" y1="8" x2="16" y2="8"/>
                <line x1="10" y1="12" x2="16" y2="12"/>
              </svg>
              Article Content
            </div>
            <label>
              <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>Content
              <textarea name="content" rows="8" required placeholder="Write your main article content..."></textarea>
            </label>
            
            <label>
              <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a10 10 0 0 1 0 20"/>
                <path d="M2 12h20"/>
                <path d="M8 12c0-2.5 1-5 4-5s4 2.5 4 5-1 5-4 5-4-2.5-4-5z"/>
              </svg>Chinese Content
              <textarea name="chineseContent" rows="6" placeholder="Chinese content (optional)..."></textarea>
            </label>
          </div>
          
          <div class="form-section">
            <div class="section-header">
              <svg style="width:19px;height:19px;display:inline;margin-right:10px;" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
              </svg>
              Article Options
            </div>
            <div class="checkbox-wrapper">
              <input type="checkbox" name="featured" id="featuredCheckbox" />
              <label for="featuredCheckbox">
                <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>Featured Article</label>
            </div>
          </div>
          
          <div id="formError" class="error-message"></div>
          
          <div class="form-actions">
            <button type="button" id="cancelFormBtn">Cancel</button>
            <button type="submit" id="submitFormBtn">
              <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>Save Article</button>
          </div>
        </form>
      </div>
    `;
    if (!document.body.contains(formModal)) {
      document.body.appendChild(formModal);
    }
    
    // 🔧 Enhanced element initialization with safety checks
    formEl = formModal.querySelector('#articleForm');
    formTitleEl = formModal.querySelector('#formTitle');
    submitBtnEl = formModal.querySelector('#submitFormBtn');
    const closeBtn = formModal.querySelector('#closeFormModal');
    const cancelBtn = formModal.querySelector('#cancelFormBtn');
    
    // Verify all critical elements were found
    if (!formEl || !formTitleEl || !submitBtnEl) {
      console.error('❌ Critical modal elements not found:', {
        formEl: !!formEl,
        formTitleEl: !!formTitleEl,
        submitBtnEl: !!submitBtnEl,
        modalInDOM: document.body.contains(formModal)
      });
      
      // Try to find elements again with more specific selectors
      setTimeout(() => {
        formEl = document.querySelector('#articleForm');
        formTitleEl = document.querySelector('#formTitle');
        submitBtnEl = document.querySelector('#submitFormBtn');
        
        console.log('🔄 Retry element search:', {
          formEl: !!formEl,
          formTitleEl: !!formTitleEl,
          submitBtnEl: !!submitBtnEl
        });
      }, 100);
      
      throw new Error('Modal initialization failed: Missing critical elements');
    }
    
    console.log('✅ Modal elements initialized successfully:', {
      formEl: !!formEl,
      formTitleEl: !!formTitleEl,
      submitBtnEl: !!submitBtnEl
    });
    
    const close = () => { formModal.classList.remove('active'); document.body.style.overflow = ''; };
    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);
    formModal.addEventListener('click', (e) => { if (e.target === formModal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && formModal.classList.contains('active')) close(); });
    
    // 🎯 Initialize tab system
    if (window.initializeTabSystem) {
      window.initializeTabSystem();
    }
    
    // 🎥 Initialize new media upload functionality
    if (window.initializeMediaUpload) {
      window.initializeMediaUpload(formEl);
    }
    
    // Handle local image upload when file selected (legacy support)
    const fileInput = formEl.querySelector('input[name="imageFile"]');
    const imageUrlInput = formEl.querySelector('input[name="image"]');
    const imagePreview = formEl.querySelector('#mediaPreview');
    const imagePreviewWrap = formEl.querySelector('#mediaPreviewWrap');
    const imagePreviewText = formEl.querySelector('#mediaPreviewTitle');
    const triggerFileBtn = formEl.querySelector('#triggerFileSelectBtn');
    if (triggerFileBtn && fileInput) {
      triggerFileBtn.addEventListener('click', () => fileInput.click());
    }

    // Update image preview function
    function updateImagePreview(url = '') {
      const trimmedUrl = url.trim();
      console.log('🖼️ Updating image preview with URL:', trimmedUrl);
      
      // 🔧 Safety check: get elements dynamically to avoid null reference  
      const currentImagePreview = formEl ? formEl.querySelector('#mediaPreview') : document.querySelector('#mediaPreview');
      const currentImagePreviewWrap = formEl ? formEl.querySelector('#mediaPreviewWrap') : document.querySelector('#mediaPreviewWrap');
      
      if (!currentImagePreview) {
        console.warn('⚠️ imagePreview element not found, skipping image preview update');
        return;
      }
      
      if (!trimmedUrl) {
        // Show placeholder
        currentImagePreview.innerHTML = `
          <svg style="width:32px;height:32px;color:#9ca3af;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          <span style="font-size:10px;color:#9ca3af;margin-top:4px;">No preview image</span>`;
        currentImagePreview.style.cssText = 'width:160px;height:90px;border:2px dashed #d1d5db;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f9fafb;';
        if (currentImagePreviewWrap) {
          currentImagePreviewWrap.style.display = 'none';
        }
        return;
      }
      
      // Create and configure image element
      const img = document.createElement('img');
      img.src = trimmedUrl;
      img.alt = 'Preview';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:6px;';
      
      // Handle successful load
      img.onload = function() {
        console.log('✅ Image loaded successfully:', trimmedUrl);
        if (currentImagePreview) {
          currentImagePreview.innerHTML = '';
          currentImagePreview.appendChild(img);
          currentImagePreview.style.cssText = 'width:160px;height:90px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;';
        }
        if (currentImagePreviewWrap) {
          currentImagePreviewWrap.style.display = 'flex';
        }
      };
      
      // Handle load error
      img.onerror = function() {
        console.log('❌ Image failed to load:', trimmedUrl);
        if (currentImagePreview) {
          currentImagePreview.innerHTML = `
            <svg style="width:32px;height:32px;color:#ef4444;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span style="font-size:10px;color:#ef4444;margin-top:4px;">Failed to load</span>`;
          currentImagePreview.style.cssText = 'width:160px;height:90px;border:2px dashed #fca5a5;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fef2f2;';
        }
        if (currentImagePreviewWrap) {
          currentImagePreviewWrap.style.display = 'flex';
        }
      };
      
      // Show loading state initially
      if (currentImagePreview) {
        currentImagePreview.innerHTML = `
          <svg style="width:24px;height:24px;color:#8b5cf6;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          <span style="font-size:10px;color:#8b5cf6;margin-top:4px;">Loading...</span>`;
        currentImagePreview.style.cssText = 'width:160px;height:90px;border:1px solid #d1d5db;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f9fafb;';
      }
      if (currentImagePreviewWrap) {
        currentImagePreviewWrap.style.display = 'flex';
      }
    }
    
    // Expose function for edit form usage
    window.updateImagePreview = updateImagePreview;
    
    // Initialize custom select component
    initializeCustomSelect();
    
    // Initialize datetime picker component
    initializeDateTimePicker();

    // Image URL validation and preview update
    if (imageUrlInput) {
      // Listen for input changes to update preview in real-time
      imageUrlInput.addEventListener('input', function() {
        // Disabled to prevent third preview: updateImagePreview(this.value);
      });
      
      imageUrlInput.addEventListener('blur', function() {
        const value = this.value.trim();
        if (value && (value.includes('example.com') || value.includes('placeholder.com') || (!value.startsWith('http') && !value.startsWith('/')))) {
          this.value = '/images/placeholder.svg';
          alert('Please enter a valid image URL (starting with http/https) or use the local upload feature');
          // Disabled: updateImagePreview(this.value);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        if (!fileInput.files || fileInput.files.length === 0) return;
        const file = fileInput.files[0];
        
        // Show preview immediately with uploaded file
        const fileUrl = URL.createObjectURL(file);
        // Disabled: updateImagePreview(fileUrl);
        
        try {
          // Show enhanced upload progress
          showLegacyImageUploadProgress(file.name, file.size);
          
          const fd = new FormData();
          fd.append('file', file);
          // Try to derive slug from title
          const titleVal = formEl.querySelector('[name="title"]').value || 'image';
          const categoryVal = formEl.querySelector('[name="category"]').value || 'uploads';
          fd.append('slug', titleVal);
          fd.append('category', categoryVal);
          
          // Use XMLHttpRequest for progress tracking
          const result = await uploadLegacyImageWithProgress('/api/upload', fd);
          
          if (imageUrlInput) {
            imageUrlInput.value = result.url;
            // Update preview with server URL
            // Disabled: updateImagePreview(result.url);
          }
          
          // Show success message with enhanced UI
          showLegacyImageUploadSuccess(result.name || 'image');
          
          // Clean up blob URL
          URL.revokeObjectURL(fileUrl);
        } catch (err) {
          console.error('Upload error', err);
          showLegacyImageUploadError(err.message || 'Upload failed, please try again');
          // Show error state
          // Disabled: updateImagePreview('');
          URL.revokeObjectURL(fileUrl);
        }
      });
    }

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = formModal.querySelector('#formError');
      errEl.style.display = 'none';
      errEl.textContent = '';
      const fd = new FormData(formEl);
      // 🎥 Get video URL directly from the unified input field
      let videoUrl = String(fd.get('videoUrl') || '').trim();
      
      const data = {
        title: String(fd.get('title') || ''),
        author: String(fd.get('author') || ''),
        category: String(fd.get('category') || ''),
        image: String(fd.get('image') || ''),
        excerpt: String(fd.get('excerpt') || ''),
        content: String(fd.get('content') || ''),
        chineseContent: String(fd.get('chineseContent') || ''),
        featured: Boolean(fd.get('featured')),
        publishDate: fd.get('publishDate') ? String(fd.get('publishDate')) : undefined,
        // 🎥 Include media type and video-related fields
        mediaType: String(fd.get('mediaType') || 'IMAGE'),
        videoUrl: videoUrl,
        videoPoster: String(fd.get('videoPoster') || ''), // 🖼️ Include video poster field
        videoDuration: fd.get('videoDuration') ? Number(fd.get('videoDuration')) : null
      };
      
      // 🐛 Debug logging for media type
      console.log('📋 Article submission data:', {
        title: data.title,
        mediaType: data.mediaType,
        videoUrl: data.videoUrl,
        videoPoster: data.videoPoster, // 🖼️ Log poster data
        hasVideo: !!data.videoUrl,
        hasPoster: !!data.videoPoster,
        image: data.image
      });
      if (!data.title.trim() || !data.author.trim() || !data.excerpt.trim() || !data.content.trim()) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.style.display = 'block';
        return;
      }
      try {
        submitBtnEl.disabled = true;
        // Enhanced Save button with progress indicator
        showSaveProgress(submitBtnEl, 'Saving article...');
        const url = isEditing ? `/api/articles/${editingId}` : '/api/articles';
        const method = isEditing ? 'PATCH' : 'POST';
        const resp = await fetch(url, { 
          method, 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(data),
          credentials: 'include'  // 🔑 Include cookies for authentication
        });
        if (!resp.ok) {
          let msg = 'Failed to save article.';
          let isAuthError = false;
          try { 
            const j = await resp.json(); 
            if (j && j.error) msg = j.error; 
          } catch {}
          
          if (resp.status === 401 || resp.status === 403) {
            msg = 'Authentication failed. Please login as admin again.';
            isAuthError = true;
          }
          
          const error = new Error(msg);
          error.isAuthError = isAuthError;
          throw error;
        }
        
        console.log(`📝 Article ${isEditing ? 'updated' : 'created'} successfully`);
        
        // 🚀 NEW ENHANCED CACHE SYNC: Use Cache Sync Manager
        console.log('🔄 Triggering Cache Sync Manager for article operation...');
        
        // Clear local cache variables
        articlesCache = null;
        cacheTimestamp = 0;
        
        // Close modal first to improve UX
        close();
        
        // 📡 Trigger Cache Sync Manager events (will handle all cache clearing and syncing)
        const eventType = isEditing ? 'articleUpdated' : 'articleCreated';
        const eventDetail = { 
          articleId: resp.data?.id || resp.id || null,
          type: eventType,
          timestamp: Date.now()
        };
        
        console.log(`📢 Dispatching ${eventType} event with detail:`, eventDetail);
        window.dispatchEvent(new CustomEvent(eventType, { detail: eventDetail }));
        
        // Cache Sync Manager will handle the rest, but we still ensure local refresh
        try {
          console.log('⏱️ Allowing Cache Sync Manager to process...');
          await new Promise(resolve => setTimeout(resolve, 200)); // Reduced delay - Cache Sync Manager handles timing
          
          // Verify refresh with cache consistency check
          if (window.cacheSyncManager) {
            const syncStatus = await window.cacheSyncManager.checkCacheConsistency();
            console.log('🔍 Cache consistency status:', syncStatus);
            
            if (!syncStatus) {
              console.log('⚠️ Cache inconsistency detected, forcing additional refresh...');
              await loadArticlesList(true);
            }
          } else {
            // Fallback to original method
            console.log('⚠️ Cache Sync Manager not available, using fallback refresh...');
            await loadArticlesList(true);
            if (!isEditing) {
              await new Promise(resolve => setTimeout(resolve, 100));
              await loadArticlesList(true);
            }
          }
          
        } catch (refreshError) {
          console.error('⚠️ Refresh error:', refreshError);
          // Force database sync as last resort
          if (window.triggerDatabaseSync) {
            console.log('🔄 Attempting emergency database sync...');
            await window.triggerDatabaseSync();
            await loadArticlesList(true);
          } else {
            console.log('🔄 Final fallback: Reloading page...');
            window.location.reload();
            return;
          }
        }
        
        // Show success message AFTER all refresh operations
        alert(`Article ${isEditing ? 'updated' : 'created'} successfully!`);
        console.log('✅ Article operation completed successfully');
      } catch (err) {
        console.error('Save error', err);
        errEl.textContent = err.message || 'Network error, please try again.';
        errEl.style.display = 'block';
        
        // Show specific error for authentication issues
        if (err.isAuthError || err.message.includes('login') || err.message.includes('Authentication')) {
          errEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
              <div>🔒 Authentication failed. Please login again to save articles.</div>
              <div style="display: flex; gap: 8px;">
                <button type="button" id="authErrorLoginBtn" style="
                  padding: 8px 16px; 
                  background: #3b82f6; 
                  color: white; 
                  border: none; 
                  border-radius: 6px; 
                  font-size: 12px; 
                  cursor: pointer;
                  transition: background 0.2s ease;
                ">
                  🔑 Login Now
                </button>
                <button type="button" id="authErrorRefreshBtn" style="
                  padding: 8px 16px; 
                  background: #6b7280; 
                  color: white; 
                  border: none; 
                  border-radius: 6px; 
                  font-size: 12px; 
                  cursor: pointer;
                  transition: background 0.2s ease;
                ">
                  Refresh Page
                </button>
              </div>
            </div>
          `;
          
          // Add event listeners for auth error buttons
          setTimeout(() => {
            const loginBtn = document.getElementById('authErrorLoginBtn');
            const refreshBtn = document.getElementById('authErrorRefreshBtn');
            
            if (loginBtn) {
              loginBtn.addEventListener('click', function() {
                console.log('Opening login modal...');
                try {
                  if (window.openLoginModal) {
                    window.openLoginModal();
                  } else {
                    console.error('openLoginModal not found');
                    alert('Login modal not available, refreshing page...');
                    window.location.reload();
                  }
                } catch (e) {
                  console.error('Login modal error:', e);
                  window.location.reload();
                }
              });
              
              // Add hover effects
              loginBtn.addEventListener('mouseenter', function() {
                this.style.background = '#2563eb';
              });
              loginBtn.addEventListener('mouseleave', function() {
                this.style.background = '#3b82f6';
              });
            }
            
            if (refreshBtn) {
              refreshBtn.addEventListener('click', function() {
                console.log('Refreshing page...');
                window.location.reload();
              });
              
              // Add hover effects
              refreshBtn.addEventListener('mouseenter', function() {
                this.style.background = '#4b5563';
              });
              refreshBtn.addEventListener('mouseleave', function() {
                this.style.background = '#6b7280';
              });
            }
          }, 100);
        }
      } finally {
        // 🔧 Always reset button state using enhanced UI
        showSaveSuccess(submitBtnEl, isEditing ? 'Update Article' : 'Save Article');
      }
    });
  }
  
  // 📊 Enhanced Legacy Image Upload Functions
  async function uploadLegacyImageWithProgress(url, formData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      // Track upload progress with speed calculation
      xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
          const currentTime = Date.now();
          const timeDiff = currentTime - lastTime;
          const loadedDiff = event.loaded - lastLoaded;
          
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          
          // Calculate speed and ETA (only if enough time has passed for accurate calculation)
          let speed = 0;
          let eta = 0;
          if (timeDiff > 100 && loadedDiff > 0) { // Update every 100ms minimum
            speed = (loadedDiff * 1000) / timeDiff; // bytes per second
            const remainingBytes = event.total - event.loaded;
            eta = Math.round(remainingBytes / speed); // seconds remaining
            
            lastLoaded = event.loaded;
            lastTime = currentTime;
          }
          
          updateLegacyImageProgress(percentComplete, speed, eta, event.loaded, event.total);
        }
      };

      // Handle completion
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          // Try to extract error message from server response
          let errorMessage = `Upload failed with status: ${xhr.status}`;
          try {
            const errorResult = JSON.parse(xhr.responseText);
            if (errorResult && errorResult.error) {
              errorMessage = errorResult.error;
            } else if (errorResult && errorResult.message) {
              errorMessage = errorResult.message;
            }
          } catch (parseError) {
            // If we can't parse the response, use the response text directly if it looks like an error message
            if (xhr.responseText && xhr.responseText.length < 200 && !xhr.responseText.includes('<')) {
              errorMessage = xhr.responseText;
            }
          }
          reject(new Error(errorMessage));
        }
      };

      // Handle errors
      xhr.onerror = function() {
        reject(new Error('Upload failed due to network error'));
      };

      // Start upload
      xhr.open('POST', url);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }
  
  function showLegacyImageUploadProgress(fileName, fileSize) {
    const imagePreviewText = document.querySelector('#mediaPreviewTitle');
    if (imagePreviewText) {
      const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
      imagePreviewText.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg style="width:16px;height:16px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span style="color: #3b82f6; font-weight: 500;">Uploading...</span>
          </div>
          <div style="width: 100%; text-align: center;">
            <div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">${fileName} (${fileSizeMB} MB)</div>
            <div class="legacy-progress-container" style="width: 100%; height: 6px; background: rgba(59, 130, 246, 0.1); border-radius: 3px; overflow: hidden;">
              <div class="legacy-progress-bar" style="height: 100%; background: linear-gradient(90deg, #3b82f6, #1d4ed8); width: 0%; transition: width 0.3s ease; border-radius: 3px;"></div>
            </div>
            <span class="legacy-progress-text" style="font-size: 12px; color: #6b7280; margin-top: 4px; display: block;">0%</span>
          </div>
        </div>
      `;
    }
  }
  
  function updateLegacyImageProgress(percentage, speed = 0, eta = 0, loaded = 0, total = 0) {
    const progressBar = document.querySelector('.legacy-progress-bar');
    const progressText = document.querySelector('.legacy-progress-text');
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      
      // Add shimmer effect for visual appeal
      if (percentage > 0 && percentage < 100) {
        progressBar.classList.add('progress-bar-shimmer');
      } else {
        progressBar.classList.remove('progress-bar-shimmer');
      }
    }
    
    if (progressText) {
      let statusText = `${percentage}%`;
      
      // Add speed and ETA information if available
      if (speed > 0 && eta > 0 && percentage > 5) { // Only show after 5% to allow speed calculation
        const speedMBps = (speed / 1024 / 1024).toFixed(1);
        const loadedMB = (loaded / 1024 / 1024).toFixed(1);
        const totalMB = (total / 1024 / 1024).toFixed(1);
        
        // Format ETA
        let etaText = '';
        if (eta < 60) {
          etaText = `${eta}s`;
        } else {
          const minutes = Math.floor(eta / 60);
          const seconds = eta % 60;
          etaText = `${minutes}m ${seconds}s`;
        }
        
        statusText = `${percentage}% • ${speedMBps} MB/s • ${etaText} remaining`;
        
        // Update file size info as well
        const sizeInfo = document.querySelector('.legacy-progress-text').parentNode.querySelector('div');
        if (sizeInfo && sizeInfo.style.fontSize === '13px') {
          sizeInfo.innerHTML = `${sizeInfo.textContent.split(' (')[0]} • ${loadedMB}/${totalMB} MB`;
        }
      }
      
      progressText.textContent = statusText;
    }
  }
  
  function showLegacyImageUploadSuccess(fileName) {
    const imagePreviewText = document.querySelector('#mediaPreviewTitle');
    if (imagePreviewText) {
      imagePreviewText.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; padding: 12px; color: #10b981;">
          <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span style="font-weight: 500;">Uploaded: ${fileName}</span>
        </div>
      `;
      
      // Reset to normal after 3 seconds
      setTimeout(() => {
        if (imagePreviewText) {
          imagePreviewText.textContent = fileName;
        }
      }, 3000);
    }
  }
  
  function showLegacyImageUploadError(errorMessage) {
    const imagePreviewText = document.querySelector('#mediaPreviewTitle');
    if (imagePreviewText) {
      imagePreviewText.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; padding: 12px; color: #ef4444;">
          <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span style="font-weight: 500;">${errorMessage}</span>
        </div>
      `;
    }
  }
  
  // 📝 Enhanced Save Button Functions
  function showSaveProgress(submitBtn, message) {
    if (submitBtn) {
      submitBtn.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
          <svg style="width:16px;height:16px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span>${message}</span>
        </div>
      `;
    }
  }
  
  function showSaveSuccess(submitBtn, originalText) {
    if (submitBtn) {
      // Show success animation
      submitBtn.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
          <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>Saved!</span>
        </div>
      `;
      
      // Reset to original text after 2 seconds
      setTimeout(() => {
        if (submitBtn) {
          submitBtn.innerHTML = `
            <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/>
            <polyline points="7,3 7,8 15,8"/>
            </svg>${originalText}
          `;
          submitBtn.disabled = false;
        }
      }, 2000);
    }
  }

  // 🎨 Add CSS animations for enhanced upload experience
  function addUploadAnimations() {
    if (!document.querySelector('#upload-animations-css')) {
      const style = document.createElement('style');
      style.id = 'upload-animations-css';
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes progress-shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        
        .upload-success-animation {
          animation: pulse 0.6s ease-in-out;
        }
        
        .progress-bar-shimmer {
          background: linear-gradient(90deg, #3b82f6, #1d4ed8, #3b82f6);
          background-size: 200px 100%;
          animation: progress-shimmer 1.5s infinite;
        }
        
        @keyframes errorSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function ensureConfirmModal() {
    if (confirmModal) return;
    confirmModal = document.createElement('div');
    confirmModal.className = 'confirm-modal-overlay';
    confirmModal.innerHTML = `
      <div class="confirm-modal">
        <div class="confirm-header">
          <h3>Confirm Delete</h3>
          <button class="close-modal" id="closeConfirmModal" aria-label="Close confirm modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="confirm-body">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <p id="confirmMessage">This action cannot be undone. Are you sure?</p>
        </div>
        <div class="confirm-actions">
          <button class="btn-cancel" id="confirmCancelBtn">Cancel</button>
          <button class="btn-danger" id="confirmOkBtn">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(confirmModal);

    const closeBtn = confirmModal.querySelector('#closeConfirmModal');
    const cancelBtn = confirmModal.querySelector('#confirmCancelBtn');
    const okBtn = confirmModal.querySelector('#confirmOkBtn');

    const close = (result) => {
      confirmModal.classList.remove('active');
      document.body.style.overflow = '';
      if (confirmResolve) { confirmResolve(result); confirmResolve = null; }
    };

    closeBtn.addEventListener('click', () => close(false));
    cancelBtn.addEventListener('click', () => close(false));
    okBtn.addEventListener('click', () => close(true));
    confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) close(false); });
    document.addEventListener('keydown', (e) => {
      if (confirmModal && confirmModal.classList.contains('active')) {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter') close(true);
      }
    });
  }

  function openConfirmModal(message) {
    ensureConfirmModal();
    const msgEl = confirmModal.querySelector('#confirmMessage');
    if (msgEl) msgEl.textContent = message || 'Are you sure you want to proceed?';
    confirmModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    return new Promise((resolve) => { confirmResolve = resolve; });
  }
  
  function openCreateForm() {
    ensureFormModal();
    isEditing = false;
    editingId = null;
    
    // 🔧 Safe innerHTML update with null check
    if (formTitleEl) {
      formTitleEl.innerHTML = `
        <svg style="width:20px;height:20px;display:inline;margin-right:8px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 3 22l1.5-4.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>New Article`;
    } else {
      console.error('❌ formTitleEl is null in openCreateForm');
    }
    
    if (formEl) {
      formEl.reset();
    } else {
      console.error('❌ formEl is null in openCreateForm');
    }
    
    if (formModal) {
      formModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      console.error('❌ formModal is null in openCreateForm');
    }
    
    // Initialize image preview for new form
    // Disabled legacy image preview initialization
    // if (window.updateImagePreview) {
    //   window.updateImagePreview('');
    // }
  }
  
  function toDatetimeLocalValue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}`;
  }
  
  async function openEditForm(article) {
    try {
      ensureFormModal();
      
      // 🔧 Wait a moment for DOM to settle if needed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 🔧 Enhanced safety checks for DOM elements
      if (!formTitleEl || !formEl || !formModal) {
        console.error('❌ Modal elements not properly initialized');
        
        // Try one more time with fresh initialization
        console.log('🔄 Attempting fresh modal initialization...');
        try {
          // Reset variables
          formModal = null;
          formTitleEl = null;
          formEl = null;
          submitBtnEl = null;
          
          ensureFormModal();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (!formTitleEl || !formEl || !formModal) {
            alert('Error: Modal not properly initialized. Please refresh the page.');
            return;
          }
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError);
          alert('Error: Modal initialization failed. Please refresh the page.');
          return;
        }
      }
      
      isEditing = true;
      editingId = article.id;
      
      // 🔧 Safe innerHTML update with null check
      if (formTitleEl) {
        formTitleEl.innerHTML = `
          <svg style="width:20px;height:20px;display:inline;margin-right:8px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 3 22l1.5-4.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>Edit Article`;
      } else {
        console.error('❌ formTitleEl is null, cannot set title');
      }
      formEl.reset();
      formModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    
      // Show loading state with safety checks (moved to outer scope for error handling)
      const contentField = formEl.querySelector('[name="content"]');
      const chineseContentField = formEl.querySelector('[name="chineseContent"]');
      
      if (!contentField || !chineseContentField) {
        console.error('❌ Content fields not found in form');
        alert('Error: Form fields not properly initialized. Please refresh the page.');
        return;
      }
      
      contentField.value = 'Loading...';
      chineseContentField.value = 'Loading...';
      
      console.log(`🔄 Loading article details for ID: ${article.id}`);
      
      // 🔧 Pre-flight check: Verify API is accessible (with manual timeout)
      try {
        const healthCheckPromise = fetch('/api/health', { 
          credentials: 'include'
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), 5000);
        });
        
        const healthCheck = await Promise.race([healthCheckPromise, timeoutPromise]);
        if (!healthCheck.ok) {
          throw new Error('API server is not responding');
        }
        console.log('✅ API server is healthy');
      } catch (healthError) {
        console.warn('⚠️ API health check failed:', healthError.message);
        // Don't throw here - continue with article fetch attempt
        console.log('🔄 Proceeding with article fetch despite health check failure...');
      }
      
      // Get complete article data (including content and chineseContent)
      const fetchPromise = fetch(`/api/articles/${article.id}`, {
        credentials: 'include'  // 🔑 Include cookies for authentication
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Article fetch timeout')), 10000);
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const choice = confirm('Authentication failed. You need to login again to edit articles.\n\nClick OK to open login window, or Cancel to refresh the page.');
          if (choice) {
            if (window.openLoginModal) {
              window.openLoginModal();
            } else {
              window.location.reload();
            }
          } else {
            window.location.reload();
          }
          return;
        }
        throw new Error('Failed to fetch article details');
      }
      
      const fullArticle = await response.json();
      
      // Fill form fields
      formEl.querySelector('[name="title"]').value = fullArticle.title || '';
      formEl.querySelector('[name="author"]').value = fullArticle.author || '';
      formEl.querySelector('[name="category"]').value = fullArticle.category || 'TodayNews';
      
      // 🎥 Handle media type and show appropriate sections FIRST
      const mediaType = fullArticle.mediaType || 'IMAGE';
      const mediaTypeInput = formEl.querySelector(`input[name="mediaType"][value="${mediaType}"]`);
      if (mediaTypeInput) {
        mediaTypeInput.checked = true;
        
        // Trigger change event to show/hide appropriate sections
        const changeEvent = new Event('change', { bubbles: true });
        mediaTypeInput.dispatchEvent(changeEvent);
        
        console.log('✅ Media type set to:', mediaType);
      }
      
      // Wait a moment for the media type change to take effect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Filter out invalid URLs like 'VIDEO', 'IMAGE' strings
      const isValidImageUrl = (url) => {
        return url && typeof url === 'string' && url !== 'VIDEO' && url !== 'IMAGE' && (url.startsWith('http') || url.startsWith('/'));
      };
      
      // 🖼️ Handle poster/image fields based on media type
      const videoPosterInput = formEl.querySelector('[name="videoPoster"]');
      const imageInput = formEl.querySelector('[name="image"]');
      
      console.log('🖼️ Poster loading debug:', {
        videoPoster: fullArticle.videoPoster,
        image: fullArticle.image,
        mediaType: fullArticle.mediaType,
        videoUrl: fullArticle.videoUrl,
        videoPosterInputExists: !!videoPosterInput,
        imageInputExists: !!imageInput
      });
      
      if (mediaType === 'VIDEO') {
        // For video articles, set both videoPoster and image fields
        if (videoPosterInput) {
          const validVideoPoster = isValidImageUrl(fullArticle.videoPoster) ? fullArticle.videoPoster : '';
          videoPosterInput.value = validVideoPoster;
          console.log('✅ Set videoPoster input value:', validVideoPoster);
        }
        if (imageInput) {
          // For video articles, image field should also have the poster for compatibility
          const fallbackImage = isValidImageUrl(fullArticle.videoPoster) ? fullArticle.videoPoster : 
                                isValidImageUrl(fullArticle.image) ? fullArticle.image : '';
          imageInput.value = fallbackImage;
          console.log('✅ Set image input value for VIDEO article:', fallbackImage);
        }
        
        // Show poster preview if available
        const validVideoPoster = isValidImageUrl(fullArticle.videoPoster) ? fullArticle.videoPoster : null;
        if (validVideoPoster) {
          const mediaData = {
            url: validVideoPoster,
            originalName: 'Existing Poster',
            mediaType: 'IMAGE',
            size: 0
          };
          console.log('🖼️ Showing poster preview:', mediaData);
          showPosterPreview(mediaData);
        }
      } else {
        // For image articles, just set image field
        if (imageInput) {
          const validImage = isValidImageUrl(fullArticle.image) ? fullArticle.image : '';
          imageInput.value = validImage;
          console.log('✅ Set image input value for IMAGE article:', validImage);
        }
      }
      
      formEl.querySelector('[name="excerpt"]').value = fullArticle.excerpt || '';
      contentField.value = fullArticle.content || '';
      chineseContentField.value = fullArticle.chineseContent || '';
      formEl.querySelector('[name="featured"]').checked = !!fullArticle.featured;
      const pd = formEl.querySelector('[name="publishDate"]');
      pd.value = toDatetimeLocalValue(fullArticle.publishDate);
      
      // Media type is already handled above
      
      // 🎥 Fill video-specific fields if media type is VIDEO
      if (mediaType === 'VIDEO') {
        const videoUrlInput = formEl.querySelector('[name="videoUrl"]');
        const videoDurationInput = formEl.querySelector('[name="videoDuration"]');
        
        if (videoUrlInput && fullArticle.videoUrl) {
          videoUrlInput.value = fullArticle.videoUrl;
          console.log('✅ Video URL loaded into input:', fullArticle.videoUrl);
          
          // Show video preview immediately
          const videoMediaData = {
            url: fullArticle.videoUrl,
            originalName: 'Existing Video',
            mediaType: 'VIDEO',
            size: 0,
            duration: fullArticle.videoDuration
          };
          showVideoPreview(videoMediaData);
        }
        
        if (videoDurationInput && fullArticle.videoDuration) {
          videoDurationInput.value = fullArticle.videoDuration;
          console.log('✅ Video duration loaded:', fullArticle.videoDuration);
        }
      }
      
      // Update media preview for editing (already handled above)
      // const imageInput = formEl.querySelector('[name="image"]');
      // if (imageInput && window.updateImagePreview) {
      //   window.updateImagePreview(posterImage);
      // }
      
      // Show video preview if it exists (handled by video URL trigger above)
      // Note: Video preview is now handled by handleVideoUrlPreview function
      
    } catch (error) {
      console.error('❌ Error loading article details:', error);
      
      // Enhanced error handling with better user feedback
      const errorMessage = error.message || 'Unknown error occurred';
      console.error('Full error details:', error);
      
      // Clear loading state safely
      try {
        if (contentField && contentField.value === 'Loading...') {
          contentField.value = '';
        }
        if (chineseContentField && chineseContentField.value === 'Loading...') {
          chineseContentField.value = '';
        }
      } catch (fieldError) {
        console.warn('Warning: Could not clear loading state:', fieldError);
      }
      
      // Show user-friendly error message
      let userMessage;
      if (errorMessage.includes('timeout')) {
        userMessage = 'Request timed out. The server might be busy. Please try again.';
      } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        userMessage = 'Failed to connect to server. Please check your internet connection and try again.';
      } else {
        userMessage = `Failed to load article details: ${errorMessage}`;
      }
      
      alert(userMessage);
      
      // Don't close modal on error - let user try again
      console.log('💡 You can try editing again or refresh the page if the problem persists.');
    }
  }
  
  // Debug authentication function
  window.debugAuth = async function() {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      });
      const status = await response.json();
      
      console.group('🔍 Authentication Status Debug');
      console.log('Authenticated:', status.authenticated);
      console.log('User:', status.user);
      console.log('Debug Info:', status.debug);
      console.groupEnd();
      
      const message = status.authenticated 
        ? `✅ Authenticated as ${status.user.username} (${status.user.role})`
        : `❌ Not authenticated\n\nDebug info:\n- Auth header: ${status.debug?.hasAuthHeader ? 'Yes' : 'No'}\n- Cookie: ${status.debug?.hasCookie ? 'Yes' : 'No'}\n- JWT Secret: ${status.debug?.jwtSecretConfigured ? 'Configured' : 'Missing'}`;
      
      alert(message);
      return status;
    } catch (error) {
      console.error('Debug auth error:', error);
      alert('Failed to check authentication status');
      return null;
    }
  };

  // Open admin manager modal
  window.openAdminManagerModal = function() {
    if (adminManagerModal) {
      adminManagerModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      // 🎯 Initialize tab system when opening admin manager
      setTimeout(() => {
        if (window.initializeTabSystem) {
          window.initializeTabSystem();
          console.log('✅ Tab system initialized');
        } else {
          console.error('❌ initializeTabSystem not found');
        }
      }, 100);
      
      // Show loading state immediately
      if (articlesList) {
        articlesList.innerHTML = `
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading articles...</p>
            <button id="debugAuthBtn" style="margin-top: 16px; padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">Debug Auth</button>
          </div>
        `;
        
        // Add event listener for debug auth button
        setTimeout(() => {
          const debugAuthBtn = document.getElementById('debugAuthBtn');
          if (debugAuthBtn) {
            debugAuthBtn.addEventListener('click', function() {
              if (window.debugAuth) {
                window.debugAuth();
              }
            });
          }
        }, 100);
      }
      
      // Load data asynchronously
      loadArticlesList();
    }
  };
  
  if (createArticleBtn) {
    createArticleBtn.addEventListener('click', () => openCreateForm());
  }

  // Close modal function
  const closeAdminManagerModal = () => {
    if (adminManagerModal) {
      adminManagerModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };
  
  // Close modal events
  if (closeAdminManagerModalBtn) {
    closeAdminManagerModalBtn.addEventListener('click', closeAdminManagerModal);
  }
  
  // Close when clicking outside
  if (adminManagerModal) {
    adminManagerModal.addEventListener('click', (e) => {
      if (e.target === adminManagerModal) {
        closeAdminManagerModal();
      }
    });
  }
  
  // Close when ESC key is pressed
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && adminManagerModal && adminManagerModal.classList.contains('active')) {
      closeAdminManagerModal();
    }
  });
  
  // Load articles list with enhanced cache support and consistency checking
  async function loadArticlesList(forceRefresh = false) {
    if (!articlesList) return;
    
    // 🔍 NEW: Cache consistency check with Cache Sync Manager
    if (window.cacheSyncManager && !forceRefresh) {
      try {
        const isConsistent = await window.cacheSyncManager.checkCacheConsistency();
        if (!isConsistent) {
          console.log('⚠️ Cache inconsistency detected in loadArticlesList, forcing refresh...');
          forceRefresh = true;
        }
      } catch (e) {
        console.warn('⚠️ Cache consistency check failed:', e);
      }
    }
    
    // Check local cache
    const now = Date.now();
    if (!forceRefresh && articlesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('📦 Using cached articles data');
      renderArticlesList(articlesCache);
      return;
    }
    
    try {
      // 🚀 Enhanced fetch with cache-busting for force refresh
      const fetchOptions = {
        credentials: 'include'  // 🔑 Include cookies for authentication
      };
      
      // ⚡ Add cache-busting headers for force refresh
      if (forceRefresh) {
        fetchOptions.headers = {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
        console.log('🔄 Force refresh: bypassing all caches...');
      }
      
      // 🚀 Enhanced cache-busting with timestamp for force refresh
      const apiUrl = forceRefresh 
        ? `/api/articles?_t=${Date.now()}&_force=true` 
        : '/api/articles';
      
      console.log(`📡 Fetching articles from: ${apiUrl}`);
      const response = await fetch(apiUrl, fetchOptions);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          articlesList.innerHTML = `
            <div class="error-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>Authentication failed</p>
              <p style="font-size: 14px; color: #6b7280; margin: 8px 0;">You need to login again to manage articles</p>
              <div style="display: flex; gap: 8px; justify-content: center; margin-top: 16px;">
                <button id="modalAuthLoginBtn" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">🔑 Login Now</button>
                <button id="modalAuthRefreshBtn" class="retry-btn">Refresh Page</button>
              </div>
            </div>
          `;
          
          // Add event listeners for modal auth error buttons
          setTimeout(() => {
            const modalLoginBtn = document.getElementById('modalAuthLoginBtn');
            const modalRefreshBtn = document.getElementById('modalAuthRefreshBtn');
            
            if (modalLoginBtn) {
              modalLoginBtn.addEventListener('click', function() {
                console.log('Opening login modal...');
                try {
                  if (window.openLoginModal) {
                    window.openLoginModal();
                  } else {
                    console.error('openLoginModal not found');
                    alert('Login modal not available, refreshing page...');
                    window.location.reload();
                  }
                } catch (e) {
                  console.error('Login modal error:', e);
                  window.location.reload();
                }
              });
            }
            
            if (modalRefreshBtn) {
              modalRefreshBtn.addEventListener('click', function() {
                console.log('Refreshing page...');
                window.location.reload();
              });
            }
          }, 100);
          
          return;
        }
        throw new Error('Failed to load articles');
      }
      const data = await response.json();
      
      // 🚀 Handle both old format (array) and new format (object with articles property)
      let articles;
      if (Array.isArray(data)) {
        // Old format - direct array
        articles = data;
      } else if (data && Array.isArray(data.articles)) {
        // New format - object with articles property
        articles = data.articles;
      } else {
        // Unexpected format
        console.warn('Unexpected API response format:', data);
        articles = [];
      }
      
      // 🔄 Update cache with fresh data
      articlesCache = articles;
      cacheTimestamp = now;
      
      console.log(`✅ Loaded ${articles.length} articles ${forceRefresh ? '(force refresh)' : '(from API)'}`);
      
      renderArticlesList(articles);
      
    } catch (error) {
      console.error('Error loading articles:', error);
      articlesList.innerHTML = `
        <div class="error-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>Failed to load articles</p>
          <button id="retryLoadBtn" class="retry-btn">Retry</button>
        </div>
      `;
      
      // Add event listener for retry button
      setTimeout(() => {
        const retryBtn = document.getElementById('retryLoadBtn');
        if (retryBtn) {
          retryBtn.addEventListener('click', function() {
            loadArticlesList(true);
          });
        }
      }, 100);
    }
  }

  // Delete article function
  window.deleteArticle = async function(articleId) {
    const ok = await openConfirmModal('Are you sure you want to delete this article? This action cannot be undone.');
    if (!ok) return;
    
    try {
      const r = await fetch(`/api/articles/${articleId}`, { 
        method: 'DELETE',
        credentials: 'include'  // 🔑 Include cookies for authentication
      });
      if (r.status === 204) {
        console.log(`🗑️ Article ${articleId} deleted successfully from API`);
        
        // 🚀 NEW ENHANCED CACHE SYNC: Use Cache Sync Manager for deletion
        console.log('🔄 Triggering Cache Sync Manager for article deletion...');
        
        // Clear local cache variables
        articlesCache = null;
        cacheTimestamp = 0;
        
        // 📡 Trigger Cache Sync Manager events (will handle all cache clearing and syncing)
        const eventDetail = { 
          articleId: articleId,
          type: 'articleDeleted',
          timestamp: Date.now()
        };
        
        console.log('📢 Dispatching articleDeleted event with detail:', eventDetail);
        window.dispatchEvent(new CustomEvent('articleDeleted', { detail: eventDetail }));
        
        // Cache Sync Manager will handle cross-page synchronization
        try {
          console.log('⏱️ Allowing Cache Sync Manager to process deletion...');
          await new Promise(resolve => setTimeout(resolve, 150)); // Reduced delay - Cache Sync Manager handles timing
          
          // Verify deletion and cache consistency
          if (window.cacheSyncManager) {
            const syncStatus = await window.cacheSyncManager.checkCacheConsistency();
            console.log('🔍 Post-deletion cache consistency status:', syncStatus);
            
            // Force additional refresh to ensure the deleted article is gone
            await loadArticlesList(true);
            console.log('✅ Post-deletion Admin Manager list refreshed');
          } else {
            // Fallback to original method
            console.log('⚠️ Cache Sync Manager not available, using fallback refresh...');
            window.clearAllArticleCaches();
            await loadArticlesList(true);
          }
          
        } catch (refreshError) {
          console.error('⚠️ Post-deletion refresh error:', refreshError);
          // Force database sync as last resort
          if (window.triggerDatabaseSync) {
            console.log('🔄 Attempting emergency database sync after deletion...');
            await window.triggerDatabaseSync();
            await loadArticlesList(true);
          } else {
            console.log('🔄 Final fallback: Reloading page...');
            window.location.reload();
            return;
          }
        }
        
        // Show success message AFTER all refresh operations
        alert('Article deleted successfully!');
        
        return;
      }

      // Show more specific error information
      let detail = '';
      try { const data = await r.json(); detail = data?.detail || data?.error || ''; } catch {}
      if (r.status === 403 || r.status === 401) {
        const choice = confirm('Authentication failed. You need to login again to delete articles.\n\nClick OK to open login window, or Cancel to refresh the page.');
        if (choice) {
          if (window.openLoginModal) {
            window.openLoginModal();
          } else {
            window.location.reload();
          }
        } else {
          window.location.reload();
        }
      } else if (r.status === 503) {
        alert(detail || 'Database disabled in preview, delete is unavailable.');
      } else {
        alert(detail ? `Delete failed: ${detail}` : 'Error deleting article, please try again.');
      }
      
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Network error while deleting. Please check connection and retry.');
    }
  };

  // Render articles list
  function renderArticlesList(articles) {
    if (!articlesList) return;
    
    // 🚀 Ensure articles is an array
    if (!Array.isArray(articles)) {
      console.error('renderArticlesList: articles is not an array:', articles);
      articles = [];
    }
    
    if (articles.length === 0) {
      articlesList.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <p>No articles found</p>
        </div>
      `;
      return;
    }
    
    // 🎯 Group articles by media type for better organization
    const imageArticles = articles.filter(article => (article.mediaType || 'IMAGE') === 'IMAGE');
    const videoArticles = articles.filter(article => article.mediaType === 'VIDEO');
    
    let articlesHTML = '';
    
    // 🎥 Video articles section
    if (videoArticles.length > 0) {
      articlesHTML += `
        <div class="media-section-header">
          <div class="section-divider">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m23 7-6 5 6 5V7z" fill="none"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none"/>
              <circle cx="8.5" cy="12" r="3" fill="none"/>
            </svg>
            <span>Video Articles (${videoArticles.length})</span>
          </div>
        </div>
      `;
      
      articlesHTML += videoArticles.map(article => `
        <div class="article-item video-article">
          <div class="article-thumbnail video-thumbnail">
            ${renderVideoPreview(article)}
          </div>
          
          <div class="article-info">
            <div class="title-with-badge">
              <div class="media-type-badge video-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m23 7-6 5 6 5V7z" fill="none"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none"/>
                  <circle cx="8.5" cy="12" r="3" fill="none"/>
                </svg>
                VIDEO
                ${article.videoDuration ? ` · ${formatDuration(article.videoDuration)}` : ''}
              </div>
              <h3 class="article-title">${article.title}</h3>
            </div>
            <div class="article-meta">
              <span class="category-tag ${article.category}">${article.category === 'TodayNews' ? 'Today News' : 'Past News'}</span>
              <span>By ${article.author}</span>
              <span>${formatRelativeTime(article.publishDate)}</span>
            </div>
          </div>
          
          <div class="article-actions compact-actions article-actions-floating">
            <button class="translucent-btn edit-btn" data-article-id="${article.id}" title="Edit Video Article">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
              <span class="btn-text">Edit</span>
            </button>
            <button class="translucent-btn delete-btn" data-article-id="${article.id}" title="Delete Video Article">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              <span class="btn-text">Delete</span>
            </button>
          </div>
        </div>
      `).join('');
    }
    
    // 🖼️ Image articles section
    if (imageArticles.length > 0) {
      articlesHTML += `
        <div class="media-section-header">
          <div class="section-divider">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span>Image Articles (${imageArticles.length})</span>
          </div>
        </div>
      `;
      
      articlesHTML += imageArticles.map(article => `
        <div class="article-item image-article">
          <div class="article-thumbnail image-thumbnail">
            <img src="${article.image}" alt="${article.title}" class="video-fallback-image">
          </div>
          
          <div class="article-info">
            <div class="title-with-badge">
              <div class="media-type-badge image-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                IMAGE
              </div>
              <h3 class="article-title">${article.title}</h3>
            </div>
            <div class="article-meta">
              <span class="category-tag ${article.category}">${article.category === 'TodayNews' ? 'Today News' : 'Past News'}</span>
              <span>By ${article.author}</span>
              <span>${formatRelativeTime(article.publishDate)}</span>
            </div>
          </div>
          
          <div class="article-actions compact-actions article-actions-floating">
            <button class="translucent-btn edit-btn" data-article-id="${article.id}" title="Edit Image Article">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
              <span class="btn-text">Edit</span>
            </button>
            <button class="translucent-btn delete-btn" data-article-id="${article.id}" title="Delete Image Article">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              <span class="btn-text">Delete</span>
            </button>
          </div>
        </div>
      `).join('');
    }
    
    articlesList.innerHTML = articlesHTML;
    
    // Save loaded articles and bind edit events using delegation
    if (window.articlesListClickHandler) {
      articlesList.removeEventListener('click', window.articlesListClickHandler);
    }
    
    const idToArticle = new Map();
    for (const a of articles) idToArticle.set(String(a.id), a);
    
    window.articlesListClickHandler = async (ev) => {
      const target = ev.target instanceof Element ? ev.target : null;
      if (!target) return;
      
      const editBtn = target.closest('.edit-btn, .edit-icon-btn, .modern-action-btn.edit-btn, .circular-btn.edit-btn, .translucent-btn.edit-btn');
      if (editBtn && editBtn instanceof HTMLElement && editBtn.dataset.articleId) {
        const a = idToArticle.get(editBtn.dataset.articleId);
        if (a) {
          try {
            await openEditForm(a);
          } catch (error) {
            console.error('❌ Error in edit button click handler:', error);
            alert('Failed to open edit form. Please try again or refresh the page.');
          }
        }
        return; // Avoid checking delete button
      }
      
      const delBtn = target.closest('.delete-icon-btn, .modern-action-btn.delete-btn, .circular-btn.delete-btn, .translucent-btn.delete-btn');
      if (delBtn && delBtn instanceof HTMLElement && delBtn.dataset.articleId) {
        ev.preventDefault();
        ev.stopPropagation();
        const id = Number(delBtn.dataset.articleId);
        if (!Number.isNaN(id) && window.deleteArticle) {
          window.deleteArticle(id);
        }
      }
    };
    
    articlesList.addEventListener('click', window.articlesListClickHandler);
    
    // 🎥 Add video preview event handlers (CSP compliant)
    setTimeout(() => {
      const videoElements = articlesList.querySelectorAll('.video-preview-element');
      const fallbackImages = articlesList.querySelectorAll('.video-fallback-image');
      
      videoElements.forEach(video => {
        video.addEventListener('loadeddata', function() {
          this.style.display = 'block';
        });
        
        video.addEventListener('error', function() {
          this.style.display = 'none';
          const fallbackImg = this.nextElementSibling;
          if (fallbackImg && fallbackImg.classList.contains('video-fallback-image')) {
            fallbackImg.style.display = 'block';
          }
        });
      });
      
      fallbackImages.forEach(img => {
        img.addEventListener('error', function() {
          this.src = '/images/placeholder.svg';
        });
      });
    }, 100);
  }
  
  // 🎥 Simple URL format validation
  function isValidUrlFormat(url) {
    if (!url || url.length < 4) return false;
    
    // Check for common URL patterns
    return url.includes('youtube.com') || 
           url.includes('youtu.be') || 
           url.includes('vimeo.com') || 
           url.includes('http') || 
           url.includes('www.') || 
           url.match(/\.(mp4|webm|ogg|mov|avi)(\?|$)/i);
  }

  // 🎥 Handle video URL preview and validation - Enhanced with memory management
  let currentVideoPreview = null; // Track current preview to prevent memory leaks
  let previewInProgress = false; // Prevent concurrent executions
  
  function handleVideoUrlPreview(url, formEl) {
    // 🛡️ Prevent concurrent executions
    if (previewInProgress) {
      console.log('🎬 Video preview already in progress, skipping...');
      return;
    }
    
    previewInProgress = true;
    
    try {
      // 🧹 Clean up previous preview if exists
      if (currentVideoPreview) {
        try {
          URL.revokeObjectURL(currentVideoPreview);
          currentVideoPreview = null;
        } catch (e) {
          console.warn('Failed to revoke previous URL:', e);
        }
      }
      
      // Basic URL validation
      let videoUrl = url.trim();
      if (!videoUrl) {
        throw new Error('Please enter a video URL');
      }
      
      // Add protocol if missing
      if (!videoUrl.match(/^https?:\/\//)) {
        videoUrl = 'https://' + videoUrl;
      }
      
      // Validate URL format
      let parsedUrl;
      try {
        parsedUrl = new URL(videoUrl);
      } catch (e) {
        throw new Error('Invalid URL format');
      }
      
      // Extract embed URLs for popular platforms
      const embedUrl = getEmbedUrl(videoUrl, parsedUrl);
      const displayUrl = embedUrl || videoUrl;
      
      // Set the URL in the form
      const videoUrlField = formEl.querySelector('input[name="videoUrl"]');
      if (videoUrlField) {
        videoUrlField.value = displayUrl;
      }
      
      // Show preview in new video preview area
      const videoData = {
        url: displayUrl,
        originalName: 'Video URL Input',
        mediaType: 'VIDEO',
        size: 0,
        duration: null // Will be auto-detected
      };
      
      // Use the new dedicated video preview function directly
      if (typeof showVideoPreview === 'function') {
        showVideoPreview(videoData);
        console.log('✅ Using new video preview system');
      } else {
        console.warn('⚠️ New video preview function not available, skipping legacy preview');
        // Don't show legacy preview to avoid duplicate previews
      }
      
      console.log('✅ Video URL processed:', { 
        original: url, 
        processed: displayUrl,
        hostname: parsedUrl.hostname,
        isYouTube: parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be'),
        isVimeo: parsedUrl.hostname.includes('vimeo.com')
      });
      
    } catch (error) {
      console.error('❌ Video URL error:', error);
      
      // More detailed error messages for different cases
      let errorMessage = error.message;
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        errorMessage += '\n\nTip: Make sure the YouTube URL includes a video ID (e.g., youtube.com/watch?v=VIDEO_ID)';
      } else if (url.includes('vimeo.com')) {
        errorMessage += '\n\nTip: Make sure the Vimeo URL includes a video ID (e.g., vimeo.com/VIDEO_ID)';
      }
      
      alert('Video URL Error:\n' + errorMessage);
    }
  }
  
  // 🎥 Get embed URL for popular video platforms
  function getEmbedUrl(originalUrl, parsedUrl) {
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // YouTube URLs
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      let videoId;
      
      if (hostname.includes('youtu.be')) {
        videoId = parsedUrl.pathname.slice(1);
      } else if (parsedUrl.searchParams.has('v')) {
        videoId = parsedUrl.searchParams.get('v');
      } else {
        const match = parsedUrl.pathname.match(/\/embed\/([^/?]+)/);
        if (match) videoId = match[1];
      }
      
      if (videoId) {
        // Remove parameters that might cause issues and use a simpler approach
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // Vimeo URLs
    if (hostname.includes('vimeo.com')) {
      const match = parsedUrl.pathname.match(/\/(\d+)/);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    }
    
    // For direct video files or other platforms, return original URL
    return originalUrl;
  }
  
    // 🎥 Show video preview in legacy media preview area (DISABLED to prevent duplicates)
  function showLegacyVideoPreview(videoUrl, formEl, hostname) {
    console.log('⚠️ Legacy video preview disabled to prevent duplicates');
    return; // Disable this function to prevent duplicate previews
    
    // Original function body commented out
    /*
    // Try multiple possible preview element IDs
    let mediaPreviewWrap = formEl.querySelector('#mediaPreviewWrap');
    let mediaPreview = formEl.querySelector('#mediaPreview');
    let mediaPreviewTitle = formEl.querySelector('#mediaPreviewTitle');
    let mediaPreviewDetails = formEl.querySelector('#mediaPreviewDetails');
    
    // Fallback to image preview elements if media preview not found
    if (!mediaPreviewWrap) {
      mediaPreviewWrap = formEl.querySelector('#imagePreviewWrap');
      console.log('🔄 Using imagePreviewWrap as fallback');
    }
    if (!mediaPreview) {
      mediaPreview = formEl.querySelector('#imagePreview');
      console.log('🔄 Using imagePreview as fallback');
    }
    if (!mediaPreviewTitle) {
      mediaPreviewTitle = formEl.querySelector('#imagePreviewTitle');
    }
    if (!mediaPreviewDetails) {
      mediaPreviewDetails = formEl.querySelector('#imagePreviewDetails');
    }
    
    if (!mediaPreviewWrap || !mediaPreview) {
      console.warn('⚠️ Media preview elements not found', {
        mediaPreviewWrap: !!mediaPreviewWrap,
        mediaPreview: !!mediaPreview,
        availableIds: Array.from(formEl.querySelectorAll('[id]')).map(el => el.id)
      });
      return;
    }
    
    // Determine preview type
    const isEmbed = videoUrl.includes('youtube.com/embed') || videoUrl.includes('player.vimeo.com');
    const isDirect = videoUrl.match(/\.(mp4|webm|ogg|mov|avi)(\?|$)/i);
    
    let previewContent;
    
    if (isEmbed) {
      // Embedded video (YouTube, Vimeo) - with proper sizing
      previewContent = `
        <iframe 
          src="${videoUrl}" 
          width="100%" 
          height="280" 
          style="border:none;border-radius:8px;min-height:280px;" 
          frameborder="0"
          allowfullscreen>
        </iframe>
      `;
    } else if (isDirect) {
      // Direct video file
      previewContent = `
        <video 
          src="${videoUrl}" 
          style="width:100%;height:100%;object-fit:cover;border-radius:8px;" 
          controls 
          preload="metadata">
          Your browser does not support video playback.
        </video>
      `;
    } else {
      // Generic preview with link
      previewContent = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🎥</div>
          <div style="font-weight:600;margin-bottom:8px;">Video Link</div>
          <div style="font-size:12px;color:#6b7280;word-break:break-all;">${hostname}</div>
          <a href="${videoUrl}" target="_blank" style="margin-top:12px;padding:6px 12px;background:#3b82f6;color:white;border-radius:4px;text-decoration:none;font-size:12px;">Open Video</a>
        </div>
      `;
    }
    
    // Update preview
    mediaPreview.innerHTML = previewContent;
    
    // 🐛 Debug: Check if iframe was created and ensure it has proper height
    setTimeout(() => {
      const iframe = mediaPreview.querySelector('iframe');
      if (iframe) {
        // Ensure the parent container has proper height
        if (mediaPreview.style) {
          mediaPreview.style.minHeight = '280px';
          mediaPreview.style.height = 'auto';
        }
        
        console.log('🎯 iframe created:', {
          src: iframe.src,
          width: iframe.width || iframe.style.width,
          height: iframe.height || iframe.style.height,
          style: iframe.style.cssText,
          parentHeight: mediaPreview.offsetHeight
        });
        
        // Check if iframe loads successfully
        iframe.onload = () => {
          console.log('✅ iframe loaded successfully');
          // Additional check after load
          setTimeout(() => {
            console.log('📏 iframe size after load:', {
              offsetWidth: iframe.offsetWidth,
              offsetHeight: iframe.offsetHeight,
              clientWidth: iframe.clientWidth,
              clientHeight: iframe.clientHeight
            });
          }, 1000);
        };
        iframe.onerror = (e) => console.error('❌ iframe load error:', e);
      } else {
        console.warn('⚠️ No iframe found in preview');
      }
    }, 100);
    
    // Update title and details
    if (mediaPreviewTitle) {
      const platform = hostname.includes('youtube') ? 'YouTube' : 
                      hostname.includes('vimeo') ? 'Vimeo' : 
                      isDirect ? 'Direct Video' : 'Video Link';
      mediaPreviewTitle.textContent = `${platform} Video`;
    }
    
    if (mediaPreviewDetails) {
      mediaPreviewDetails.innerHTML = `
        <div>Type: VIDEO</div>
        <div>Source: ${hostname}</div>
        <div>URL: <code style="font-size:10px;word-break:break-all;">${videoUrl}</code></div>
        <div style="margin-top:8px;"><strong>Debug:</strong> ${isEmbed ? 'Embed iframe' : isDirect ? 'Direct video' : 'Generic link'}</div>
      `;
    }
    
    // Show preview
    mediaPreviewWrap.style.display = 'flex';
    
    console.log('✅ Video preview displayed successfully', {
      videoUrl,
      isEmbed,
      isDirect,
      hostname
    });
    */ // End of commented legacy function
  }
  
  // 🎥 Render video preview function
  function renderVideoPreview(article) {
    const videoUrl = article.videoUrl;
    const posterUrl = article.image || article.videoPoster || '/images/placeholder.svg';
    
    if (!videoUrl) {
      return `<img src="${posterUrl}" alt="${article.title}" class="video-fallback-image">`;
    }
    
    return `
      <div class="video-preview-container">
        <video 
          src="${videoUrl}" 
          poster="${posterUrl}"
          preload="metadata"
          style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"
          class="video-preview-element"
        >
          Your browser does not support video playback.
        </video>
        <img 
          src="${posterUrl}" 
          alt="${article.title}"
          style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: none;"
          class="video-fallback-image"
        >
        <div class="video-play-overlay">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      </div>
    `;
  }
  
  // 🕒 Format duration function (used for video durations)
  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Format relative time function
  function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
    
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  }

  // 🚀 Enhanced force refresh function
  window.forceRefreshAdminPanel = function() {
    articlesCache = null; // Clear cache
    cacheTimestamp = 0;   // Reset timestamp
    if (adminManagerModal && adminManagerModal.classList.contains('active')) {
      console.log('🔄 Force refreshing admin panel...');
      loadArticlesList(true); // Force refresh
    }
  };

  // Event listeners for real-time updates
  window.addEventListener('articlePublished', () => {
    console.log('[Article] Article published event detected');
    window.forceRefreshAdminPanel();
  });
  
  window.addEventListener('articleUpdated', () => {
    console.log('[Article] Article updated event detected'); 
    window.forceRefreshAdminPanel();
  });

  window.addEventListener('articleDeleted', () => {
    console.log('[Article] Article deleted event detected');
    window.forceRefreshAdminPanel();
  });

  // 🔑 Listen for login success to refresh admin panel
  window.addEventListener('userLoggedIn', (event) => {
    console.log('[Auth] User logged in successfully:', event.detail?.username);
    
    // Clear any auth-related errors in all forms
    const allErrorEls = document.querySelectorAll('.error-message, #formError');
    allErrorEls.forEach(errEl => {
      if (errEl) {
        errEl.style.display = 'none';
        errEl.textContent = '';
        errEl.innerHTML = '';
      }
    });
    
    // Update login status in localStorage
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('username', event.detail?.username || 'Admin');
    
    // Refresh admin panel if it's open
    if (adminManagerModal && adminManagerModal.classList.contains('active')) {
      console.log('[Auth] Refreshing admin panel after login...');
      
      // Show success message temporarily
      if (articlesList) {
        articlesList.innerHTML = `
          <div class="loading-state" style="color: #10b981;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #10b981;">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <p>✅ Login successful! Reloading articles...</p>
          </div>
        `;
      }
      
      // Force refresh the articles list after a short delay
      setTimeout(() => {
        window.forceRefreshAdminPanel();
      }, 800);
      
      // Also update header login status
      if (window.updateHeaderForLoggedInUser) {
        window.updateHeaderForLoggedInUser();
      }
    }
    
    // Show admin manage button if user is admin
    const adminManageBtn = document.getElementById('adminManageBtn');
    if (adminManageBtn && (event.detail?.username === 'admin' || event.detail?.username === 'Admin')) {
      adminManageBtn.style.display = 'flex';
    }
  });

  // Initialize if opened via URL or other means
  if (adminManagerModal && adminManagerModal.classList.contains('active')) {
    loadArticlesList();
  }

  // Custom Select Component
  function initializeCustomSelect() {
    if (!formEl) return;
    
    const wrapper = formEl.querySelector('.custom-select-wrapper');
    const select = formEl.querySelector('.custom-select');
    const display = formEl.querySelector('.custom-select-display');
    const selectedText = formEl.querySelector('.selected-text');
    const arrow = formEl.querySelector('.select-arrow');
    const optionsContainer = formEl.querySelector('.custom-options');
    const options = formEl.querySelectorAll('.custom-option');
    const section = wrapper ? wrapper.closest('.form-section') : null;
    
    if (!wrapper || !select || !display || !selectedText || !optionsContainer) return;
    
    let isOpen = false;

    // Elevation ref-count for shared section
    function elevate() {
      if (!section) return;
      const current = Number(section.dataset.elevatedCount || '0') + 1;
      section.dataset.elevatedCount = String(current);
      if (current > 0) section.classList.add('elevated');
    }

    function lowerAfter(delayMs = 0) {
      if (!section) return;
      const perform = () => {
        const current = Math.max(0, Number(section.dataset.elevatedCount || '0') - 1);
        section.dataset.elevatedCount = String(current);
        if (current === 0) section.classList.remove('elevated');
      };
      if (delayMs > 0) setTimeout(perform, delayMs); else perform();
    }
    
    // Toggle dropdown
    function toggleDropdown() {
      isOpen = !isOpen;
      wrapper.classList.toggle('open', isOpen);
      arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      
      if (isOpen) {
        elevate();
        optionsContainer.style.display = 'block';
        setTimeout(() => optionsContainer.classList.add('show'), 10);
      } else {
        optionsContainer.classList.remove('show');
        setTimeout(() => { optionsContainer.style.display = 'none'; }, 200);
        lowerAfter(200);
      }
    }
    
    // Close dropdown
    function closeDropdown() {
      if (isOpen) {
        isOpen = false;
        wrapper.classList.remove('open');
        arrow.style.transform = 'rotate(0deg)';
        optionsContainer.classList.remove('show');
        setTimeout(() => { optionsContainer.style.display = 'none'; }, 200);
        lowerAfter(200);
      }
    }
    
    // Handle option selection
    function selectOption(value, text) {
      select.value = value;
      selectedText.textContent = text;
      closeDropdown();
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      select.dispatchEvent(event);
    }
    
    // Event listeners
    display.addEventListener('click', toggleDropdown);
    
    options.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.dataset.value;
        const text = option.querySelector('span').textContent;
        selectOption(value, text);
      });
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        closeDropdown();
      }
    });
    
    // Update display when select value changes programmatically
    const observer = new MutationObserver(() => {
      const selectedOption = select.querySelector(`option[value="${select.value}"]`);
      if (selectedOption) {
        selectedText.textContent = selectedOption.textContent;
      }
    });
    observer.observe(select, { attributes: true, attributeFilter: ['value'] });
    
    // Store observer for cleanup
    wrapper.selectObserver = observer;
  }

  // DateTime Picker Component
  function initializeDateTimePicker() {
    if (!formEl) return;
    
    const wrapper = formEl.querySelector('.datetime-picker-wrapper');
    const input = formEl.querySelector('.datetime-picker-input');
    const btn = formEl.querySelector('.datetime-picker-btn');
    const dropdown = formEl.querySelector('.datetime-picker-dropdown');
    const closeBtn = formEl.querySelector('.datetime-picker-close');
    const dateInput = formEl.querySelector('.date-input');
    const timeInput = formEl.querySelector('.time-input');
    const nowBtn = formEl.querySelector('.btn-now');
    const clearBtn = formEl.querySelector('.btn-clear');
    const confirmBtn = formEl.querySelector('.btn-confirm');
    const section = wrapper ? wrapper.closest('.form-section') : null;
    
    if (!wrapper || !input || !btn || !dropdown) return;
    
    let isOpen = false;
    
    // Open dropdown
    function openDropdown() {
      isOpen = true;
      dropdown.style.display = 'block';
      setTimeout(() => dropdown.classList.add('show'), 10);
      if (section) section.classList.add('elevated');
      wrapper.classList.add('open');
      
      // Set current values if input has value
      if (input.value) {
        const date = new Date(input.value);
        if (!isNaN(date.getTime())) {
          dateInput.value = date.toISOString().split('T')[0];
          timeInput.value = date.toTimeString().slice(0, 5);
        }
      }
    }
    
    // Close dropdown
    function closeDropdown() {
      if (isOpen) {
        isOpen = false;
        dropdown.classList.remove('show');
        setTimeout(() => dropdown.style.display = 'none', 200);
        if (section) section.classList.remove('elevated');
        wrapper.classList.remove('open');
      }
    }
    
    // Format date for display
    function formatDateTime(date) {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      const hh = String(date.getHours()).padStart(2, '0');
      const mi = String(date.getMinutes()).padStart(2, '0');
      return `${mm}/${dd}/${yyyy} ${hh}:${mi}`;
    }
    
    // Set current date/time
    function setNow() {
      const now = new Date();
      dateInput.value = now.toISOString().split('T')[0];
      timeInput.value = now.toTimeString().slice(0, 5);
    }
    
    // Clear values
    function clearValues() {
      dateInput.value = '';
      timeInput.value = '';
      input.value = '';
      closeDropdown();
    }
    
    // Confirm selection
    function confirmSelection() {
      if (!dateInput.value) {
        clearValues();
        return;
      }
      
      const dateStr = dateInput.value;
      const timeStr = timeInput.value || '00:00';
      const datetime = new Date(`${dateStr}T${timeStr}`);
      
      if (!isNaN(datetime.getTime())) {
        input.value = formatDateTime(datetime);
      }
      
      closeDropdown();
    }
    
    // Event listeners
    btn.addEventListener('click', openDropdown);
    input.addEventListener('click', openDropdown);
    closeBtn.addEventListener('click', closeDropdown);
    nowBtn.addEventListener('click', setNow);
    clearBtn.addEventListener('click', clearValues);
    confirmBtn.addEventListener('click', confirmSelection);
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        closeDropdown();
      }
    });
    
    // Auto-confirm on Enter
    dateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmSelection();
    });
    timeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmSelection();
    });
  }
  
  // 🎯 Tab System Management
  window.initializeTabSystem = function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const targetTab = this.dataset.tab;
        console.log(`🔄 Switching to tab: ${targetTab}`);
        
        // Update button states
        tabBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Update content visibility
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === targetTab + 'Tab') {
            content.classList.add('active');
            console.log(`✅ Tab content activated: ${content.id}`);
          }
        });
        
        // 🔄 Reset initialization flags when switching tabs
        if (targetTab !== 'media') {
          window._mediaCenterInitialized = false;
          console.log('🔄 Reset Media Center initialization flag');
        }
        
        // Initialize Media Center when switching to media tab
        if (targetTab === 'media') {
          console.log('🎯 Media tab clicked, initializing...');
          setTimeout(() => {
            if (window.initializeMediaCenter) {
              window.initializeMediaCenter();
            } else {
              console.error('❌ initializeMediaCenter function not found!');
            }
          }, 100); // Small delay to ensure DOM is ready
        }
      });
    });
  };

  // 🎥 Media Center Initialization
  window.initializeMediaCenter = function() {
    console.log('🎥 Initializing Media Center...');
    
    // Check if we're in the media tab
    const mediaTab = document.getElementById('mediaTab');
    if (!mediaTab || !mediaTab.classList.contains('active')) {
      console.log('⚠️ Media tab not active, skipping initialization');
      return;
    }
    
    // 🚨 防止重复初始化
    if (window._mediaCenterInitialized) {
      console.log('ℹ️ Media Center already initialized, skipping...');
      return;
    }
    
    try {
      // Initialize components
      initializeSystemStatus();
      initializeQuickUpload();
      initializeApiTesting();
      updateStatistics();
      
      // 🆕 Initialize Media Library
      initializeMediaLibrary();
      
      // 标记为已初始化
      window._mediaCenterInitialized = true;
      console.log('✅ Media Center initialized successfully');
    } catch (error) {
      console.error('❌ Media Center initialization failed:', error);
    }
  };

  // 📊 System Status Check
  function initializeSystemStatus() {
    checkStorageConnection();
  }

  async function checkStorageConnection() {
    const storageIcon = document.getElementById('storageIcon');
    const storageStatus = document.getElementById('storageStatus');
    
    if (!storageIcon || !storageStatus) return;
    
    try {
      storageStatus.textContent = 'Checking...';
      storageStatus.className = 'status-badge checking';
      storageIcon.className = 'status-icon status-checking';
      
      const response = await fetch('/api/media/simple-upload?action=test', {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (response.ok && result.connected) {
        storageStatus.textContent = 'Connected';
        storageStatus.className = 'status-badge active';
        storageIcon.className = 'status-icon status-active';
        console.log('✅ Storage connection successful');
      } else {
        throw new Error(result.message || 'Connection failed');
      }
    } catch (error) {
      console.error('❌ Storage connection failed:', error);
      storageStatus.textContent = 'Disconnected';
      storageStatus.className = 'status-badge error';
      storageIcon.className = 'status-icon status-error';
    }
  }

  // 🚀 Quick Upload Functionality
  function initializeQuickUpload() {
    const uploadTypeBtns = document.querySelectorAll('.upload-type-btn');
    const uploadZone = document.getElementById('quickUploadZone');
    const uploadInput = document.getElementById('quickUploadInput');
    
    // Upload type selection
    uploadTypeBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const uploadType = this.dataset.type;
        
        // Update button states
        uploadTypeBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Update file input accept
        if (uploadInput) {
          uploadInput.accept = uploadType === 'image' ? 'image/*' : 'video/*';
        }
        
        console.log(`🎯 Upload type changed to: ${uploadType}`);
      });
    });

    // Drag and drop handling
    if (uploadZone && uploadInput) {
      uploadZone.addEventListener('click', () => uploadInput.click());
      
      uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(139, 92, 246, 0.6)';
        uploadZone.style.background = 'rgba(139, 92, 246, 0.12)';
      });
      
      uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        uploadZone.style.background = 'rgba(139, 92, 246, 0.05)';
      });
      
      uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        uploadZone.style.background = 'rgba(139, 92, 246, 0.05)';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          handleQuickUpload(files);
        }
      });
      
      uploadInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleQuickUpload(e.target.files);
        }
      });
    }
  }

  // Handle quick upload files
  async function handleQuickUpload(files) {
    const progressContainer = document.getElementById('quickUploadProgress');
    
    for (const file of files) {
      try {
        // 🛡️ File validation (dynamic limits)
        const isVideoFile = file.type.startsWith('video/');
        const maxSizeBytes = isVideoFile ? uploadLimits.maxVideoSize : uploadLimits.maxImageSize;
        const maxSizeMB = isVideoFile ? uploadLimits.maxVideoSizeMB : uploadLimits.maxImageSizeMB;
        
        if (file.size > maxSizeBytes) {
          throw new Error(`File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`);
        }
        
        showQuickUploadProgress(file);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'TodayNews');
        
        const response = await fetch('/api/media/simple-upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          // Check if it's an authentication error
          if (response.status === 401 || response.status === 403) {
            const authError = new Error('Authentication failed. Please login as admin again.');
            authError.isAuthError = true;
            authError.status = response.status;
            throw authError;
          }
          
          // Try to get detailed error message from response
          let errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
          try {
            const errorResult = await response.json();
            if (errorResult && errorResult.error) {
              errorMessage = errorResult.error;
            }
          } catch {
            // Keep default error message if can't parse response
          }
          
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Quick upload successful:', result.data);
          showQuickUploadSuccess(file, result.data);
          
          // Trigger media upload success event for library refresh
          document.dispatchEvent(new CustomEvent('mediaUploadSuccess', {
            detail: result.data
          }));
          
          // Update statistics with a small delay to ensure database is updated
          setTimeout(() => {
            updateStatistics();
          }, 1000);
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        console.error('❌ Quick upload failed:', error);
        
        // Handle authentication errors specially
        if (error.isAuthError || error.message.includes('Authentication failed')) {
          showQuickUploadAuthError(file, error.message);
        } else {
          showQuickUploadError(file, error.message);
        }
      }
    }
  }

  function showQuickUploadProgress(file) {
    const progressContainer = document.getElementById('quickUploadProgress');
    if (!progressContainer) return;
    
    progressContainer.style.display = 'block';
    
    const uploadName = progressContainer.querySelector('.upload-name');
    const uploadSize = progressContainer.querySelector('.upload-size');
    const progressFill = progressContainer.querySelector('.upload-progress-fill');
    const uploadStatus = progressContainer.querySelector('.upload-status');
    
    if (uploadName) uploadName.textContent = file.name;
    if (uploadSize) uploadSize.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    if (uploadStatus) uploadStatus.textContent = 'Uploading...';
    if (progressFill) progressFill.style.width = '60%';
  }

  function showQuickUploadSuccess(file, data) {
    const progressContainer = document.getElementById('quickUploadProgress');
    if (!progressContainer) return;
    
    const uploadStatus = progressContainer.querySelector('.upload-status');
    const progressFill = progressContainer.querySelector('.upload-progress-fill');
    
    if (uploadStatus) uploadStatus.textContent = 'Complete';
    if (progressFill) {
      progressFill.style.width = '100%';
      progressFill.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    }
    
    // Hide after 3 seconds
    setTimeout(() => {
      progressContainer.style.display = 'none';
      if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.style.background = 'linear-gradient(90deg, var(--modal-primary), var(--modal-primary-light))';
      }
    }, 3000);
  }

  function showQuickUploadError(file, error) {
    const progressContainer = document.getElementById('quickUploadProgress');
    if (!progressContainer) return;
    
    const uploadStatus = progressContainer.querySelector('.upload-status');
    const progressFill = progressContainer.querySelector('.upload-progress-fill');
    
    if (uploadStatus) uploadStatus.textContent = 'Failed';
    if (progressFill) {
      progressFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    }
    
    console.error(`❌ Upload failed for ${file.name}:`, error);
    
    // Show error alert
    setTimeout(() => {
      alert(`Upload failed for ${file.name}: ${error}`);
    }, 500);
    
    // Hide after 5 seconds
    setTimeout(() => {
      progressContainer.style.display = 'none';
      if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.style.background = 'linear-gradient(90deg, var(--modal-primary), var(--modal-primary-light))';
      }
    }, 5000);
  }

  function showQuickUploadAuthError(file, error) {
    const progressContainer = document.getElementById('quickUploadProgress');
    if (!progressContainer) return;
    
    const uploadStatus = progressContainer.querySelector('.upload-status');
    const progressFill = progressContainer.querySelector('.upload-progress-fill');
    
    if (uploadStatus) uploadStatus.textContent = 'Auth Error';
    if (progressFill) {
      progressFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
    }
    
    console.error(`🔒 Authentication error for ${file.name}:`, error);
    
    // Show authentication error dialog
    setTimeout(() => {
      const choice = confirm(`🔒 Authentication failed for ${file.name}\n\n${error}\n\nClick OK to open login window, or Cancel to refresh the page.`);
      if (choice) {
        if (window.openLoginModal) {
          window.openLoginModal();
        } else {
          console.error('openLoginModal not found');
          window.location.reload();
        }
      } else {
        window.location.reload();
      }
      
      // Reset progress container
      progressContainer.style.display = 'none';
      if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.style.background = 'linear-gradient(90deg, var(--modal-primary), var(--modal-primary-light))';
      }
    }, 1000);
  }

  // 🧪 API Testing Functions
  function initializeApiTesting() {
    const testStorageBtn = document.getElementById('testStorageBtn');
    const getUploadInfoBtn = document.getElementById('getUploadInfoBtn');
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    const testingOutput = document.getElementById('testingOutput');
    
    if (testStorageBtn) {
      testStorageBtn.addEventListener('click', async () => {
        await runStorageTest();
      });
    }
    
    if (getUploadInfoBtn) {
      getUploadInfoBtn.addEventListener('click', async () => {
        await getUploadInfo();
      });
    }
    
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', async () => {
        await refreshStatistics();
      });
    }
  }

  async function runStorageTest() {
    const output = document.getElementById('testingOutput');
    if (!output) return;
    
    output.innerHTML = '<div style="color: #f59e0b;">🧪 Testing storage connection...</div>';
    
    try {
      const response = await fetch('/api/media/simple-upload?action=test', {
        credentials: 'include'
      });
      const result = await response.json();
      
      const status = response.ok ? '✅ SUCCESS' : '❌ FAILED';
      const timestamp = new Date().toLocaleTimeString();
      
      output.innerHTML = `
        <div style="color: ${response.ok ? '#10b981' : '#ef4444'};">${status}</div>
        <div style="color: #94a3b8; margin-top: 8px;">Timestamp: ${timestamp}</div>
        <div style="margin-top: 12px;">
          <div style="font-weight: 600; color: #f8fafc;">Response:</div>
          <pre style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; font-size: 11px; margin-top: 4px; overflow-x: auto;">${JSON.stringify(result, null, 2)}</pre>
        </div>
      `;
    } catch (error) {
      output.innerHTML = `
        <div style="color: #ef4444;">❌ FAILED</div>
        <div style="color: #94a3b8; margin-top: 8px;">Timestamp: ${new Date().toLocaleTimeString()}</div>
        <div style="margin-top: 12px;">
          <div style="font-weight: 600; color: #f8fafc;">Error:</div>
          <div style="color: #fca5a5; margin-top: 4px;">${error.message}</div>
        </div>
      `;
    }
  }

  async function getUploadInfo() {
    const output = document.getElementById('testingOutput');
    if (!output) return;
    
    output.innerHTML = '<div style="color: #f59e0b;">📋 Getting upload configuration...</div>';
    
    try {
      const response = await fetch('/api/media/simple-upload?action=info', {
        credentials: 'include'
      });
      const result = await response.json();
      
      const status = response.ok ? '✅ SUCCESS' : '❌ FAILED';
      const timestamp = new Date().toLocaleTimeString();
      
      output.innerHTML = `
        <div style="color: ${response.ok ? '#10b981' : '#ef4444'};">${status}</div>
        <div style="color: #94a3b8; margin-top: 8px;">Timestamp: ${timestamp}</div>
        <div style="margin-top: 12px;">
          <div style="font-weight: 600; color: #f8fafc;">Configuration:</div>
          <pre style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; font-size: 11px; margin-top: 4px; overflow-x: auto;">${JSON.stringify(result, null, 2)}</pre>
        </div>
      `;
    } catch (error) {
      output.innerHTML = `
        <div style="color: #ef4444;">❌ FAILED</div>
        <div style="color: #94a3b8; margin-top: 8px;">Timestamp: ${new Date().toLocaleTimeString()}</div>
        <div style="margin-top: 12px;">
          <div style="font-weight: 600; color: #f8fafc;">Error:</div>
          <div style="color: #fca5a5; margin-top: 4px;">${error.message}</div>
        </div>
      `;
    }
  }

  async function refreshStatistics() {
    const output = document.getElementById('testingOutput');
    if (!output) return;
    
    output.innerHTML = '<div style="color: #f59e0b;">🔄 Refreshing statistics...</div>';
    
    try {
      // Force refresh statistics
      await updateStatistics();
      
      // Also refresh media library if it's initialized
      if (window.loadMediaFiles) {
        await window.loadMediaFiles();
      }
      if (window.loadStats) {
        await window.loadStats();
      }
      
      const timestamp = new Date().toLocaleTimeString();
      const totalUploads = document.getElementById('totalUploads')?.textContent || '0';
      const storageUsed = document.getElementById('storageUsed')?.textContent || '0 MB';
      
      output.innerHTML = `
        <div style="color: #10b981;">✅ STATISTICS REFRESHED</div>
        <div style="color: #94a3b8; margin-top: 8px;">Timestamp: ${timestamp}</div>
        <div style="margin-top: 12px;">
          <div style="font-weight: 600; color: #f8fafc;">Current Statistics:</div>
          <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; font-size: 11px; margin-top: 4px;">
            Total Uploads: ${totalUploads}<br>
            Storage Used: ${storageUsed}
          </div>
        </div>
      `;
      
      console.log('✅ Statistics manually refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh statistics:', error);
      
      const timestamp = new Date().toLocaleTimeString();
      output.innerHTML = `
        <div style="color: #ef4444;">❌ REFRESH FAILED</div>
        <div style="color: #94a3b8; margin-top: 8px;">Timestamp: ${timestamp}</div>
        <div style="margin-top: 12px; color: #ef4444;">
          Error: ${error.message}
        </div>
      `;
    }
  }

  // 📊 Real Statistics Update - 从真实API获取数据
  async function updateStatistics() {
    try {
      console.log('📊 更新真实统计数据...');
      const response = await fetch('/api/media/library?action=stats');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load stats');
      }
      
      // Update the main statistics display
      const totalUploads = document.getElementById('totalUploads');
      const storageUsed = document.getElementById('storageUsed');
      const storageStatus = document.getElementById('storageStatus');
      const storageIcon = document.getElementById('storageIcon');
      
      if (totalUploads) {
        totalUploads.textContent = data.totalFiles || 0;
      }
      
      if (storageUsed) {
        const sizeMB = (data.totalSizeMB || 0).toFixed(1);
        storageUsed.textContent = sizeMB + ' MB';
      }
      
      // Update storage connection status to show success
      if (storageStatus) {
        storageStatus.textContent = 'Connected';
        storageStatus.className = 'status-badge active';
      }
      
      if (storageIcon) {
        storageIcon.className = 'status-icon status-active';
      }
      
      console.log('✅ 统计数据更新:', {
        totalFiles: data.totalFiles,
        totalSizeMB: data.totalSizeMB,
        imageCount: data.imageCount,
        videoCount: data.videoCount
      });
      
    } catch (error) {
      console.error('❌ 更新统计数据失败:', error);
      
      // Update storage connection status to show error
      const storageStatus = document.getElementById('storageStatus');
      const storageIcon = document.getElementById('storageIcon');
      
      if (storageStatus) {
        storageStatus.textContent = 'Connection Failed';
        storageStatus.className = 'status-badge error';
      }
      
      if (storageIcon) {
        storageIcon.className = 'status-icon status-error';
      }
      
      // Show error indicators if no data is available
      const totalUploads = document.getElementById('totalUploads');
      const storageUsed = document.getElementById('storageUsed');
      
      if (totalUploads && totalUploads.textContent === '0') {
        totalUploads.innerHTML = `<span style="color: #fca5a5;">N/A</span>`;
      }
      if (storageUsed && storageUsed.textContent === '0 MB') {
        storageUsed.innerHTML = `<span style="color: #fca5a5;">N/A</span>`;
      }
    }
  }

  // 🎥 Enhanced Media Upload Integration
  window.initializeMediaUpload = function(formEl) {
    if (!formEl) return;
    
    // Get elements
    const mediaTypeInputs = formEl.querySelectorAll('input[name="mediaType"]');
    const imageUploadSection = formEl.querySelector('#imageUploadSection');
    const videoUploadSection = formEl.querySelector('#videoUploadSection');
    const uploadBtns = formEl.querySelectorAll('.upload-media-btn');
    const mediaPreviewWrap = formEl.querySelector('#mediaPreviewWrap');
    const mediaPreview = formEl.querySelector('#mediaPreview');
    const mediaPreviewInfo = formEl.querySelector('#mediaPreviewInfo');
    const mediaPreviewTitle = formEl.querySelector('#mediaPreviewTitle');
    const mediaPreviewDetails = formEl.querySelector('#mediaPreviewDetails');
    const clearMediaBtn = formEl.querySelector('#clearMediaBtn');
    
    // Media type selection handlers
    mediaTypeInputs.forEach(input => {
      input.addEventListener('change', function() {
        const mediaType = this.value;
        
        if (mediaType === 'IMAGE') {
          imageUploadSection.style.display = 'block';
          videoUploadSection.style.display = 'none';
          
          // Update visual states
          document.querySelectorAll('.media-type-option').forEach(option => {
            option.classList.remove('media-type-option-active');
          });
          this.closest('.media-type-option').classList.add('media-type-option-active');
          
        } else if (mediaType === 'VIDEO') {
          imageUploadSection.style.display = 'none';
          videoUploadSection.style.display = 'block';
          
          // Update visual states
          document.querySelectorAll('.media-type-option').forEach(option => {
            option.classList.remove('media-type-option-active');
          });
          this.closest('.media-type-option').classList.add('media-type-option-active');
        }
        
        // Clear previous media
        clearMediaPreview();
      });
    });
    
    // Upload button handlers
    uploadBtns.forEach(btn => {
      btn.addEventListener('click', async function() {
        const mediaType = this.dataset.type;
        try {
          await handleMediaUpload(mediaType, formEl);
        } catch (error) {
          console.error(`💥 ${mediaType} upload button error:`, error);
          // Error is already handled in handleMediaUpload, just log here
        }
      });
    });
    
    // 🎥 Video URL input handler (unified input field)
    const videoUrlInput = formEl.querySelector('input[name="videoUrl"]');
    
    if (videoUrlInput) {
      // 🛡️ Enhanced event management with debouncing and conflict prevention
      let previewTimeout;
      let lastPreviewUrl = '';
      
      function executePreview(url) {
        // Prevent redundant previews
        if (url === lastPreviewUrl) {
          console.log('🎬 Same URL, skipping preview');
          return;
        }
        lastPreviewUrl = url;
        handleVideoUrlPreview(url, formEl);
      }
      
      videoUrlInput.addEventListener('input', function() {
        const url = this.value.trim();
        
        // Clear previous timeout
        if (previewTimeout) {
          clearTimeout(previewTimeout);
        }
        
        // Auto-preview after user stops typing (1200ms delay - increased for stability)
        if (url && isValidUrlFormat(url)) {
          previewTimeout = setTimeout(() => {
            executePreview(url);
          }, 1200);
        }
      });
      
      // Handle Enter key for immediate preview
      videoUrlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const url = this.value.trim();
          if (url) {
            if (previewTimeout) clearTimeout(previewTimeout);
            executePreview(url);
          }
        }
      });
      
      // Handle paste events for immediate preview - with longer delay
      videoUrlInput.addEventListener('paste', function() {
        setTimeout(() => {
          const url = this.value.trim();
          if (url && isValidUrlFormat(url)) {
            if (previewTimeout) clearTimeout(previewTimeout);
            executePreview(url);
          }
        }, 300); // Increased delay for paste events
      });
    }

    // 🖼️ Poster upload handler
    const posterUploadBtn = formEl.querySelector('.upload-poster-btn');
    if (posterUploadBtn) {
      posterUploadBtn.addEventListener('click', async function() {
        await handlePosterUpload(formEl);
      });
    }
    
    // Clear media handler
    if (clearMediaBtn) {
      clearMediaBtn.addEventListener('click', function() {
        clearMediaPreview();
      });
    }
    
    // Image URL input change handler for auto-preview
    const imageUrlInput = formEl.querySelector('input[name="image"]');
    if (imageUrlInput) {
      imageUrlInput.addEventListener('input', function() {
        const url = this.value.trim();
        if (url && (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('supabase.co'))) {
          // Show preview for image URLs
          const mediaData = {
            url: url,
            originalName: 'Manual Input',
            mediaType: 'IMAGE',
            size: 0
          };
          showMediaPreview(mediaData, 'image');
        } else if (!url) {
          clearMediaPreview();
        }
      });
    }
    
    // Handle media upload with duplicate click protection
    let isUploading = false; // 防重复上传标志
    
    async function handleMediaUpload(mediaType, formEl) {
      // 防重复点击检查
      if (isUploading) {
        console.log('⚠️ Upload already in progress, ignoring duplicate click');
        return null;
      }
      
      console.log(`🎥 Starting ${mediaType} upload...`);
      isUploading = true; // 设置上传状态
      
      // 禁用上传按钮
      const uploadBtns = formEl.querySelectorAll('.upload-media-btn');
      uploadBtns.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
      });
      
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = mediaType === 'image' ? 'image/*' : 'video/*';
    
    return new Promise((resolve, reject) => {
      // 🔧 内部清理函数
      const cleanup = () => {
        isUploading = false;
        const uploadBtns = formEl.querySelectorAll('.upload-media-btn');
        uploadBtns.forEach(btn => {
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        });
        hideUploadProgress();
        console.log('🔄 Upload state reset, buttons re-enabled');
      };
      
      fileInput.onchange = async function(e) {
        try {
          const file = e.target.files[0];
          if (!file) {
            cleanup();
            resolve(null);
            return;
          }
          
          // 🛡️ File size validation (dynamic limits)
          const maxSizeBytes = mediaType === 'video' ? uploadLimits.maxVideoSize : uploadLimits.maxImageSize;
          const maxSizeMB = mediaType === 'video' ? uploadLimits.maxVideoSizeMB : uploadLimits.maxImageSizeMB;
          
          if (file.size > maxSizeBytes) {
            const error = new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`);
            cleanup();
            showUploadError(error.message);
            reject(error);
            return;
          }
          
          // Show upload progress
          showUploadProgress(mediaType, file.name);
          
          // Create form data with error handling
          const formData = new FormData();
          formData.append('file', file);
          formData.append('category', 'TodayNews');
          
    // 🚀 Try client-side direct upload first (for large files)
    let result;
    if (file.size > 10 * 1024 * 1024) { // Files larger than 10MB use direct upload
      console.log('🔄 Using direct upload for large file...');
      result = await directUploadToSupabase(file, mediaType);
    } else {
      console.log('🔄 Using server upload for small file...');
      result = await uploadWithProgress('/api/media/simple-upload', formData, mediaType);
    }
          
          if (result.success) {
            console.log('✅ Upload successful:', result.data);
            
            // Update form fields based on media type
            if (mediaType === 'image') {
              const imageInput = formEl.querySelector('input[name="image"]');
              if (imageInput) {
                imageInput.value = result.data.url;
                
                // 🖼️ Trigger preview update for image
                if (window.updateImagePreview) {
                  window.updateImagePreview(result.data.url);
                }
              }
            } else if (mediaType === 'video') {
              const videoUrlInput = formEl.querySelector('input[name="videoUrl"]');
              const videoPosterInput = formEl.querySelector('input[name="videoPoster"]'); // poster
              const durationInput = formEl.querySelector('input[name="videoDuration"]');
              
              if (videoUrlInput) {
                videoUrlInput.value = result.data.url;
                // Show video preview directly (no need for legacy handler)
                // handleVideoUrlPreview(result.data.url, formEl);
              }
              // ❌ REMOVED: Don't auto-fill poster with video URL (invalid)
              // Video URLs are not images and cannot be used as poster
              // Users should upload a separate poster image
              // if (videoPosterInput && !videoPosterInput.value) {
              //   videoPosterInput.value = result.data.url;  // This was incorrect
              // }
              if (durationInput && result.data.duration) {
                durationInput.value = Math.round(result.data.duration);
              }
            }
            
            // Show media preview in appropriate area
            console.log('📤 About to show media preview:', { resultData: result.data, mediaType });
            if (mediaType === 'video') {
              showVideoPreview(result.data, formEl);
            } else {
              showMediaPreview(result.data, mediaType);
            }
            
            cleanup();
            resolve(result.data);
          } else {
            const error = new Error(result.error || 'Upload failed');
            cleanup();
            showUploadError(error.message);
            reject(error);
          }
          
        } catch (error) {
          console.error('❌ Upload failed:', error);
          cleanup();
          showUploadError(error.message);
          reject(error);
        }
      };
      
      // 🚫 取消上传处理
      fileInput.oncancel = function() {
        console.log('📷 Upload cancelled by user');
        cleanup();
        resolve(null);
      };
      
      // Trigger file selection
      fileInput.click();
    }).catch(error => {
      // 🚨 最终错误处理，确保不会有未处理的Promise
      console.error('💥 Final upload error handler:', error);
      // 重新抛出让调用者处理，但现在不会是"unhandled"
      throw error;
    });
    }

    // 🚀 Direct upload to Supabase (bypasses Netlify Functions)
    async function directUploadToSupabase(file, mediaType) {
      console.log(`🚀 Starting direct upload to Supabase: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      try {
        // Step 1: Get upload URL from our API
        console.log('📡 Getting signed upload URL...');
        const urlResponse = await fetch('/api/media/get-upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            category: 'TodayNews'
          })
        });

        if (!urlResponse.ok) {
          throw new Error(`Failed to get upload URL: ${urlResponse.status}`);
        }

        const urlResult = await urlResponse.json();
        if (!urlResult.success) {
          throw new Error(urlResult.error || 'Failed to get upload URL');
        }

        const { uploadUrl, token, publicUrl, finalFileName, path, mediaType: resultMediaType } = urlResult.data;
        console.log('✅ Got upload URL, starting direct upload...');

        // Step 2: Upload directly to Supabase with progress tracking
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          let startTime = Date.now();

          // Progress tracking
          xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              const elapsed = Date.now() - startTime;
              const speed = event.loaded / (elapsed / 1000); // bytes per second
              const eta = (event.total - event.loaded) / speed;
              
              updateUploadProgress(mediaType, percentComplete, speed, eta, event.loaded, event.total);
              console.log(`📊 Direct upload progress: ${percentComplete}% (${(event.loaded / 1024 / 1024).toFixed(1)}MB / ${(event.total / 1024 / 1024).toFixed(1)}MB)`);
            }
          };

          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              console.log('✅ Direct upload to Supabase successful!');
              
              // Return result in the same format as server upload
              resolve({
                success: true,
                data: {
                  url: publicUrl,
                  path: path,
                  type: mediaType,
                  mediaType: resultMediaType,
                  size: file.size,
                  originalName: finalFileName,
                  category: 'TodayNews',
                  uploadedAt: new Date().toISOString(),
                  uploadMethod: 'direct' // Flag to indicate direct upload
                }
              });
            } else {
              reject(new Error(`Direct upload failed with status: ${xhr.status}`));
            }
          };

          xhr.onerror = function() {
            reject(new Error('Direct upload failed due to network error'));
          };

          xhr.ontimeout = function() {
            reject(new Error('Direct upload timed out'));
          };

          // Set timeout to 5 minutes for large files
          xhr.timeout = 300000; // 5 minutes
          
          // Upload to Supabase with correct method and headers
          xhr.open('PUT', uploadUrl);
          // Note: Don't set Authorization header for signed URLs - auth is in the URL
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

      } catch (error) {
        console.error('💥 Direct upload failed:', error);
        throw error;
      }
    }

    // 🖼️ Handle poster upload
    async function handlePosterUpload(formEl) {
      console.log('🖼️ Starting poster upload...');
      
      // Create file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      
      return new Promise((resolve, reject) => {
        fileInput.onchange = async function(e) {
          const file = e.target.files[0];
          if (!file) {
            resolve(null);
            return;
          }
          
          try {
            // Show upload progress
            showPosterUploadProgress();
            
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'TodayNews');
            
            // Upload to API with progress tracking
            const result = await uploadWithProgress('/api/media/simple-upload', formData, 'poster');
            
            if (result.success) {
              console.log('✅ Poster upload successful:', result.data);
              
              // Update poster input field (use videoPoster for video articles)
              const videoPosterInput = formEl.querySelector('input[name="videoPoster"]');
              if (videoPosterInput) {
                videoPosterInput.value = result.data.url;
                console.log('✅ Poster URL set in videoPoster input:', result.data.url);
                
                // 🖼️ Trigger preview update for poster (DISABLED - using showPosterPreview instead)
                // if (window.updateImagePreview) {
                //   window.updateImagePreview(result.data.url);
                // }
              } else {
                console.warn('❌ videoPoster input not found');
              }
              
              // Show poster preview
              showPosterPreview(result.data, formEl);
              
              // Show success message
              showUploadSuccess('Poster uploaded successfully!');
              resolve(result.data);
            } else {
              throw new Error(result.error || 'Upload failed');
            }
          } catch (error) {
            console.error('❌ Poster upload failed:', error);
            showUploadError(error.message);
            reject(error);
          } finally {
            hidePosterUploadProgress();
          }
        };
        
        // Trigger file selection
        fileInput.click();
      });
    }

    // 📊 Upload with progress tracking with enhanced speed calculation
    function uploadWithProgress(url, formData, uploadType) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let startTime = Date.now();
        let lastLoaded = 0;
        let lastTime = startTime;

        // Track upload progress with speed and ETA calculation
        xhr.upload.onprogress = function(event) {
          if (event.lengthComputable) {
            const currentTime = Date.now();
            const timeDiff = currentTime - lastTime;
            const loadedDiff = event.loaded - lastLoaded;
            
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            
            // Calculate speed and ETA
            let speed = 0;
            let eta = 0;
            if (timeDiff > 100 && loadedDiff > 0) {
              speed = (loadedDiff * 1000) / timeDiff; // bytes per second
              const remainingBytes = event.total - event.loaded;
              eta = Math.round(remainingBytes / speed);
              
              lastLoaded = event.loaded;
              lastTime = currentTime;
            }
            
            updateUploadProgress(uploadType, percentComplete, speed, eta, event.loaded, event.total);
          }
        };

        // Ensure progress starts at 0
        updateUploadProgress(uploadType, 0, 0, 0, 0, 0);

        // Handle completion
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            // Try to extract error message from server response
            let errorMessage = `Upload failed with status: ${xhr.status}`;
            try {
              const errorResult = JSON.parse(xhr.responseText);
              if (errorResult && errorResult.error) {
                errorMessage = errorResult.error;
              } else if (errorResult && errorResult.message) {
                errorMessage = errorResult.message;
              }
            } catch (parseError) {
              // If we can't parse the response, use the response text directly if it looks like an error message
              if (xhr.responseText && xhr.responseText.length < 200 && !xhr.responseText.includes('<')) {
                errorMessage = xhr.responseText;
              }
            }
            reject(new Error(errorMessage));
          }
        };

        // Handle errors
        xhr.onerror = function() {
          reject(new Error('Upload failed due to network error'));
        };

        // Handle timeout
        xhr.ontimeout = function() {
          reject(new Error('Upload failed due to timeout'));
        };

        // Start upload
        xhr.open('POST', url);
        xhr.withCredentials = true;
        xhr.timeout = 60000; // 60 seconds timeout for large video files
        xhr.send(formData);
      });
    }

    // Show upload progress with progress bar
    function showUploadProgress(mediaType, fileName) {
      const btn = formEl.querySelector(`[data-type="${mediaType}"]`);
      if (btn) {
        btn.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <svg style="width:14px;height:14px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <span>Uploading...</span>
            </div>
            <div class="progress-container" style="width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
              <div class="progress-bar" style="height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); width: 0%; transition: width 0.3s ease; border-radius: 2px;"></div>
            </div>
            <span class="progress-text" style="font-size: 11px; opacity: 0.8;">0%</span>
          </div>
        `;
        btn.disabled = true;
        
        // Ensure progress starts at 0
        setTimeout(() => {
          updateUploadProgress(mediaType, 0);
        }, 50);
      }
    }

    // Update upload progress with enhanced information
    function updateUploadProgress(uploadType, percentage, speed = 0, eta = 0, loaded = 0, total = 0) {
      let btn;
      if (uploadType === 'poster') {
        btn = formEl.querySelector('.upload-poster-btn');
      } else {
        btn = formEl.querySelector(`[data-type="${uploadType}"]`);
      }
      
      if (btn) {
        const progressBar = btn.querySelector('.progress-bar');
        const progressText = btn.querySelector('.progress-text');
        
        if (progressBar) {
          progressBar.style.width = `${percentage}%`;
          
          // Add shimmer effect during upload
          if (percentage > 0 && percentage < 100) {
            progressBar.classList.add('progress-bar-shimmer');
          } else {
            progressBar.classList.remove('progress-bar-shimmer');
          }
        }
        
        if (progressText) {
          let statusText = `${percentage}%`;
          
          // Add speed and ETA information if available
          if (speed > 0 && eta > 0 && percentage > 5) {
            const speedMBps = (speed / 1024 / 1024).toFixed(1);
            
            // Format ETA
            let etaText = '';
            if (eta < 60) {
              etaText = `${eta}s`;
            } else if (eta < 3600) {
              const minutes = Math.floor(eta / 60);
              const seconds = eta % 60;
              etaText = `${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}`;
            } else {
              etaText = 'calculating...';
            }
            
            statusText = `${percentage}% • ${speedMBps} MB/s • ${etaText}`;
          }
          
          progressText.textContent = statusText;
        }
      }
    }
    
    // Hide upload progress
    function hideUploadProgress() {
      uploadBtns.forEach(btn => {
        const mediaType = btn.dataset.type;
        btn.innerHTML = mediaType === 'image' ? 'Upload Image...' : 'Upload Video...';
        btn.disabled = false;
      });
    }
    
    // Show upload error with enhanced messaging
    function showUploadError(message) {
      console.error('📤 Upload Error:', message);
      
      const errorDiv = formEl.querySelector('#formError') || document.createElement('div');
      errorDiv.id = 'formError';
      errorDiv.className = 'error-message upload-error';
      
      // Enhanced styling for better visibility
      errorDiv.style.cssText = `
        display: block;
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15));
        border: 2px solid rgba(239, 68, 68, 0.4);
        color: #dc2626;
        padding: 16px;
        border-radius: 12px;
        margin: 12px 0;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        position: relative;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        animation: errorSlideIn 0.3s ease-out;
      `;
      
      // Enhanced error message with file size guidance
      let errorContent = '';
      if (message.toLowerCase().includes('too large') || message.toLowerCase().includes('maximum') || message.toLowerCase().includes('50mb')) {
        errorContent = `
          <div style="display: flex; align-items: start; gap: 10px;">
            <svg style="width:20px;height:20px;flex-shrink:0;margin-top:2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">File Too Large</div>
              <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">${message}</div>
              <div style="font-size: 12px; opacity: 0.8;">
                💡 <strong>Tips:</strong> 
                • Images: max 10MB (JPG, PNG, GIF, WebP)
                • Videos: max 50MB (MP4, WebM, OGG)
                • Consider compressing your file before uploading
              </div>
            </div>
          </div>
        `;
      } else {
        errorContent = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>Upload failed: ${message}</span>
          </div>
        `;
      }
      
      errorDiv.innerHTML = errorContent;
      
      if (!formEl.contains(errorDiv)) {
        // Insert error div at the top of the form for better visibility
        formEl.insertBefore(errorDiv, formEl.firstChild);
      }
      
      // Scroll error into view
      errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Clear error after 12 seconds (longer for file size errors so users can read tips)
      const clearDelay = message.toLowerCase().includes('too large') ? 15000 : 8000;
      setTimeout(() => {
        if (errorDiv && errorDiv.parentNode) {
          errorDiv.style.opacity = '0';
          errorDiv.style.transform = 'translateY(-10px)';
          errorDiv.style.transition = 'all 0.3s ease-out';
          setTimeout(() => {
            if (errorDiv.parentNode) {
          errorDiv.style.display = 'none';
        }
          }, 300);
        }
      }, clearDelay);
      
      // Also show as browser alert for critical errors like file size
      if (message.toLowerCase().includes('too large') || message.toLowerCase().includes('maximum')) {
        alert(`❌ ${message}\n\n💡 File size limits:\n• Images: max 10MB\n• Videos: max 50MB\n\nPlease compress your file and try again.`);
      }
    }

    // Show poster upload progress with progress bar
    function showPosterUploadProgress() {
      const btn = formEl.querySelector('.upload-poster-btn');
      if (btn) {
        btn.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <svg style="width:14px;height:14px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <span>Uploading...</span>
            </div>
            <div class="progress-container" style="width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
              <div class="progress-bar" style="height: 100%; background: linear-gradient(90deg, #06b6d4, #0891b2); width: 0%; transition: width 0.3s ease; border-radius: 2px;"></div>
            </div>
            <span class="progress-text" style="font-size: 11px; opacity: 0.8;">0%</span>
          </div>
        `;
        btn.disabled = true;
        
        // Ensure progress starts at 0
        setTimeout(() => {
          updateUploadProgress('poster', 0);
        }, 50);
      }
    }

    // Hide poster upload progress
    function hidePosterUploadProgress() {
      const btn = formEl.querySelector('.upload-poster-btn');
      if (btn) {
        btn.innerHTML = 'Upload Poster...';
        btn.disabled = false;
      }
    }

    // Show upload success message
    function showUploadSuccess(message) {
      const successDiv = formEl.querySelector('#formSuccess') || document.createElement('div');
      successDiv.id = 'formSuccess';
      successDiv.className = 'success-message';
      successDiv.style.cssText = `
        display: block; 
        background: rgba(34, 197, 94, 0.1); 
        border: 1px solid rgba(34, 197, 94, 0.3); 
        color: #22c55e; 
        padding: 12px; 
        border-radius: 8px; 
        margin: 8px 0; 
        font-size: 14px;
      `;
      successDiv.textContent = message;
      
      if (!formEl.contains(successDiv)) {
        formEl.appendChild(successDiv);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 3000);
    }
    
    // Note: showVideoPreview and showPosterPreview functions moved to global scope

    // Show media preview (legacy/routing function - DISABLED to prevent duplicates)
    function showMediaPreview(mediaData, mediaType) {
      console.log('🖼️ showMediaPreview called - routing to specific preview:', { mediaData, mediaType });
      
      // Route to dedicated preview areas ONLY
      if (mediaType === 'video') {
        showVideoPreview(mediaData, null);
        return;
      }
      
      if (mediaType === 'poster') {
        showPosterPreview(mediaData);
        return;
      }
      
      if (mediaType === 'image') {
        // 🖼️ Enable image preview for regular images
        console.log('🖼️ Showing image preview for regular image');
        if (window.updateImagePreview && mediaData.url) {
          window.updateImagePreview(mediaData.url);
        } else {
          console.warn('⚠️ updateImagePreview function not available or no URL provided');
        }
        return;
      }
      
      console.warn('⚠️ Legacy media preview disabled for type:', mediaType);
    }
    
    // Clear all previews
    function clearAllPreviews() {
      const videoPreviewWrap = formEl.querySelector('#videoPreviewWrap');
      const posterPreviewWrap = formEl.querySelector('#posterPreviewWrap');
      const mediaPreviewWrap = formEl.querySelector('#mediaPreviewWrap');
      
      if (videoPreviewWrap) videoPreviewWrap.style.display = 'none';
      if (posterPreviewWrap) posterPreviewWrap.style.display = 'none';
      if (mediaPreviewWrap) mediaPreviewWrap.style.display = 'none';
    }
    
    // Clear video preview
    function clearVideoPreview() {
      const videoPreviewWrap = formEl.querySelector('#videoPreviewWrap');
      if (videoPreviewWrap) {
        videoPreviewWrap.style.display = 'none';
      }
      
      const videoUrlInput = formEl.querySelector('input[name="videoUrl"]');
      const durationInput = formEl.querySelector('input[name="videoDuration"]');
      
      if (videoUrlInput) videoUrlInput.value = '';
      if (durationInput) durationInput.value = '';
    }
    
    // Clear poster preview
    function clearPosterPreview() {
      const posterPreviewWrap = formEl.querySelector('#posterPreviewWrap');
      if (posterPreviewWrap) {
        posterPreviewWrap.style.display = 'none';
      }
      
      const videoPosterInput = formEl.querySelector('input[name="videoPoster"]');
      if (videoPosterInput) videoPosterInput.value = '';
    }
    
    // Clear media preview (legacy)
    function clearMediaPreview() {
      clearAllPreviews();
      
      // Clear form inputs
      const imageInput = formEl.querySelector('input[name="image"]');
      const videoUrlInput = formEl.querySelector('input[name="videoUrl"]');
      const durationInput = formEl.querySelector('input[name="videoDuration"]');
      
      if (imageInput) imageInput.value = '';
      if (videoUrlInput) videoUrlInput.value = '';
      if (durationInput) durationInput.value = '';
    }
    
    // Helper functions
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function formatDuration(seconds) {
      if (!seconds || seconds <= 0) return '';
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Check for existing image URL and show preview on form load
    function checkExistingImagePreview() {
      const imageUrlInput = formEl.querySelector('input[name="image"]');
      if (imageUrlInput && imageUrlInput.value.trim()) {
        const url = imageUrlInput.value.trim();
        if (url && (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('supabase.co'))) {
          const mediaData = {
            url: url,
            originalName: 'Existing Image',
            mediaType: 'IMAGE',
            size: 0
          };
          showMediaPreview(mediaData, 'image');
        }
      }
    }
    
    // Initialize existing image preview check
    setTimeout(checkExistingImagePreview, 100);
  };

  // 🎥 Global Video Preview Function
  function showVideoPreview(mediaData, formElement = null) {
    console.log('🎥 showVideoPreview called:', mediaData);
    
    const formEl = formElement || document.querySelector('#articleForm') || document.querySelector('.admin-manager-modal form');
    if (!formEl) {
      console.error('❌ No form element found for video preview');
      return;
    }
    
    const videoPreviewWrap = formEl.querySelector('#videoPreviewWrap');
    const videoPreview = formEl.querySelector('#videoPreview');
    const videoPreviewTitle = formEl.querySelector('#videoPreviewTitle');
    const videoPreviewDetails = formEl.querySelector('#videoPreviewDetails');
    
    if (!videoPreviewWrap || !videoPreview || !videoPreviewTitle || !videoPreviewDetails) {
      console.error('❌ Missing video preview DOM elements');
      return;
    }
    
    videoPreviewWrap.style.display = 'flex';
    
    videoPreview.innerHTML = `
      <div style="position: relative; width:100%;height:100%;">
        <video id="previewVideoElement" src="${mediaData.url}" style="width:100%;height:100%;object-fit:cover;" controls muted preload="metadata">
          Your browser does not support video playback.
        </video>
        <div style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.7);color:white;padding:2px 6px;border-radius:4px;font-size:10px;">VIDEO</div>
      </div>
    `;
    
    videoPreviewTitle.textContent = `Video: ${mediaData.originalName || 'Video File'}`;
    videoPreviewDetails.innerHTML = `
      <div>Type: VIDEO</div>
      <div>Size: ${formatFileSize(mediaData.size)}</div>
      <div id="videoDurationDisplay">${mediaData.duration ? `Duration: ${formatDuration(mediaData.duration)}` : 'Duration: Detecting...'}</div>
      <div>URL: <code style="font-size:10px;">${mediaData.url}</code></div>
    `;
    
    // 🕒 Auto-detect video duration from the preview video element
    setTimeout(() => {
      const videoElement = formEl.querySelector('#previewVideoElement');
      const durationInput = formEl.querySelector('input[name="videoDuration"]');
      const durationDisplay = formEl.querySelector('#videoDurationDisplay');
      
      if (!mediaData.duration) {
        console.log('🎬 Setting up video duration auto-detection...');
        
        // Check if this is a YouTube or Vimeo URL that needs special handling
        const isYouTube = mediaData.url.includes('youtube.com') || mediaData.url.includes('youtu.be');
        const isVimeo = mediaData.url.includes('vimeo.com');
        
        if (isYouTube || isVimeo) {
          // For YouTube/Vimeo, we can't detect duration from embedded player
          // Show a helpful message
          if (durationDisplay) {
            durationDisplay.innerHTML = `
              Duration: <span style="color: #f59e0b;">Please enter manually</span>
              <br><small style="color: #6b7280; font-size: 11px;">YouTube/Vimeo duration cannot be auto-detected</small>
            `;
          }
          console.log('ℹ️ YouTube/Vimeo video - duration must be entered manually');
        } else if (videoElement) {
          // For direct video files, use the HTML5 video element
          videoElement.addEventListener('loadedmetadata', function() {
            const duration = videoElement.duration;
            if (duration && isFinite(duration)) {
              const roundedDuration = Math.round(duration);
              console.log('✅ Video duration detected:', roundedDuration + 's');
              
              // Update duration input field
              if (durationInput) {
                durationInput.value = roundedDuration;
                console.log('📝 Duration input field updated:', roundedDuration);
              }
              
              // Update display in preview
              if (durationDisplay) {
                durationDisplay.textContent = `Duration: ${formatDuration(duration)}`;
              }
              
              // Update mediaData for future reference
              mediaData.duration = roundedDuration;
            } else {
              console.warn('⚠️ Could not detect video duration');
              if (durationDisplay) {
                durationDisplay.textContent = 'Duration: Unable to detect';
              }
            }
          });
          
          videoElement.addEventListener('error', function() {
            console.error('❌ Error loading video for duration detection');
            if (durationDisplay) {
              durationDisplay.textContent = 'Duration: Detection failed';
            }
          });
        }
      } else if (mediaData.duration) {
        console.log('✅ Video duration already available:', mediaData.duration);
      }
      
      // 🗑️ Bind clear video button event listener
      const clearVideoBtn = formEl.querySelector('#clearVideoBtn');
      if (clearVideoBtn) {
        clearVideoBtn.addEventListener('click', function() {
          window.clearVideoPreview(formEl);
        });
      }
    }, 100); // Small delay to ensure DOM is ready
  }
  
  // 🗑️ Global Clear Functions
  window.clearVideoPreview = function(formElement = null) {
    const formEl = formElement || document.querySelector('#articleForm') || document.querySelector('.admin-manager-modal form');
    if (!formEl) return;
    
    const videoPreviewWrap = formEl.querySelector('#videoPreviewWrap');
    if (videoPreviewWrap) {
      videoPreviewWrap.style.display = 'none';
    }
    
    const videoUrlInput = formEl.querySelector('input[name="videoUrl"]');
    const durationInput = formEl.querySelector('input[name="videoDuration"]');
    
    if (videoUrlInput) videoUrlInput.value = '';
    if (durationInput) durationInput.value = '';
    
    console.log('🗑️ Video preview cleared successfully');
  };
  
  window.clearPosterPreview = function(formElement = null) {
    const formEl = formElement || document.querySelector('#articleForm') || document.querySelector('.admin-manager-modal form');
    if (!formEl) return;
    
    const posterPreviewWrap = formEl.querySelector('#posterPreviewWrap');
    if (posterPreviewWrap) {
      posterPreviewWrap.style.display = 'none';
    }
    
    const videoPosterInput = formEl.querySelector('input[name="videoPoster"]');
    if (videoPosterInput) videoPosterInput.value = '';
    
    console.log('🗑️ Poster preview cleared successfully');
  };

  // 🖼️ Global Poster Preview Function
  function showPosterPreview(mediaData, formElement = null) {
    console.log('🖼️ showPosterPreview called:', mediaData);
    
    const formEl = formElement || document.querySelector('#articleForm') || document.querySelector('.admin-manager-modal form');
    if (!formEl) {
      console.error('❌ No form element found for poster preview');
      return;
    }
    
    const posterPreviewWrap = formEl.querySelector('#posterPreviewWrap');
    const posterPreview = formEl.querySelector('#posterPreview');
    const posterPreviewTitle = formEl.querySelector('#posterPreviewTitle');
    const posterPreviewDetails = formEl.querySelector('#posterPreviewDetails');
    
    if (!posterPreviewWrap || !posterPreview || !posterPreviewTitle || !posterPreviewDetails) {
      console.error('❌ Missing poster preview DOM elements');
      return;
    }
    
    posterPreviewWrap.style.display = 'flex';
    
    posterPreview.innerHTML = `
      <div style="position: relative; width:100%;height:100%;">
        <img src="${mediaData.url}" alt="Poster Preview" style="width:100%;height:100%;object-fit:cover;" 
             onload="console.log('✅ Poster loaded successfully')" 
             onerror="console.error('❌ Poster failed to load:', this.src)" />
        <div style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.7);color:white;padding:2px 6px;border-radius:4px;font-size:10px;">POSTER</div>
      </div>
    `;
    
    posterPreviewTitle.textContent = `Poster: ${mediaData.originalName || 'Poster Image'}`;
    posterPreviewDetails.innerHTML = `
      <div>Type: POSTER</div>
      <div>Size: ${formatFileSize(mediaData.size)}</div>
      <div>URL: <code style="font-size:10px;">${mediaData.url}</code></div>
    `;
    
    // 🗑️ Bind clear poster button event listener
    setTimeout(() => {
      const clearPosterBtn = formEl.querySelector('#clearPosterBtn');
      if (clearPosterBtn) {
        clearPosterBtn.addEventListener('click', function() {
          window.clearPosterPreview(formEl);
        });
      }
    }, 100); // Small delay to ensure DOM is ready
  }

  // 🛠️ Global File Size Formatter
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 🛠️ Global Duration Formatter
  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // 🆕 Media Library Management System
  function initializeMediaLibrary() {
    console.log('📚 Initializing Media Library...');
    
    // State management
    let currentPage = 1;
    let currentType = '';
    let currentCategory = '';
    let currentSearch = '';
    let currentFiles = [];
    let totalPages = 1;
    
    // Elements
    const mediaSearch = document.getElementById('mediaSearch');
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const refreshBtn = document.getElementById('refreshLibrary');
    const mediaGrid = document.getElementById('mediaGrid');
    const paginationControls = document.getElementById('paginationControls');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    
    // Statistics elements
    const libraryImageCount = document.getElementById('libraryImageCount');
    const libraryVideoCount = document.getElementById('libraryVideoCount');
    const libraryTotalFiles = document.getElementById('libraryTotalFiles');
    const totalLibrarySize = document.getElementById('totalLibrarySize');
    const recentUploads = document.getElementById('recentUploads');
    
    // Modal elements
    const previewModal = document.getElementById('mediaPreviewModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const closePreview = document.getElementById('closePreview');
    const mediaPreview = document.getElementById('mediaPreview');
    const mediaEditForm = document.getElementById('mediaEditForm');
    const mediaTitle = document.getElementById('mediaTitle');
    const mediaCategory = document.getElementById('mediaCategory');
    const fileInfo = document.getElementById('fileInfo');
    const copyUrlBtn = document.getElementById('copyUrlBtn');
    const deleteFileBtn = document.getElementById('deleteFileBtn');
    
    let currentMediaFile = null;
    
    // Initialize
    loadMediaFiles();
    loadStats();
    loadCategories();
    
    // Event listeners
    if (mediaSearch) {
      mediaSearch.addEventListener('input', debounce((e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        loadMediaFiles();
      }, 300));
    }
    
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        currentType = e.target.value;
        currentPage = 1;
        loadMediaFiles();
      });
    }
    
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        currentPage = 1;
        loadMediaFiles();
      });
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadMediaFiles();
        loadStats();
        loadCategories();
      });
    }
    
    // Pagination
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          loadMediaFiles();
        }
      });
    }
    
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadMediaFiles();
        }
      });
    }
    
    // Modal events
    if (closePreview) {
      closePreview.addEventListener('click', closePreviewModal);
    }
    
    if (modalOverlay) {
      modalOverlay.addEventListener('click', closePreviewModal);
    }
    
    if (mediaEditForm) {
      mediaEditForm.addEventListener('submit', handleMediaUpdate);
    }
    
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', copyMediaUrl);
    }
    
    if (deleteFileBtn) {
      deleteFileBtn.addEventListener('click', handleMediaDelete);
    }
    
    // Load media files
    async function loadMediaFiles() {
      if (!mediaGrid) return;
      
      try {
        showLoading();
        
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20'
        });
        
        if (currentType) params.append('type', currentType);
        if (currentCategory) params.append('category', currentCategory);
        if (currentSearch) params.append('search', currentSearch);
        
        console.log('📋 Loading media files with params:', Object.fromEntries(params));
        
        const response = await fetch(`/api/media/library?action=list&${params}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load media files');
        }
        
        currentFiles = data.files || [];
        totalPages = data.pagination?.pages || 1;
        
        renderMediaGrid(currentFiles);
        updatePagination(data.pagination);
        
        console.log(`✅ Loaded ${currentFiles.length} media files`);
      } catch (error) {
        console.error('❌ Failed to load media files:', error);
        showError('Failed to load media files: ' + error.message);
      }
    }
    
    // Load statistics
    async function loadStats() {
      try {
        const response = await fetch('/api/media/library?action=stats');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load stats');
        }
        
        // Update statistics
        if (libraryImageCount) libraryImageCount.textContent = data.imageCount || 0;
        if (libraryVideoCount) libraryVideoCount.textContent = data.videoCount || 0;
        if (libraryTotalFiles) libraryTotalFiles.textContent = data.totalFiles || 0;
        if (totalLibrarySize) totalLibrarySize.textContent = (data.totalSizeMB || 0) + ' MB';
        if (recentUploads) recentUploads.textContent = data.recentUploads || 0;
        
        console.log('📊 Stats updated:', data);
      } catch (error) {
        console.error('❌ Failed to load stats:', error);
      }
    }
    
    // Load categories
    async function loadCategories() {
      if (!categoryFilter) return;
      
      try {
        const response = await fetch('/api/media/library?action=categories');
        const data = await response.json();
        
        if (!response.ok) return;
        
        // Clear and populate categories
        while (categoryFilter.children.length > 1) {
          categoryFilter.removeChild(categoryFilter.lastChild);
        }
        
        const categories = data.categories || [];
        categories.forEach(category => {
          const option = document.createElement('option');
          option.value = category;
          option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
          categoryFilter.appendChild(option);
        });
        
      } catch (error) {
        console.error('❌ Failed to load categories:', error);
      }
    }
    
    // Render media grid
    function renderMediaGrid(files) {
      if (!mediaGrid) return;
      
      if (files.length === 0) {
        mediaGrid.innerHTML = '<div class="empty-state">No media files found</div>';
        return;
      }
      
      mediaGrid.innerHTML = files.map(file => `
        <div class="media-card" data-id="${file.id}" onclick="previewMedia(${file.id})">
          <div class="media-thumbnail">
            ${file.mediaType === 'IMAGE' 
              ? `<img src="${file.url}" alt="${file.title || file.filename}" loading="lazy">`
              : `<video src="${file.url}" preload="none"></video>`
            }
            <div class="media-type-badge">${file.mediaType}</div>
          </div>
          <div class="media-info">
            <h4 class="media-title">${file.title || file.filename}</h4>
            <div class="media-meta">
              <span class="file-size">${formatFileSize(file.fileSize)}</span>
              <span class="upload-date">${formatDate(file.uploadedAt)}</span>
            </div>
            <div class="media-category">${file.category}</div>
          </div>
          <div class="media-actions">
            <button class="action-btn" onclick="event.stopPropagation(); previewMedia(${file.id})" title="Preview">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="action-btn" onclick="event.stopPropagation(); copyMediaUrl('${file.url}')" title="Copy URL">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('');
    }
    
    // Update pagination
    function updatePagination(pagination) {
      if (!paginationControls || !pagination) return;
      
      totalPages = pagination.pages;
      
      if (totalPages <= 1) {
        paginationControls.style.display = 'none';
        return;
      }
      
      paginationControls.style.display = 'flex';
      
      if (prevPageBtn) {
        prevPageBtn.disabled = currentPage <= 1;
      }
      
      if (nextPageBtn) {
        nextPageBtn.disabled = currentPage >= totalPages;
      }
      
      if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      }
    }
    
    // Preview media (moved to global scope)
    async function previewMedia(fileId) {
      try {
        const response = await fetch(`/api/media/library?action=detail&id=${fileId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load media details');
        }
        
        currentMediaFile = data.file;
        showPreviewModal(currentMediaFile);
        
      } catch (error) {
        console.error('❌ Failed to preview media:', error);
        showError('Failed to load media details: ' + error.message);
      }
    }
    
    // Make it globally available
    window.previewMedia = previewMedia;
    
    // Show preview modal
    function showPreviewModal(file) {
      if (!previewModal || !file) return;
      
      // Update preview content
      if (mediaPreview) {
        if (file.mediaType === 'IMAGE') {
          mediaPreview.innerHTML = `<img src="${file.url}" alt="${file.title || file.filename}">`;
        } else {
          mediaPreview.innerHTML = `<video src="${file.url}" controls></video>`;
        }
      }
      
      // Update form fields
      if (mediaTitle) mediaTitle.value = file.title || '';
      if (mediaCategory) mediaCategory.value = file.category || 'misc';
      
      // Update file info
      if (fileInfo) {
        fileInfo.innerHTML = `
          <div><strong>Filename:</strong> ${file.filename}</div>
          <div><strong>Size:</strong> ${formatFileSize(file.fileSize)}</div>
          <div><strong>Type:</strong> ${file.mimeType}</div>
          <div><strong>Uploaded:</strong> ${formatDate(file.uploadedAt)}</div>
          <div><strong>Usage Count:</strong> ${file.usageCount || 0}</div>
        `;
      }
      
      // Show modal
      previewModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
    
    // Close preview modal
    function closePreviewModal() {
      if (previewModal) {
        previewModal.style.display = 'none';
        document.body.style.overflow = '';
        currentMediaFile = null;
      }
    }
    
    // Handle media update
    async function handleMediaUpdate(e) {
      e.preventDefault();
      
      if (!currentMediaFile) return;
      
      try {
        const formData = new FormData(mediaEditForm);
        const updateData = {
          id: currentMediaFile.id,
          title: formData.get('title'),
          category: formData.get('category')
        };
        
        const response = await fetch('/api/media/library', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update media');
        }
        
        showSuccess('Media updated successfully');
        closePreviewModal();
        loadMediaFiles(); // Refresh the grid
        
      } catch (error) {
        console.error('❌ Failed to update media:', error);
        showError('Failed to update media: ' + error.message);
      }
    }
    
    // Copy media URL (moved to global scope)
    function copyMediaUrl(url) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          showSuccess('URL copied to clipboard');
        }).catch(error => {
          console.error('❌ Failed to copy URL:', error);
          showError('Failed to copy URL');
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showSuccess('URL copied to clipboard');
        } catch (error) {
          console.error('❌ Failed to copy URL:', error);
          showError('Failed to copy URL');
        }
        document.body.removeChild(textArea);
      }
    }
    
    // Make it globally available
    window.copyMediaUrl = copyMediaUrl;
    
    // Handle media delete
    async function handleMediaDelete() {
      if (!currentMediaFile) return;
      
      if (!confirm(`Are you sure you want to delete "${currentMediaFile.filename}"? This action cannot be undone.`)) {
        return;
      }
      
      try {
        const response = await fetch(`/api/media/library?id=${currentMediaFile.id}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete media');
        }
        
        showSuccess('Media deleted successfully');
        closePreviewModal();
        loadMediaFiles(); // Refresh the grid
        loadStats(); // Refresh stats
        
      } catch (error) {
        console.error('❌ Failed to delete media:', error);
        showError('Failed to delete media: ' + error.message);
      }
    }
    
    // Utility functions
    function showLoading() {
      if (mediaGrid) {
        mediaGrid.innerHTML = `
          <div class="loading-placeholder">
            <div class="loading-spinner"></div>
            <p>Loading media files...</p>
          </div>
        `;
      }
    }
    
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
    
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    function formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    function showSuccess(message) {
      console.log('✅', message);
      // You can replace this with a proper toast notification system
      alert('Success: ' + message);
    }
    
    function showError(message) {
      console.error('❌', message);
      // You can replace this with a proper toast notification system
      alert('Error: ' + message);
    }
    
    // Listen for upload success events to refresh the library
    document.addEventListener('mediaUploadSuccess', function(event) {
      console.log('📤 Media upload detected, refreshing library...');
      setTimeout(() => {
        loadMediaFiles();
        loadStats();
      }, 1000); // Small delay to ensure database is updated
    });
  }
  
});