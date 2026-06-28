// Main Application State
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let appState = {
  companies: [],
  people: [],
  lastRunTimestamp: '',
  selectedCompanyId: null,
  searchQuery: '',
  statusFilter: 'all',
  isPipelineRunning: false
};

// DOM Elements
const elements = {
  lastRunTime: document.getElementById('last-run-time'),
  runPipelineBtn: document.getElementById('run-pipeline-btn'),
  logsDrawer: document.getElementById('pipeline-logs-drawer'),
  closeLogsBtn: document.getElementById('close-logs-btn'),
  progressFill: document.getElementById('pipeline-progress-fill'),
  pipelineStatusText: document.getElementById('pipeline-status-text'),
  rawLogs: document.getElementById('raw-logs'),
  searchInput: document.getElementById('search-input'),
  statusFilter: document.getElementById('status-filter'),
  accountsCount: document.getElementById('accounts-count'),
  accountsList: document.getElementById('accounts-list'),
  detailWorkspace: document.getElementById('detail-workspace')
};

// Initializer
async function init() {
  setupEventListeners();
  
  if (!isLocal) {
    elements.runPipelineBtn.disabled = true;
    elements.runPipelineBtn.style.opacity = '0.5';
    elements.runPipelineBtn.style.cursor = 'not-allowed';
    elements.runPipelineBtn.querySelector('.btn-text').textContent = 'Cloud View (Read-Only)';
  }
  
  await fetchResults();
  
  // Select first company if list is not empty
  if (appState.companies.length > 0) {
    selectCompany(appState.companies[0].id);
  } else {
    render();
  }
}

// Fetch data from local Express backend
async function fetchResults() {
  try {
    const fetchUrl = isLocal ? '/api/results' : './data/results.json';
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error('API server unavailable.');
    const data = await response.json();
    
    appState.companies = data.companies || [];
    appState.people = data.people || [];
    appState.lastRunTimestamp = data.lastRunTimestamp || data.lastRunTime || 'Never';
    
    // Format run time
    if (appState.lastRunTimestamp !== 'Never') {
      const date = new Date(appState.lastRunTimestamp);
      elements.lastRunTime.textContent = date.toLocaleString();
    } else {
      elements.lastRunTime.textContent = 'Never';
    }
    
  } catch (error) {
    console.error('Error fetching results:', error);
    elements.rawLogs.textContent += `\nError loading database: ${error.message}`;
  }
}

// Event Listeners setup
function setupEventListeners() {
  // Run pipeline trigger
  elements.runPipelineBtn.addEventListener('click', runPipeline);
  elements.closeLogsBtn.addEventListener('click', () => {
    elements.logsDrawer.classList.add('hidden');
  });

  // Search & Filter
  elements.searchInput.addEventListener('input', (e) => {
    appState.searchQuery = e.target.value.toLowerCase();
    renderSidebar();
  });
  
  elements.statusFilter.addEventListener('change', (e) => {
    appState.statusFilter = e.target.value;
    renderSidebar();
  });
}

// Trigger daily automation pipeline run
async function runPipeline() {
  if (appState.isPipelineRunning) return;
  
  appState.isPipelineRunning = true;
  elements.runPipelineBtn.disabled = true;
  elements.runPipelineBtn.classList.add('running');
  elements.logsDrawer.classList.remove('hidden');
  elements.progressFill.style.width = '10%';
  elements.progressFill.classList.add('active');
  elements.pipelineStatusText.textContent = 'Running python3 agent.py...';
  elements.rawLogs.textContent = '[SYSTEM] Launching child process...\n[SYSTEM] python3 agent.py\n\n';

  try {
    const response = await fetch('/api/run-agent', { method: 'POST' });
    const result = await response.json();
    
    elements.progressFill.style.width = '80%';
    
    if (result.success) {
      elements.rawLogs.textContent += result.stdout;
      elements.rawLogs.textContent += '\n\n[SYSTEM] Run complete! Refreshing database...';
      
      // Reload results
      await fetchResults();
      
      elements.progressFill.style.width = '100%';
      elements.pipelineStatusText.textContent = 'Pipeline execution completed successfully!';
      setTimeout(() => {
        elements.logsDrawer.classList.add('hidden');
      }, 3000);
    } else {
      elements.rawLogs.textContent += `\n\n[ERROR] Pipeline run failed:\n${result.error}\n\n${result.stderr || ''}`;
      elements.pipelineStatusText.textContent = 'Pipeline failed with errors.';
      elements.progressFill.style.width = '100%';
      elements.progressFill.style.backgroundColor = 'var(--accent-red)';
    }
  } catch (error) {
    console.error('Pipeline API error:', error);
    elements.rawLogs.textContent += `\n\n[ERROR] Network error communicating with Express backend: ${error.message}`;
    elements.pipelineStatusText.textContent = 'Network connection failed.';
  } finally {
    appState.isPipelineRunning = false;
    elements.runPipelineBtn.disabled = false;
    elements.runPipelineBtn.classList.remove('running');
    elements.progressFill.classList.remove('active');
    render();
  }
}

// Change active company
function selectCompany(companyId) {
  appState.selectedCompanyId = companyId;
  renderSidebar();
  renderDetails();
}

// Render Sidebars Target list
function renderSidebar() {
  const filtered = appState.companies.filter(c => {
    const matchesSearch = c.company.toLowerCase().includes(appState.searchQuery) ||
                          c.industry.toLowerCase().includes(appState.searchQuery) ||
                          c.intentSummary.toLowerCase().includes(appState.searchQuery);
                          
    const matchesStatus = appState.statusFilter === 'all' || c.status === appState.statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  elements.accountsCount.textContent = filtered.length;
  elements.accountsList.innerHTML = '';

  if (filtered.length === 0) {
    elements.accountsList.innerHTML = '<li class="loading-placeholder">No matching accounts found</li>';
    return;
  }

  filtered.forEach(c => {
    const li = document.createElement('li');
    li.className = `account-item ${c.id === appState.selectedCompanyId ? 'active' : ''}`;
    
    // Status dot color mapping
    let dotClass = 'outreach';
    if (c.status === 'Watchlist') dotClass = 'watchlist';
    if (c.status === 'Deprioritize') dotClass = 'deprioritize';

    // Score color class
    const scoreClass = c.totalIntentScore >= 22 ? 'high' : 'medium';

    li.innerHTML = `
      <div class="account-item-top">
        <h4>${c.company}</h4>
        <span class="score-badge ${scoreClass}">${c.totalIntentScore}/25</span>
      </div>
      <div class="account-item-details">
        <span class="industry">${c.industry}</span>
        <span class="status-indicator-dot">
          <span class="dot ${dotClass}"></span>
          <span>${c.status || 'Immediate Outreach'}</span>
        </span>
      </div>
    `;

    li.addEventListener('click', () => selectCompany(c.id));
    elements.accountsList.appendChild(li);
  });
}

// Render selected company Workspace view
function renderDetails() {
  if (!appState.selectedCompanyId) {
    elements.detailWorkspace.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <h2>Select a high-intent account</h2>
        <p>Click on any target company in the sidebar to view detailed signals, mapped buyer personas, and personalized outreach templates.</p>
      </div>
    `;
    return;
  }

  const company = appState.companies.find(c => c.id === appState.selectedCompanyId);
  const people = appState.people.filter(p => p.companyId === appState.selectedCompanyId);
  
  if (!company) return;

  // Build the workspace HTML
  let detailsHtml = `
    <!-- Header -->
    <div class="detail-header">
      <div class="detail-title">
        <h2>${company.company}</h2>
        <div class="meta-row">
          <span><strong>Industry:</strong> ${company.industry}</span>
          <span><strong>Signals Checked:</strong> ${company.evidenceDate || 'Recent'}</span>
          <span><strong>Source:</strong> <a href="${company.sourceUrl}" target="_blank">View Article Link</a></span>
        </div>
      </div>
      
      <div class="detail-actions">
        <div class="status-dropdown-wrapper">
          <label>Campaign Status:</label>
          <select class="status-dropdown" id="detail-status-select" ${isLocal ? '' : 'disabled'}>
            <option value="Immediate Outreach" ${company.status === 'Immediate Outreach' ? 'selected' : ''}>Immediate Outreach</option>
            <option value="Watchlist" ${company.status === 'Watchlist' ? 'selected' : ''}>Watchlist</option>
            <option value="Deprioritize" ${company.status === 'Deprioritize' ? 'selected' : ''}>Deprioritize</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="detail-body">
      ${isLocal ? '' : `
        <div class="cloud-banner" style="background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.25); padding: 0.75rem 1.25rem; border-radius: 8px; font-size: 0.8rem; color: #93c5fd; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
          <span>☁️</span>
          <span>Running in View-Only mode on GitHub Pages. To trigger pipeline runs, save strategy notes, or edit templates, run locally at <strong>http://localhost:3000</strong>.</span>
        </div>
      `}
      <!-- Top Grid: Intent and Notes -->
      <div class="intel-grid">
        <div class="left-cards">
          <!-- Intent Signal Summary -->
          <div class="intel-card" style="margin-bottom: 1rem;">
            <h3>🔍 Current Intent Signaling</h3>
            <p style="margin-bottom: 0.75rem;"><strong>Summary:</strong> ${company.intentSummary}</p>
            <div class="signals-list">
              <div class="signal-item">
                <span class="signal-bullet">✓</span>
                <span><strong>Public Signal:</strong> ${company.publicEvidence}</span>
              </div>
              <div class="signal-item">
                <span class="signal-bullet">✓</span>
                <span><strong>Implication:</strong> ${company.whyThisMatters}</span>
              </div>
            </div>
          </div>

          <!-- Notes Card -->
          <div class="intel-card notes-card">
            <h3>📝 Campaign Strategy Notes</h3>
            <textarea id="company-notes-textarea" ${isLocal ? '' : 'disabled'} placeholder="${isLocal ? 'Add custom constraints, execution logs, or comments for this account...' : 'Strategy notes are read-only in cloud mode.'}">${company.notes || ''}</textarea>
            ${isLocal ? `
              <div class="notes-footer">
                <button id="save-notes-btn" class="btn btn-secondary btn-sm" style="padding: 0.35rem 0.75rem; font-size:0.75rem;">Save Notes</button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Right Card: Metric Breakdown -->
        <div class="intel-card">
          <h3>📊 Intent Score: ${company.totalIntentScore}/25</h3>
          <div class="scores-container">
            ${renderScoreRow('Adoption Depth', company.adoptionDepthScore)}
            ${renderScoreRow('ROI Pressure', company.roiPressureScore)}
            ${renderScoreRow('Executive Visibility', company.execVisibilityScore)}
            ${renderScoreRow('Timeliness', company.timelinessScore)}
            ${renderScoreRow('Product Relevance', company.productRelevanceScore)}
          </div>
          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); font-size: 0.75rem; text-align: center; color: var(--text-muted);">
            Intent Band: <strong style="color: var(--accent-purple);">${company.intentBand}</strong>
          </div>
        </div>
      </div>

      <!-- Bottom Block: Target People & Outreach Copy -->
      <div class="outreach-workspace">
        <div class="outreach-header">🎯 Mapped Decision-Makers & Outreach Templates</div>
        
        <div class="people-cards-list">
          ${people.map(person => renderPersonCard(person, company.outreachAngle)).join('')}
        </div>
      </div>
    </div>
  `;

  elements.detailWorkspace.innerHTML = detailsHtml;
  bindDetailEventListeners(company.id);
}

function renderScoreRow(label, score) {
  const percent = (score / 5) * 100;
  return `
    <div class="score-row">
      <span class="score-label">${label}</span>
      <div class="score-bar-bg">
        <div class="score-bar-fill" style="width: ${percent}%;"></div>
      </div>
      <span class="score-value">${score}</span>
    </div>
  `;
}

function renderPersonCard(person, generalAngle) {
  return `
    <div class="person-card">
      <!-- Person Header -->
      <div class="person-card-header">
        <div class="person-info">
          <h4>
            ${person.name} 
            <span class="person-badge">${person.seniorityType}</span>
          </h4>
          <span>${person.title} at ${person.company}</span>
        </div>
        <div class="person-actions">
          <a href="${person.linkedinUrl}" target="_blank" class="person-linkedin">
            LinkedIn Profile
          </a>
        </div>
      </div>

      <!-- Person Context -->
      <div class="person-card-body">
        <div class="person-context">
          <div>
            <strong>Why Target:</strong>
            ${person.whyThisPerson}
          </div>
          <div>
            <strong>Estimated Authority & Pain:</strong>
            ${person.likelyPainTension}
          </div>
        </div>

        <!-- Outreach Templates -->
        <div class="message-templates">
          <!-- Connection Note -->
          ${renderTemplateSection(person.companyId, person.name, 'connectionNote', '1. LinkedIn Connection Request Note (180-280 Chars)', person.connectionNote)}
          
          <!-- First DM -->
          ${renderTemplateSection(person.companyId, person.name, 'firstDM', '2. First Direct Message (40-90 Words)', person.firstDM)}
          
          <!-- Follow-up -->
          ${renderTemplateSection(person.companyId, person.name, 'followUpDM', '3. Follow-Up Touchpoint (25-60 Words)', person.followUpDM)}
        </div>
      </div>
    </div>
  `;
}

function renderTemplateSection(companyId, name, field, title, content) {
  const editBtn = isLocal ? `<button class="template-btn edit-msg-btn" data-company-id="${companyId}" data-name="${name}" data-field="${field}">Edit</button>` : '';
  return `
    <div class="template-section">
      <div class="template-section-header">
        <label>${title}</label>
        <div class="template-actions">
          ${editBtn}
          <button class="template-btn copy-msg-btn" data-text="${content.replace(/"/g, '&quot;')}">Copy</button>
        </div>
      </div>
      <div class="message-box-wrapper">
        <div class="message-box" id="msg-${companyId}-${name.replace(/\s+/g, '-')}-${field}">${content}</div>
      </div>
    </div>
  `;
}

// Bind detail workspace interaction events
function bindDetailEventListeners(companyId) {
  // 1. Status Dropdown update
  const statusSelect = document.getElementById('detail-status-select');
  statusSelect.addEventListener('change', async (e) => {
    const newStatus = e.target.value;
    try {
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, status: newStatus })
      });
      if (response.ok) {
        // Update local state and sidebar
        const company = appState.companies.find(c => c.id === companyId);
        if (company) company.status = newStatus;
        renderSidebar();
      }
    } catch (err) {
      console.error('Failed to update status on server:', err);
    }
  });

  // 2. Save Notes text updates
  const notesTextarea = document.getElementById('company-notes-textarea');
  const saveNotesBtn = document.getElementById('save-notes-btn');
  
  saveNotesBtn.addEventListener('click', async () => {
    const notesValue = notesTextarea.value;
    saveNotesBtn.textContent = 'Saving...';
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, notes: notesValue })
      });
      if (response.ok) {
        const company = appState.companies.find(c => c.id === companyId);
        if (company) company.notes = notesValue;
        saveNotesBtn.textContent = 'Saved!';
        setTimeout(() => {
          saveNotesBtn.textContent = 'Save Notes';
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
      saveNotesBtn.textContent = 'Failed to Save';
    }
  });

  // 3. Copy message to Clipboard
  document.querySelectorAll('.copy-msg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-text');
      navigator.clipboard.writeText(textToCopy).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('Could not copy text to clipboard: ', err);
      });
    });
  });

  // 4. Edit message inline toggler
  document.querySelectorAll('.edit-msg-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const compId = btn.getAttribute('data-company-id');
      const name = btn.getAttribute('data-name');
      const field = btn.getAttribute('data-field');
      const boxId = `msg-${compId}-${name.replace(/\s+/g, '-')}-${field}`;
      const msgBox = document.getElementById(boxId);
      
      if (btn.textContent === 'Edit') {
        // Toggle to Edit mode
        msgBox.setAttribute('contenteditable', 'true');
        msgBox.focus();
        btn.textContent = 'Save';
        btn.style.color = 'var(--accent-green)';
      } else {
        // Save action
        msgBox.removeAttribute('contenteditable');
        const newValue = msgBox.innerText;
        btn.textContent = 'Saving...';
        
        try {
          const response = await fetch('/api/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: compId, name, field, value: newValue })
          });
          
          if (response.ok) {
            // Update local state cache
            const person = appState.people.find(p => p.companyId === compId && p.name === name);
            if (person) person[field] = newValue;
            
            // Update the copy button's data text as well
            const copyBtn = btn.nextElementSibling;
            if (copyBtn) copyBtn.setAttribute('data-text', newValue);
            
            btn.textContent = 'Edit';
            btn.style.color = '';
          } else {
            btn.textContent = 'Failed';
            setTimeout(() => { btn.textContent = 'Save'; }, 1500);
          }
        } catch (err) {
          console.error('Failed to save message edits:', err);
          btn.textContent = 'Failed';
          setTimeout(() => { btn.textContent = 'Save'; }, 1500);
        }
      }
    });
  });
}

// Master rendering function
function render() {
  renderSidebar();
  renderDetails();
}

// Start application
window.addEventListener('DOMContentLoaded', init);
