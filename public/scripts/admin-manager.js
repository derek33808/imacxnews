// Admin Article Manager functionality
document.addEventListener('DOMContentLoaded', function() {
  const adminManagerModal = document.getElementById('adminManagerModal');
  const closeAdminManagerModalBtn = document.getElementById('closeAdminManagerModal');
  const articlesList = document.getElementById('articlesList');
  const createArticleBtn = document.getElementById('createArticleBtn');

  // Create/Edit modal elements (created once and reused)
  let formModal;
  let formEl;
  let formTitleEl;
  let submitBtnEl;
  let isEditing = false;
  let editingId = null;
  
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
        
        <form id="articleForm">
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
            <input name="image" required placeholder="https://example.com/image.jpg" />
          </label>
          
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
            <textarea name="chineseContent" rows="6" placeholder="中文内容（可选）..."></textarea>
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
        featured: fd.get('featured') === 'on'
      };
      const publishDate = String(fd.get('publishDate') || '');
      if (publishDate) {
        data.publishDate = publishDate;
      }
      try {
        let resp;
        if (isEditing && editingId != null) {
          resp = await fetch(`/api/articles/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        } else {
          resp = await fetch('/api/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        }
        if (!resp.ok) {
          let msg = 'Error saving article.';
          try { const j = await resp.json(); if (j && j.error) msg = j.error; } catch {}
          if (resp.status === 401 || resp.status === 403) msg = 'Please login as admin first.';
          if (resp.status === 422) msg = 'Invalid input. Please check publishDate and required fields.';
          errEl.textContent = msg;
          errEl.style.display = 'block';
          return;
        }
        formModal.classList.remove('active');
        document.body.style.overflow = '';
        formEl.reset();
        if (isEditing) {
          window.dispatchEvent(new CustomEvent('articleUpdated'));
        } else {
          window.dispatchEvent(new CustomEvent('articlePublished'));
        }
        loadArticlesList();
        setTimeout(() => { window.location.reload(); }, 600);
      } catch (err) {
        console.error('Save error', err);
        alert('Network error, please try again.');
      }
    });
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
  
  function openEditForm(article) {
    ensureFormModal();
    isEditing = true;
    editingId = article.id;
    formTitleEl.textContent = '✏️ Edit Article';
    formEl.reset();
    formEl.querySelector('[name="title"]').value = article.title || '';
    formEl.querySelector('[name="author"]').value = article.author || '';
    formEl.querySelector('[name="category"]').value = article.category || 'TodayNews';
    formEl.querySelector('[name="image"]').value = article.image || '';
    formEl.querySelector('[name="excerpt"]').value = article.excerpt || '';
    formEl.querySelector('[name="content"]').value = article.content || '';
    formEl.querySelector('[name="chineseContent"]').value = article.chineseContent || '';
    formEl.querySelector('[name="featured"]').checked = !!article.featured;
    const pd = formEl.querySelector('[name="publishDate"]');
    pd.value = toDatetimeLocalValue(article.publishDate);
    formModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  // Open admin manager modal
  window.openAdminManagerModal = function() {
    loadArticlesList();
    if (adminManagerModal) {
      adminManagerModal.classList.add('active');
      document.body.style.overflow = 'hidden';
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
  
  // Load articles list
  async function loadArticlesList() {
    if (!articlesList) return;
    
    try {
      const res = await fetch('/api/articles');
      const articles = await res.json();
      
      if (articles.length === 0) {
        articlesList.innerHTML = `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
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
          
          <div class="article-actions">
            <button class="action-btn edit-btn" data-article-id="${article.id}">Edit</button>
            <button class="action-btn delete-btn" onclick="deleteArticle(${article.id})">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Delete
            </button>
          </div>
        </div>
      `).join('');
      
      // 保存本次加载的文章，使用事件委托绑定 Edit
      if (window.articlesListClickHandler) {
        articlesList.removeEventListener('click', window.articlesListClickHandler);
      }
      
      const idToArticle = new Map();
      for (const a of articles) idToArticle.set(String(a.id), a);
      
      window.articlesListClickHandler = (ev) => {
        const target = ev.target instanceof Element ? ev.target : null;
        if (!target) return;
        const editBtn = target.closest('.edit-btn');
        if (editBtn && editBtn instanceof HTMLElement && editBtn.dataset.articleId) {
          const a = idToArticle.get(editBtn.dataset.articleId);
          if (a) openEditForm(a);
        }
      };
      
      articlesList.addEventListener('click', window.articlesListClickHandler);
      
    } catch (error) {
      console.error('Error loading articles:', error);
      articlesList.innerHTML = `
        <div class="empty-state">
          <p>Error loading articles</p>
        </div>
      `;
    }
  }
  
  // Delete article function
  window.deleteArticle = async function(articleId) {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }
    
    try {
      const r = await fetch(`/api/articles/${articleId}`, { method: 'DELETE' });
      if (r.status === 204) {
        alert('Article deleted successfully!');
        loadArticlesList();
        setTimeout(() => { window.location.reload(); }, 600);
      } else if (r.status === 403 || r.status === 401) {
        alert('Please login as admin first.');
      } else {
        alert('Error deleting article, please try again.');
      }
      
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Error deleting article, please try again.');
    }
  };
  
  // Format relative time function
  function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  // Listen for article updates
  window.addEventListener('articlePublished', () => {
    if (adminManagerModal && adminManagerModal.classList.contains('active')) {
      loadArticlesList();
    }
  });
  
  window.addEventListener('articleUpdated', () => {
    if (adminManagerModal && adminManagerModal.classList.contains('active')) {
      loadArticlesList();
    }
  });
});
