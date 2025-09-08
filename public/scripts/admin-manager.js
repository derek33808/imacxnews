// 🚀 Enhanced Global Cache Management with Sync Manager
// This will be handled by the Cache Sync Manager - legacy function for compatibility
window.clearAllArticleCaches = function() {
  console.log('🧹 Legacy cache clear function called - delegating to Cache Sync Manager...');
  
  if (window.cacheSyncManager) {
    window.cacheSyncManager.clearAllCaches();
  } else {
    // Fallback to old implementation
    console.log('⚠️ Cache Sync Manager not available, using fallback...');
    
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
document.addEventListener('DOMContentLoaded', function() {
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
  // Confirm modal elements
  let confirmModal;
  let confirmResolve;
  
  function ensureFormModal() {
    if (formModal) return;
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
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
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
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>Video URL
                <div style="display:flex; gap:12px; align-items:stretch;">
                  <input name="videoUrl" placeholder="Video will be uploaded here..." style="flex:1;" readonly />
                  <button type="button" class="upload-media-btn" data-type="video" style="white-space:nowrap; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">Upload Video...</button>
                </div>
                <small style="color:#6b7280;font-size:13px;margin-top:8px;display:block;">Supports MP4, WebM, OGG (max 50MB)</small>
              </label>
              
              <label style="margin-top: 12px;">
                <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>Video Poster (Thumbnail)
                <input name="image" placeholder="Auto-generated from video or custom URL" style="width: 100%;" />
                <small style="color:#6b7280;font-size:13px;margin-top:8px;display:block;">Poster image will be auto-generated or you can specify a custom one</small>
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

            <!-- Media Preview -->
            <div id="mediaPreviewWrap" style="display:none; gap:16px; align-items:center; margin-top: 16px; padding: 16px; background: rgba(139, 92, 246, 0.05); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);">
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
    document.body.appendChild(formModal);
    
    formEl = formModal.querySelector('#articleForm');
    formTitleEl = formModal.querySelector('#formTitle');
    submitBtnEl = formModal.querySelector('#submitFormBtn');
    const closeBtn = formModal.querySelector('#closeFormModal');
    const cancelBtn = formModal.querySelector('#cancelFormBtn');
    
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
    const imagePreview = formEl.querySelector('#imagePreview');
    const imagePreviewWrap = formEl.querySelector('#imagePreviewWrap');
    const imagePreviewText = formEl.querySelector('#imagePreviewText');
    const triggerFileBtn = formEl.querySelector('#triggerFileSelectBtn');
    if (triggerFileBtn && fileInput) {
      triggerFileBtn.addEventListener('click', () => fileInput.click());
    }

    // Update image preview function
    function updateImagePreview(url = '') {
      const trimmedUrl = url.trim();
      console.log('🖼️ Updating image preview with URL:', trimmedUrl);
      
      if (!trimmedUrl) {
        // Show placeholder
        imagePreview.innerHTML = `
          <svg style="width:32px;height:32px;color:#9ca3af;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          <span style="font-size:10px;color:#9ca3af;margin-top:4px;">No preview image</span>`;
        imagePreview.style.cssText = 'width:160px;height:90px;border:2px dashed #d1d5db;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f9fafb;';
        imagePreviewWrap.style.display = 'none';
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
        imagePreview.innerHTML = '';
        imagePreview.appendChild(img);
        imagePreview.style.cssText = 'width:160px;height:90px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;';
        imagePreviewWrap.style.display = 'flex';
      };
      
      // Handle load error
      img.onerror = function() {
        console.log('❌ Image failed to load:', trimmedUrl);
        imagePreview.innerHTML = `
          <svg style="width:32px;height:32px;color:#ef4444;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          <span style="font-size:10px;color:#ef4444;margin-top:4px;">Failed to load</span>`;
        imagePreview.style.cssText = 'width:160px;height:90px;border:2px dashed #fca5a5;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fef2f2;';
        imagePreviewWrap.style.display = 'flex';
      };
      
      // Show loading state initially
      imagePreview.innerHTML = `
        <svg style="width:24px;height:24px;color:#8b5cf6;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        <span style="font-size:10px;color:#8b5cf6;margin-top:4px;">Loading...</span>`;
      imagePreview.style.cssText = 'width:160px;height:90px;border:1px solid #d1d5db;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f9fafb;';
      imagePreviewWrap.style.display = 'flex';
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
        updateImagePreview(this.value);
      });
      
      imageUrlInput.addEventListener('blur', function() {
        const value = this.value.trim();
        if (value && (value.includes('example.com') || value.includes('placeholder.com') || (!value.startsWith('http') && !value.startsWith('/')))) {
          this.value = '/images/placeholder.svg';
          alert('Please enter a valid image URL (starting with http/https) or use the local upload feature');
          updateImagePreview(this.value);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        if (!fileInput.files || fileInput.files.length === 0) return;
        const file = fileInput.files[0];
        
        // Show preview immediately with uploaded file
        const fileUrl = URL.createObjectURL(file);
        updateImagePreview(fileUrl);
        imagePreviewText.textContent = 'Uploading...';
        
        try {
          const fd = new FormData();
          fd.append('file', file);
          // Try to derive slug from title
          const titleVal = formEl.querySelector('[name="title"]').value || 'image';
          const categoryVal = formEl.querySelector('[name="category"]').value || 'uploads';
          fd.append('slug', titleVal);
          fd.append('category', categoryVal);
          const resp = await fetch('/api/upload', { method: 'POST', body: fd });
          if (!resp.ok) throw new Error('Upload failed');
          const json = await resp.json();
          if (imageUrlInput) {
            imageUrlInput.value = json.url;
            // Update preview with server URL
            updateImagePreview(json.url);
          }
          imagePreviewText.textContent = `Uploaded: ${json.name}`;
          
          // Clean up blob URL
          URL.revokeObjectURL(fileUrl);
        } catch (err) {
          console.error('Upload error', err);
          imagePreviewText.textContent = 'Upload failed, please try again';
          // Show error state
          updateImagePreview('');
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
      const data = {
        title: String(fd.get('title') || ''),
        author: String(fd.get('author') || ''),
        category: String(fd.get('category') || ''),
        image: String(fd.get('image') || ''),
        excerpt: String(fd.get('excerpt') || ''),
        content: String(fd.get('content') || ''),
        chineseContent: String(fd.get('chineseContent') || ''),
        featured: Boolean(fd.get('featured')),
        publishDate: fd.get('publishDate') ? String(fd.get('publishDate')) : undefined
      };
      if (!data.title.trim() || !data.author.trim() || !data.excerpt.trim() || !data.content.trim()) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.style.display = 'block';
        return;
      }
      try {
        submitBtnEl.disabled = true;
        submitBtnEl.textContent = 'Saving...';
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
        // 🔧 Always reset button state
        submitBtnEl.disabled = false;
        submitBtnEl.innerHTML = isEditing ? `
          <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/>
            <polyline points="7,3 7,8 15,8"/>
          </svg>Update Article` : `
          <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/>
            <polyline points="7,3 7,8 15,8"/>
          </svg>Save Article`;
      }
    });
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
    formTitleEl.innerHTML = `
      <svg style="width:20px;height:20px;display:inline;margin-right:8px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 3 22l1.5-4.5Z"/>
        <path d="m15 5 4 4"/>
      </svg>New Article`;
    formEl.reset();
    formModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Initialize image preview for new form
    if (window.updateImagePreview) {
      window.updateImagePreview('');
    }
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
    ensureFormModal();
    isEditing = true;
    editingId = article.id;
    formTitleEl.innerHTML = `
      <svg style="width:20px;height:20px;display:inline;margin-right:8px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 3 22l1.5-4.5Z"/>
        <path d="m15 5 4 4"/>
      </svg>Edit Article`;
    formEl.reset();
    formModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Show loading state
    const contentField = formEl.querySelector('[name="content"]');
    const chineseContentField = formEl.querySelector('[name="chineseContent"]');
    contentField.value = 'Loading...';
    chineseContentField.value = 'Loading...';
    
    try {
      // Get complete article data (including content and chineseContent)
      const response = await fetch(`/api/articles/${article.id}`, {
        credentials: 'include'  // 🔑 Include cookies for authentication
      });
      
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
      formEl.querySelector('[name="image"]').value = fullArticle.image || '';
      formEl.querySelector('[name="excerpt"]').value = fullArticle.excerpt || '';
      contentField.value = fullArticle.content || '';
      chineseContentField.value = fullArticle.chineseContent || '';
      formEl.querySelector('[name="featured"]').checked = !!fullArticle.featured;
      const pd = formEl.querySelector('[name="publishDate"]');
      pd.value = toDatetimeLocalValue(fullArticle.publishDate);
      
      // 🎥 Fill video-related fields if they exist
      const mediaType = fullArticle.mediaType || 'IMAGE';
      const mediaTypeInput = formEl.querySelector(`input[name="mediaType"][value="${mediaType}"]`);
      if (mediaTypeInput) {
        mediaTypeInput.checked = true;
        
        // Trigger change event to show/hide appropriate sections
        const changeEvent = new Event('change', { bubbles: true });
        mediaTypeInput.dispatchEvent(changeEvent);
      }
      
      // Fill video-specific fields
      const videoUrlInput = formEl.querySelector('[name="videoUrl"]');
      const videoDurationInput = formEl.querySelector('[name="videoDuration"]');
      
      if (videoUrlInput && fullArticle.videoUrl) {
        videoUrlInput.value = fullArticle.videoUrl;
      }
      
      if (videoDurationInput && fullArticle.videoDuration) {
        videoDurationInput.value = fullArticle.videoDuration;
      }
      
      // Update media preview for editing
      const imageInput = formEl.querySelector('[name="image"]');
      if (imageInput && window.updateImagePreview) {
        window.updateImagePreview(fullArticle.image || '');
      }
      
      // Show media preview if video
      if (mediaType === 'VIDEO' && fullArticle.videoUrl) {
        const mediaData = {
          url: fullArticle.videoUrl,
          originalName: 'Existing Video',
          mediaType: 'VIDEO',
          size: 0,
          duration: fullArticle.videoDuration
        };
        
        // Show video preview if the function is available
        setTimeout(() => {
          const mediaPreviewWrap = formEl.querySelector('#mediaPreviewWrap');
          const mediaPreview = formEl.querySelector('#mediaPreview');
          const mediaPreviewTitle = formEl.querySelector('#mediaPreviewTitle');
          const mediaPreviewDetails = formEl.querySelector('#mediaPreviewDetails');
          
          if (mediaPreviewWrap && mediaPreview) {
            mediaPreviewWrap.style.display = 'flex';
            mediaPreview.innerHTML = `
              <video src="${fullArticle.videoUrl}" style="width:100%;height:100%;object-fit:cover;" controls muted>
                Your browser does not support video playback.
              </video>
            `;
            
            if (mediaPreviewTitle) {
              mediaPreviewTitle.textContent = 'Existing Video';
            }
            
            if (mediaPreviewDetails) {
              mediaPreviewDetails.innerHTML = `
                <div>Type: VIDEO</div>
                ${fullArticle.videoDuration ? `<div>Duration: ${Math.floor(fullArticle.videoDuration / 60)}:${(fullArticle.videoDuration % 60).toString().padStart(2, '0')}</div>` : ''}
                <div>URL: <code style="font-size:10px;">${fullArticle.videoUrl}</code></div>
              `;
            }
          }
        }, 100);
      }
      
    } catch (error) {
      console.error('Error loading article details:', error);
      contentField.value = '';
      chineseContentField.value = '';
      alert('Failed to load article details, please retry');
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
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
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
            <div class="media-type-badge video-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              VIDEO
              ${article.videoDuration ? ` · ${formatDuration(article.videoDuration)}` : ''}
            </div>
            <h3 class="article-title">${article.title}</h3>
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
            <div class="media-type-badge image-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              IMAGE
            </div>
            <h3 class="article-title">${article.title}</h3>
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
        if (a) await openEditForm(a);
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
        
        // Update button states
        tabBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Update content visibility
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === targetTab + 'Tab') {
            content.classList.add('active');
          }
        });
        
        // Initialize Media Center when switching to media tab
        if (targetTab === 'media') {
          initializeMediaCenter();
        }
      });
    });
  };

  // 🎥 Media Center Initialization
  window.initializeMediaCenter = function() {
    console.log('🎥 Initializing Media Center...');
    
    // Initialize components
    initializeSystemStatus();
    initializeQuickUpload();
    initializeApiTesting();
    updateStatistics();
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
      
      const response = await fetch('/api/media/simple-upload?action=test');
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
        showQuickUploadProgress(file);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'TodayNews');
        
        const response = await fetch('/api/media/simple-upload', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Quick upload successful:', result.data);
          showQuickUploadSuccess(file, result.data);
          updateStatistics(); // Update stats after successful upload
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        console.error('❌ Quick upload failed:', error);
        showQuickUploadError(file, error.message);
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
    
    // Hide after 5 seconds
    setTimeout(() => {
      progressContainer.style.display = 'none';
      if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.style.background = 'linear-gradient(90deg, var(--modal-primary), var(--modal-primary-light))';
      }
    }, 5000);
  }

  // 🧪 API Testing Functions
  function initializeApiTesting() {
    const testStorageBtn = document.getElementById('testStorageBtn');
    const getUploadInfoBtn = document.getElementById('getUploadInfoBtn');
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
  }

  async function runStorageTest() {
    const output = document.getElementById('testingOutput');
    if (!output) return;
    
    output.innerHTML = '<div style="color: #f59e0b;">🧪 Testing storage connection...</div>';
    
    try {
      const response = await fetch('/api/media/simple-upload?action=test');
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
      const response = await fetch('/api/media/simple-upload?action=info');
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

  // 📊 Statistics Update
  function updateStatistics() {
    // This is a simplified version - in a real app, you'd fetch actual data
    const totalUploads = document.getElementById('totalUploads');
    const storageUsed = document.getElementById('storageUsed');
    
    if (totalUploads) {
      const currentCount = parseInt(totalUploads.textContent) || 0;
      totalUploads.textContent = currentCount + 1;
    }
    
    if (storageUsed) {
      // Simulate storage usage calculation
      const currentUsage = parseFloat(storageUsed.textContent.replace(' MB', '')) || 0;
      const newUsage = currentUsage + Math.random() * 10; // Random increase
      storageUsed.textContent = newUsage.toFixed(1) + ' MB';
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
        await handleMediaUpload(mediaType, formEl);
      });
    });
    
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
    
    // Handle media upload
    async function handleMediaUpload(mediaType, formEl) {
      console.log(`🎥 Starting ${mediaType} upload...`);
      
      // Create file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = mediaType === 'image' ? 'image/*' : 'video/*';
      
      return new Promise((resolve, reject) => {
        fileInput.onchange = async function(e) {
          const file = e.target.files[0];
          if (!file) {
            resolve(null);
            return;
          }
          
          try {
            // Show upload progress
            showUploadProgress(mediaType, file.name);
            
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'TodayNews');
            
            // Upload to API
            const response = await fetch('/api/media/simple-upload', {
              method: 'POST',
              body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
              console.log('✅ Upload successful:', result.data);
              
              // Update form fields based on media type
              if (mediaType === 'image') {
                const imageInput = formEl.querySelector('input[name="image"]');
                if (imageInput) {
                  imageInput.value = result.data.url;
                }
              } else if (mediaType === 'video') {
                const videoUrlInput = formEl.querySelector('input[name="videoUrl"]');
                const imageInput = formEl.querySelector('input[name="image"]'); // poster
                const durationInput = formEl.querySelector('input[name="videoDuration"]');
                
                if (videoUrlInput) videoUrlInput.value = result.data.url;
                if (imageInput && !imageInput.value) {
                  // Use video URL as poster if no custom poster is set
                  imageInput.value = result.data.url;
                }
                if (durationInput && result.data.duration) {
                  durationInput.value = Math.round(result.data.duration);
                }
              }
              
              // Show media preview
              showMediaPreview(result.data, mediaType);
              
              resolve(result.data);
            } else {
              throw new Error(result.error || 'Upload failed');
            }
            
          } catch (error) {
            console.error('❌ Upload failed:', error);
            showUploadError(error.message);
            reject(error);
          } finally {
            hideUploadProgress();
          }
        };
        
        // Trigger file selection
        fileInput.click();
      });
    }
    
    // Show upload progress
    function showUploadProgress(mediaType, fileName) {
      const btn = formEl.querySelector(`[data-type="${mediaType}"]`);
      if (btn) {
        btn.innerHTML = `
          <svg style="width:16px;height:16px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Uploading...
        `;
        btn.disabled = true;
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
    
    // Show upload error
    function showUploadError(message) {
      const errorDiv = formEl.querySelector('#formError') || document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.style.display = 'block';
      errorDiv.textContent = `Upload failed: ${message}`;
      
      if (!formEl.contains(errorDiv)) {
        formEl.appendChild(errorDiv);
      }
      
      // Clear error after 5 seconds
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
    
    // Show media preview
    function showMediaPreview(mediaData, mediaType) {
      if (!mediaPreviewWrap || !mediaPreview || !mediaPreviewTitle || !mediaPreviewDetails) return;
      
      // Show preview container
      mediaPreviewWrap.style.display = 'flex';
      
      // Update preview content
      if (mediaType === 'image') {
        mediaPreview.innerHTML = `
          <img src="${mediaData.url}" alt="Preview" style="width:100%;height:100%;object-fit:cover;" />
        `;
      } else if (mediaType === 'video') {
        mediaPreview.innerHTML = `
          <video src="${mediaData.url}" style="width:100%;height:100%;object-fit:cover;" controls muted>
            Your browser does not support video playback.
          </video>
        `;
      }
      
      // Update info
      mediaPreviewTitle.textContent = mediaData.originalName || 'Uploaded Media';
      mediaPreviewDetails.innerHTML = `
        <div>Type: ${mediaData.mediaType}</div>
        <div>Size: ${formatFileSize(mediaData.size)}</div>
        ${mediaData.duration ? `<div>Duration: ${formatDuration(mediaData.duration)}</div>` : ''}
        <div>URL: <code style="font-size:10px;">${mediaData.url}</code></div>
      `;
    }
    
    // Clear media preview
    function clearMediaPreview() {
      if (mediaPreviewWrap) {
        mediaPreviewWrap.style.display = 'none';
      }
      
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
  
});