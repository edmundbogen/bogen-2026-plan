// Edmund Bogen Team - 2026 Operating Plan
// Application Logic

// ===========================================
// SUPABASE CONFIGURATION
// ===========================================

const SUPABASE_URL = 'https://qaariaqrekfmeocweasn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Z1-HThhTRRLzrHLnvGZ5RA_qUA3-wgP';

let supabaseClient = null;
let syncStatus = 'offline'; // 'online', 'offline', 'syncing', 'error'

// Initialize Supabase client
function initSupabase() {
    try {
        // Check for Supabase library (loaded from CDN)
        if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized successfully');
            return true;
        } else {
            console.log('Supabase library not loaded, using localStorage only');
            syncStatus = 'offline';
        }
    } catch (err) {
        console.error('Failed to initialize Supabase:', err);
        syncStatus = 'offline';
    }
    return false;
}

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
    edmundBrokerageSplit: 80,  // Edmund keeps 80% of his share
    agentBrokerageSplit: 70,   // Agents keep 70% of their share
    edmundOriginatedShare: 60, // Edmund gets 60% when he originates
    agentOriginatedShare: 40,  // Edmund gets 40% when agent originates
    nicoleBonus: 1000,
    monthlyFloor: 25000,
    monthlyOps: 10000,
    annualFloor: 300000,
    targetDeals: 14,
    targetActiveSellers: 20
};

const STAGES = ['prospect', 'active', 'listing-meeting', 'showing', 'listed', 'under-contract', 'closed'];
const STAGE_LABELS = {
    'prospect': 'Prospect',
    'active': 'Active',
    'listing-meeting': 'Listing Meeting',
    'showing': 'Showing',
    'listed': 'Listed',
    'under-contract': 'Under Contract',
    'closed': 'Closed'
};

const ORIGINATOR_NAMES = {
    'edmund': 'Edmund',
    'dina': 'Dina',
    'samantha': 'Samantha'
};

const PREAPPROVAL_LABELS = {
    'none': 'Not Pre-Approved',
    'pending': 'Pending',
    'approved': 'Pre-Approved',
    'cash': 'Cash Buyer'
};

const LEAD_SOURCE_TYPES = {
    'attorney': 'Attorney',
    'cpa': 'CPA/Accountant',
    'financial-advisor': 'Financial Advisor',
    'past-client': 'Past Client',
    'builder': 'Builder/Developer',
    'contractor': 'Contractor',
    'mortgage': 'Mortgage Broker',
    'title': 'Title Company',
    'friend': 'Friend/Family',
    'agent': 'Other Agent',
    'other': 'Other'
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
    leadSources: [],
    leadSourceTouches: [],
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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        initSupabase();
    } catch (err) {
        console.error('Supabase init failed:', err);
    }

    try {
        await loadData();
    } catch (err) {
        console.error('Load data failed:', err);
        // Fallback to localStorage only
        const saved = localStorage.getItem('bogen2026Data');
        if (saved) {
            const parsed = JSON.parse(saved);
            appData = { ...appData, ...parsed };
            appData.settings = { ...DEFAULT_SETTINGS, ...appData.settings };
        }
    }

    // Add seed clients if they don't exist
    await seedClients();

    checkAuth();
    initializeNavigation();
    initializeChecklist();
    initializePipelineFilters();
    calculateDeal(); // Initialize calculator
    updateWeekDateRange();
    updateSyncStatusUI();
});

// ===========================================
// SEED CLIENTS - Auto-add new clients from code
// ===========================================

async function seedClients() {
    const seedData = [
        {
            id: 'client_iacometta_debra',
            type: 'seller',
            name: 'Debra A. Iacometta',
            address: '17603 Foxborough Ln',
            community: 'St Andrews Country Club',
            value: 0,
            timing: '3-6',
            stage: 'prospect',
            pricing: '',
            nextAction: 'Initial outreach',
            originator: 'edmund',
            probability: 30,
            closeDate: '',
            notes: `PROPERTY:
17603 Foxborough Ln, Boca Raton FL 33496
St Andrews Country Club PL 2
Parcel: 00-42-46-33-02-000-0660
3,529 sq ft single family
Purchased: 05/16/2020 (Book/Page: 31456/1733)
Use Type: 0100 - Single Family

--- More details to be added ---`,
            budgetMin: 0,
            budgetMax: 0,
            preapproval: '',
            leadSourceId: null,
            lastTouchDate: '2026-01-02',
            createdAt: '2026-01-02T12:00:00.000Z'
        },
        {
            id: 'client_satovsky_jonathan',
            type: 'buyer',
            name: 'Jonathan Satovsky',
            address: '',
            community: 'Broward / Palm Beach / Martin Counties',
            value: 0,
            timing: '0-3',
            stage: 'active',
            pricing: '',
            nextAction: 'Send initial property options meeting live-work, scalability, and HOA covenant criteria',
            originator: 'edmund',
            probability: 60,
            closeDate: '2026-06-01',
            notes: `CONTACT: 917-565-0195

REFERRAL: Dad is member at St. Andrews Country Club

BUDGET: $2-4M, flexible to go higher for right property

AREAS: Broward, Palm Beach, or Martin Counties. Priorities: good restaurants, easy airport access.

PURPOSE: Live-work arrangement for tax residency. Must establish FL property as PRIMARY OFFICE (not NYC). Optics matter for IRS - needs to look like credible operating headquarters.

BUSINESSES:
• Satovsky Asset Management (Jonathan)
• FinDash.ai - fintech venture with his son
• Care Find - girlfriend Larisa's nursing registry

REQUIREMENTS:
• Single-family home ONLY
• Model: His SoHo loft - open professional space for employees + entertaining
• Hosts Shabbat dinners regularly - layout must be welcoming for guests AND credible as professional office
• Employee scalability critical - may exceed 2 non-resident employees as businesses grow
• Look for: detached structures, guest houses, carriage houses for dedicated office space
• HOA MUST allow home-based business - filter out restrictive covenants upfront

LEGAL CONTEXT: FL Statute §559.955 (HB 403, 2021) pre-empts local restrictions on home-based businesses. Allows 2 onsite employees, unlimited remote. Does NOT pre-empt HOA restrictions.

TEAM: Dina added for property research, zoning context, comparative analysis. Nicole added for operations support.

NEXT STEPS: Huddle with team, send property options for Jonathan to review with accountant/attorney.

--- EMAIL THREAD: Jan 1, 2026 ---`,
            budgetMin: 2000000,
            budgetMax: 4000000,
            preapproval: 'pending',
            leadSourceId: null,
            lastTouchDate: '2026-01-01',
            createdAt: '2026-01-01T21:00:00.000Z'
        },
        {
            id: 'client_kriess_david',
            type: 'buyer',
            name: 'David Kriess',
            address: '',
            community: 'St Andrews Country Club',
            value: 0,
            timing: '0-3',
            stage: 'prospect',
            pricing: '',
            nextAction: 'Initial outreach',
            originator: 'edmund',
            probability: 30,
            closeDate: '',
            notes: `BUDGET: Up to $7M

AREAS: St Andrews Country Club

--- More details to be added ---`,
            budgetMin: 0,
            budgetMax: 7000000,
            preapproval: '',
            leadSourceId: null,
            lastTouchDate: '2026-01-19',
            createdAt: '2026-01-19T12:00:00.000Z'
        },
        {
            id: 'client_chen_michael',
            type: 'seller',
            name: 'Michael Chen',
            address: '',
            community: 'The Sanctuary',
            value: 7000000,
            timing: '6+',
            stage: 'prospect',
            pricing: '',
            nextAction: 'Listing appointment this evening',
            originator: 'edmund',
            probability: 30,
            closeDate: '',
            notes: `PROPERTY VALUE: $7M

COMMUNITY: The Sanctuary

TIMING: Listing next summer

RELATIONSHIP: Friend of Edmund

--- Listing appointment scheduled for Jan 19, 2026 ---`,
            budgetMin: 0,
            budgetMax: 0,
            preapproval: '',
            leadSourceId: null,
            lastTouchDate: '2026-01-19',
            createdAt: '2026-01-19T12:00:00.000Z'
        },
        {
            id: 'client_goodwitch_ronnie_seller',
            type: 'seller',
            name: 'Ronnie & Allison Goodwitch',
            address: '',
            community: 'East Boca',
            value: 4500000,
            timing: '0-3',
            stage: 'prospect',
            pricing: '',
            nextAction: 'Initial outreach',
            originator: 'edmund',
            probability: 30,
            closeDate: '',
            notes: `PROPERTY VALUE: $4.5M

COMMUNITY: East Boca

DUAL TRANSACTION: Selling this home to purchase $5.5M home
See also: Ronnie & Allison Goodwitch (Buyer)

--- More details to be added ---`,
            budgetMin: 0,
            budgetMax: 0,
            preapproval: '',
            leadSourceId: null,
            lastTouchDate: '2026-01-19',
            createdAt: '2026-01-19T12:00:00.000Z'
        },
        {
            id: 'client_goodwitch_ronnie_buyer',
            type: 'buyer',
            name: 'Ronnie & Allison Goodwitch',
            address: '',
            community: '',
            value: 0,
            timing: '0-3',
            stage: 'prospect',
            pricing: '',
            nextAction: 'Initial outreach',
            originator: 'edmund',
            probability: 30,
            closeDate: '',
            notes: `BUDGET: $5.5M

DUAL TRANSACTION: Purchasing after selling East Boca home ($4.5M)
See also: Ronnie & Allison Goodwitch (Seller)

--- More details to be added ---`,
            budgetMin: 0,
            budgetMax: 5500000,
            preapproval: '',
            leadSourceId: null,
            lastTouchDate: '2026-01-19',
            createdAt: '2026-01-19T12:00:00.000Z'
        },
        {
            id: 'client_lieberman_mitch_tina',
            type: 'buyer',
            name: 'Mitch & Tina Lieberman',
            address: '',
            community: 'Polo Club',
            value: 0,
            timing: '0-3',
            stage: 'prospect',
            pricing: '',
            nextAction: 'Initial outreach',
            originator: 'dina',
            probability: 30,
            closeDate: '',
            notes: `BUDGET: $4M-$5M

COMMUNITY: Polo Club

ORIGINATOR: Dina

--- More details to be added ---`,
            budgetMin: 4000000,
            budgetMax: 5000000,
            preapproval: '',
            leadSourceId: null,
            lastTouchDate: '2026-01-19',
            createdAt: '2026-01-19T12:00:00.000Z'
        },
        {
            id: 'client_brivio_sofia',
            type: 'buyer',
            name: 'Sofia Brivio',
            address: '',
            community: '',
            value: 1500000,
            timing: '0-3',
            stage: 'active',
            pricing: '',
            nextAction: 'Awaiting response on offer',
            originator: 'edmund',
            probability: 60,
            closeDate: '',
            notes: `BUDGET: $1.5M

STATUS: Offer out for $1.5M

TEAM: Edmund (originator) + Dina Ulrich

--- More details to be added ---`,
            budgetMin: 0,
            budgetMax: 1500000,
            preapproval: '',
            leadSourceId: null,
            lastTouchDate: '2026-01-19',
            createdAt: '2026-01-19T12:00:00.000Z'
        },
        {
            id: 'client_buonpastore_anthony_chris',
            type: 'buyer',
            name: 'Anthony & Chris Buonpastore',
            address: '',
            community: 'Beachy area',
            value: 0,
            timing: '0-3',
            stage: 'prospect',
            pricing: '',
            nextAction: 'Show properties Jan 26-28',
            originator: 'dina',
            probability: 30,
            closeDate: '',
            notes: `BUDGET: Up to $1.5M

PURPOSE: Second home, want a beachy place

VISITING: Jan 26-28, 2026

--- More details to be added ---`,
            budgetMin: 0,
            budgetMax: 1500000,
            preapproval: '',
            leadSourceId: null,
            lastTouchDate: '2026-01-19',
            createdAt: '2026-01-19T12:00:00.000Z'
        },
        {
            id: 'client_richland_karina_garrett',
            type: 'buyer',
            name: 'Karina & Garrett Richland',
            address: '',
            community: 'Lake Ida',
            value: 0,
            timing: '0-3',
            stage: 'prospect',
            pricing: '',
            nextAction: 'Initial outreach',
            originator: 'dina',
            probability: 30,
            closeDate: '',
            notes: `BUDGET: Up to $1.5M

FROM: Mission Viejo, California

REQUIREMENT: Need to homestead Florida

CRITERIA: Cute, walkable place - Lake Ida area

--- More details to be added ---`,
            budgetMin: 0,
            budgetMax: 1500000,
            preapproval: '',
            leadSourceId: null,
            lastTouchDate: '2026-01-19',
            createdAt: '2026-01-19T12:00:00.000Z'
        }
    ];

    let added = false;
    for (const client of seedData) {
        const exists = appData.sellers.some(s => s.id === client.id);
        if (!exists) {
            appData.sellers.push(client);
            added = true;
            console.log('Seeded client:', client.name);
        }
    }

    if (added) {
        await saveData();
    }
}

async function loadData() {
    // First, load from localStorage as fallback/cache
    try {
        const saved = localStorage.getItem('bogen2026Data');
        if (saved) {
            const parsed = JSON.parse(saved);
            appData = { ...appData, ...parsed };
            appData.settings = { ...DEFAULT_SETTINGS, ...appData.settings };
        }
    } catch (err) {
        console.error('Failed to load from localStorage:', err);
    }

    // Then try to load from Supabase (if available)
    if (supabaseClient) {
        try {
            syncStatus = 'syncing';
            updateSyncStatusUI();

            const { data, error } = await supabaseClient
                .from('bogen_2026_data')
                .select('data')
                .eq('user_id', 'bogen_team')
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 = no rows found (first time)
                console.error('Supabase load error:', error);
                syncStatus = 'error';
            } else if (data && data.data) {
                // Merge cloud data with defaults
                appData = { ...appData, ...data.data };
                appData.settings = { ...DEFAULT_SETTINGS, ...appData.settings };
                // Update localStorage with cloud data
                localStorage.setItem('bogen2026Data', JSON.stringify(appData));
                syncStatus = 'online';
                console.log('Data loaded from Supabase');
            } else {
                // No data in cloud yet, we'll create it on first save
                syncStatus = 'online';
            }
        } catch (err) {
            console.error('Failed to load from Supabase:', err);
            syncStatus = 'error';
        }
    }
    updateSyncStatusUI();
}

async function saveData() {
    // Always save to localStorage first (instant, offline-capable)
    localStorage.setItem('bogen2026Data', JSON.stringify(appData));

    // Then sync to Supabase
    if (supabaseClient) {
        try {
            syncStatus = 'syncing';
            updateSyncStatusUI();

            const { error } = await supabaseClient
                .from('bogen_2026_data')
                .upsert({
                    user_id: 'bogen_team',
                    data: appData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) {
                console.error('Supabase save error:', error);
                syncStatus = 'error';
            } else {
                syncStatus = 'online';
                console.log('Data saved to Supabase');
            }
        } catch (err) {
            console.error('Failed to save to Supabase:', err);
            syncStatus = 'error';
        }
    }
    updateSyncStatusUI();
}

function updateSyncStatusUI() {
    const indicator = document.getElementById('sync-status');
    if (!indicator) return;

    const statusConfig = {
        'online': { text: 'Synced', color: 'var(--success)', icon: '☁️' },
        'offline': { text: 'Offline', color: 'var(--gray-500)', icon: '💾' },
        'syncing': { text: 'Syncing...', color: 'var(--warning)', icon: '🔄' },
        'error': { text: 'Sync Error', color: 'var(--danger)', icon: '⚠️' }
    };

    const config = statusConfig[syncStatus] || statusConfig.offline;
    indicator.innerHTML = `<span style="color: ${config.color};">${config.icon} ${config.text}</span>`;
}

async function syncNow() {
    if (!supabaseClient) {
        alert('Supabase is not connected. Data is saved locally only.');
        return;
    }

    const btn = document.getElementById('sync-now-btn');

    // Count local records
    const localClients = (appData.sellers || []).length;
    const localActivities = (appData.activities || []).length;
    const localLeadSources = (appData.leadSources || []).length;

    // Fetch cloud record counts
    let cloudClients = 0;
    let cloudActivities = 0;
    let cloudLeadSources = 0;

    try {
        const { data: cloudData } = await supabaseClient
            .from('bogen_2026_data')
            .select('data')
            .eq('user_id', 'bogen_team')
            .single();

        if (cloudData && cloudData.data) {
            cloudClients = (cloudData.data.sellers || []).length;
            cloudActivities = (cloudData.data.activities || []).length;
            cloudLeadSources = (cloudData.data.leadSources || []).length;
        }
    } catch (err) {
        console.log('No existing cloud data or error fetching:', err);
    }

    // Show confirmation with record counts
    const message = `⚠️ SYNC CONFIRMATION\n\n` +
        `LOCAL DATA (will be pushed to cloud):\n` +
        `• ${localClients} clients\n` +
        `• ${localActivities} activities\n` +
        `• ${localLeadSources} lead sources\n\n` +
        `CLOUD DATA (will be overwritten):\n` +
        `• ${cloudClients} clients\n` +
        `• ${cloudActivities} activities\n` +
        `• ${cloudLeadSources} lead sources\n\n` +
        `Do you want to push your local data to the cloud?\n` +
        `(This will OVERWRITE all cloud data)`;

    if (!confirm(message)) {
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Syncing...';
    }

    try {
        await saveData();
        if (syncStatus === 'online') {
            alert('Data synced successfully to cloud!');
        } else {
            alert('Sync encountered an issue. Check console for details.');
        }
    } catch (err) {
        console.error('Manual sync failed:', err);
        alert('Sync failed: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Sync Now';
        }
    }
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

    // Add role class to body for CSS visibility control
    document.body.classList.remove('role-admin', 'role-agent', 'role-ops');
    document.body.classList.add(`role-${currentUser.role}`);

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
    renderLeadSources();
    renderTeamGoals();
    renderOpsPage();
    populateLeadSourceDropdown();
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

    // Revenue tracking
    renderRevenueTracking();
}

function renderRevenueTracking() {
    const revenue = calculateRevenueByPerson();

    // Admin sees all revenue
    const edmundEl = document.getElementById('revenue-edmund');
    const dinaEl = document.getElementById('revenue-dina');
    const samanthaEl = document.getElementById('revenue-samantha');
    const nicoleEl = document.getElementById('revenue-nicole');

    if (edmundEl) edmundEl.textContent = formatCurrency(revenue.edmund);
    if (dinaEl) dinaEl.textContent = formatCurrency(revenue.dina);
    if (samanthaEl) samanthaEl.textContent = formatCurrency(revenue.samantha);
    if (nicoleEl) nicoleEl.textContent = formatCurrency(revenue.nicole);

    // Agent sees their own revenue
    const myNetEl = document.getElementById('revenue-my-net');
    if (myNetEl && currentUser) {
        const myRevenue = revenue[currentUser.id] || 0;
        myNetEl.textContent = formatCurrency(myRevenue);
    }
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

let currentClosingRange = 60;

function getDealsInRange(days) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return appData.sellers.filter(s => {
        if (s.stage === 'closed') return false;
        if (!s.closeDate) return false;
        const closeDate = new Date(s.closeDate);
        closeDate.setHours(0, 0, 0, 0);

        // Must be in the future
        if (closeDate < now) return false;

        // If 'all', return all future deals
        if (days === 'all') return true;

        // Otherwise, check if within range
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        return closeDate <= futureDate;
    });
}

function get60DayDeals() {
    return getDealsInRange(60);
}

function filterClosingRange(days) {
    currentClosingRange = days;

    // Update button states
    document.querySelectorAll('.closing-range-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.range == days) {
            btn.classList.add('active');
        }
    });

    // Re-render closings with new range
    const deals = getDealsInRange(days);
    renderUpcomingClosings(deals);
}

function calculate60DayForecast(deals) {
    return deals.reduce((sum, deal) => {
        const isBuyer = deal.type === 'buyer';
        // For buyers, use budgetMax as estimated value; for sellers, use value
        const dealValue = isBuyer ? (deal.budgetMax || deal.budgetMin || 0) : (deal.value || 0);
        const net = calculateNetToEdmund(dealValue, deal.originator === 'edmund');
        const probability = (deal.probability || 50) / 100;
        return sum + (net * probability);
    }, 0);
}

// Calculate full deal breakdown with separate brokerage splits
function calculateDealBreakdown(price, isEdmundOriginated, agentId = null, commissionRate = null) {
    const s = appData.settings;
    const rate = commissionRate || s.commissionRate;

    // Step 1: Calculate gross commission
    const grossCommission = price * (rate / 100);

    // Step 2: Split between Edmund and Agent (before brokerage)
    const edmundSplitPct = isEdmundOriginated ? s.edmundOriginatedShare : s.agentOriginatedShare;
    const agentSplitPct = 100 - edmundSplitPct;

    const edmundPreBrokerage = grossCommission * (edmundSplitPct / 100);
    const agentPreBrokerage = grossCommission * (agentSplitPct / 100);

    // Step 3: Apply different brokerage splits
    // Edmund keeps 80%, Agent keeps 70%
    const edmundPostBrokerage = edmundPreBrokerage * (s.edmundBrokerageSplit / 100);
    const agentPostBrokerage = agentPreBrokerage * (s.agentBrokerageSplit / 100);

    // Step 4: Edmund pays Nicole bonus
    const edmundNet = edmundPostBrokerage - s.nicoleBonus;
    const agentNet = agentPostBrokerage;

    // Calculate what goes to Douglas Elliman
    const edmundToBrokerage = edmundPreBrokerage - edmundPostBrokerage;
    const agentToBrokerage = agentPreBrokerage - agentPostBrokerage;
    const totalToBrokerage = edmundToBrokerage + agentToBrokerage;

    return {
        grossCommission,
        edmundSplitPct,
        agentSplitPct,
        edmundPreBrokerage,
        agentPreBrokerage,
        edmundBrokeragePct: s.edmundBrokerageSplit,
        agentBrokeragePct: s.agentBrokerageSplit,
        edmundPostBrokerage,
        agentPostBrokerage,
        edmundToBrokerage,
        agentToBrokerage,
        totalToBrokerage,
        nicoleBonus: s.nicoleBonus,
        edmundNet,
        agentNet,
        agentId
    };
}

function calculateNetToEdmund(price, isEdmundOriginated) {
    const breakdown = calculateDealBreakdown(price, isEdmundOriginated);
    return breakdown.edmundNet;
}

function calculateNetYTD(closedDeals) {
    return closedDeals.reduce((sum, deal) => {
        return sum + calculateNetToEdmund(deal.value || 0, deal.originator === 'edmund');
    }, 0);
}

// Calculate revenue by team member from closed deals
function calculateRevenueByPerson() {
    const closedDeals = appData.sellers.filter(s => s.stage === 'closed');

    const revenue = {
        edmund: 0,
        dina: 0,
        samantha: 0,
        nicole: 0  // Nicole's bonuses
    };

    closedDeals.forEach(deal => {
        const isEdmundOriginated = deal.originator === 'edmund';
        const breakdown = calculateDealBreakdown(deal.value || 0, isEdmundOriginated, deal.agentId);

        revenue.edmund += breakdown.edmundNet;
        revenue.nicole += breakdown.nicoleBonus;

        // Assign agent revenue based on who worked the deal
        if (deal.agentId === 'dina') {
            revenue.dina += breakdown.agentNet;
        } else if (deal.agentId === 'samantha') {
            revenue.samantha += breakdown.agentNet;
        } else if (!isEdmundOriginated && deal.originator === 'dina') {
            revenue.dina += breakdown.agentNet;
        } else if (!isEdmundOriginated && deal.originator === 'samantha') {
            revenue.samantha += breakdown.agentNet;
        }
    });

    return revenue;
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-400);">No upcoming closings in next 60 days</td></tr>';
        return;
    }

    // Sort by close date
    deals.sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate));

    tbody.innerHTML = deals.map(d => {
        const isBuyer = d.type === 'buyer';
        // For buyers, use budgetMax as estimated value; for sellers, use value
        const dealValue = isBuyer ? (d.budgetMax || d.budgetMin || 0) : (d.value || 0);
        const net = calculateNetToEdmund(dealValue, d.originator === 'edmund');
        const prob = d.probability || 50;
        const typeBadge = isBuyer ? '<span class="badge badge-buyer">Buyer</span>' : '<span class="badge badge-seller">Seller</span>';

        return `
            <tr>
                <td>${typeBadge}</td>
                <td>${d.name || d.address || 'TBD'}</td>
                <td>${formatCurrency(dealValue)}</td>
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
        <div class="alert-banner ${a.type}" title="${a.message}">
            <span class="alert-icon">${a.type === 'danger' ? '⚠️' : '⚡'}</span>
            <span class="alert-title">${a.title.replace('STOP-LOSS: ', '')}</span>
        </div>
    `).join('');
}

// ===========================================
// PIPELINE MANAGEMENT
// ===========================================

let currentStageFilter = 'all';
let currentTypeFilter = 'all';

function initializePipelineFilters() {
    // Stage filter buttons
    document.querySelectorAll('.stage-btn:not(.type-btn)').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.stage-btn:not(.type-btn)').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStageFilter = btn.dataset.stage;
            renderPipeline();
        });
    });

    // Type filter buttons (Sellers/Buyers)
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTypeFilter = btn.dataset.type;
            renderPipeline();
        });
    });
}

function renderPipeline() {
    // Update type counts
    const allTypeCount = appData.sellers.length;
    const sellerCount = appData.sellers.filter(s => s.type !== 'buyer').length;
    const buyerCount = appData.sellers.filter(s => s.type === 'buyer').length;

    document.getElementById('count-type-all').textContent = allTypeCount;
    document.getElementById('count-type-seller').textContent = sellerCount;
    document.getElementById('count-type-buyer').textContent = buyerCount;

    // Update stage counts
    document.getElementById('count-all').textContent = allTypeCount;
    STAGES.forEach(stage => {
        const countEl = document.getElementById(`count-${stage}`);
        if (countEl) {
            const count = appData.sellers.filter(s => s.stage === stage).length;
            countEl.textContent = count;
        }
    });

    // Filter by type first
    let filtered = appData.sellers;
    if (currentTypeFilter !== 'all') {
        if (currentTypeFilter === 'seller') {
            filtered = filtered.filter(s => s.type !== 'buyer');
        } else {
            filtered = filtered.filter(s => s.type === 'buyer');
        }
    }

    // Then filter by stage
    if (currentStageFilter !== 'all') {
        filtered = filtered.filter(s => s.stage === currentStageFilter);
    }

    // Sort by last touch date (most recent first)
    filtered.sort((a, b) => {
        const dateA = a.lastTouchDate ? new Date(a.lastTouchDate) : new Date(0);
        const dateB = b.lastTouchDate ? new Date(b.lastTouchDate) : new Date(0);
        return dateB - dateA;
    });

    const tbody = document.getElementById('pipeline-table');

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--gray-400);">No clients match the current filters</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        const daysSinceTouch = s.lastTouchDate ? Math.floor((new Date() - new Date(s.lastTouchDate)) / (1000 * 60 * 60 * 24)) : 999;
        const touchStatus = daysSinceTouch <= 14 ? 'success' : daysSinceTouch <= 30 ? 'warning' : 'danger';
        const isBuyer = s.type === 'buyer';
        const typeLabel = isBuyer ? 'Buyer' : 'Seller';
        const typeBadgeClass = isBuyer ? 'badge-buyer' : 'badge-seller';

        // Value display: for buyers show budget range, for sellers show value
        let valueDisplay = '-';
        if (isBuyer) {
            if (s.budgetMin || s.budgetMax) {
                const min = s.budgetMin ? formatCurrency(s.budgetMin) : '?';
                const max = s.budgetMax ? formatCurrency(s.budgetMax) : '?';
                valueDisplay = `${min} - ${max}`;
            }
        } else {
            valueDisplay = s.value ? formatCurrency(s.value) : '-';
        }

        // Originator display
        const originatorName = ORIGINATOR_NAMES[s.originator] || s.originator || '-';

        return `
            <tr>
                <td><span class="badge ${typeBadgeClass}">${typeLabel}</span></td>
                <td>
                    <strong>${s.name || 'Unknown'}</strong>
                    ${s.address ? `<br><span style="font-size: 0.8125rem; color: var(--gray-500);">${s.address}</span>` : ''}
                    ${isBuyer && s.preapproval ? `<br><span style="font-size: 0.75rem; color: var(--gray-400);">${PREAPPROVAL_LABELS[s.preapproval] || s.preapproval}</span>` : ''}
                </td>
                <td>${s.community || '-'}</td>
                <td>${valueDisplay}</td>
                <td>${s.timing || '-'}</td>
                <td><strong>${originatorName}</strong></td>
                <td>
                    <span class="badge badge-${touchStatus}">
                        ${s.lastTouchDate ? `${daysSinceTouch}d ago` : 'Never'}
                    </span>
                </td>
                <td><span class="badge badge-info">${STAGE_LABELS[s.stage] || s.stage}</span></td>
                <td>
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="viewClient('${s.id}')">View</button>
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="openActivityModal('${s.id}')">Log</button>
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editSeller('${s.id}')">Edit</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===========================================
// CLIENT DETAIL VIEW
// ===========================================

let currentDetailClientId = null;

function viewClient(id) {
    const client = appData.sellers.find(s => s.id === id);
    if (!client) return;

    currentDetailClientId = id;
    const isBuyer = client.type === 'buyer';

    // Set title
    document.getElementById('client-detail-title').textContent = client.name || 'Client Details';

    // Build info section
    const leadSource = client.leadSourceId ? appData.leadSources.find(ls => ls.id === client.leadSourceId) : null;

    let infoHtml = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div>
                <div style="font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; margin-bottom: 0.25rem;">Type</div>
                <div><span class="badge ${isBuyer ? 'badge-buyer' : 'badge-seller'}">${isBuyer ? 'Buyer' : 'Seller'}</span></div>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; margin-bottom: 0.25rem;">Stage</div>
                <div><span class="badge badge-info">${STAGE_LABELS[client.stage] || client.stage}</span></div>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; margin-bottom: 0.25rem;">${isBuyer ? 'Target Community' : 'Community'}</div>
                <div>${client.community || '-'}</div>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; margin-bottom: 0.25rem;">${isBuyer ? 'Budget' : 'Value'}</div>
                <div>${isBuyer ? (client.budgetMin || client.budgetMax ? `${formatCurrency(client.budgetMin || 0)} - ${formatCurrency(client.budgetMax || 0)}` : '-') : (client.value ? formatCurrency(client.value) : '-')}</div>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; margin-bottom: 0.25rem;">Originator</div>
                <div><strong>${ORIGINATOR_NAMES[client.originator] || client.originator || '-'}</strong></div>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; margin-bottom: 0.25rem;">Referred By</div>
                <div>${leadSource ? leadSource.name : 'Direct / No Referral'}</div>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; margin-bottom: 0.25rem;">Timing</div>
                <div>${client.timing || '-'}</div>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; margin-bottom: 0.25rem;">Probability</div>
                <div>${client.probability || 50}%</div>
            </div>
        </div>
    `;

    // Add address for sellers
    if (!isBuyer && client.address) {
        infoHtml = `
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--gray-100); border-radius: 6px;">
                <div style="font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; margin-bottom: 0.25rem;">Property Address</div>
                <div style="font-weight: 600;">${client.address}</div>
            </div>
        ` + infoHtml;
    }

    // Add notes if present
    if (client.notes) {
        infoHtml += `
            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--gray-100); border-radius: 6px;">
                <div style="font-size: 0.75rem; color: var(--gray-500); text-transform: uppercase; margin-bottom: 0.25rem;">Notes</div>
                <div>${client.notes}</div>
            </div>
        `;
    }

    document.getElementById('client-detail-info').innerHTML = infoHtml;

    // Render activity history
    renderClientActivities(id);

    openModal('client-detail-modal');
}

function renderClientActivities(clientId) {
    const activities = (appData.activities || [])
        .filter(a => a.sellerId === clientId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const container = document.getElementById('client-activity-list');

    if (activities.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-400); text-align: center;">No activities logged yet</p>';
        return;
    }

    const activityTypeLabels = {
        'seller_call': 'Seller Call',
        'seller_meeting': 'Seller Meeting',
        'pricing_discussion': 'Pricing Discussion',
        'listing_appointment': 'Listing Appointment',
        'showing': 'Showing',
        'offer_received': 'Offer Received',
        'other': 'Other'
    };

    const outcomeColors = {
        'positive': 'var(--success)',
        'neutral': 'var(--gray-500)',
        'negative': 'var(--danger)'
    };

    container.innerHTML = activities.map(a => `
        <div style="padding: 0.75rem; border-bottom: 1px solid var(--gray-200); display: flex; gap: 1rem;">
            <div style="min-width: 80px; font-size: 0.8125rem; color: var(--gray-500);">
                ${new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                    ${activityTypeLabels[a.type] || a.type}
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${outcomeColors[a.outcome] || outcomeColors.neutral};"></span>
                </div>
                ${a.notes ? `<div style="font-size: 0.875rem; color: var(--gray-600); margin-top: 0.25rem;">${a.notes}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function logActivityFromDetail() {
    if (currentDetailClientId) {
        closeModal('client-detail-modal');
        openActivityModal(currentDetailClientId);
    }
}

function editClientFromDetail() {
    if (currentDetailClientId) {
        closeModal('client-detail-modal');
        editSeller(currentDetailClientId);
    }
}

function openAddSellerModal() {
    document.getElementById('seller-modal-title').textContent = 'Add New Client';
    document.getElementById('seller-form').reset();
    document.getElementById('seller-id').value = '';
    document.getElementById('seller-type').value = 'seller';
    document.getElementById('seller-originator').value = currentUser ? currentUser.id : 'edmund';
    populateLeadSourceDropdown();
    toggleClientTypeFields();
    openModal('seller-modal');
}

function toggleClientTypeFields() {
    const type = document.getElementById('seller-type').value;
    const isBuyer = type === 'buyer';

    // Toggle field visibility
    document.getElementById('seller-fields').style.display = isBuyer ? 'none' : 'block';
    document.getElementById('buyer-fields').style.display = isBuyer ? 'block' : 'none';
    document.getElementById('field-address').style.display = isBuyer ? 'none' : 'block';

    // Toggle stage options
    document.querySelectorAll('.seller-stage-option').forEach(opt => {
        opt.style.display = isBuyer ? 'none' : '';
    });
    document.querySelectorAll('.buyer-stage-option').forEach(opt => {
        opt.style.display = isBuyer ? '' : 'none';
    });

    // Update labels
    const communityLabel = document.getElementById('label-community');
    if (communityLabel) {
        communityLabel.textContent = isBuyer ? 'Target Community' : 'Community';
    }

    // Update modal title for new clients
    const titleEl = document.getElementById('seller-modal-title');
    const isEdit = document.getElementById('seller-id').value !== '';
    if (!isEdit) {
        titleEl.textContent = isBuyer ? 'Add New Buyer' : 'Add New Seller';
    }
}

function editSeller(id) {
    const seller = appData.sellers.find(s => s.id === id);
    if (!seller) return;

    const isBuyer = seller.type === 'buyer';
    document.getElementById('seller-modal-title').textContent = isBuyer ? 'Edit Buyer' : 'Edit Seller';
    document.getElementById('seller-id').value = seller.id;
    document.getElementById('seller-type').value = seller.type || 'seller';
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

    // Buyer-specific fields
    document.getElementById('buyer-budget-min').value = seller.budgetMin || '';
    document.getElementById('buyer-budget-max').value = seller.budgetMax || '';
    document.getElementById('buyer-preapproval').value = seller.preapproval || 'none';

    // Lead source
    populateLeadSourceDropdown();
    document.getElementById('seller-lead-source').value = seller.leadSourceId || '';

    toggleClientTypeFields();
    openModal('seller-modal');
}

function saveSeller() {
    const id = document.getElementById('seller-id').value || generateId();
    const isNew = !document.getElementById('seller-id').value;
    const type = document.getElementById('seller-type').value;
    const isBuyer = type === 'buyer';

    const seller = {
        id,
        type: type,
        name: document.getElementById('seller-name').value,
        address: isBuyer ? '' : document.getElementById('seller-address').value,
        community: document.getElementById('seller-community').value,
        value: isBuyer ? 0 : (parseFloat(document.getElementById('seller-value').value) || 0),
        timing: document.getElementById('seller-timing').value,
        stage: document.getElementById('seller-stage').value,
        pricing: isBuyer ? '' : document.getElementById('seller-pricing').value,
        nextAction: document.getElementById('seller-next-action').value,
        originator: document.getElementById('seller-originator').value,
        probability: parseInt(document.getElementById('seller-probability').value) || 50,
        closeDate: document.getElementById('seller-close-date').value,
        notes: document.getElementById('seller-notes').value,
        // Buyer-specific fields
        budgetMin: isBuyer ? (parseFloat(document.getElementById('buyer-budget-min').value) || 0) : 0,
        budgetMax: isBuyer ? (parseFloat(document.getElementById('buyer-budget-max').value) || 0) : 0,
        preapproval: isBuyer ? document.getElementById('buyer-preapproval').value : '',
        // Lead source
        leadSourceId: document.getElementById('seller-lead-source').value || null,
        // Metadata
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
    renderLeadSources();
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
    const isEdmundOriginated = originator === 'edmund';

    // Handle solo deals (no co-broke)
    if (coBroke === 'no') {
        const grossCommission = price * (commissionRate / 100);
        const edmundNet = grossCommission * (s.edmundBrokerageSplit / 100) - s.nicoleBonus;

        document.getElementById('result-price').textContent = formatCurrency(price);
        document.getElementById('result-rate').textContent = commissionRate.toFixed(1);
        document.getElementById('result-gross').textContent = formatCurrency(grossCommission);
        document.getElementById('result-edmund-split').textContent = '100';
        document.getElementById('result-agent-split').textContent = '0';
        document.getElementById('result-edmund-pre').textContent = formatCurrency(grossCommission);
        document.getElementById('result-agent-pre').textContent = formatCurrency(0);
        document.getElementById('result-edmund-brokerage-pct').textContent = s.edmundBrokerageSplit;
        document.getElementById('result-agent-brokerage-pct').textContent = s.agentBrokerageSplit;
        document.getElementById('result-edmund-post').textContent = formatCurrency(grossCommission * (s.edmundBrokerageSplit / 100));
        document.getElementById('result-agent-post').textContent = formatCurrency(0);
        document.getElementById('result-nicole').textContent = `-${formatCurrency(s.nicoleBonus)}`;
        document.getElementById('result-edmund-net').textContent = formatCurrency(edmundNet);
        document.getElementById('result-agent-net').textContent = formatCurrency(0);
        return;
    }

    // Co-broke deal - use the full breakdown
    const breakdown = calculateDealBreakdown(price, isEdmundOriginated, null, commissionRate);

    // Update display
    document.getElementById('result-price').textContent = formatCurrency(price);
    document.getElementById('result-rate').textContent = commissionRate.toFixed(1);
    document.getElementById('result-gross').textContent = formatCurrency(breakdown.grossCommission);
    document.getElementById('result-edmund-split').textContent = breakdown.edmundSplitPct;
    document.getElementById('result-agent-split').textContent = breakdown.agentSplitPct;
    document.getElementById('result-edmund-pre').textContent = formatCurrency(breakdown.edmundPreBrokerage);
    document.getElementById('result-agent-pre').textContent = formatCurrency(breakdown.agentPreBrokerage);
    document.getElementById('result-edmund-brokerage-pct').textContent = breakdown.edmundBrokeragePct;
    document.getElementById('result-agent-brokerage-pct').textContent = breakdown.agentBrokeragePct;
    document.getElementById('result-edmund-post').textContent = formatCurrency(breakdown.edmundPostBrokerage);
    document.getElementById('result-agent-post').textContent = formatCurrency(breakdown.agentPostBrokerage);
    document.getElementById('result-nicole').textContent = `-${formatCurrency(breakdown.nicoleBonus)}`;
    document.getElementById('result-edmund-net').textContent = formatCurrency(breakdown.edmundNet);
    document.getElementById('result-agent-net').textContent = formatCurrency(breakdown.agentNet);
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
// LEAD SOURCES
// ===========================================

function renderLeadSources() {
    const sources = appData.leadSources || [];
    const now = new Date();

    // Calculate metrics with details for tooltips
    const totalSources = sources.length;
    const sourceNames = sources.map(s => s.name).slice(0, 10);
    const sourceNamesTooltip = sourceNames.length > 0
        ? sourceNames.join('\n') + (sources.length > 10 ? `\n...and ${sources.length - 10} more` : '')
        : 'No lead sources added';

    const leadsFromReferrals = appData.sellers.filter(s => s.leadSourceId);
    const leadsCount = leadsFromReferrals.length;
    const leadsTooltip = leadsFromReferrals.length > 0
        ? leadsFromReferrals.slice(0, 10).map(c => {
            const source = sources.find(s => s.id === c.leadSourceId);
            return `${c.name} (from ${source?.name || 'Unknown'})`;
        }).join('\n') + (leadsFromReferrals.length > 10 ? `\n...and ${leadsFromReferrals.length - 10} more` : '')
        : 'No leads from referrals yet';

    const closedClients = appData.sellers.filter(s => s.leadSourceId && s.stage === 'closed');
    const closedFromReferrals = closedClients.length;
    const closedTooltip = closedClients.length > 0
        ? closedClients.slice(0, 10).map(c => {
            const source = sources.find(s => s.id === c.leadSourceId);
            return `${c.name} (from ${source?.name || 'Unknown'})`;
        }).join('\n') + (closedClients.length > 10 ? `\n...and ${closedClients.length - 10} more` : '')
        : 'No closed deals from referrals yet';

    // Sources needing touch (30+ days)
    const needTouchSources = sources.filter(s => {
        if (!s.lastTouchDate) return true;
        const daysSince = Math.floor((now - new Date(s.lastTouchDate)) / (1000 * 60 * 60 * 24));
        return daysSince >= 30;
    });
    const needTouch = needTouchSources.length;
    const needTouchTooltip = needTouchSources.length > 0
        ? needTouchSources.slice(0, 10).map(s => {
            const days = s.lastTouchDate
                ? Math.floor((now - new Date(s.lastTouchDate)) / (1000 * 60 * 60 * 24)) + ' days ago'
                : 'Never contacted';
            return `${s.name} (${days})`;
        }).join('\n') + (needTouchSources.length > 10 ? `\n...and ${needTouchSources.length - 10} more` : '')
        : 'All lead sources contacted recently';

    // Update metrics
    document.getElementById('ls-total-count').textContent = totalSources;
    document.getElementById('ls-leads-count').textContent = leadsCount;
    document.getElementById('ls-closed-count').textContent = closedFromReferrals;
    document.getElementById('ls-need-touch').textContent = needTouch;

    // Update tooltips
    document.getElementById('ls-total-card').title = sourceNamesTooltip;
    document.getElementById('ls-leads-card').title = leadsTooltip;
    document.getElementById('ls-closed-card').title = closedTooltip;
    document.getElementById('ls-need-touch-card').title = needTouchTooltip;

    // Render table
    const tbody = document.getElementById('lead-sources-table');

    if (sources.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--gray-400);">No lead sources added yet</td></tr>';
    } else {
        // Sort by last touch date (oldest first to prioritize follow-ups)
        const sorted = [...sources].sort((a, b) => {
            const dateA = a.lastTouchDate ? new Date(a.lastTouchDate) : new Date(0);
            const dateB = b.lastTouchDate ? new Date(b.lastTouchDate) : new Date(0);
            return dateA - dateB;
        });

        tbody.innerHTML = sorted.map(s => {
            const leadsSent = appData.sellers.filter(c => c.leadSourceId === s.id).length;
            const closedDeals = appData.sellers.filter(c => c.leadSourceId === s.id && c.stage === 'closed').length;
            const daysSinceTouch = s.lastTouchDate ? Math.floor((now - new Date(s.lastTouchDate)) / (1000 * 60 * 60 * 24)) : 999;
            const touchStatus = daysSinceTouch <= 14 ? 'success' : daysSinceTouch <= 30 ? 'warning' : 'danger';

            return `
                <tr>
                    <td>
                        <strong>${s.name || 'Unknown'}</strong>
                        ${s.phone ? `<br><span style="font-size: 0.8125rem; color: var(--gray-500);">${s.phone}</span>` : ''}
                    </td>
                    <td>${LEAD_SOURCE_TYPES[s.type] || s.type || '-'}</td>
                    <td>${s.company || '-'}</td>
                    <td><strong>${leadsSent}</strong></td>
                    <td><span class="badge ${closedDeals > 0 ? 'badge-success' : 'badge-gray'}">${closedDeals}</span></td>
                    <td>
                        <span class="badge badge-${touchStatus}">
                            ${s.lastTouchDate ? `${daysSinceTouch}d ago` : 'Never'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="openLeadSourceTouchModal('${s.id}')">Touch</button>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editLeadSource('${s.id}')">Edit</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Render top referrers
    renderTopReferrers();
}

function renderTopReferrers() {
    const container = document.getElementById('top-referrers-list');

    // Calculate revenue per lead source
    const sourceRevenue = {};
    appData.sellers.filter(s => s.leadSourceId && s.stage === 'closed').forEach(client => {
        const sourceId = client.leadSourceId;
        if (!sourceRevenue[sourceId]) {
            sourceRevenue[sourceId] = { deals: 0, revenue: 0 };
        }
        sourceRevenue[sourceId].deals++;
        sourceRevenue[sourceId].revenue += calculateNetToEdmund(client.value || 0, client.originator === 'edmund');
    });

    // Sort by revenue
    const topSources = Object.entries(sourceRevenue)
        .map(([id, data]) => {
            const source = appData.leadSources.find(s => s.id === id);
            return { ...data, source };
        })
        .filter(s => s.source)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    if (topSources.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-400); text-align: center;">Add lead sources and link clients to see your top referrers</p>';
        return;
    }

    container.innerHTML = topSources.map((s, i) => `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: ${i === 0 ? 'var(--gold-light)' : 'var(--gray-100)'}; border-radius: 6px;">
            <div style="font-size: 1.5rem; font-weight: 700; color: ${i === 0 ? 'var(--gold-dark)' : 'var(--gray-400)'}; width: 2rem;">#${i + 1}</div>
            <div style="flex: 1;">
                <strong>${s.source.name}</strong>
                <span style="color: var(--gray-500); font-size: 0.875rem;"> - ${LEAD_SOURCE_TYPES[s.source.type] || s.source.type}</span>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 600; color: var(--success);">${formatCurrency(s.revenue)}</div>
                <div style="font-size: 0.75rem; color: var(--gray-500);">${s.deals} deal${s.deals !== 1 ? 's' : ''}</div>
            </div>
        </div>
    `).join('');
}

function openAddLeadSourceModal() {
    document.getElementById('lead-source-modal-title').textContent = 'Add Lead Source';
    document.getElementById('lead-source-form').reset();
    document.getElementById('lead-source-id').value = '';
    openModal('lead-source-modal');
}

function editLeadSource(id) {
    const source = appData.leadSources.find(s => s.id === id);
    if (!source) return;

    document.getElementById('lead-source-modal-title').textContent = 'Edit Lead Source';
    document.getElementById('lead-source-id').value = source.id;
    document.getElementById('lead-source-name').value = source.name || '';
    document.getElementById('lead-source-type').value = source.type || 'other';
    document.getElementById('lead-source-company').value = source.company || '';
    document.getElementById('lead-source-phone').value = source.phone || '';
    document.getElementById('lead-source-email').value = source.email || '';
    document.getElementById('lead-source-notes').value = source.notes || '';

    openModal('lead-source-modal');
}

function saveLeadSource() {
    const id = document.getElementById('lead-source-id').value || generateId();
    const isNew = !document.getElementById('lead-source-id').value;

    const source = {
        id,
        name: document.getElementById('lead-source-name').value,
        type: document.getElementById('lead-source-type').value,
        company: document.getElementById('lead-source-company').value,
        phone: document.getElementById('lead-source-phone').value,
        email: document.getElementById('lead-source-email').value,
        notes: document.getElementById('lead-source-notes').value,
        lastTouchDate: isNew ? null : (appData.leadSources.find(s => s.id === id)?.lastTouchDate || null),
        createdAt: isNew ? new Date().toISOString() : (appData.leadSources.find(s => s.id === id)?.createdAt || new Date().toISOString())
    };

    if (isNew) {
        appData.leadSources.push(source);
    } else {
        const idx = appData.leadSources.findIndex(s => s.id === id);
        if (idx !== -1) {
            appData.leadSources[idx] = source;
        }
    }

    saveData();
    closeModal('lead-source-modal');
    renderLeadSources();
    populateLeadSourceDropdown();
}

function openLeadSourceTouchModal(sourceId) {
    document.getElementById('touch-lead-source-id').value = sourceId;
    document.getElementById('lead-source-touch-form').reset();
    document.getElementById('touch-lead-source-id').value = sourceId;
    document.getElementById('touch-date').value = new Date().toISOString().split('T')[0];
    openModal('lead-source-touch-modal');
}

function saveLeadSourceTouch() {
    const sourceId = document.getElementById('touch-lead-source-id').value;

    const touch = {
        id: generateId(),
        leadSourceId: sourceId,
        type: document.getElementById('touch-type').value,
        date: document.getElementById('touch-date').value,
        notes: document.getElementById('touch-notes').value,
        createdAt: new Date().toISOString()
    };

    appData.leadSourceTouches.push(touch);

    // Update last touch date on source
    const source = appData.leadSources.find(s => s.id === sourceId);
    if (source) {
        source.lastTouchDate = touch.date;
    }

    saveData();
    closeModal('lead-source-touch-modal');
    renderLeadSources();
}

function populateLeadSourceDropdown() {
    const dropdown = document.getElementById('seller-lead-source');
    if (!dropdown) return;

    const sources = appData.leadSources || [];

    // Keep the first "no referral" option and rebuild the rest
    dropdown.innerHTML = '<option value="">-- No referral / Direct --</option>' +
        sources.map(s => `<option value="${s.id}">${s.name} (${LEAD_SOURCE_TYPES[s.type] || s.type})</option>`).join('');
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
    document.getElementById('setting-edmund-brokerage').value = s.edmundBrokerageSplit;
    document.getElementById('setting-agent-brokerage').value = s.agentBrokerageSplit;
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
        edmundBrokerageSplit: parseFloat(document.getElementById('setting-edmund-brokerage').value) || 80,
        agentBrokerageSplit: parseFloat(document.getElementById('setting-agent-brokerage').value) || 70,
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
