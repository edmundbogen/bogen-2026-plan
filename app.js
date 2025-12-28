// Edmund Bogen Team - 2026 Operating Plan
// Application Logic

// ===========================================
// CONFIGURATION & CONSTANTS
// ===========================================

const PASSWORDS = {
    edmund: 'Bogen2026',
    dina: 'Agent2026',
    samantha: 'Agent2026',
    nicole: 'Ops2026'
};

const USERS = {
    edmund: { name: 'Edmund Bogen', role: 'admin', displayRole: 'Admin' },
    dina: { name: 'Dina', role: 'agent', displayRole: 'Agent' },
    samantha: { name: 'Samantha', role: 'agent', displayRole: 'Agent' },
    nicole: { name: 'Nicole', role: 'ops', displayRole: 'Operations' }
};

const DEFAULT_SETTINGS = {
    commissionRate: 5.0,
    brokerageSplit: 80,
    edmundOriginatedShare: 60,
    agentOriginatedShare: 40,
    nicoleBonus: 1000,
    monthlyFloor: 25000,
    monthlyOps: 10000,
    annualFloor: 300000,
    targetDeals: 14,
    targetActiveSellers: 20
};

const STAGES = ['prospect', 'active', 'listing-meeting', 'listed', 'under-contract', 'closed'];
const STAGE_LABELS = {
    'prospect': 'Prospect',
    'active': 'Active',
    'listing-meeting': 'Listing Meeting',
    'listed': 'Listed',
    'under-contract': 'Under Contract',
    'closed': 'Closed'
};

// ===========================================
// STATE MANAGEMENT
// ===========================================

let currentUser = null;
let appData = {
    settings: { ...DEFAULT_SETTINGS },
    sellers: [],
    deals: [],
    activities: [],
    weeklyScores: [],
    vacations: [],
    teamGoals: {
        edmund: {
            goals: [
                { id: 1, title: '6 Edmund-originated $2M+ closings', target: 6, current: 0 },
                { id: 2, title: 'Maintain 20+ active $2M+ sellers', target: 20, current: 0 },
                { id: 3, title: '2 seller conversations per week', target: 104, current: 0 },
                { id: 4, title: '1 pricing conversation per week', target: 52, current: 0 }
            ]
        },
        dina: {
            goals: [
                { id: 1, title: 'Agent-originated closings', target: 4, current: 0 },
                { id: 2, title: 'Listing presentations', target: 12, current: 0 },
                { id: 3, title: 'Buyer transactions', target: 6, current: 0 }
            ]
        },
        samantha: {
            goals: [
                { id: 1, title: 'Agent-originated closings', target: 4, current: 0 },
                { id: 2, title: 'Listing presentations', target: 12, current: 0 },
                { id: 3, title: 'Buyer transactions', target: 6, current: 0 }
            ]
        },
        nicole: {
            goals: [
                { id: 1, title: 'Transactions processed', target: 14, current: 0 },
                { id: 2, title: 'Closing checklist completion rate', target: 100, current: 0 },
                { id: 3, title: 'Average days to close (target < 45)', target: 45, current: 0 }
            ]
        }
    },
    weeklyChecklist: {}
};

// ===========================================
// INITIALIZATION
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    checkAuth();
    initializeNavigation();
    initializeChecklist();
    initializePipelineFilters();
    calculateDeal(); // Initialize calculator
    updateWeekDateRange();
});

function loadData() {
    const saved = localStorage.getItem('bogen2026Data');
    if (saved) {
        const parsed = JSON.parse(saved);
        appData = { ...appData, ...parsed };
        // Ensure settings have all defaults
        appData.settings = { ...DEFAULT_SETTINGS, ...appData.settings };
    }
}

function saveData() {
    localStorage.setItem('bogen2026Data', JSON.stringify(appData));
}

// ===========================================
// AUTHENTICATION
// ===========================================

function checkAuth() {
    const savedUser = sessionStorage.getItem('bogen2026User');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
    }
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const userId = document.getElementById('login-user').value;
    const password = document.getElementById('login-password').value;

    if (PASSWORDS[userId] && PASSWORDS[userId] === password) {
        currentUser = { id: userId, ...USERS[userId] };
        sessionStorage.setItem('bogen2026User', JSON.stringify(currentUser));
        showApp();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
});

function logout() {
    sessionStorage.removeItem('bogen2026User');
    currentUser = null;
    location.reload();
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // Update user info in header
    document.getElementById('current-user-name').textContent = currentUser.name;
    document.getElementById('current-user-role').textContent = currentUser.displayRole;

    // Handle role-based nav visibility
    const navOps = document.getElementById('nav-ops');
    const navSettings = document.getElementById('nav-settings');

    // Ops page visible to admin and ops
    if (currentUser.role !== 'admin' && currentUser.role !== 'ops') {
        navOps.classList.add('hidden');
    }

    // Settings only for admin
    if (currentUser.role !== 'admin') {
        navSettings.classList.add('hidden');
    }

    // Load settings into form if admin
    if (currentUser.role === 'admin') {
        loadSettingsForm();
    }

    // Render all pages
    renderDashboard();
    renderPipeline();
    renderTeamGoals();
    renderOpsPage();
}

// ===========================================
// NAVIGATION
// ===========================================

function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(pageId) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
}

// ===========================================
// DASHBOARD
// ===========================================

function renderDashboard() {
    const activeSellers = getActiveSellers();
    const deals60Day = get60DayDeals();
    const forecast60Day = calculate60DayForecast(deals60Day);
    const closedDeals = appData.sellers.filter(s => s.stage === 'closed');
    const netYTD = calculateNetYTD(closedDeals);
    const weekActivity = getWeekActivity();

    // Update metrics
    document.getElementById('metric-60day-forecast').textContent = formatCurrency(forecast60Day);
    document.getElementById('metric-60day-forecast').className = `metric-value ${forecast60Day >= 70000 ? 'positive' : 'negative'}`;

    document.getElementById('metric-active-sellers').textContent = activeSellers.length;
    document.getElementById('metric-active-sellers').className = `metric-value ${activeSellers.length >= 16 ? 'positive' : activeSellers.length >= 12 ? 'warning' : 'negative'}`;
    document.getElementById('metric-sellers-status').textContent = `Target: 20-22 | ${activeSellers.length >= 20 ? 'On Track' : activeSellers.length >= 16 ? 'Below Target' : 'CRITICAL'}`;

    document.getElementById('metric-deals-ytd').textContent = closedDeals.length;
    document.getElementById('metric-deals-target').textContent = `Target: 14 total | ${Math.round(closedDeals.length / 14 * 100)}% complete`;

    document.getElementById('metric-net-ytd').textContent = formatCurrency(netYTD);
    document.getElementById('metric-net-ytd').className = `metric-value ${netYTD >= appData.settings.annualFloor ? 'positive' : 'neutral'}`;

    // Floor progress
    const floorPct = Math.min(100, Math.round(netYTD / appData.settings.annualFloor * 100));
    document.getElementById('floor-progress-pct').textContent = `${floorPct}%`;
    document.getElementById('floor-progress-bar').style.width = `${floorPct}%`;
    document.getElementById('floor-progress-bar').className = `progress-fill ${floorPct >= 100 ? 'success' : floorPct >= 75 ? '' : 'warning'}`;

    // Weekly activity
    document.getElementById('week-seller-calls').textContent = weekActivity.sellerCalls;
    document.getElementById('week-pricing-convos').textContent = weekActivity.pricingConvos;
    document.getElementById('week-listing-appts').textContent = weekActivity.listingAppts;
    document.getElementById('week-seller-touches').textContent = weekActivity.sellerTouches;

    // Upcoming closings table
    renderUpcomingClosings(deals60Day);

    // Stop-loss alerts
    renderStopLossAlerts(activeSellers.length, forecast60Day, weekActivity);
}

function getActiveSellers() {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

    return appData.sellers.filter(s => {
        if (s.stage === 'closed') return false;
        const lastTouch = s.lastTouchDate ? new Date(s.lastTouchDate) : null;
        const isRecent = lastTouch && lastTouch >= cutoffDate;
        const hasTimingInWindow = s.timing && !s.timing.includes('18+');
        const hasPricing = s.pricing && s.pricing.trim() !== '';
        const isHighValue = s.value && s.value >= 2000000;

        return isRecent && hasTimingInWindow && hasPricing && isHighValue;
    });
}

function get60DayDeals() {
    const now = new Date();
    const future60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    return appData.sellers.filter(s => {
        if (s.stage === 'closed') return false;
        if (!s.closeDate) return false;
        const closeDate = new Date(s.closeDate);
        return closeDate >= now && closeDate <= future60;
    });
}

function calculate60DayForecast(deals) {
    return deals.reduce((sum, deal) => {
        const net = calculateNetToEdmund(deal.value || 0, deal.originator === 'edmund');
        const probability = (deal.probability || 50) / 100;
        return sum + (net * probability);
    }, 0);
}

function calculateNetToEdmund(price, isEdmundOriginated) {
    const s = appData.settings;
    const grossCommission = price * (s.commissionRate / 100);
    const postBrokerage = grossCommission * (s.brokerageSplit / 100);
    const edmundShare = isEdmundOriginated ? s.edmundOriginatedShare : s.agentOriginatedShare;
    const edmundGross = postBrokerage * (edmundShare / 100);
    return edmundGross - s.nicoleBonus;
}

function calculateNetYTD(closedDeals) {
    return closedDeals.reduce((sum, deal) => {
        return sum + calculateNetToEdmund(deal.value || 0, deal.originator === 'edmund');
    }, 0);
}

function getWeekActivity() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekActivities = appData.activities.filter(a => {
        const actDate = new Date(a.date);
        return actDate >= weekStart;
    });

    return {
        sellerCalls: weekActivities.filter(a => a.type === 'seller_call').length,
        pricingConvos: weekActivities.filter(a => a.type === 'pricing_discussion').length,
        listingAppts: weekActivities.filter(a => a.type === 'listing_appointment').length,
        sellerTouches: weekActivities.filter(a => ['seller_call', 'seller_meeting', 'pricing_discussion'].includes(a.type)).length
    };
}

function renderUpcomingClosings(deals) {
    const tbody = document.getElementById('upcoming-closings-table');

    if (deals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--gray-400);">No upcoming closings in next 60 days</td></tr>';
        return;
    }

    tbody.innerHTML = deals.map(d => {
        const net = calculateNetToEdmund(d.value || 0, d.originator === 'edmund');
        const prob = d.probability || 50;
        return `
            <tr>
                <td>${d.name || d.address || 'TBD'}</td>
                <td>${formatCurrency(d.value || 0)}</td>
                <td style="color: var(--success);">${formatCurrency(net)}</td>
                <td><span class="badge ${prob >= 75 ? 'badge-success' : prob >= 50 ? 'badge-warning' : 'badge-gray'}">${prob}%</span></td>
            </tr>
        `;
    }).join('');
}

function renderStopLossAlerts(activeSellers, forecast, weekActivity) {
    const alerts = [];

    if (activeSellers < 16) {
        alerts.push({
            type: 'danger',
            title: 'STOP-LOSS: Active Sellers Below Minimum',
            message: `Active $2M+ sellers: ${activeSellers} (minimum: 16). No new projects until resolved.`
        });
    } else if (activeSellers < 20) {
        alerts.push({
            type: 'warning',
            title: 'Active Sellers Below Target',
            message: `Active $2M+ sellers: ${activeSellers} (target: 20-22). Increase seller acquisition.`
        });
    }

    if (forecast < 70000) {
        alerts.push({
            type: 'danger',
            title: 'STOP-LOSS: 60-Day Forecast Below Minimum',
            message: `Forecast: ${formatCurrency(forecast)} (minimum: $70,000). No new projects until resolved.`
        });
    }

    // Check for 2 weeks without pricing conversations
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const recentPricing = appData.activities.filter(a =>
        a.type === 'pricing_discussion' && new Date(a.date) >= twoWeeksAgo
    );

    if (recentPricing.length === 0 && appData.activities.length > 0) {
        alerts.push({
            type: 'danger',
            title: 'STOP-LOSS: No Pricing Conversations',
            message: 'No pricing conversations in the last 14 days. Schedule immediately.'
        });
    }

    const container = document.getElementById('stop-loss-alerts');
    container.innerHTML = alerts.map(a => `
        <div class="alert-banner ${a.type}">
            <span class="alert-icon">${a.type === 'danger' ? '⚠️' : '⚡'}</span>
            <div class="alert-content">
                <div class="alert-title">${a.title}</div>
                <div class="alert-message">${a.message}</div>
            </div>
        </div>
    `).join('');
}

// ===========================================
// PIPELINE MANAGEMENT
// ===========================================

let currentStageFilter = 'all';

function initializePipelineFilters() {
    document.querySelectorAll('.stage-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.stage-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStageFilter = btn.dataset.stage;
            renderPipeline();
        });
    });
}

function renderPipeline() {
    // Update counts
    const allCount = appData.sellers.length;
    document.getElementById('count-all').textContent = allCount;

    STAGES.forEach(stage => {
        const count = appData.sellers.filter(s => s.stage === stage).length;
        document.getElementById(`count-${stage}`).textContent = count;
    });

    // Filter sellers
    let filtered = appData.sellers;
    if (currentStageFilter !== 'all') {
        filtered = appData.sellers.filter(s => s.stage === currentStageFilter);
    }

    // Sort by last touch date (most recent first)
    filtered.sort((a, b) => {
        const dateA = a.lastTouchDate ? new Date(a.lastTouchDate) : new Date(0);
        const dateB = b.lastTouchDate ? new Date(b.lastTouchDate) : new Date(0);
        return dateB - dateA;
    });

    const tbody = document.getElementById('pipeline-table');

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--gray-400);">No sellers in this stage</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        const daysSinceTouch = s.lastTouchDate ? Math.floor((new Date() - new Date(s.lastTouchDate)) / (1000 * 60 * 60 * 24)) : 999;
        const touchStatus = daysSinceTouch <= 14 ? 'success' : daysSinceTouch <= 30 ? 'warning' : 'danger';

        return `
            <tr>
                <td>
                    <strong>${s.name || 'Unknown'}</strong>
                    ${s.address ? `<br><span style="font-size: 0.8125rem; color: var(--gray-500);">${s.address}</span>` : ''}
                </td>
                <td>${s.community || '-'}</td>
                <td>${s.value ? formatCurrency(s.value) : '-'}</td>
                <td>${s.timing || '-'}</td>
                <td>
                    <span class="badge badge-${touchStatus}">
                        ${s.lastTouchDate ? `${daysSinceTouch}d ago` : 'Never'}
                    </span>
                </td>
                <td><span class="badge badge-info">${STAGE_LABELS[s.stage] || s.stage}</span></td>
                <td>
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="openActivityModal('${s.id}')">Log</button>
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editSeller('${s.id}')">Edit</button>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddSellerModal() {
    document.getElementById('seller-modal-title').textContent = 'Add New Seller';
    document.getElementById('seller-form').reset();
    document.getElementById('seller-id').value = '';
    document.getElementById('activity-date').value = new Date().toISOString().split('T')[0];
    openModal('seller-modal');
}

function editSeller(id) {
    const seller = appData.sellers.find(s => s.id === id);
    if (!seller) return;

    document.getElementById('seller-modal-title').textContent = 'Edit Seller';
    document.getElementById('seller-id').value = seller.id;
    document.getElementById('seller-name').value = seller.name || '';
    document.getElementById('seller-address').value = seller.address || '';
    document.getElementById('seller-community').value = seller.community || '';
    document.getElementById('seller-value').value = seller.value || '';
    document.getElementById('seller-timing').value = seller.timing || '6-12';
    document.getElementById('seller-stage').value = seller.stage || 'prospect';
    document.getElementById('seller-pricing').value = seller.pricing || '';
    document.getElementById('seller-next-action').value = seller.nextAction || '';
    document.getElementById('seller-originator').value = seller.originator || 'edmund';
    document.getElementById('seller-probability').value = seller.probability || 50;
    document.getElementById('seller-close-date').value = seller.closeDate || '';
    document.getElementById('seller-notes').value = seller.notes || '';

    openModal('seller-modal');
}

function saveSeller() {
    const id = document.getElementById('seller-id').value || generateId();
    const isNew = !document.getElementById('seller-id').value;

    const seller = {
        id,
        name: document.getElementById('seller-name').value,
        address: document.getElementById('seller-address').value,
        community: document.getElementById('seller-community').value,
        value: parseFloat(document.getElementById('seller-value').value) || 0,
        timing: document.getElementById('seller-timing').value,
        stage: document.getElementById('seller-stage').value,
        pricing: document.getElementById('seller-pricing').value,
        nextAction: document.getElementById('seller-next-action').value,
        originator: document.getElementById('seller-originator').value,
        probability: parseInt(document.getElementById('seller-probability').value) || 50,
        closeDate: document.getElementById('seller-close-date').value,
        notes: document.getElementById('seller-notes').value,
        lastTouchDate: isNew ? new Date().toISOString().split('T')[0] : (appData.sellers.find(s => s.id === id)?.lastTouchDate || new Date().toISOString().split('T')[0]),
        createdAt: isNew ? new Date().toISOString() : (appData.sellers.find(s => s.id === id)?.createdAt || new Date().toISOString())
    };

    if (isNew) {
        appData.sellers.push(seller);
    } else {
        const idx = appData.sellers.findIndex(s => s.id === id);
        if (idx !== -1) {
            appData.sellers[idx] = seller;
        }
    }

    saveData();
    closeModal('seller-modal');
    renderPipeline();
    renderDashboard();
}

function openActivityModal(sellerId) {
    document.getElementById('activity-seller-id').value = sellerId;
    document.getElementById('activity-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('activity-form').reset();
    document.getElementById('activity-date').value = new Date().toISOString().split('T')[0];
    openModal('activity-modal');
}

function saveActivity() {
    const sellerId = document.getElementById('activity-seller-id').value;

    const activity = {
        id: generateId(),
        sellerId,
        userId: currentUser.id,
        type: document.getElementById('activity-type').value,
        date: document.getElementById('activity-date').value,
        notes: document.getElementById('activity-notes').value,
        outcome: document.getElementById('activity-outcome').value,
        createdAt: new Date().toISOString()
    };

    appData.activities.push(activity);

    // Update seller's last touch date
    const seller = appData.sellers.find(s => s.id === sellerId);
    if (seller) {
        seller.lastTouchDate = activity.date;
    }

    saveData();
    closeModal('activity-modal');
    renderPipeline();
    renderDashboard();
}

// ===========================================
// DEAL CALCULATOR
// ===========================================

function calculateDeal() {
    const price = parseFloat(document.getElementById('calc-price').value) || 0;
    const commissionRate = parseFloat(document.getElementById('calc-commission').value) || 5.0;
    const originator = document.getElementById('calc-originator').value;
    const coBroke = document.getElementById('calc-cobroke').value;

    const s = appData.settings;
    const grossCommission = price * (commissionRate / 100);
    const brokerageAmount = grossCommission * ((100 - s.brokerageSplit) / 100);
    const postBrokerage = grossCommission - brokerageAmount;

    let edmundPct, agentPct;
    if (coBroke === 'no') {
        edmundPct = 100;
        agentPct = 0;
    } else {
        edmundPct = originator === 'edmund' ? s.edmundOriginatedShare : s.agentOriginatedShare;
        agentPct = 100 - edmundPct;
    }

    const edmundShare = postBrokerage * (edmundPct / 100);
    const agentShare = postBrokerage * (agentPct / 100);
    const edmundNet = edmundShare - s.nicoleBonus;

    // Update display
    document.getElementById('result-price').textContent = formatCurrency(price);
    document.getElementById('result-rate').textContent = commissionRate.toFixed(1);
    document.getElementById('result-gross').textContent = formatCurrency(grossCommission);
    document.getElementById('result-brokerage').textContent = `-${formatCurrency(brokerageAmount)}`;
    document.getElementById('result-post-brokerage').textContent = formatCurrency(postBrokerage);
    document.getElementById('result-edmund-pct').textContent = edmundPct;
    document.getElementById('result-edmund-share').textContent = formatCurrency(edmundShare);
    document.getElementById('result-nicole').textContent = `-${formatCurrency(s.nicoleBonus)}`;
    document.getElementById('result-edmund-net').textContent = formatCurrency(edmundNet);
    document.getElementById('result-agent-net').textContent = formatCurrency(agentShare);
}

// Add event listeners for calculator
document.getElementById('calc-price')?.addEventListener('input', calculateDeal);
document.getElementById('calc-commission')?.addEventListener('input', calculateDeal);
document.getElementById('calc-originator')?.addEventListener('change', calculateDeal);
document.getElementById('calc-cobroke')?.addEventListener('change', calculateDeal);

// ===========================================
// WEEKLY CHECKLIST
// ===========================================

function initializeChecklist() {
    document.querySelectorAll('.checklist-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', () => {
            const key = checkbox.dataset.check;
            if (!key) return;

            checkbox.classList.toggle('checked');
            const isChecked = checkbox.classList.contains('checked');
            checkbox.innerHTML = isChecked ? '✓' : '';

            const textEl = checkbox.nextElementSibling;
            if (textEl) {
                textEl.classList.toggle('completed', isChecked);
            }

            // Save state
            const weekKey = getWeekKey();
            if (!appData.weeklyChecklist[weekKey]) {
                appData.weeklyChecklist[weekKey] = {};
            }
            appData.weeklyChecklist[weekKey][key] = isChecked;
            saveData();
        });
    });

    // Load saved state
    loadChecklistState();
}

function getWeekKey() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return weekStart.toISOString().split('T')[0];
}

function loadChecklistState() {
    const weekKey = getWeekKey();
    const saved = appData.weeklyChecklist[weekKey] || {};

    document.querySelectorAll('.checklist-checkbox[data-check]').forEach(checkbox => {
        const key = checkbox.dataset.check;
        if (saved[key]) {
            checkbox.classList.add('checked');
            checkbox.innerHTML = '✓';
            const textEl = checkbox.nextElementSibling;
            if (textEl) textEl.classList.add('completed');
        }
    });
}

function updateWeekDateRange() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const options = { month: 'short', day: 'numeric' };
    const range = `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}, ${weekEnd.getFullYear()}`;

    const el = document.getElementById('week-date-range');
    if (el) el.textContent = range;
}

// ===========================================
// TEAM GOALS
// ===========================================

function renderTeamGoals() {
    const container = document.getElementById('team-goals-container');

    // Determine which goals to show based on role
    let goalsToShow = [];
    if (currentUser.role === 'admin') {
        goalsToShow = Object.entries(appData.teamGoals);
    } else {
        goalsToShow = [[currentUser.id, appData.teamGoals[currentUser.id]]];
    }

    container.innerHTML = goalsToShow.map(([userId, data]) => {
        if (!data) return '';
        const user = USERS[userId];

        return `
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3>${user?.name || userId}'s 2026 Goals</h3>
                    <span class="badge badge-info">${user?.displayRole || 'Team Member'}</span>
                </div>
                <div class="card-body">
                    ${data.goals.map(goal => {
                        const pct = goal.target > 0 ? Math.min(100, Math.round(goal.current / goal.target * 100)) : 0;
                        const progressClass = pct >= 100 ? 'success' : pct >= 50 ? '' : 'warning';

                        return `
                            <div class="goal-card">
                                <div class="goal-header">
                                    <span class="goal-title">${goal.title}</span>
                                    <span>${goal.current} / ${goal.target}</span>
                                </div>
                                <div class="goal-progress">
                                    <div class="goal-progress-header">
                                        <span>Progress</span>
                                        <span>${pct}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill ${progressClass}" style="width: ${pct}%;"></div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ===========================================
// OPS PAGE
// ===========================================

function renderOpsPage() {
    const closedDeals = appData.sellers.filter(s => s.stage === 'closed');
    const bonusEarned = closedDeals.length * appData.settings.nicoleBonus;
    const projectedBonus = appData.settings.targetDeals * appData.settings.nicoleBonus;

    document.getElementById('ops-deals-closed').textContent = closedDeals.length;
    document.getElementById('ops-bonus-earned').textContent = formatCurrency(bonusEarned);
    document.getElementById('ops-bonus-projected').textContent = formatCurrency(projectedBonus);

    // Closing calendar
    const upcomingDeals = appData.sellers.filter(s =>
        ['listed', 'under-contract'].includes(s.stage) && s.closeDate
    ).sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate));

    const tbody = document.getElementById('closing-calendar-table');
    if (upcomingDeals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-400);">No upcoming closings scheduled</td></tr>';
    } else {
        tbody.innerHTML = upcomingDeals.map(d => `
            <tr>
                <td>${d.closeDate ? new Date(d.closeDate).toLocaleDateString() : '-'}</td>
                <td>${d.name || d.address || 'TBD'}</td>
                <td>${formatCurrency(d.value || 0)}</td>
                <td><span class="badge badge-info">${STAGE_LABELS[d.stage]}</span></td>
                <td><button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">View</button></td>
            </tr>
        `).join('');
    }
}

// ===========================================
// SETTINGS (Admin Only)
// ===========================================

function loadSettingsForm() {
    const s = appData.settings;
    document.getElementById('setting-commission-rate').value = s.commissionRate;
    document.getElementById('setting-brokerage-split').value = s.brokerageSplit;
    document.getElementById('setting-edmund-originated').value = s.edmundOriginatedShare;
    document.getElementById('setting-agent-originated').value = s.agentOriginatedShare;
    document.getElementById('setting-nicole-bonus').value = s.nicoleBonus;
    document.getElementById('setting-monthly-floor').value = s.monthlyFloor;
    document.getElementById('setting-monthly-ops').value = s.monthlyOps;
}

function saveSettings() {
    if (currentUser.role !== 'admin') {
        alert('Only admins can modify settings.');
        return;
    }

    appData.settings = {
        ...appData.settings,
        commissionRate: parseFloat(document.getElementById('setting-commission-rate').value) || 5.0,
        brokerageSplit: parseFloat(document.getElementById('setting-brokerage-split').value) || 80,
        edmundOriginatedShare: parseFloat(document.getElementById('setting-edmund-originated').value) || 60,
        agentOriginatedShare: parseFloat(document.getElementById('setting-agent-originated').value) || 40,
        nicoleBonus: parseFloat(document.getElementById('setting-nicole-bonus').value) || 1000,
        monthlyFloor: parseFloat(document.getElementById('setting-monthly-floor').value) || 25000,
        monthlyOps: parseFloat(document.getElementById('setting-monthly-ops').value) || 10000
    };

    saveData();
    alert('Settings saved successfully.');
    renderDashboard();
    calculateDeal();
}

function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bogen-2026-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            appData = { ...appData, ...imported };
            saveData();
            alert('Data imported successfully.');
            location.reload();
        } catch (err) {
            alert('Error importing data: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function resetData() {
    if (!confirm('Are you sure you want to reset ALL data? This cannot be undone.')) return;
    if (!confirm('FINAL WARNING: All sellers, activities, and settings will be deleted. Continue?')) return;

    localStorage.removeItem('bogen2026Data');
    location.reload();
}

// ===========================================
// UTILITIES
// ===========================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// Close modals on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});
