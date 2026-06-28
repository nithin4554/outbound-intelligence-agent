(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))o(t);new MutationObserver(t=>{for(const i of t)if(i.type==="childList")for(const l of i.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&o(l)}).observe(document,{childList:!0,subtree:!0});function r(t){const i={};return t.integrity&&(i.integrity=t.integrity),t.referrerPolicy&&(i.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?i.credentials="include":t.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(t){if(t.ep)return;t.ep=!0;const i=r(t);fetch(t.href,i)}})();const d=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1";let a={companies:[],people:[],lastRunTimestamp:"",selectedCompanyId:null,searchQuery:"",statusFilter:"all",isPipelineRunning:!1};const n={lastRunTime:document.getElementById("last-run-time"),runPipelineBtn:document.getElementById("run-pipeline-btn"),logsDrawer:document.getElementById("pipeline-logs-drawer"),closeLogsBtn:document.getElementById("close-logs-btn"),progressFill:document.getElementById("pipeline-progress-fill"),pipelineStatusText:document.getElementById("pipeline-status-text"),rawLogs:document.getElementById("raw-logs"),searchInput:document.getElementById("search-input"),statusFilter:document.getElementById("status-filter"),accountsCount:document.getElementById("accounts-count"),accountsList:document.getElementById("accounts-list"),detailWorkspace:document.getElementById("detail-workspace")};async function L(){T(),d||(n.runPipelineBtn.disabled=!0,n.runPipelineBtn.style.opacity="0.5",n.runPipelineBtn.style.cursor="not-allowed",n.runPipelineBtn.querySelector(".btn-text").textContent="Cloud View (Read-Only)"),await C(),a.companies.length>0?x(a.companies[0].id):$()}async function C(){try{const s=await fetch(d?"/api/results":"./data/results.json");if(!s.ok)throw new Error("API server unavailable.");const r=await s.json();if(a.companies=r.companies||[],a.people=r.people||[],a.lastRunTimestamp=r.lastRunTimestamp||r.lastRunTime||"Never",a.lastRunTimestamp!=="Never"){const o=new Date(a.lastRunTimestamp);n.lastRunTime.textContent=o.toLocaleString()}else n.lastRunTime.textContent="Never"}catch(e){console.error("Error fetching results:",e),n.rawLogs.textContent+=`
Error loading database: ${e.message}`}}function T(){n.runPipelineBtn.addEventListener("click",E),n.closeLogsBtn.addEventListener("click",()=>{n.logsDrawer.classList.add("hidden")}),n.searchInput.addEventListener("input",e=>{a.searchQuery=e.target.value.toLowerCase(),u()}),n.statusFilter.addEventListener("change",e=>{a.statusFilter=e.target.value,u()})}async function E(){if(!a.isPipelineRunning){a.isPipelineRunning=!0,n.runPipelineBtn.disabled=!0,n.runPipelineBtn.classList.add("running"),n.logsDrawer.classList.remove("hidden"),n.progressFill.style.width="10%",n.progressFill.classList.add("active"),n.pipelineStatusText.textContent="Running python3 agent.py...",n.rawLogs.textContent=`[SYSTEM] Launching child process...
[SYSTEM] python3 agent.py

`;try{const s=await(await fetch("/api/run-agent",{method:"POST"})).json();n.progressFill.style.width="80%",s.success?(n.rawLogs.textContent+=s.stdout,n.rawLogs.textContent+=`

[SYSTEM] Run complete! Refreshing database...`,await C(),n.progressFill.style.width="100%",n.pipelineStatusText.textContent="Pipeline execution completed successfully!",setTimeout(()=>{n.logsDrawer.classList.add("hidden")},3e3)):(n.rawLogs.textContent+=`

[ERROR] Pipeline run failed:
${s.error}

${s.stderr||""}`,n.pipelineStatusText.textContent="Pipeline failed with errors.",n.progressFill.style.width="100%",n.progressFill.style.backgroundColor="var(--accent-red)")}catch(e){console.error("Pipeline API error:",e),n.rawLogs.textContent+=`

[ERROR] Network error communicating with Express backend: ${e.message}`,n.pipelineStatusText.textContent="Network connection failed."}finally{a.isPipelineRunning=!1,n.runPipelineBtn.disabled=!1,n.runPipelineBtn.classList.remove("running"),n.progressFill.classList.remove("active"),$()}}}function x(e){a.selectedCompanyId=e,u(),S()}function u(){const e=a.companies.filter(s=>{const r=s.company.toLowerCase().includes(a.searchQuery)||s.industry.toLowerCase().includes(a.searchQuery)||s.intentSummary.toLowerCase().includes(a.searchQuery),o=a.statusFilter==="all"||s.status===a.statusFilter;return r&&o});if(n.accountsCount.textContent=e.length,n.accountsList.innerHTML="",e.length===0){n.accountsList.innerHTML='<li class="loading-placeholder">No matching accounts found</li>';return}e.forEach(s=>{const r=document.createElement("li");r.className=`account-item ${s.id===a.selectedCompanyId?"active":""}`;let o="outreach";s.status==="Watchlist"&&(o="watchlist"),s.status==="Deprioritize"&&(o="deprioritize");const t=s.totalIntentScore>=22?"high":"medium";r.innerHTML=`
      <div class="account-item-top">
        <h4>${s.company}</h4>
        <span class="score-badge ${t}">${s.totalIntentScore}/25</span>
      </div>
      <div class="account-item-details">
        <span class="industry">${s.industry}</span>
        <span class="status-indicator-dot">
          <span class="dot ${o}"></span>
          <span>${s.status||"Immediate Outreach"}</span>
        </span>
      </div>
    `,r.addEventListener("click",()=>x(s.id)),n.accountsList.appendChild(r)})}function S(){if(!a.selectedCompanyId){n.detailWorkspace.innerHTML=`
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <h2>Select a high-intent account</h2>
        <p>Click on any target company in the sidebar to view detailed signals, mapped buyer personas, and personalized outreach templates.</p>
      </div>
    `;return}const e=a.companies.find(o=>o.id===a.selectedCompanyId),s=a.people.filter(o=>o.companyId===a.selectedCompanyId);if(!e)return;let r=`
    <!-- Header -->
    <div class="detail-header">
      <div class="detail-title">
        <h2>${e.company}</h2>
        <div class="meta-row">
          <span><strong>Industry:</strong> ${e.industry}</span>
          <span><strong>Signals Checked:</strong> ${e.evidenceDate||"Recent"}</span>
          <span><strong>Source:</strong> <a href="${e.sourceUrl}" target="_blank">View Article Link</a></span>
        </div>
      </div>
      
      <div class="detail-actions">
        <div class="status-dropdown-wrapper">
          <label>Campaign Status:</label>
          <select class="status-dropdown" id="detail-status-select" ${d?"":"disabled"}>
            <option value="Immediate Outreach" ${e.status==="Immediate Outreach"?"selected":""}>Immediate Outreach</option>
            <option value="Watchlist" ${e.status==="Watchlist"?"selected":""}>Watchlist</option>
            <option value="Deprioritize" ${e.status==="Deprioritize"?"selected":""}>Deprioritize</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="detail-body">
      ${d?"":`
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
            <p style="margin-bottom: 0.75rem;"><strong>Summary:</strong> ${e.intentSummary}</p>
            <div class="signals-list">
              <div class="signal-item">
                <span class="signal-bullet">✓</span>
                <span><strong>Public Signal:</strong> ${e.publicEvidence}</span>
              </div>
              <div class="signal-item">
                <span class="signal-bullet">✓</span>
                <span><strong>Implication:</strong> ${e.whyThisMatters}</span>
              </div>
            </div>
          </div>

          <!-- Notes Card -->
          <div class="intel-card notes-card">
            <h3>📝 Campaign Strategy Notes</h3>
            <textarea id="company-notes-textarea" ${d?"":"disabled"} placeholder="${d?"Add custom constraints, execution logs, or comments for this account...":"Strategy notes are read-only in cloud mode."}">${e.notes||""}</textarea>
            ${d?`
              <div class="notes-footer">
                <button id="save-notes-btn" class="btn btn-secondary btn-sm" style="padding: 0.35rem 0.75rem; font-size:0.75rem;">Save Notes</button>
              </div>
            `:""}
          </div>
        </div>

        <!-- Right Card: Metric Breakdown -->
        <div class="intel-card">
          <h3>📊 Intent Score: ${e.totalIntentScore}/25</h3>
          <div class="scores-container">
            ${p("Adoption Depth",e.adoptionDepthScore)}
            ${p("ROI Pressure",e.roiPressureScore)}
            ${p("Executive Visibility",e.execVisibilityScore)}
            ${p("Timeliness",e.timelinessScore)}
            ${p("Product Relevance",e.productRelevanceScore)}
          </div>
          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); font-size: 0.75rem; text-align: center; color: var(--text-muted);">
            Intent Band: <strong style="color: var(--accent-purple);">${e.intentBand}</strong>
          </div>
        </div>
      </div>

      <!-- Bottom Block: Target People & Outreach Copy -->
      <div class="outreach-workspace">
        <div class="outreach-header">🎯 Mapped Decision-Makers & Outreach Templates</div>
        
        <div class="people-cards-list">
          ${s.map(o=>I(o,e.outreachAngle)).join("")}
        </div>
      </div>
    </div>
  `;n.detailWorkspace.innerHTML=r,P(e.id)}function p(e,s){const r=s/5*100;return`
    <div class="score-row">
      <span class="score-label">${e}</span>
      <div class="score-bar-bg">
        <div class="score-bar-fill" style="width: ${r}%;"></div>
      </div>
      <span class="score-value">${s}</span>
    </div>
  `}function I(e,s){return`
    <div class="person-card">
      <!-- Person Header -->
      <div class="person-card-header">
        <div class="person-info">
          <h4>
            ${e.name} 
            <span class="person-badge">${e.seniorityType}</span>
          </h4>
          <span>${e.title} at ${e.company}</span>
        </div>
        <div class="person-actions">
          <a href="${e.linkedinUrl}" target="_blank" class="person-linkedin">
            LinkedIn Profile
          </a>
        </div>
      </div>

      <!-- Person Context -->
      <div class="person-card-body">
        <div class="person-context">
          <div>
            <strong>Why Target:</strong>
            ${e.whyThisPerson}
          </div>
          <div>
            <strong>Estimated Authority & Pain:</strong>
            ${e.likelyPainTension}
          </div>
        </div>

        <!-- Outreach Templates -->
        <div class="message-templates">
          <!-- Connection Note -->
          ${y(e.companyId,e.name,"connectionNote","1. LinkedIn Connection Request Note (180-280 Chars)",e.connectionNote)}
          
          <!-- First DM -->
          ${y(e.companyId,e.name,"firstDM","2. First Direct Message (40-90 Words)",e.firstDM)}
          
          <!-- Follow-up -->
          ${y(e.companyId,e.name,"followUpDM","3. Follow-Up Touchpoint (25-60 Words)",e.followUpDM)}
        </div>
      </div>
    </div>
  `}function y(e,s,r,o,t){const i=d?`<button class="template-btn edit-msg-btn" data-company-id="${e}" data-name="${s}" data-field="${r}">Edit</button>`:"";return`
    <div class="template-section">
      <div class="template-section-header">
        <label>${o}</label>
        <div class="template-actions">
          ${i}
          <button class="template-btn copy-msg-btn" data-text="${t.replace(/"/g,"&quot;")}">Copy</button>
        </div>
      </div>
      <div class="message-box-wrapper">
        <div class="message-box" id="msg-${e}-${s.replace(/\s+/g,"-")}-${r}">${t}</div>
      </div>
    </div>
  `}function P(e){document.getElementById("detail-status-select").addEventListener("change",async t=>{const i=t.target.value;try{if((await fetch("/api/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyId:e,status:i})})).ok){const c=a.companies.find(g=>g.id===e);c&&(c.status=i),u()}}catch(l){console.error("Failed to update status on server:",l)}});const r=document.getElementById("company-notes-textarea"),o=document.getElementById("save-notes-btn");o.addEventListener("click",async()=>{const t=r.value;o.textContent="Saving...";try{if((await fetch("/api/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyId:e,notes:t})})).ok){const l=a.companies.find(c=>c.id===e);l&&(l.notes=t),o.textContent="Saved!",setTimeout(()=>{o.textContent="Save Notes"},1500)}}catch(i){console.error("Failed to save notes:",i),o.textContent="Failed to Save"}}),document.querySelectorAll(".copy-msg-btn").forEach(t=>{t.addEventListener("click",()=>{const i=t.getAttribute("data-text");navigator.clipboard.writeText(i).then(()=>{t.textContent="Copied!",t.classList.add("copied"),setTimeout(()=>{t.textContent="Copy",t.classList.remove("copied")},2e3)}).catch(l=>{console.error("Could not copy text to clipboard: ",l)})})}),document.querySelectorAll(".edit-msg-btn").forEach(t=>{t.addEventListener("click",async()=>{const i=t.getAttribute("data-company-id"),l=t.getAttribute("data-name"),c=t.getAttribute("data-field"),g=`msg-${i}-${l.replace(/\s+/g,"-")}-${c}`,m=document.getElementById(g);if(t.textContent==="Edit")m.setAttribute("contenteditable","true"),m.focus(),t.textContent="Save",t.style.color="var(--accent-green)";else{m.removeAttribute("contenteditable");const v=m.innerText;t.textContent="Saving...";try{if((await fetch("/api/message",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyId:i,name:l,field:c,value:v})})).ok){const f=a.people.find(b=>b.companyId===i&&b.name===l);f&&(f[c]=v);const w=t.nextElementSibling;w&&w.setAttribute("data-text",v),t.textContent="Edit",t.style.color=""}else t.textContent="Failed",setTimeout(()=>{t.textContent="Save"},1500)}catch(h){console.error("Failed to save message edits:",h),t.textContent="Failed",setTimeout(()=>{t.textContent="Save"},1500)}}})})}function $(){u(),S()}window.addEventListener("DOMContentLoaded",L);
