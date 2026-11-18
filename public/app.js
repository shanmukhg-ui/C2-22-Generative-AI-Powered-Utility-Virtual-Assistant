/**
 * Project C2-22: Generative AI-Powered Utility Virtual Assistant
 * TechBharat AI CoE – Cohort #2
 * Authors: Gollavilli Shanmukh Vardhan Sai, PANAM VICTOR KOMAL
 */

// Global State
const state = {
  user: {
    id: 'CUST0001',
    name: 'Customer 1',
    role: 'Customer',
    city: 'Vizag',
    dept: 'Citizen'
  },
  meta: {
    utilities: [],
    statuses: [],
    priorities: [],
    requestTypes: [],
    staff: []
  },
  tracking: {
    subTab: 'requests', // 'requests' or 'complaints'
    page: 1,
    limit: 25,
    total: 0,
    search: '',
    utility: '',
    status: '',
    priority: ''
  },
  chatMessages: []
};

// DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initPersonaSwitcher();
  initChat();
  initModals();
  initTrackingControls();
  initOperations();
  initKnowledge();

  // Load Metadata
  await loadMetadata();
  // Initial data loads
  loadTrackingData();
  loadOperationsData();
  loadKnowledgeData();
  loadAnalyticsData();
  renderWelcomeMessage();
});

// 1. NAVIGATION
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.dataset.target;
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.remove('hidden');

      if (targetId === 'tab-tracking') loadTrackingData();
      if (targetId === 'tab-operations') loadOperationsData();
      if (targetId === 'tab-knowledge') loadKnowledgeData();
      if (targetId === 'tab-analytics') loadAnalyticsData();
    });
  });
}

// 2. METADATA LOADER
async function loadMetadata() {
  try {
    const res = await fetch('/api/meta');
    const data = await res.json();
    state.meta = data;
  } catch (err) {
    console.error('Failed to load metadata:', err);
  }
}

// 3. PERSONA SWITCHER (RBAC)
function initPersonaSwitcher() {
  const select = document.getElementById('personaSelect');
  if (!select) return;

  select.addEventListener('change', (e) => {
    const opt = select.options[select.selectedIndex];
    const role = opt.dataset.role;
    const name = opt.dataset.name;
    const city = opt.dataset.city || 'Vizag';
    const dept = opt.dataset.dept || 'Operations';

    state.user = {
      id: select.value,
      name,
      role,
      city,
      dept
    };

    updateRoleBanner();
    loadTrackingData();

    // Add notification message in chat
    appendChatMessage('system', `Switched active RBAC persona to **${name}** (\`${select.value}\` - ${role}). Permissions and record isolation have been updated.`);
  });

  updateRoleBanner();
}

function updateRoleBanner() {
  const badge = document.getElementById('roleBadge');
  const desc = document.getElementById('roleDescription');
  const filterCustName = document.getElementById('filterCustomerName');
  const custNotice = document.getElementById('customerFilterNotice');

  if (state.user.role === 'Customer') {
    badge.className = 'px-2 py-0.5 rounded font-bold uppercase text-[10px] tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    badge.textContent = 'Citizen Scope';
    desc.innerHTML = `Access to verified Knowledge Base FAQs & private service records for <strong>${state.user.name} (${state.user.id})</strong>.`;
    if (custNotice) custNotice.classList.remove('hidden');
    if (filterCustName) filterCustName.textContent = `${state.user.name} (${state.user.id})`;
  } else if (state.user.role === 'Employee') {
    badge.className = 'px-2 py-0.5 rounded font-bold uppercase text-[10px] tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30';
    badge.textContent = 'Utility Staff Scope';
    desc.innerHTML = `Internal permissions active for <strong>${state.user.name} (${state.user.id} - ${state.user.dept})</strong>. Access to all operational tickets & daily outage logs.`;
    if (custNotice) custNotice.classList.add('hidden');
  } else {
    badge.className = 'px-2 py-0.5 rounded font-bold uppercase text-[10px] tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30';
    badge.textContent = 'Administrator Scope';
    desc.innerHTML = `Full system governance for <strong>${state.user.name} (${state.user.id})</strong>. Knowledge ingestion, cross-utility dispatch, & audit compliance.`;
    if (custNotice) custNotice.classList.add('hidden');
  }

  // Update modal defaults
  const reqCust = document.getElementById('reqCustomerDisplay');
  const cmpCust = document.getElementById('cmpCustomerDisplay');
  if (reqCust) reqCust.value = `${state.user.name} (${state.user.id}) - ${state.user.city}`;
  if (cmpCust) cmpCust.value = `${state.user.name} (${state.user.id}) - ${state.user.city}`;
}

// 4. CONVERSATIONAL RAG CHAT
function initChat() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const btnClear = document.getElementById('btnClearChat');
  const btnVoice = document.getElementById('btnVoiceInput');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = input.value.trim();
      if (!message) return;

      input.value = '';
      await sendChatMessage(message);
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      const container = document.getElementById('chatMessages');
      container.innerHTML = '';
      renderWelcomeMessage();
    });
  }

  // Quick Prompt buttons
  document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.querySelector('.text-\\[11px\\]')?.textContent.trim() || btn.textContent.trim();
      if (input) {
        input.value = text;
        sendChatMessage(text);
      }
    });
  });

  // Voice Input (Web Speech API)
  if (btnVoice) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        btnVoice.classList.add('voice-active');
        btnVoice.title = 'Listening... Speak now';
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (input) {
          input.value = transcript;
          sendChatMessage(transcript);
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech error:', e.error);
        btnVoice.classList.remove('voice-active');
      };

      recognition.onend = () => {
        btnVoice.classList.remove('voice-active');
      };

      btnVoice.addEventListener('click', () => {
        try {
          recognition.start();
        } catch (err) {
          recognition.stop();
        }
      });
    } else {
      btnVoice.title = 'Speech recognition not supported in this browser';
      btnVoice.classList.add('opacity-40', 'cursor-not-allowed');
    }
  }
}

function renderWelcomeMessage() {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const welcomeHtml = `
    <div class="flex items-start gap-3.5 max-w-2xl">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white flex items-center justify-center flex-shrink-0 shadow-md">
        <i class="fa-solid fa-robot text-sm"></i>
      </div>
      <div class="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 text-xs text-slate-200 shadow-lg space-y-2.5">
        <div class="font-bold text-white text-sm flex items-center gap-2">
          <span>Namaste! Welcome to TechBharat Utility Assistant</span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">C2-22</span>
        </div>
        <p class="text-slate-300 leading-relaxed">
          I am your authorized virtual assistant for municipal and state utilities (Electricity, Water, Gas, Telecom, and Waste Management). All answers are strictly grounded in verified SOP documents with transparent source citations.
        </p>
        <div class="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-1">
          <div class="font-semibold text-brand-400">What you can ask me:</div>
          <div class="text-slate-300">• <strong>Check Ticket:</strong> "Check status of SR000001" or "Status of CMP000001"</div>
          <div class="text-slate-300">• <strong>Procedures & SOPs:</strong> "What documents are needed for a new electricity connection?"</div>
          <div class="text-slate-300">• <strong>Billing Disputes:</strong> "What should I do if my water or electricity bill is incorrect?"</div>
          <div class="text-slate-300">• <strong>Daily Summary:</strong> "Summarize today's issues and outages" (Staff / Supervisor view)</div>
        </div>
        <div class="text-[10px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-800">
          <span>Authors: G. Shanmukh Vardhan Sai & Panam Victor Komal</span>
          <span class="text-emerald-400">Strict RBAC & Grounding</span>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = welcomeHtml;
}

async function sendChatMessage(query) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  // 1. Append User Message
  appendChatMessage('user', query);

  // 2. Append Shimmering Loading Bubble
  const loadingId = 'loading-' + Date.now();
  const loadingHtml = `
    <div id="${loadingId}" class="flex items-start gap-3.5 max-w-2xl">
      <div class="w-8 h-8 rounded-xl bg-brand-600/30 text-brand-400 flex items-center justify-center flex-shrink-0 animate-pulse">
        <i class="fa-solid fa-spinner fa-spin text-sm"></i>
      </div>
      <div class="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 text-xs text-slate-400 w-64 animate-shimmer">
        <div class="h-3 bg-slate-700 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-slate-700 rounded w-1/2"></div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', loadingHtml);
  container.scrollTop = container.scrollHeight;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        userContext: {
          userId: state.user.id,
          userName: state.user.name,
          role: state.user.role,
          city: state.user.city
        }
      })
    });

    const data = await res.json();
    document.getElementById(loadingId)?.remove();

    renderAssistantReply(data);
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    appendChatMessage('system', `Error connecting to assistant server: ${err.message}`);
  }
}

function appendChatMessage(sender, text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  let html = '';
  if (sender === 'user') {
    html = `
      <div class="flex items-start justify-end gap-3.5">
        <div class="bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-2xl rounded-tr-none px-4 py-3 text-xs max-w-lg shadow-md">
          ${escapeHtml(text)}
        </div>
        <div class="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
          <i class="fa-solid fa-user"></i>
        </div>
      </div>
    `;
  } else if (sender === 'system') {
    html = `
      <div class="flex justify-center my-2">
        <div class="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-full text-[11px] text-slate-400 flex items-center gap-1.5 shadow-sm">
          <i class="fa-solid fa-circle-info text-brand-400"></i>
          <span>${marked.parseInline(text)}</span>
        </div>
      </div>
    `;
  }

  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
}

function renderAssistantReply(data) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const {
    reply = '',
    intent = 'GENERAL',
    citations = [],
    cards = [],
    securityAlert = false,
    confidence = 1.0,
    latencyMs = 0,
    actionButtons = []
  } = data;

  const parsedMarkdown = marked.parse(reply);

  // Citations HTML
  let citationsHtml = '';
  if (citations && citations.length > 0) {
    citationsHtml = `
      <div class="mt-3 pt-3 border-t border-slate-800/80">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <i class="fa-solid fa-certificate text-emerald-400"></i> Verified Citations (${citations.length})
        </div>
        <div class="flex flex-wrap gap-2">
          ${citations.map(c => `
            <div class="citation-chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-700/80 text-[11px] text-slate-300">
              <i class="fa-solid fa-file-shield text-cyan-400 text-[10px]"></i>
              <span class="font-medium text-slate-200">${escapeHtml(c.title || c.source)}</span>
              ${c.confidence ? `<span class="text-[10px] text-emerald-400 font-mono">(${c.confidence})</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Cards HTML (Service Request or Complaint)
  let cardsHtml = '';
  if (cards && cards.length > 0) {
    cardsHtml = cards.map(c => {
      if (c.type === 'SERVICE_REQUEST') {
        const stBadge = getStatusBadge(c.status);
        const prBadge = getPriorityBadge(c.priority);
        return `
          <div class="mt-3 p-4 rounded-xl bg-slate-950/90 border border-slate-700/80 shadow-md">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-brand-300 text-sm">${c.requestId}</span>
                <span class="text-slate-400">•</span>
                <span class="text-slate-200 font-semibold">${c.utility} (${c.requestType})</span>
              </div>
              <div class="flex items-center gap-1.5">
                ${stBadge}
                ${prBadge}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mb-2">
              <div><span class="text-slate-400">Customer:</span> ${escapeHtml(c.customerName)} (${c.customerId})</div>
              <div><span class="text-slate-400">Location:</span> ${escapeHtml(c.location || 'N/A')}</div>
              <div><span class="text-slate-400">Assigned Staff:</span> ${escapeHtml(c.assignedStaff)}</div>
              <div><span class="text-slate-400">Created:</span> ${c.createdAt ? c.createdAt.substring(0, 10) : 'Recent'}</div>
            </div>
            <div class="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
              <span class="text-slate-400">Description:</span> "${escapeHtml(c.description)}"
            </div>
            ${state.user.role !== 'Customer' ? `
              <div class="mt-2.5 pt-2 border-t border-slate-800 flex justify-end">
                <button onclick="openUpdateModal('SERVICE_REQUEST', '${c.requestId}', '${c.statusId || 'ST002'}')" class="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition">
                  <i class="fa-solid fa-pen-to-square mr-1"></i> Update Status (Staff)
                </button>
              </div>
            ` : ''}
          </div>
        `;
      } else if (c.type === 'COMPLAINT') {
        const stBadge = getStatusBadge(c.status);
        const prBadge = getPriorityBadge(c.priority);
        return `
          <div class="mt-3 p-4 rounded-xl bg-slate-950/90 border border-slate-700/80 shadow-md">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-rose-300 text-sm">${c.complaintId}</span>
                <span class="text-slate-400">•</span>
                <span class="text-slate-200 font-semibold">${c.category}</span>
              </div>
              <div class="flex items-center gap-1.5">
                ${stBadge}
                ${prBadge}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mb-2">
              <div><span class="text-slate-400">Linked Request:</span> <span class="font-mono text-brand-300">${c.requestId}</span></div>
              <div><span class="text-slate-400">Customer:</span> ${escapeHtml(c.customerName || c.customerId)}</div>
              <div><span class="text-slate-400">Filing Date:</span> ${c.createdDate}</div>
              <div><span class="text-slate-400">Latest Update:</span> <span class="text-emerald-400">${escapeHtml(c.latestUpdate)}</span></div>
            </div>
          </div>
        `;
      }
      return '';
    }).join('');
  }

  // Security Alert Style (RBAC violation)
  const isSecurity = securityAlert || intent === 'RBAC_DENIED';
  const borderClass = isSecurity ? 'border-rose-500/50 bg-rose-950/20' : 'border-slate-700/80 bg-slate-900/90';

  // Action Buttons HTML
  let actionsHtml = '';
  if (actionButtons && actionButtons.length > 0) {
    actionsHtml = `
      <div class="mt-3 pt-2 border-t border-slate-800 flex flex-wrap gap-2">
        ${actionButtons.map(b => `
          <button onclick="handleActionButton('${b.action}')" class="px-3 py-1.5 rounded-lg bg-brand-600/30 hover:bg-brand-600/50 text-brand-200 border border-brand-500/40 text-xs font-semibold transition flex items-center gap-1.5">
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
            <span>${b.text}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  const replyHtml = `
    <div class="flex items-start gap-3.5 max-w-2xl">
      <div class="w-8 h-8 rounded-xl ${isSecurity ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-brand-500/20 text-brand-400 border border-brand-500/30'} flex items-center justify-center flex-shrink-0">
        <i class="fa-solid ${isSecurity ? 'fa-shield-halved text-rose-400' : 'fa-robot text-brand-400'} text-sm"></i>
      </div>
      <div class="${borderClass} border rounded-2xl p-4 text-xs text-slate-200 shadow-xl flex-1">
        <div class="chat-markdown leading-relaxed">
          ${parsedMarkdown}
        </div>
        ${cardsHtml}
        ${citationsHtml}
        ${actionsHtml}
        <div class="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full ${isSecurity ? 'bg-rose-400' : 'bg-emerald-400'}"></span>
            <span>Intent: <strong>${intent}</strong></span>
          </span>
          <span class="font-mono text-slate-400">Response in ${latencyMs}ms</span>
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', replyHtml);
  container.scrollTop = container.scrollHeight;
}

window.handleActionButton = function(action) {
  if (action === 'OPEN_REQUEST_MODAL') {
    openModal('modalNewRequest');
  } else if (action === 'OPEN_COMPLAINT_MODAL') {
    openModal('modalNewComplaint');
  } else if (action === 'CONNECT_SUPPORT') {
    appendChatMessage('system', 'Support handoff initiated: Connecting your session to Support Agent (EMP0001 - Customer Support). Average wait time: < 1 minute.');
  }
};

// 5. REQUESTS & COMPLAINTS HUB
function initTrackingControls() {
  const btnSubReq = document.getElementById('btnSubTabRequests');
  const btnSubCmp = document.getElementById('btnSubTabComplaints');
  const searchInput = document.getElementById('trackingSearchInput');
  const utilFilter = document.getElementById('trackingUtilityFilter');
  const stFilter = document.getElementById('trackingStatusFilter');
  const prFilter = document.getElementById('trackingPriorityFilter');

  btnSubReq?.addEventListener('click', () => {
    state.tracking.subTab = 'requests';
    state.tracking.page = 1;
    btnSubReq.classList.add('active');
    btnSubCmp?.classList.remove('active');
    loadTrackingData();
  });

  btnSubCmp?.addEventListener('click', () => {
    state.tracking.subTab = 'complaints';
    state.tracking.page = 1;
    btnSubCmp.classList.add('active');
    btnSubReq?.classList.remove('active');
    loadTrackingData();
  });

  let debounceTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.tracking.search = searchInput.value.trim();
      state.tracking.page = 1;
      loadTrackingData();
    }, 300);
  });

  utilFilter?.addEventListener('change', () => {
    state.tracking.utility = utilFilter.value;
    state.tracking.page = 1;
    loadTrackingData();
  });

  stFilter?.addEventListener('change', () => {
    state.tracking.status = stFilter.value;
    state.tracking.page = 1;
    loadTrackingData();
  });

  prFilter?.addEventListener('change', () => {
    state.tracking.priority = prFilter.value;
    state.tracking.page = 1;
    loadTrackingData();
  });

  document.getElementById('btnPrevPage')?.addEventListener('click', () => {
    if (state.tracking.page > 1) {
      state.tracking.page--;
      loadTrackingData();
    }
  });

  document.getElementById('btnNextPage')?.addEventListener('click', () => {
    state.tracking.page++;
    loadTrackingData();
  });
}

async function loadTrackingData() {
  const header = document.getElementById('trackingTableHeader');
  const body = document.getElementById('trackingTableBody');
  const recordCount = document.getElementById('trackingRecordCount');
  const pageIndicator = document.getElementById('currentPageIndicator');
  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');

  if (!body) return;

  const isReq = state.tracking.subTab === 'requests';
  const offset = (state.tracking.page - 1) * state.tracking.limit;

  // Build query
  const params = new URLSearchParams();
  if (state.user.role === 'Customer') {
    params.set('customer_id', state.user.id);
  }
  if (state.tracking.search) params.set('q', state.tracking.search);
  if (state.tracking.utility) params.set('utility_id', state.tracking.utility);
  if (state.tracking.status) params.set('status_id', state.tracking.status);
  if (state.tracking.priority) params.set('priority_id', state.tracking.priority);
  params.set('limit', state.tracking.limit);
  params.set('offset', offset);

  const endpoint = isReq ? `/api/requests?${params.toString()}` : `/api/complaints?${params.toString()}`;

  body.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-400">Loading records...</td></tr>`;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    const records = data.records || [];

    // Table Header
    if (header) {
      if (isReq) {
        header.innerHTML = `
          <th class="px-4 py-3">Request ID</th>
          <th class="px-4 py-3">Utility</th>
          <th class="px-4 py-3">Type</th>
          <th class="px-4 py-3">Customer</th>
          <th class="px-4 py-3">Status</th>
          <th class="px-4 py-3">Priority</th>
          <th class="px-4 py-3">Assigned Crew</th>
          <th class="px-4 py-3">Action</th>
        `;
      } else {
        header.innerHTML = `
          <th class="px-4 py-3">Complaint ID</th>
          <th class="px-4 py-3">Linked Request</th>
          <th class="px-4 py-3">Category</th>
          <th class="px-4 py-3">Customer</th>
          <th class="px-4 py-3">Status</th>
          <th class="px-4 py-3">Priority</th>
          <th class="px-4 py-3">Latest Update</th>
          <th class="px-4 py-3">Action</th>
        `;
      }
    }

    if (records.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-8 text-slate-400">
            <i class="fa-solid fa-folder-open text-2xl text-slate-600 block mb-2"></i>
            No records found matching current RBAC scope and filters.
          </td>
        </tr>
      `;
      if (recordCount) recordCount.textContent = 'Showing 0 records';
      return;
    }

    // Populate rows
    body.innerHTML = records.map(r => {
      const stBadge = getStatusBadge(r.status_name);
      const prBadge = getPriorityBadge(r.priority_name);

      if (isReq) {
        return `
          <tr class="hover:bg-slate-750/50 transition">
            <td class="px-4 py-3 font-mono font-bold text-brand-300">${r.request_id}</td>
            <td class="px-4 py-3 text-slate-200">${r.utility_name}</td>
            <td class="px-4 py-3 text-slate-300">${r.request_type_name}</td>
            <td class="px-4 py-3">
              <div class="text-slate-200 font-medium">${escapeHtml(r.customer_name || r.customer_id)}</div>
              <div class="text-[10px] text-slate-400">${r.service_location || ''}</div>
            </td>
            <td class="px-4 py-3">${stBadge}</td>
            <td class="px-4 py-3">${prBadge}</td>
            <td class="px-4 py-3 text-slate-300">${escapeHtml(r.staff_name || 'Pending Crew')}</td>
            <td class="px-4 py-3">
              <button onclick="handleQuickCheckTicket('${r.request_id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition text-[11px]">
                <i class="fa-solid fa-comments mr-1"></i> Ask AI
              </button>
              ${state.user.role !== 'Customer' ? `
                <button onclick="openUpdateModal('SERVICE_REQUEST', '${r.request_id}', '${r.status_id}')" class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] ml-1">
                  <i class="fa-solid fa-pen"></i>
                </button>
              ` : ''}
            </td>
          </tr>
        `;
      } else {
        return `
          <tr class="hover:bg-slate-750/50 transition">
            <td class="px-4 py-3 font-mono font-bold text-rose-300">${r.complaint_id}</td>
            <td class="px-4 py-3 font-mono text-brand-300">${r.request_id}</td>
            <td class="px-4 py-3 text-slate-200">${escapeHtml(r.category)}</td>
            <td class="px-4 py-3 text-slate-300">${escapeHtml(r.customer_name || r.customer_id)}</td>
            <td class="px-4 py-3">${stBadge}</td>
            <td class="px-4 py-3">${prBadge}</td>
            <td class="px-4 py-3 text-slate-300">${escapeHtml(r.latest_update || '')}</td>
            <td class="px-4 py-3">
              <button onclick="handleQuickCheckTicket('${r.complaint_id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition text-[11px]">
                <i class="fa-solid fa-comments mr-1"></i> Ask AI
              </button>
              ${state.user.role !== 'Customer' ? `
                <button onclick="openUpdateModal('COMPLAINT', '${r.complaint_id}', '${r.status_id}')" class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] ml-1">
                  <i class="fa-solid fa-pen"></i>
                </button>
              ` : ''}
            </td>
          </tr>
        `;
      }
    }).join('');

    if (recordCount) {
      recordCount.textContent = `Showing ${records.length} records (Page ${state.tracking.page})`;
    }
    if (pageIndicator) pageIndicator.textContent = `Page ${state.tracking.page}`;
    if (btnPrev) btnPrev.disabled = state.tracking.page <= 1;
    if (btnNext) btnNext.disabled = records.length < state.tracking.limit;

  } catch (err) {
    body.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-rose-400">Failed to load records: ${err.message}</td></tr>`;
  }
}

window.handleQuickCheckTicket = function(id) {
  // Switch to Assistant tab
  const assistantTab = document.querySelector('.nav-tab[data-target="tab-assistant"]');
  if (assistantTab) assistantTab.click();
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = `Check status of ${id}`;
    sendChatMessage(`Check status of ${id}`);
  }
};

// 6. OPERATIONS & OUTAGES
function initOperations() {
  const btnSummarize = document.getElementById('btnGenerateOperationalSummary');
  const btnCloseSummary = document.getElementById('btnCloseSummary');
  const btnCopy = document.getElementById('btnCopySummary');
  const typeFilter = document.getElementById('incTypeFilter');
  const areaFilter = document.getElementById('incAreaFilter');

  btnSummarize?.addEventListener('click', async () => {
    btnSummarize.disabled = true;
    btnSummarize.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Synthesizing Summary...`;
    
    try {
      const res = await fetch('/api/incidents/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: state.user.role,
          userId: state.user.id
        })
      });
      const data = await res.json();
      
      const summaryCard = document.getElementById('operationalSummaryCard');
      const summaryContent = document.getElementById('operationalSummaryContent');
      if (summaryCard && summaryContent) {
        summaryContent.innerHTML = marked.parse(data.reply);
        summaryCard.classList.remove('hidden');
        summaryCard.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (e) {
      alert('Error generating summary: ' + e.message);
    } finally {
      btnSummarize.disabled = false;
      btnSummarize.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Generate Daily AI Summary`;
    }
  });

  btnCloseSummary?.addEventListener('click', () => {
    document.getElementById('operationalSummaryCard')?.classList.add('hidden');
  });

  btnCopy?.addEventListener('click', () => {
    const content = document.getElementById('operationalSummaryContent')?.innerText;
    if (content) {
      navigator.clipboard.writeText(content);
      btnCopy.innerHTML = `<i class="fa-solid fa-check mr-1"></i> Copied!`;
      setTimeout(() => {
        btnCopy.innerHTML = `<i class="fa-solid fa-copy mr-1"></i> Copy`;
      }, 2000);
    }
  });

  typeFilter?.addEventListener('change', loadOperationsData);
  areaFilter?.addEventListener('change', loadOperationsData);
}

async function loadOperationsData() {
  const body = document.getElementById('incidentsTableBody');
  const typeFilter = document.getElementById('incTypeFilter')?.value;
  const areaFilter = document.getElementById('incAreaFilter')?.value;
  if (!body) return;

  const params = new URLSearchParams();
  if (typeFilter) params.set('incident_type', typeFilter);
  if (areaFilter) params.set('area', areaFilter);

  try {
    const res = await fetch(`/api/incidents?${params.toString()}`);
    const data = await res.json();
    const list = data.incidents || [];

    body.innerHTML = list.map(i => {
      const stBadge = getStatusBadge(i.status_name);
      const prBadge = getPriorityBadge(i.priority_name);

      return `
        <tr class="hover:bg-slate-750/50 transition">
          <td class="px-4 py-3 font-mono font-bold text-amber-300">${i.incident_id}</td>
          <td class="px-4 py-3 text-slate-200">${i.utility_name}</td>
          <td class="px-4 py-3 text-slate-300">${i.incident_type}</td>
          <td class="px-4 py-3 font-semibold text-slate-200">${i.affected_area}</td>
          <td class="px-4 py-3">${prBadge}</td>
          <td class="px-4 py-3">${stBadge}</td>
          <td class="px-4 py-3 text-slate-400">${escapeHtml(i.staff_name || 'Engineering Crew')}</td>
          <td class="px-4 py-3 text-slate-300 max-w-xs truncate" title="${escapeHtml(i.summary)}">${escapeHtml(i.summary)}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    body.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-rose-400">Failed to load incidents: ${err.message}</td></tr>`;
  }
}

// 7. KNOWLEDGE BASE & RAG HUB
function initKnowledge() {
  const btnRunTest = document.getElementById('btnRunRAGTest');
  const testInput = document.getElementById('ragTestInput');

  btnRunTest?.addEventListener('click', () => {
    runSemanticRAGTest(testInput?.value || '');
  });

  testInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSemanticRAGTest(testInput.value);
  });
}

async function runSemanticRAGTest(q) {
  const container = document.getElementById('ragTestResults');
  if (!container) return;
  container.innerHTML = `<div class="col-span-3 text-center py-4 text-slate-400">Searching hybrid BM25 / Vector index...</div>`;

  try {
    const res = await fetch(`/api/rag/test?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const matches = data.matches || [];

    if (matches.length === 0) {
      container.innerHTML = `<div class="col-span-3 text-center py-4 text-amber-400">No matching chunks found above confidence threshold.</div>`;
      return;
    }

    container.innerHTML = matches.map((m, idx) => `
      <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-white">${m.title}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${m.confidence > 0.6 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
              ${Math.round(m.confidence * 100)}% match
            </span>
          </div>
          <p class="text-slate-300 text-[11px] leading-relaxed line-clamp-4">"${escapeHtml(m.text || m.answer)}"</p>
        </div>
        <div class="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
          <span>Source: ${m.source}</span>
          <span class="font-mono text-cyan-400">${m.id}</span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<div class="col-span-3 text-center py-4 text-rose-400">Error: ${err.message}</div>`;
  }
}

async function loadKnowledgeData() {
  const docContainer = document.getElementById('documentsList');
  const faqsBody = document.getElementById('faqsTableBody');

  try {
    const res = await fetch('/api/documents');
    const data = await res.json();

    // 1. Documents Cards
    if (docContainer) {
      docContainer.innerHTML = (data.documents || []).map(d => `
        <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-700/80 text-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-white text-sm">${escapeHtml(d.document_title)}</span>
              <span class="font-mono text-[10px] text-cyan-400 px-1.5 py-0.5 rounded bg-slate-950">${d.document_id}</span>
            </div>
            <div class="text-[11px] text-brand-400 font-semibold mb-2">${d.utility_name} Sector</div>
            <p class="text-slate-300 text-[11px] leading-relaxed line-clamp-3 mb-2">${escapeHtml(d.document_text)}</p>
          </div>
          <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>${d.source_type}</span>
            <span class="text-emerald-400 font-semibold">${d.faq_count} Grounded FAQs</span>
          </div>
        </div>
      `).join('');
    }

    // 2. FAQs Table
    if (faqsBody) {
      faqsBody.innerHTML = (data.sampleFaqs || []).map(f => `
        <tr class="hover:bg-slate-750/50 transition">
          <td class="px-4 py-3 font-mono font-bold text-purple-300">${f.faq_id}</td>
          <td class="px-4 py-3 text-slate-300">${f.utility_name}</td>
          <td class="px-4 py-3 text-slate-200 font-medium">${escapeHtml(f.question)}</td>
          <td class="px-4 py-3 text-slate-300 max-w-sm">${escapeHtml(f.answer)}</td>
          <td class="px-4 py-3 text-slate-400 text-[10px]">${escapeHtml(f.source_note)}</td>
        </tr>
      `).join('');
    }

    // Initial RAG test
    runSemanticRAGTest('What documents are needed for a new electricity connection?');

  } catch (err) {
    console.error('Failed to load knowledge documents:', err);
  }
}

// 8. ANALYTICS & AUDIT LOGS
async function loadAnalyticsData() {
  const utilContainer = document.getElementById('analyticsUtilityBreakdown');
  const stContainer = document.getElementById('analyticsStatusBreakdown');
  const prContainer = document.getElementById('analyticsPriorityBreakdown');
  const auditBody = document.getElementById('auditLogsTableBody');

  try {
    // 1. Metrics Breakdown
    const metricsRes = await fetch('/api/metrics');
    const metrics = await metricsRes.json();

    if (utilContainer) {
      utilContainer.innerHTML = (metrics.requestsByUtility || []).map(u => `
        <div>
          <div class="flex justify-between text-slate-300 mb-1">
            <span>${u.utility_name}</span>
            <span class="font-bold text-white">${u.count}</span>
          </div>
          <div class="w-full bg-slate-900 rounded-full h-2">
            <div class="bg-brand-500 h-2 rounded-full" style="width: ${(u.count / 500) * 100}%"></div>
          </div>
        </div>
      `).join('');
    }

    if (stContainer) {
      stContainer.innerHTML = (metrics.requestsByStatus || []).map(s => `
        <div>
          <div class="flex justify-between text-slate-300 mb-1">
            <span>${s.status_name}</span>
            <span class="font-bold text-white">${s.count}</span>
          </div>
          <div class="w-full bg-slate-900 rounded-full h-2">
            <div class="bg-indigo-500 h-2 rounded-full" style="width: ${(s.count / 500) * 100}%"></div>
          </div>
        </div>
      `).join('');
    }

    if (prContainer) {
      prContainer.innerHTML = (metrics.priorityBreakdown || []).map(p => `
        <div>
          <div class="flex justify-between text-slate-300 mb-1">
            <span>${p.priority_name}</span>
            <span class="font-bold text-white">${p.count}</span>
          </div>
          <div class="w-full bg-slate-900 rounded-full h-2">
            <div class="bg-rose-500 h-2 rounded-full" style="width: ${(p.count / 500) * 100}%"></div>
          </div>
        </div>
      `).join('');
    }

    // 2. Audit Logs
    const auditRes = await fetch('/api/audit-logs');
    const auditData = await auditRes.json();
    const logs = auditData.logs || [];

    if (auditBody) {
      auditBody.innerHTML = logs.map(l => {
        const isDenied = l.status === 'DENIED';
        return `
          <tr class="hover:bg-slate-750/50 transition">
            <td class="px-4 py-2.5 text-slate-400">#${l.log_id}</td>
            <td class="px-4 py-2.5 text-slate-400">${l.timestamp}</td>
            <td class="px-4 py-2.5 text-brand-300 font-bold">${escapeHtml(l.user_id)}</td>
            <td class="px-4 py-2.5 text-slate-300">${l.user_role}</td>
            <td class="px-4 py-2.5 text-slate-200">${l.action_type}</td>
            <td class="px-4 py-2.5 text-cyan-300">${l.intent_routed || 'N/A'}</td>
            <td class="px-4 py-2.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isDenied ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}">
                ${l.status}
              </span>
            </td>
            <td class="px-4 py-2.5 text-slate-300 max-w-xs truncate" title="${escapeHtml(l.query_or_target)}">${escapeHtml(l.query_or_target)}</td>
          </tr>
        `;
      }).join('');
    }

  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
}

// 9. MODALS & SUBMISSION HANDLERS
function initModals() {
  // Modal openers
  document.getElementById('btnQuickNewReq')?.addEventListener('click', () => openModal('modalNewRequest'));
  document.getElementById('btnQuickComplaint')?.addEventListener('click', () => openModal('modalNewComplaint'));
  document.getElementById('btnOpenNewRequestModal')?.addEventListener('click', () => openModal('modalNewRequest'));
  document.getElementById('btnOpenNewComplaintModal')?.addEventListener('click', () => openModal('modalNewComplaint'));
  document.getElementById('btnOpenIngestModal')?.addEventListener('click', () => openModal('modalIngestDocument'));
  document.getElementById('btnAboutProject')?.addEventListener('click', () => openModal('modalAboutProject'));
  document.getElementById('btnOpenLoginModal')?.addEventListener('click', () => openModal('modalAboutProject'));

  // Modal Closers
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fixed.inset-0').forEach(m => m.classList.add('hidden'));
    });
  });

  // Close on outside click
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('fixed') && e.target.classList.contains('inset-0')) {
      e.target.classList.add('hidden');
    }
  });

  // 1. Submit New Request
  document.getElementById('formNewRequest')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const utility_id = document.getElementById('reqUtilitySelect').value;
    const request_type_id = document.getElementById('reqTypeSelect').value;
    const priority_id = document.getElementById('reqPrioritySelect').value;
    const service_location = document.getElementById('reqLocationInput').value;
    const description = document.getElementById('reqDescriptionInput').value;

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: state.user.id,
          utility_id,
          request_type_id,
          priority_id,
          service_location,
          description
        })
      });
      const data = await res.json();
      if (data.success) {
        closeModal('modalNewRequest');
        alert(`Service Request Created! Request ID: ${data.requestId}`);
        loadTrackingData();
        // Notify chat
        appendChatMessage('system', `Successfully filed Service Request **${data.requestId}**.`);
      }
    } catch (err) {
      alert('Error creating request: ' + err.message);
    }
  });

  // 2. Submit New Complaint
  document.getElementById('formNewComplaint')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('cmpCategorySelect').value;
    const priority_id = document.getElementById('cmpPrioritySelect').value;
    const request_id = document.getElementById('cmpRelatedRequestId').value;
    const latest_update = document.getElementById('cmpDetailsInput').value;

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: state.user.id,
          category,
          priority_id,
          request_id: request_id || undefined,
          latest_update
        })
      });
      const data = await res.json();
      if (data.success) {
        closeModal('modalNewComplaint');
        alert(`Complaint Registered! Complaint ID: ${data.complaintId}`);
        loadTrackingData();
        appendChatMessage('system', `Official complaint registered under Reference **${data.complaintId}**.`);
      }
    } catch (err) {
      alert('Error registering complaint: ' + err.message);
    }
  });

  // 3. Ingest SOP Document
  document.getElementById('formIngestDocument')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('ingestTitle').value;
    const utilityId = document.getElementById('ingestUtilitySelect').value;
    const sourceType = document.getElementById('ingestSourceTag').value;
    const text = document.getElementById('ingestFullText').value;

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          utilityId,
          sourceType,
          text,
          staffId: state.user.id
        })
      });
      const data = await res.json();
      if (data.success) {
        closeModal('modalIngestDocument');
        alert(`Document Indexed! New Document ID: ${data.docId}`);
        loadKnowledgeData();
        appendChatMessage('system', `Admin indexed new procedural guide **${title}** (\`${data.docId}\`) into vector store.`);
      }
    } catch (err) {
      alert('Error ingesting document: ' + err.message);
    }
  });

  // 4. Update Ticket Status
  document.getElementById('formUpdateTicket')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ticketType = document.getElementById('updateTicketType').value;
    const ticketId = document.getElementById('updateTicketId').value;
    const statusId = document.getElementById('updateStatusSelect').value;
    const assignedStaffId = document.getElementById('updateStaffSelect').value;
    const note = document.getElementById('updateNoteInput').value;

    try {
      const res = await fetch('/api/tickets/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType,
          ticketId,
          statusId,
          assignedStaffId,
          note,
          staffId: state.user.id
        })
      });
      const data = await res.json();
      if (data.success) {
        closeModal('modalUpdateTicket');
        alert(`Ticket ${ticketId} updated successfully!`);
        loadTrackingData();
        appendChatMessage('system', `Staff updated ticket **${ticketId}** to status \`${statusId}\`.`);
      }
    } catch (err) {
      alert('Error updating ticket: ' + err.message);
    }
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

window.openUpdateModal = function(ticketType, ticketId, currentStatusId) {
  const modal = document.getElementById('modalUpdateTicket');
  const typeInput = document.getElementById('updateTicketType');
  const idInput = document.getElementById('updateTicketId');
  const targetDisplay = document.getElementById('updateTicketTargetDisplay');
  const statusSelect = document.getElementById('updateStatusSelect');

  if (typeInput) typeInput.value = ticketType;
  if (idInput) idInput.value = ticketId;
  if (targetDisplay) targetDisplay.textContent = `${ticketType === 'SERVICE_REQUEST' ? 'Service Request' : 'Complaint'}: ${ticketId}`;
  if (statusSelect && currentStatusId) statusSelect.value = currentStatusId;

  openModal('modalUpdateTicket');
};

// 10. HELPER FUNCTIONS
function getStatusBadge(statusName) {
  const s = (statusName || '').toLowerCase();
  if (s.includes('submitted')) {
    return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Submitted</span>`;
  }
  if (s.includes('progress') || s.includes('investigation') || s.includes('assigned')) {
    return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">In Progress</span>`;
  }
  if (s.includes('resolved') || s.includes('completed') || s.includes('communicated')) {
    return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>`;
  }
  if (s.includes('rejected')) {
    return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Rejected</span>`;
  }
  if (s.includes('hold')) {
    return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">On Hold</span>`;
  }
  return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">${escapeHtml(statusName || 'Active')}</span>`;
}

function getPriorityBadge(priorityName) {
  const p = (priorityName || '').toLowerCase();
  if (p.includes('critical') || p === 'p4') {
    return `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">P4 Critical</span>`;
  }
  if (p.includes('high') || p === 'p3') {
    return `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">P3 High</span>`;
  }
  if (p.includes('medium') || p === 'p2') {
    return `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">P2 Medium</span>`;
  }
  return `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">P1 Low</span>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

