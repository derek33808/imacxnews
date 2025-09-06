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
              Image Settings
            </div>
            <label>
              <svg style="width:16px;height:16px;display:inline;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>Image URL
              <div style="display:flex; gap:12px; align-items:stretch;">
                <input name="image" placeholder="/images/placeholder.svg" style="flex:1;" />
                <button type="button" id="triggerFileSelectBtn" style="white-space:nowrap;">Upload Local...</button>
              </div>
              <input type="file" name="imageFile" accept="image/*" style="display:none;" />
              <small style="color:#6b7280;font-size:13px;margin-top:8px;display:block;">Supports jpg/png/webp; automatically fills URL after successful upload</small>
            </label>
            <div id="imagePreviewWrap" style="display:none; gap:16px; align-items:center;">
              <div id="imagePreview" style="width:160px;height:90px;object-fit:cover;border:2px dashed #d1d5db;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f9fafb;">
                <svg style="width:32px;height:32px;color:#9ca3af;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                <span style="font-size:10px;color:#9ca3af;margin-top:4px;">No preview image</span>
              </div>
              <span id="imagePreviewText"></span>
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
    
    // Handle local image upload when file selected
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
          try { const j = await resp.json(); if (j && j.error) msg = j.error; } catch {}
          if (resp.status === 401 || resp.status === 403) msg = 'Please login as admin first.';
          throw new Error(msg);
        }
        
        alert(`Article ${isEditing ? 'updated' : 'created'} successfully!`);
        close();
        
        // Clear the cache and trigger event
        articlesCache = null;
        
        if (isEditing) {
          window.dispatchEvent(new CustomEvent('articleUpdated'));
        } else {
          window.dispatchEvent(new CustomEvent('articlePublished'));
        }
        try { localStorage.setItem('imacx_articles', String(Date.now())); } catch {}
        loadArticlesList(true); // Force refresh after save
      } catch (err) {
        console.error('Save error', err);
        errEl.textContent = err.message || 'Network error, please try again.';
        errEl.style.display = 'block';
        
        // Show specific error for authentication issues
        if (err.message.includes('login')) {
          errEl.innerHTML = '🔒 Please <a href="#" onclick="document.getElementById(\'adminManageBtn\').click(); return false;">login as admin</a> first.';
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
      if (!response.ok) throw new Error('Failed to fetch article details');
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
      
      // Update image preview for editing
      const imageInput = formEl.querySelector('[name="image"]');
      if (imageInput && window.updateImagePreview) {
        window.updateImagePreview(fullArticle.image || '');
      }
      
    } catch (error) {
      console.error('Error loading article details:', error);
      contentField.value = '';
      chineseContentField.value = '';
      alert('Failed to load article details, please retry');
    }
  }
  
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
          </div>
        `;
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
  
  // Load articles list with cache support
  async function loadArticlesList(forceRefresh = false) {
    if (!articlesList) return;
    
    // Check cache
    const now = Date.now();
    if (!forceRefresh && articlesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      renderArticlesList(articlesCache);
      return;
    }
    
    try {
      const response = await fetch('/api/articles', {
        credentials: 'include'  // 🔑 Include cookies for authentication
      });
      if (!response.ok) throw new Error('Failed to load articles');
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
      
      // Update cache
      articlesCache = articles;
      cacheTimestamp = now;
      
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
          <button onclick="loadArticlesList(true)" class="retry-btn">Retry</button>
        </div>
      `;
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
        alert('Article deleted successfully!');
        
        // Clear cache and force refresh the articles list
        articlesCache = null;
        loadArticlesList(true);
        
        // Trigger delete event for other components
        window.dispatchEvent(new CustomEvent('articleDeleted', { detail: { articleId } }));
        try { localStorage.setItem('imacx_articles', String(Date.now())); } catch {}
        return;
      }

      // Show more specific error information
      let detail = '';
      try { const data = await r.json(); detail = data?.detail || data?.error || ''; } catch {}
      if (r.status === 403 || r.status === 401) {
        alert('Please login as admin first.');
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
    
    articlesList.innerHTML = articles.map(article => `
      <div class="article-item">
        <div class="article-thumbnail">
          <img src="${article.image}" alt="${article.title}">
        </div>
        
        <div class="article-info">
          <h3 class="article-title">${article.title}</h3>
          <div class="article-meta">
            <span class="category-tag ${article.category}">${article.category === 'TodayNews' ? 'Today News' : 'Past News'}</span>
            <span>By ${article.author}</span>
            <span>${formatRelativeTime(article.publishDate)}</span>
          </div>
        </div>
        
        <div class="article-actions compact-actions article-actions-floating">
          <button class="translucent-btn edit-btn" data-article-id="${article.id}" title="Edit Article">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
            <span class="btn-text">Edit</span>
          </button>
          <button class="translucent-btn delete-btn" data-article-id="${article.id}" title="Delete Article">
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
  
});