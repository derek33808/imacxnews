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
          <h2 id="formTitle">✨ New Article</h2>
          <button class="close-modal" id="closeFormModal" aria-label="Close form modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form id="articleForm" enctype="multipart/form-data">
          <div class="form-grid">
            <label>
              📝 Title
              <input name="title" required placeholder="Enter an engaging title..." />
            </label>
            <label>
              👤 Author
              <input name="author" required placeholder="Author name" />
            </label>
            <label>
              📂 Category
              <select name="category" required>
                <option value="TodayNews">📰 Today News</option>
                <option value="PastNews">🗞️ Past News</option>
              </select>
            </label>
            <label>
              📅 Publish Date
              <input type="datetime-local" name="publishDate" />
            </label>
          </div>
          
          <label>
            🖼️ Image URL
            <div style="display:flex; gap:8px; align-items:center;">
              <input name="image" placeholder="/images/placeholder.svg" style="flex:1;" />
              <button type="button" id="triggerFileSelectBtn" style="white-space:nowrap;">Upload Local...</button>
            </div>
            <input type="file" name="imageFile" accept="image/*" style="display:none;" />
            <small>Supports jpg/png/webp; automatically fills URL after successful upload</small>
          </label>
          <div id="imagePreviewWrap" style="display:none; gap:12px; align-items:center;">
            <img id="imagePreview" alt="preview" style="width:160px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />
            <span id="imagePreviewText" style="font-size:12px;color:#6b7280;"></span>
          </div>
          
          <label>
            📄 Excerpt
            <textarea name="excerpt" rows="3" required placeholder="Write a compelling short summary..."></textarea>
          </label>
          
          <label>
            📖 Content
            <textarea name="content" rows="8" required placeholder="Write your main article content..."></textarea>
          </label>
          
          <label>
            🇨🇳 Chinese Content
            <textarea name="chineseContent" rows="6" placeholder="Chinese content (optional)..."></textarea>
          </label>
          
          <div class="checkbox-wrapper">
            <input type="checkbox" name="featured" id="featuredCheckbox" />
            <label for="featuredCheckbox">⭐ Featured Article</label>
          </div>
          
          <div id="formError" class="error-message"></div>
          
          <div class="form-actions">
            <button type="button" id="cancelFormBtn">Cancel</button>
            <button type="submit" id="submitFormBtn">💾 Save Article</button>
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

    // Image URL validation
    if (imageUrlInput) {
      imageUrlInput.addEventListener('blur', function() {
        const value = this.value.trim();
        if (value && (value.includes('example.com') || value.includes('placeholder.com') || (!value.startsWith('http') && !value.startsWith('/')))) {
          this.value = '/images/placeholder.svg';
          alert('Please enter a valid image URL (starting with http/https) or use the local upload feature');
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        if (!fileInput.files || fileInput.files.length === 0) return;
        const file = fileInput.files[0];
        imagePreviewWrap.style.display = 'flex';
        imagePreview.src = URL.createObjectURL(file);
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
          if (imageUrlInput) imageUrlInput.value = json.url;
          imagePreviewText.textContent = `Uploaded: ${json.name}`;
        } catch (err) {
          console.error('Upload error', err);
          imagePreviewText.textContent = 'Upload failed, please try again';
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
        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
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
        loadArticlesList(true); // Force refresh after save
      } catch (err) {
        console.error('Save error', err);
        alert('Network error, please try again.');
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
    formTitleEl.textContent = 'New Article';
    formEl.reset();
    formModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  function toDatetimeLocalValue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }
  
  async function openEditForm(article) {
    ensureFormModal();
    isEditing = true;
    editingId = article.id;
    formTitleEl.textContent = '✏️ Edit Article';
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
      const response = await fetch(`/api/articles/${article.id}`);
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
      const response = await fetch('/api/articles');
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
      const r = await fetch(`/api/articles/${articleId}`, { method: 'DELETE' });
      if (r.status === 204) {
        alert('Article deleted successfully!');
        
        // Clear cache and force refresh the articles list
        articlesCache = null;
        loadArticlesList(true);
        
        // Trigger delete event for other components
        window.dispatchEvent(new CustomEvent('articleDeleted', { detail: { articleId } }));
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

  // Event listeners for real-time updates
  window.addEventListener('articlePublished', () => {
    articlesCache = null; // Clear cache
    if (adminManagerModal && adminManagerModal.classList.contains('active')) {
      loadArticlesList(true); // Force refresh
    }
  });
  
  window.addEventListener('articleUpdated', () => {
    articlesCache = null; // Clear cache
    if (adminManagerModal && adminManagerModal.classList.contains('active')) {
      loadArticlesList(true); // Force refresh
    }
  });

  window.addEventListener('articleDeleted', () => {
    articlesCache = null; // Clear cache
    if (adminManagerModal && adminManagerModal.classList.contains('active')) {
      loadArticlesList(true); // Force refresh
    }
  });

  // Initialize if opened via URL or other means
  if (adminManagerModal && adminManagerModal.classList.contains('active')) {
    loadArticlesList();
  }
});