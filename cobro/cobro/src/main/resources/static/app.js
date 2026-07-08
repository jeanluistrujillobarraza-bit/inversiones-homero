// Configuration parameters
const API_BASE = '/api';
let currentUser = null;
let companyConfig = null;
let currentTab = 'dashboard';
let activeLoansList = [];
let selectedPaymentLoan = null;

function getLocalDateString() {
  const localDate = new Date();
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// On Load init
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupLoginForm();
  startLoginClock();
});

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

async function initApp() {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  
  if (token && storedUser) {
    currentUser = JSON.parse(storedUser);
    document.getElementById('login-portal').classList.add('hidden');
    document.getElementById('app-workspace').classList.remove('hidden');
    
    // Set user profile info in layout
    document.getElementById('user-avatar-char').innerText = currentUser.fullName.charAt(0).toUpperCase();
    document.getElementById('user-full-name').innerText = currentUser.fullName;
    document.getElementById('user-role-badge').innerText = currentUser.role === 'ROLE_ADMIN' ? 'Administrador' : 'Cobrador';
    
    // Hide admin sections if employee
    if (currentUser.role !== 'ROLE_ADMIN') {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.employee-only').forEach(el => el.classList.remove('hidden'));
    } else {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
      document.querySelectorAll('.employee-only').forEach(el => el.classList.add('hidden'));
    }

    await loadCompanyConfig();
    switchTab('dashboard');
  } else {
    document.getElementById('login-portal').classList.remove('hidden');
    document.getElementById('app-workspace').classList.add('hidden');
    await loadCompanyConfig(); // load logo and config on login screen too
  }
  lucide.createIcons();
}

// ----------------------------------------------------
// AUTH SECTION
// ----------------------------------------------------
function setupLoginForm() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value;
    const passwordInput = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const errorMsg = document.getElementById('login-error-msg');
    const submitBtn = document.getElementById('login-btn');

    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Iniciando sesión...';

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });

      if (!response.ok) {
        throw new Error('Credenciales inválidas o cuenta inactiva.');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: data.id,
        username: data.username,
        fullName: data.fullName,
        role: data.role
      }));

      // Reset form
      document.getElementById('login-username').value = '';
      document.getElementById('login-password').value = '';

      await initApp();
    } catch (error) {
      errorMsg.innerText = error.message;
      errorDiv.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Entrar al Sistema';
    }
  });
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  document.getElementById('login-portal').classList.remove('hidden');
  document.getElementById('app-workspace').classList.add('hidden');
}

// ----------------------------------------------------
// THEME SWITCHER
// ----------------------------------------------------
function toggleTheme() {
  const html = document.documentElement;
  const icon = document.getElementById('theme-icon');
  
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    document.body.classList.remove('dark');
    icon.setAttribute('data-lucide', 'moon');
    localStorage.setItem('theme', 'light');
  } else {
    html.classList.add('dark');
    document.body.classList.add('dark');
    icon.setAttribute('data-lucide', 'sun');
    localStorage.setItem('theme', 'dark');
  }
  lucide.createIcons();
}

// ----------------------------------------------------
// SPA TAB NAVIGATION
// ----------------------------------------------------
function switchTab(tabName) {
  // Strict role guard check
  if (currentUser) {
    if (['users', 'settings', 'corrections-admin', 'loans'].includes(tabName) && currentUser.role !== 'ROLE_ADMIN') {
      tabName = 'dashboard';
    }
    if (['corrections-employee'].includes(tabName) && currentUser.role === 'ROLE_ADMIN') {
      tabName = 'dashboard';
    }
  }

  currentTab = tabName;
  
  // Hide all sections
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  
  // Show target section
  const targetPane = document.getElementById(`tab-content-${tabName}`);
  if (targetPane) targetPane.classList.remove('hidden');
  
  // Update sidebar buttons style
  document.querySelectorAll('aside nav button').forEach(btn => {
    btn.classList.remove('bg-primary-600', 'text-white', 'shadow-lg', 'shadow-primary-600/20');
    btn.classList.add('text-slate-650', 'hover:bg-slate-100', 'hover:text-slate-950', 'dark:text-slate-400', 'dark:hover:bg-slate-800', 'dark:hover:text-white');
  });
  
  const activeBtn = document.getElementById(`nav-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-650', 'hover:bg-slate-100', 'hover:text-slate-950', 'dark:text-slate-400', 'dark:hover:bg-slate-800', 'dark:hover:text-white');
    activeBtn.classList.add('bg-primary-600', 'text-white', 'shadow-lg', 'shadow-primary-600/20');
  }

  // Update header title
  const tabTitles = {
    dashboard: 'Dashboard',
    clients: 'Gestión de Clientes',
    loans: 'Registro de Préstamos',
    payments: 'Registrar Cobro',
    alerts: 'Alertas de Cobro',
    'corrections-admin': 'Peticiones Recibidas',
    'corrections-employee': 'Soporte y Peticiones',
    reports: 'Generador de Reportes',
    users: 'Control de Empleados',
    settings: 'Configuración Empresa'
  };
  document.getElementById('header-tab-title').innerText = tabTitles[tabName] || 'Detalles';

  // Load specific tab data
  if (tabName === 'dashboard') loadDashboardStats();
  if (tabName === 'clients') loadClientsList();
  if (tabName === 'loans') loadLoansTabDetails();
  if (tabName === 'payments') loadPaymentsTabDetails();
  if (tabName === 'expenses') loadExpensesList();
  if (tabName === 'cash-closing') loadCashClosingDetails();
  if (tabName === 'alerts') loadAlertsTabDetails();
  if (tabName === 'corrections-admin') loadCorrectionsAdminTab();
  if (tabName === 'corrections-employee') loadCorrectionsEmployeeTab();
  if (tabName === 'reports') loadReportsTabDetails();
  if (tabName === 'users') loadUsersList();
  if (tabName === 'settings') loadSettingsTabDetails();
}

function toggleMobileMenu() {
  const drawer = document.getElementById('mobile-menu-drawer');
  drawer.classList.toggle('hidden');
  lucide.createIcons();
}

// ----------------------------------------------------
// UTILS
// ----------------------------------------------------
function formatCurrency(val) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(val || 0);
}

async function loadCompanyConfig() {
  try {
    const res = await fetch(`${API_BASE}/company`);
    if (res.ok) {
      companyConfig = await res.json();
      
      // Update UI texts
      document.getElementById('sidebar-company-name').innerText = companyConfig.companyName;
      document.getElementById('login-company-name').innerText = companyConfig.companyName;
      document.getElementById('mobile-company-name').innerText = companyConfig.companyName;
      
      // Update Logotypes
      const containers = [
        document.getElementById('brand-logo-container'),
        document.getElementById('login-logo-container'),
        document.getElementById('settings-logo-preview')
      ];
      
      containers.forEach(container => {
        if (!container) return;
        if (companyConfig.logoBase64) {
          container.innerHTML = `<img src="${companyConfig.logoBase64}" class="h-full w-full object-cover">`;
        } else {
          container.innerHTML = `<img src="logo.jpg" class="h-full w-full object-cover">`;
        }
      });
    }
  } catch (error) {
    console.error("Config error:", error);
  }
}

// ----------------------------------------------------
// TAB: DASHBOARD LOGIC
// ----------------------------------------------------
async function loadDashboardStats() {
  try {
    const res = await fetch(`${API_BASE}/dashboard`, { headers: getHeaders() });
    if (!res.ok) throw new Error();
    const stats = await res.json();

    // Set stats
    document.getElementById('stat-capital-neto').innerText = formatCurrency(stats.totalCapitalLent);
    document.getElementById('stat-capital-total').innerText = formatCurrency(stats.totalLentWithInterest);
    document.getElementById('stat-intereses-generados').innerText = formatCurrency(stats.interestGenerated);
    document.getElementById('stat-saldo-por-cobrar').innerText = formatCurrency(stats.balanceOutstanding);
    document.getElementById('stat-total-recuperado').innerText = formatCurrency(stats.totalRecovered);

    // Reorganized Recaudo cards
    document.getElementById('stat-recaudo-dia').innerText = formatCurrency(stats.dailyCollection);
    document.getElementById('stat-recaudo-efectivo').innerText = formatCurrency(stats.cashCollection);
    document.getElementById('stat-recaudo-nequi').innerText = formatCurrency(stats.nequiCollection);
    document.getElementById('stat-recaudo-semana').innerText = formatCurrency(stats.weeklyCollection);
    document.getElementById('stat-ganancia-semanal').innerText = formatCurrency(stats.weeklyRealizedProfits);
    document.getElementById('stat-recaudo-quincena').innerText = formatCurrency(stats.fortnightlyCollection);
    document.getElementById('stat-ganancia-quincenal').innerText = formatCurrency(stats.fortnightlyRealizedProfits);
    document.getElementById('stat-recaudo-mes').innerText = formatCurrency(stats.monthlyCollection);
    document.getElementById('stat-ganancia-mensual').innerText = formatCurrency(stats.monthlyRealizedProfits);

    // Gastos cards
    document.getElementById('stat-gastos-dia').innerText = formatCurrency(stats.dailyExpenses);
    document.getElementById('stat-gastos-semana').innerText = formatCurrency(stats.weeklyExpenses);
    document.getElementById('stat-gastos-quincena').innerText = formatCurrency(stats.fortnightlyExpenses);
    document.getElementById('stat-gastos-mes').innerText = formatCurrency(stats.monthlyExpenses);

    // Flujo de caja e Utilidades indicators
    document.getElementById('stat-utilidad-dia').innerText = formatCurrency(stats.dailyUtility);
    document.getElementById('stat-utilidad-mes').innerText = formatCurrency(stats.monthlyUtility);
    document.getElementById('stat-caja-actual').innerText = formatCurrency(stats.currentCash);
    document.getElementById('stat-caja-esperada').innerText = formatCurrency(stats.expectedCash);
    document.getElementById('stat-caja-cerrada').innerText = stats.closedCash;

    // Activides indicators
    document.getElementById('stat-ganancias-obtenidas').innerText = formatCurrency(stats.realizedProfits);
    document.getElementById('stat-ganancias-pendientes').innerText = formatCurrency(stats.pendingProfits);
    document.getElementById('stat-clientes-activos').innerText = stats.activeClientsCount;
    document.getElementById('stat-prestamos-activos').innerText = stats.activeLoansCount;
    document.getElementById('stat-clientes-mora').innerText = stats.lateClientsCount;
    document.getElementById('stat-cuotas-vencidas').innerText = stats.lateInstallmentsCount;

    // Render Charts
    renderDailyChart(stats.dailyCollectionsChart);
    renderDonutChart(stats.paymentMethodChart);
  } catch (error) {
    console.error(error);
  }
}

function renderDailyChart(data) {
  const container = document.getElementById('chart-daily-bars');
  if (!container || !data || data.length === 0) return;

  const maxVal = Math.max(...data.map(d => d.recaudo), 1);
  container.innerHTML = data.map(d => {
    const pct = (d.recaudo / maxVal) * 100;
    return `
      <div class="flex-1 flex flex-col items-center h-full justify-end group relative">
        <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-800 text-white text-[9px] font-semibold py-1 px-2 rounded absolute bottom-24 z-10 shadow-lg pointer-events-none whitespace-nowrap">
          ${formatCurrency(d.recaudo)}
        </div>
        <div class="w-full bg-gradient-to-t from-primary-650 to-primary-500 rounded-lg hover:from-primary-550 transition-all duration-300" style="height: ${Math.max(pct, 5)}%"></div>
        <span class="text-[9px] text-slate-500 mt-2 font-medium truncate max-w-full text-center">${d.name}</span>
      </div>
    `;
  }).join('');
}

function renderDonutChart(chartData) {
  const container = document.getElementById('chart-donut-container');
  if (!container) return;

  const cash = chartData?.["Efectivo"] || 0;
  const nequi = chartData?.["Nequi"] || 0;
  const total = cash + nequi;
  
  const cashPct = total > 0 ? (cash / total) * 100 : 50;
  const nequiPct = total > 0 ? (nequi / total) * 100 : 50;

  document.getElementById('donut-cash-label').innerText = `${formatCurrency(cash)} (${cashPct.toFixed(1)}%)`;
  document.getElementById('donut-nequi-label').innerText = `${formatCurrency(nequi)} (${nequiPct.toFixed(1)}%)`;

  const size = 160;
  const radius = 60;
  const strokeWidth = 16;
  const circ = 2 * Math.PI * radius;
  const cashOffset = circ - (cashPct / 100) * circ;

  container.innerHTML = `
    <svg width="${size}" height="${size}" class="transform -rotate-90">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="transparent" stroke="#f1f5f9" stroke-width="${strokeWidth}" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="transparent" stroke="#6366f1" stroke-width="${strokeWidth}" stroke-dasharray="${circ}" stroke-dashoffset="0" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="transparent" stroke="#10b981" stroke-width="${strokeWidth}" stroke-dasharray="${circ}" stroke-dashoffset="${cashOffset}" />
    </svg>
    <div class="absolute flex flex-col items-center justify-center">
      <span class="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
      <span class="text-xs font-bold text-slate-800 dark:text-white">${formatCurrency(total)}</span>
    </div>
  `;
}

// ----------------------------------------------------
// TAB: CLIENTS LOGIC
// ----------------------------------------------------
async function loadClientsList() {
  const container = document.getElementById('clients-table-container');
  container.innerHTML = `<div class="flex items-center justify-center p-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>`;
  
  try {
    const res = await fetch(`${API_BASE}/clients`, { headers: getHeaders() });
    if (!res.ok) throw new Error();
    const clientsList = await res.ok ? await res.json() : [];

    if (clientsList.length === 0) {
      container.innerHTML = `
        <div class="p-12 text-center">
          <i data-lucide="users" class="h-12 w-12 text-slate-300 mx-auto mb-4"></i>
          <h4 class="text-slate-800 dark:text-white font-bold text-sm">No hay clientes registrados</h4>
          <p class="text-xs text-slate-500 mt-1">Registra un nuevo cliente para empezar.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-xs">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
              <th class="py-4 px-6">Foto</th>
              <th class="py-4 px-6">Nombre / Cédula</th>
              <th class="py-4 px-6">Dirección</th>
              <th class="py-4 px-6">Celular</th>
              <th class="py-4 px-6">Estado</th>
              <th class="py-4 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-850">
            ${clientsList.map(c => `
              <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                <td class="py-4 px-6">
                  ${c.photoBase64 ? `<img src="${c.photoBase64}" class="h-9 w-9 rounded-xl object-cover border border-slate-200">` : `<div class="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 uppercase">${c.fullName.charAt(0)}</div>`}
                </td>
                <td class="py-4 px-6">
                  <p onclick="viewClientProfile('${c.id}')" class="font-bold text-slate-800 dark:text-white hover:text-primary-500 cursor-pointer">${c.fullName}</p>
                  <p class="text-[10px] text-slate-450 mt-0.5">${c.dni}</p>
                </td>
                <td class="py-4 px-6">${c.address} (${c.neighborhood})</td>
                <td class="py-4 px-6">${c.phone}</td>
                <td class="py-4 px-6">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${c.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' : 'bg-slate-100 text-slate-650'}">
                    ${c.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td class="py-4 px-6 text-right">
                  <div class="flex justify-end gap-2">
                    <button onclick="viewClientProfile('${c.id}')" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white"><i data-lucide="eye" class="h-4.5 w-4.5"></i></button>
                    <button onclick="openClientModal('${c.id}')" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white"><i data-lucide="edit-3" class="h-4.5 w-4.5"></i></button>
                    ${currentUser.role === 'ROLE_ADMIN' ? `<button onclick="deleteClient('${c.id}')" class="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500"><i data-lucide="trash-2" class="h-4.5 w-4.5"></i></button>` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    lucide.createIcons();
  } catch (error) {
    container.innerHTML = `<p class="p-6 text-center text-red-500">Error al cargar clientes.</p>`;
  }
}

async function searchClients(e) {
  const query = e.target.value;
  if (!query || query.trim() === '') {
    loadClientsList();
    return;
  }
  const container = document.getElementById('clients-table-container');
  try {
    const res = await fetch(`${API_BASE}/clients/search?q=${query}`, { headers: getHeaders() });
    const list = await res.json();
    if (list.length === 0) {
      container.innerHTML = `<p class="p-6 text-center text-slate-400">No se encontraron clientes.</p>`;
      return;
    }
    // Render search rows
    container.querySelector('tbody').innerHTML = list.map(c => `
      <tr class="hover:bg-slate-50/50">
        <td class="py-4 px-6">
          ${c.photoBase64 ? `<img src="${c.photoBase64}" class="h-9 w-9 rounded-xl object-cover">` : `<div class="h-9 w-9 rounded-xl bg-slate-150 flex items-center justify-center font-bold text-slate-500">${c.fullName.charAt(0)}</div>`}
        </td>
        <td class="py-4 px-6">
          <p onclick="viewClientProfile('${c.id}')" class="font-bold text-slate-800 dark:text-white hover:text-primary-500 cursor-pointer">${c.fullName}</p>
          <p class="text-[10px] text-slate-450 mt-0.5">${c.dni}</p>
        </td>
        <td class="py-4 px-6">${c.address} (${c.neighborhood})</td>
        <td class="py-4 px-6">${c.phone}</td>
        <td class="py-4 px-6">
          <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-650'}">
            ${c.active ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="py-4 px-6 text-right">
          <div class="flex justify-end gap-2">
            <button onclick="viewClientProfile('${c.id}')" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><i data-lucide="eye" class="h-4.5 w-4.5"></i></button>
            <button onclick="openClientModal('${c.id}')" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><i data-lucide="edit-3" class="h-4.5 w-4.5"></i></button>
            ${currentUser.role === 'ROLE_ADMIN' ? `<button onclick="deleteClient('${c.id}')" class="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><i data-lucide="trash-2" class="h-4.5 w-4.5"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
    lucide.createIcons();
  } catch (error) {
    console.error(error);
  }
}

// Client Modal actions
async function openClientModal(id = null) {
  const errorDiv = document.getElementById('modal-client-error');
  errorDiv.classList.add('hidden');
  
  // Set Employees dropdown for Admin
  if (currentUser.role === 'ROLE_ADMIN') {
    const empSelect = document.getElementById('client-employee');
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
      const users = await res.json();
      empSelect.innerHTML = `<option value="">Seleccione cobrador...</option>` + 
        users.filter(u => u.role === 'ROLE_EMPLOYEE').map(u => `<option value="${u.id}">${u.fullName}</option>`).join('');
    } catch (e) {
      console.error(e);
    }
  }

  if (id) {
    document.getElementById('modal-client-title').innerText = 'Editar Cliente';
    try {
      const res = await fetch(`${API_BASE}/clients/${id}`, { headers: getHeaders() });
      const c = await res.json();
      
      document.getElementById('modal-client-id-field').value = c.id;
      document.getElementById('client-fullname').value = c.fullName;
      document.getElementById('client-dni').value = c.dni;
      document.getElementById('client-address').value = c.address;
      document.getElementById('client-neighborhood').value = c.neighborhood;
      document.getElementById('client-phone').value = c.phone;
      document.getElementById('client-reference').value = c.personalReference || '';
      document.getElementById('client-notes').value = c.notes || '';
      document.getElementById('client-active').checked = c.active;
      
      if (currentUser.role === 'ROLE_ADMIN') {
        document.getElementById('client-employee').value = c.assignedEmployeeId || '';
      }

      if (c.photoBase64) {
        document.getElementById('client-photo-preview').innerHTML = `<img src="${c.photoBase64}" class="h-full w-full object-cover">`;
      } else {
        document.getElementById('client-photo-preview').innerHTML = `<i data-lucide="user-plus" class="h-6 w-6"></i>`;
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    document.getElementById('modal-client-title').innerText = 'Registrar Cliente';
    document.getElementById('modal-client-id-field').value = '';
    document.getElementById('modal-client-form').reset();
    document.getElementById('client-photo-preview').innerHTML = `<i data-lucide="user-plus" class="h-6 w-6"></i>`;
  }
  
  document.getElementById('modal-client').classList.remove('hidden');
  lucide.createIcons();
}

function closeClientModal() {
  document.getElementById('modal-client').classList.add('hidden');
}

let uploadPhotoBase64 = "";

function handleClientPhotoUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      uploadPhotoBase64 = reader.result;
      document.getElementById('client-photo-preview').innerHTML = `<img src="${uploadPhotoBase64}" class="h-full w-full object-cover">`;
    };
    reader.readAsDataURL(file);
  }
}

async function handleClientSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('modal-client-error');
  errorDiv.classList.add('hidden');

  const id = document.getElementById('modal-client-id-field').value;
  const payload = {
    dni: document.getElementById('client-dni').value,
    fullName: document.getElementById('client-fullname').value,
    address: document.getElementById('client-address').value,
    neighborhood: document.getElementById('client-neighborhood').value,
    phone: document.getElementById('client-phone').value,
    personalReference: document.getElementById('client-reference').value,
    notes: document.getElementById('client-notes').value,
    active: document.getElementById('client-active').checked
  };

  if (uploadPhotoBase64) {
    payload.photoBase64 = uploadPhotoBase64;
  }

  if (currentUser.role === 'ROLE_ADMIN') {
    payload.assignedEmployeeId = document.getElementById('client-employee').value || null;
  } else {
    payload.assignedEmployeeId = currentUser.id;
  }

  try {
    const url = id ? `${API_BASE}/clients/${id}` : `${API_BASE}/clients`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al guardar cliente.');
    }

    closeClientModal();
    uploadPhotoBase64 = "";
    loadClientsList();
  } catch (error) {
    errorDiv.innerText = error.message;
    errorDiv.classList.remove('hidden');
  }
}

async function deleteClient(id) {
  if (confirm('¿Está seguro de que desea eliminar este cliente?')) {
    try {
      const res = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) loadClientsList();
    } catch (e) {
      console.error(e);
    }
  }
}

// ----------------------------------------------------
// TAB: CLIENT PROFILE LOGIC
// ----------------------------------------------------
async function viewClientProfile(id) {
  switchTab('client-profile');
  const personalCard = document.getElementById('profile-personal-card');
  const financialDetails = document.getElementById('profile-financial-details');
  const paymentsHistory = document.getElementById('profile-payments-history');
  const loansHistory = document.getElementById('profile-loans-history');

  personalCard.innerHTML = `<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>`;
  financialDetails.innerHTML = '';

  try {
    // 1. Fetch Client Profile details
    const clientRes = await fetch(`${API_BASE}/clients/${id}`, { headers: getHeaders() });
    const c = await clientRes.json();

    // Render Personal Info Card
    personalCard.innerHTML = `
      ${c.photoBase64 ? `<img src="${c.photoBase64}" class="h-28 w-28 rounded-3xl object-cover mb-4 border shadow-sm">` : `<div class="h-28 w-28 rounded-3xl bg-primary-100 dark:bg-slate-800 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-3xl mb-4">${c.fullName.charAt(0)}</div>`}
      <h3 class="text-xl font-bold text-slate-850 dark:text-white">${c.fullName}</h3>
      <p class="text-xs text-slate-500 mt-1 font-medium">C.C. ${c.dni}</p>

      <div class="w-full mt-6 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6 text-left text-xs">
        <div class="flex items-center gap-3">
          <i data-lucide="map-pin" class="h-4 w-4 text-slate-400"></i>
          <div>
            <p class="text-[9px] text-slate-400 uppercase font-semibold">Dirección</p>
            <p class="font-bold text-slate-700 dark:text-slate-350 mt-0.5">${c.address}</p>
            <p class="text-[10px] text-slate-400">Barrio: ${c.neighborhood}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <i data-lucide="phone" class="h-4 w-4 text-slate-400"></i>
          <div>
            <p class="text-[9px] text-slate-400 uppercase font-semibold">Celular</p>
            <p class="font-bold text-slate-700 dark:text-slate-350 mt-0.5">${c.phone}</p>
          </div>
        </div>
        ${c.personalReference ? `
          <div class="flex items-center gap-3">
            <i data-lucide="file-check" class="h-4 w-4 text-slate-400"></i>
            <div>
              <p class="text-[9px] text-slate-400 uppercase font-semibold">Referencia</p>
              <p class="font-bold text-slate-700 dark:text-slate-350 mt-0.5">${c.personalReference}</p>
            </div>
          </div>
        ` : ''}
        ${c.notes ? `<div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl"><p class="text-[9px] text-slate-450 font-bold uppercase">Notas</p><p class="text-[10px] text-slate-650 italic mt-0.5">${c.notes}</p></div>` : ''}
      </div>
    `;

    // 2. Fetch all Client Loans
    const loansRes = await fetch(`${API_BASE}/loans/client/${id}`, { headers: getHeaders() });
    const loansList = await loansRes.json();

    // Render loans list sidebar
    if (loansList.length === 0) {
      financialDetails.innerHTML = `
        <div class="text-center py-12">
          <i data-lucide="alert-triangle" class="h-10 w-10 text-amber-500 mx-auto mb-3"></i>
          <p class="text-slate-500 font-medium">Este cliente no registra préstamos activos en el sistema</p>
          ${currentUser.role === 'ROLE_ADMIN' ? `
            <button onclick="navigateRegisterLoan('${c.id}')" class="mt-4 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-lg shadow-primary-600/10">Registrar Préstamo</button>
          ` : ''}
        </div>
      `;
      loansHistory.innerHTML = `<p class="text-center py-4 text-slate-400 text-xs">No hay préstamos.</p>`;
      paymentsHistory.innerHTML = `<p class="text-center py-4 text-slate-400 text-xs">No hay pagos.</p>`;
      lucide.createIcons();
      return;
    }

    // Load first loan metrics by default
    const activeOrLate = loansList.find(l => l.status === 'ACTIVO' || l.status === 'ATRASADO') || loansList[0];
    renderFinancialDetails(activeOrLate, loansList);

    loansHistory.innerHTML = loansList.map((l, idx) => `
      <div onclick="selectProfileLoan(${JSON.stringify(l).replace(/"/g, '&quot;')})" class="p-3 border rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-950 hover:border-slate-200 transition text-[11px]">
        <div class="flex justify-between items-center">
          <p class="font-bold text-slate-800 dark:text-slate-200">${formatCurrency(l.amount)} al ${l.interestRate}%</p>
          <span class="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold ${l.status === 'PAGADO' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}">${l.status}</span>
        </div>
        <p class="text-[9px] text-slate-450 mt-1">Tipo: ${l.loanType} | Inicio: ${l.startDate}</p>
      </div>
    `).join('');

    lucide.createIcons();
  } catch (error) {
    console.error(error);
  }
}

function navigateRegisterLoan(clientId) {
  switchTab('loans');
  document.getElementById('loan-client-id').value = clientId;
}

async function selectProfileLoan(loan) {
  // Fetch detailed loan to get the latest status
  try {
    const res = await fetch(`${API_BASE}/loans/${loan.id}`, { headers: getHeaders() });
    const fullLoan = await res.json();
    renderFinancialDetails(fullLoan);
  } catch (e) {
    console.error(e);
  }
}

async function renderFinancialDetails(loan) {
  const container = document.getElementById('profile-financial-details');
  const activePaid = loan.amountPaid - (loan.rolledOverPayments || 0.0);
  const pct = ((Math.max(0, activePaid) / loan.totalToPay) * 100).toFixed(0);

  container.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h4 class="font-bold text-slate-850 dark:text-white text-sm">Resumen del Préstamo</h4>
      <span class="inline-flex px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${loan.status === 'PAGADO' ? 'bg-emerald-50 text-emerald-700' : loan.status === 'ATRASADO' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}">
        ${loan.status}
      </span>
    </div>

    <div class="mb-6">
      <div class="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
        <span>Progreso del Pago</span>
        <span>${pct}%</span>
      </div>
      <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
        <div class="bg-emerald-500 h-full rounded-full transition-all" style="width: ${pct}%"></div>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
      <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl">
        <span class="text-[9px] text-slate-450 uppercase font-semibold">Capital Inicial</span>
        <p class="font-bold text-slate-750 dark:text-white mt-1">${formatCurrency(loan.amount)}</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl">
        <span class="text-[9px] text-slate-450 uppercase font-semibold">Tasa Aplicada</span>
        <p class="font-bold text-slate-750 dark:text-white mt-1">${loan.interestRate}%</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl">
        <span class="text-[9px] text-slate-450 uppercase font-semibold">Interés Generado</span>
        <p class="font-bold text-slate-750 dark:text-white mt-1">${formatCurrency(loan.interestValue)}</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl font-bold">
        <span class="text-[9px] text-slate-400 uppercase">Total a Pagar</span>
        <p class="mt-1">${formatCurrency(loan.totalToPay)}</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border-l-2 border-emerald-500">
        <span class="text-[9px] text-emerald-600 uppercase font-bold">Total Cobrado</span>
        <p class="font-bold mt-1 text-emerald-650">${formatCurrency(loan.amountPaid)}</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border-l-2 border-amber-500">
        <span class="text-[9px] text-amber-605 uppercase font-bold">Saldo Pendiente</span>
        <p class="font-bold mt-1 text-amber-650">${formatCurrency(loan.balanceOutstanding)}</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl">
        <span class="text-[9px] text-slate-450 uppercase font-semibold">Cuotas Cobradas</span>
        <p class="font-bold mt-1">${loan.installmentsPaid} de ${loan.installmentsCount}</p>
        <p class="text-[8px] text-slate-400 mt-0.5">Cuota: ${formatCurrency(loan.installmentValue)}</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl">
        <span class="text-[9px] text-slate-450 uppercase font-semibold">Cuotas Restantes</span>
        <p class="font-bold mt-1">${loan.installmentsRemaining}</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl ${loan.installmentsLate > 0 ? 'bg-red-50/50 border-l-2 border-red-500' : ''}">
        <span class="text-[9px] text-slate-450 uppercase font-semibold">Cuotas Vencidas</span>
        <p class="font-bold mt-1 ${loan.installmentsLate > 0 ? 'text-red-500' : ''}">${loan.installmentsLate}</p>
      </div>
    </div>

    ${loan.status !== 'PAGADO' ? `
      <div class="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 flex justify-end gap-3">
        ${currentUser.role === 'ROLE_ADMIN' ? `
          <button onclick="openEditLoanModal('${loan.id}')" class="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-xl text-xs">
            <i data-lucide="edit" class="h-4 w-4"></i> Editar Préstamo
          </button>
          <button onclick="openRenewLoanModal('${loan.id}')" class="inline-flex items-center gap-2 bg-emerald-650 hover:bg-emerald-600 dark:bg-emerald-900/60 dark:hover:bg-emerald-800/80 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md">
            <i data-lucide="plus-circle" class="h-4 w-4"></i> ➕ Aumentar Préstamo
          </button>
        ` : ''}
        <button onclick="navigateRegisterPayment('${loan.id}')" class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-lg">
          <i data-lucide="circle-dollar-sign" class="h-4 w-4"></i> Cobrar Cuota
        </button>
      </div>
    ` : ''}
  `;

  // Fetch payments for this loan
  try {
    const payRes = await fetch(`${API_BASE}/payments/loan/${loan.id}`, { headers: getHeaders() });
    const payments = await payRes.json();
    const paymentsHistory = document.getElementById('profile-payments-history');
    
    if (payments.length === 0) {
      paymentsHistory.innerHTML = `<p class="text-center py-4 text-slate-400 text-xs">No se registran pagos.</p>`;
      return;
    }

    paymentsHistory.innerHTML = payments.map(p => `
      <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 hover:border-slate-200 transition text-[11px]">
        <div>
          <p class="font-bold text-slate-850 dark:text-white">${formatCurrency(p.amount)}</p>
          <p class="text-[9px] text-slate-450 mt-0.5">${new Date(p.paymentDate).toLocaleString('es-CO')}</p>
        </div>
        <div class="text-right">
          <span class="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 text-[9px] font-bold">${p.paymentMethod}</span>
          <button onclick="viewPrintableReceipt('${p.id}')" class="flex items-center gap-1 text-[9px] text-primary-500 hover:underline mt-1 font-semibold">
            <i data-lucide="receipt" class="h-3 w-3"></i> Recibo
          </button>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  } catch (e) {
    console.error(e);
  }

  // Render renewals history
  const renewalsHistory = document.getElementById('profile-renewals-history');
  if (loan.renewals && loan.renewals.length > 0) {
    renewalsHistory.innerHTML = loan.renewals.map(r => `
      <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 hover:border-slate-200 transition text-[11px] space-y-1">
        <div class="flex justify-between items-center font-bold">
          <span class="text-slate-850 dark:text-white">Renovación Realizada</span>
          <span class="text-slate-450 text-[10px]">${new Date(r.renewalDate).toLocaleString('es-CO')}</span>
        </div>
        <div class="grid grid-cols-2 gap-1.5 text-[10px] mt-1">
          <div><span class="text-slate-450 font-medium">Saldo anterior:</span> <span class="font-semibold text-slate-700 dark:text-slate-300">${formatCurrency(r.previousOutstandingBalance)}</span></div>
          <div><span class="text-slate-450 font-medium">Dinero adicional:</span> <span class="font-semibold text-emerald-600">+${formatCurrency(r.additionalAmount)}</span></div>
          <div><span class="text-slate-450 font-medium">Nuevo capital:</span> <span class="font-semibold text-slate-700 dark:text-slate-300">${formatCurrency(r.newCapital)}</span></div>
          <div><span class="text-slate-450 font-medium">Nueva deuda:</span> <span class="font-semibold text-primary-600">${formatCurrency(r.newTotalToPay)}</span></div>
        </div>
        <div class="text-[9px] text-slate-450 mt-1 italic border-t border-slate-100 dark:border-slate-800 pt-1">
          Por: ${r.createdBy} ${r.notes ? `| Obs: ${r.notes}` : ''}
        </div>
      </div>
    `).join('');
  } else {
    renewalsHistory.innerHTML = `<p class="text-center py-4 text-slate-400 text-xs">No hay renovaciones registradas para este préstamo.</p>`;
  }
  lucide.createIcons();
}

function navigateRegisterPayment(loanId) {
  switchTab('payments');
  // Trigger selection directly
  const interval = setInterval(() => {
    const target = activeLoansList.find(l => l.id === loanId);
    if (target) {
      handleLoanSelection(target);
      clearInterval(interval);
    }
  }, 100);
}

// ----------------------------------------------------
// TAB: LOANS REGISTRY LOGIC
// ----------------------------------------------------
async function loadLoansTabDetails() {
  document.getElementById('loan-form').reset();
  document.getElementById('loan-start-date').value = getLocalDateString();
  document.getElementById('loan-error').classList.add('hidden');
  document.getElementById('loan-success').classList.add('hidden');
  toggleCustomInterest(false);

  // Load clients options
  const clientSelect = document.getElementById('loan-client-id');
  try {
    const res = await fetch(`${API_BASE}/clients`, { headers: getHeaders() });
    const list = await res.json();
    clientSelect.innerHTML = `<option value="">Seleccione cliente...</option>` + 
      list.filter(c => c.active).map(c => `<option value="${c.id}">${c.fullName} - ${c.dni}</option>`).join('');
  } catch (e) {
    console.error(e);
  }
  liveCalculateLoan();
}

function toggleCustomInterest(forceCustom = false) {
  const select = document.getElementById('loan-interest-rate');
  const customInput = document.getElementById('loan-interest-custom');
  
  if (select.value === 'CUSTOM' || forceCustom) {
    select.value = 'CUSTOM';
    customInput.classList.remove('hidden');
    customInput.required = true;
  } else {
    customInput.classList.add('hidden');
    customInput.required = false;
    customInput.value = '';
  }
}

function handleLoanTypeChange() {
  const type = document.getElementById('loan-type').value;
  const installments = document.getElementById('loan-installments');
  installments.value = type === 'SEMANAL' ? '8' : '30';
}

function liveCalculateLoan() {
  const amt = parseFloat(document.getElementById('loan-amount').value) || 0;
  const selectRate = document.getElementById('loan-interest-rate').value;
  const customRate = parseFloat(document.getElementById('loan-interest-custom').value) || 0;
  const rate = selectRate === 'CUSTOM' ? customRate : parseFloat(selectRate);
  const installments = parseInt(document.getElementById('loan-installments').value) || 1;
  const startDateStr = document.getElementById('loan-start-date').value;
  const type = document.getElementById('loan-type').value;

  if (selectRate === 'CUSTOM') {
    document.getElementById('loan-interest-custom').classList.remove('hidden');
  } else {
    document.getElementById('loan-interest-custom').classList.add('hidden');
  }

  const interestVal = amt * (rate / 100);
  const total = amt + interestVal;
  const installmentVal = total / installments;

  document.getElementById('live-calc-interest').innerText = formatCurrency(interestVal);
  document.getElementById('live-calc-total').innerText = formatCurrency(total);
  document.getElementById('live-calc-installment').innerText = formatCurrency(installmentVal);

  if (startDateStr) {
    const d = new Date(startDateStr + 'T12:00:00');
    if (type === 'SEMANAL') {
      d.setDate(d.getDate() + (installments * 7));
    } else if (type === 'QUINCENAL') {
      d.setDate(d.getDate() + (installments * 15));
    } else if (type === 'MENSUAL') {
      d.setMonth(d.getMonth() + installments);
    } else {
      d.setDate(d.getDate() + installments);
    }
    document.getElementById('live-calc-end-date').innerText = d.toISOString().split('T')[0];
  } else {
    document.getElementById('live-calc-end-date').innerText = 'N/A';
  }
}

async function handleLoanSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('loan-error');
  const successDiv = document.getElementById('loan-success');
  errorDiv.classList.add('hidden');
  successDiv.classList.add('hidden');

  const clientId = document.getElementById('loan-client-id').value;
  if (!clientId) {
    errorDiv.innerText = 'Seleccione un cliente.';
    errorDiv.classList.remove('hidden');
    return;
  }

  const selectRate = document.getElementById('loan-interest-rate').value;
  const customRate = parseFloat(document.getElementById('loan-interest-custom').value) || 0;
  const rate = selectRate === 'CUSTOM' ? customRate : parseFloat(selectRate);

  const payload = {
    clientId,
    amount: parseFloat(document.getElementById('loan-amount').value),
    loanType: document.getElementById('loan-type').value,
    interestRate: rate,
    installmentsCount: parseInt(document.getElementById('loan-installments').value),
    startDate: document.getElementById('loan-start-date').value
  };

  try {
    const res = await fetch(`${API_BASE}/loans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al guardar préstamo.');
    }

    successDiv.innerText = 'Préstamo creado con éxito.';
    successDiv.classList.remove('hidden');
    document.getElementById('loan-form').reset();
    document.getElementById('loan-start-date').value = getLocalDateString();
    liveCalculateLoan();
  } catch (error) {
    errorDiv.innerText = error.message;
    errorDiv.classList.remove('hidden');
  }
}

async function openEditLoanModal(loanId) {
  const errorDiv = document.getElementById('modal-edit-loan-error');
  errorDiv.classList.add('hidden');
  document.getElementById('modal-edit-loan-form').reset();

  try {
    const res = await fetch(`${API_BASE}/loans/${loanId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al cargar préstamo');
    const loan = await res.json();

    const clientRes = await fetch(`${API_BASE}/clients/${loan.clientId}`, { headers: getHeaders() });
    const client = await clientRes.json();

    document.getElementById('modal-edit-loan-id-field').value = loan.id;
    document.getElementById('modal-edit-loan-client-id').value = loan.clientId;
    document.getElementById('edit-loan-client-name').value = `${client.fullName} - ${client.dni}`;
    document.getElementById('edit-loan-amount').value = loan.amount;
    document.getElementById('edit-loan-type').value = loan.loanType || 'DIARIO';
    document.getElementById('edit-loan-installments').value = loan.installmentsCount;
    document.getElementById('edit-loan-start-date').value = loan.startDate;

    const rate = loan.interestRate;
    const rateSelect = document.getElementById('edit-loan-interest-rate');
    const customInput = document.getElementById('edit-loan-interest-custom');
    
    if (rate === 10 || rate === 15 || rate === 20) {
      rateSelect.value = rate.toString();
      customInput.classList.add('hidden');
      customInput.required = false;
    } else {
      rateSelect.value = 'CUSTOM';
      customInput.classList.remove('hidden');
      customInput.required = true;
      customInput.value = rate;
    }

    liveCalculateEditLoan();
    document.getElementById('modal-edit-loan').classList.remove('hidden');
    lucide.createIcons();
  } catch (e) {
    alert(e.message);
  }
}

function closeEditLoanModal() {
  document.getElementById('modal-edit-loan').classList.add('hidden');
}

function toggleEditCustomInterest() {
  const select = document.getElementById('edit-loan-interest-rate');
  const customInput = document.getElementById('edit-loan-interest-custom');
  
  if (select.value === 'CUSTOM') {
    customInput.classList.remove('hidden');
    customInput.required = true;
  } else {
    customInput.classList.add('hidden');
    customInput.required = false;
    customInput.value = '';
  }
}

function liveCalculateEditLoan() {
  const amt = parseFloat(document.getElementById('edit-loan-amount').value) || 0;
  const selectRate = document.getElementById('edit-loan-interest-rate').value;
  const customRate = parseFloat(document.getElementById('edit-loan-interest-custom').value) || 0;
  const rate = selectRate === 'CUSTOM' ? customRate : parseFloat(selectRate);
  const installments = parseInt(document.getElementById('edit-loan-installments').value) || 1;
  const startDateStr = document.getElementById('edit-loan-start-date').value;
  const type = document.getElementById('edit-loan-type').value;

  const interestVal = amt * (rate / 100);
  const total = amt + interestVal;
  const installmentVal = total / installments;

  document.getElementById('edit-live-calc-interest').innerText = formatCurrency(interestVal);
  document.getElementById('edit-live-calc-total').innerText = formatCurrency(total);
  document.getElementById('edit-live-calc-installment').innerText = formatCurrency(installmentVal);

  if (startDateStr) {
    const d = new Date(startDateStr + 'T12:00:00');
    if (type === 'SEMANAL') {
      d.setDate(d.getDate() + (installments * 7));
    } else if (type === 'QUINCENAL') {
      d.setDate(d.getDate() + (installments * 15));
    } else if (type === 'MENSUAL') {
      d.setMonth(d.getMonth() + installments);
    } else {
      d.setDate(d.getDate() + installments);
    }
    document.getElementById('edit-live-calc-end-date').innerText = d.toISOString().split('T')[0];
  } else {
    document.getElementById('edit-live-calc-end-date').innerText = 'N/A';
  }
}

async function handleEditLoanSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('modal-edit-loan-error');
  errorDiv.classList.add('hidden');

  const id = document.getElementById('modal-edit-loan-id-field').value;
  const selectRate = document.getElementById('edit-loan-interest-rate').value;
  const customRate = parseFloat(document.getElementById('edit-loan-interest-custom').value) || 0;
  const rate = selectRate === 'CUSTOM' ? customRate : parseFloat(selectRate);

  const payload = {
    clientId: document.getElementById('modal-edit-loan-client-id').value,
    amount: parseFloat(document.getElementById('edit-loan-amount').value),
    loanType: document.getElementById('edit-loan-type').value,
    interestRate: rate,
    installmentsCount: parseInt(document.getElementById('edit-loan-installments').value),
    startDate: document.getElementById('edit-loan-start-date').value
  };

  try {
    const res = await fetch(`${API_BASE}/loans/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al actualizar préstamo.');
    }

    closeEditLoanModal();
    if (currentTab === 'client-profile') {
      const clientId = payload.clientId;
      viewClientProfile(clientId);
    } else if (currentTab === 'payments') {
      await loadPaymentsTabDetails();
      selectPaymentLoanById(id);
    } else {
      alert('Préstamo actualizado con éxito.');
    }
  } catch (error) {
    errorDiv.innerText = error.message;
    errorDiv.classList.remove('hidden');
  }
}

// ----------------------------------------------------
// TAB: PAYMENTS LOGIC
// -----------------------------------// ----------------------------------------------------
// TAB: PAYMENTS LOGIC
// ----------------------------------------------------
let selectedPaymentFrequency = 'DIARIO';
let paymentsClientsMap = {};
let paymentsTodayList = [];
let paymentsTodayIds = new Set();
let paymentsAllLoans = [];
let paymentSearchQuery = '';

async function loadPaymentsTabDetails() {
  if (document.getElementById('payment-real-form-wrapper')) {
    document.getElementById('payment-real-form-wrapper').classList.add('hidden');
  }
  document.getElementById('payment-form-placeholder').classList.remove('hidden');
  document.getElementById('payment-receipt-view').classList.add('hidden');
  document.getElementById('payment-form-area').classList.remove('hidden');
  selectedPaymentLoan = null;
  paymentSearchQuery = '';
  document.getElementById('payment-search-input').value = '';

  const listContainer = document.getElementById('payment-active-loans-list');
  listContainer.innerHTML = `<div class="flex items-center justify-center p-6"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div></div>`;

  try {
    const [loansRes, clientsRes, paymentsRes] = await Promise.all([
      fetch(`${API_BASE}/loans`, { headers: getHeaders() }),
      fetch(`${API_BASE}/clients`, { headers: getHeaders() }),
      fetch(`${API_BASE}/payments`, { headers: getHeaders() })
    ]);

    const loans = await loansRes.json();
    const clients = await clientsRes.json();
    const payments = await paymentsRes.json();

    // Map clients
    paymentsClientsMap = {};
    clients.forEach(c => {
      paymentsClientsMap[c.id] = c;
    });

    // Process today's payments
    const todayStr = getLocalDateString();
    paymentsTodayList = payments.filter(p => p.paymentDate && p.paymentDate.startsWith(todayStr));
    paymentsTodayIds = new Set(paymentsTodayList.map(p => p.loanId));

    // Active loans list
    paymentsAllLoans = loans.filter(l => l.status === 'ACTIVO' || l.status === 'ATRASADO');

    // Calculate next payment date & diff days for sorting and coloring
    paymentsAllLoans.forEach(l => {
      const nextDate = getNextPaymentDate(l);
      l._nextPaymentDate = nextDate;
      l._diffDays = getDaysRemaining(nextDate);
      l._paidToday = paymentsTodayIds.has(l.id);
    });

    // Update tab counters
    updatePaymentsTabCounters();

    // Render list
    renderPaymentsActiveLoans();

  } catch (e) {
    console.error(e);
    listContainer.innerHTML = `<p class="text-xs text-red-500 py-6 text-center">Error al cargar datos de cobros.</p>`;
  }
}

function getNextPaymentDate(loan) {
  if (loan.status === 'PAGADO') return null;
  const nextInstallmentIndex = loan.installmentsPaid + 1;
  const start = new Date(loan.startDate + 'T12:00:00');
  
  if (loan.loanType === 'SEMANAL') {
    start.setDate(start.getDate() + (nextInstallmentIndex * 7));
  } else if (loan.loanType === 'QUINCENAL') {
    start.setDate(start.getDate() + (nextInstallmentIndex * 15));
  } else if (loan.loanType === 'MENSUAL') {
    start.setMonth(start.getMonth() + nextInstallmentIndex);
  } else {
    // DIARIO
    start.setDate(start.getDate() + nextInstallmentIndex);
  }
  return start;
}

function getDaysRemaining(nextPaymentDate) {
  if (!nextPaymentDate) return 0;
  const today = new Date();
  today.setHours(0,0,0,0);
  const next = new Date(nextPaymentDate);
  next.setHours(0,0,0,0);
  
  const diffTime = next - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function updatePaymentsTabCounters() {
  const counts = { DIARIO: 0, SEMANAL: 0, QUINCENAL: 0, MENSUAL: 0 };
  paymentsAllLoans.forEach(l => {
    const type = l.loanType || 'DIARIO';
    if (counts[type] !== undefined) {
      counts[type]++;
    }
  });

  document.getElementById('tab-count-diarios').innerText = counts.DIARIO;
  document.getElementById('tab-count-semanales').innerText = counts.SEMANAL;
  document.getElementById('tab-count-quincenales').innerText = counts.QUINCENAL;
  document.getElementById('tab-count-mensuales').innerText = counts.MENSUAL;

  // Highlight active tab
  const freqs = ['DIARIO', 'SEMANAL', 'QUINCENAL', 'MENSUAL'];
  freqs.forEach(f => {
    const btn = document.getElementById(`tab-freq-${f.toLowerCase()}`);
    if (btn) {
      if (f === selectedPaymentFrequency) {
        btn.className = "flex items-center gap-3 p-4 bg-primary-50/50 dark:bg-primary-950/20 border-2 border-primary-500 rounded-2xl shadow-sm transition-all text-left w-full";
      } else {
        btn.className = "flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm transition-all text-left w-full";
      }
    }
  });
}

function setPaymentsFrequency(freq) {
  selectedPaymentFrequency = freq;
  updatePaymentsTabCounters();
  renderPaymentsActiveLoans();
}

function renderPaymentsActiveLoans() {
  const listContainer = document.getElementById('payment-active-loans-list');
  listContainer.innerHTML = '';

  // Filter by frequency tab
  let filtered = paymentsAllLoans.filter(l => (l.loanType || 'DIARIO') === selectedPaymentFrequency);

  // Filter by search query if any
  if (paymentSearchQuery.trim() !== '') {
    const q = paymentSearchQuery.toLowerCase();
    filtered = filtered.filter(l => {
      const client = paymentsClientsMap[l.clientId] || {};
      const clientName = (client.fullName || '').toLowerCase();
      const clientDni = (client.dni || '').toLowerCase();
      const clientPhone = (client.phone || '').toLowerCase();
      const loanId = (l.id || '').toLowerCase();
      return clientName.includes(q) || clientDni.includes(q) || clientPhone.includes(q) || loanId.includes(q);
    });
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `<p class="text-xs text-slate-400 py-6 text-center">No hay préstamos para esta categoría.</p>`;
    return;
  }

  // Automatic Priority Sort:
  // 1. Paid today at the very bottom (already collected)
  // 2. Late/overdue (diffDays < 0 or installmentsLate > 0)
  // 3. Due today (diffDays === 0)
  // 4. Due tomorrow (diffDays === 1)
  // 5. Rest of them
  filtered.sort((a, b) => {
    if (a._paidToday !== b._paidToday) {
      return a._paidToday ? 1 : -1;
    }
    const priorityA = getSortPriority(a);
    const priorityB = getSortPriority(b);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Secondary sort: alphabetical by client name
    const nameA = (paymentsClientsMap[a.clientId]?.fullName || '').toLowerCase();
    const nameB = (paymentsClientsMap[b.clientId]?.fullName || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  listContainer.innerHTML = filtered.map(l => {
    const client = paymentsClientsMap[l.clientId] || { fullName: 'Cliente Desconocido' };
    
    // Card styles based on state
    let borderStyle = 'border-slate-100 dark:border-slate-800';
    let statusBg = 'bg-slate-100 text-slate-700';
    let statusText = 'Pendiente';
    
    if (l._paidToday) {
      borderStyle = 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10';
      statusBg = 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-355 font-bold';
      statusText = '💰 Pagado hoy';
    } else if (l.installmentsLate > 0 || l._diffDays < 0) {
      borderStyle = 'border-red-500 dark:border-red-800 bg-red-50/10 dark:bg-red-955/5';
      statusBg = 'bg-red-650 text-white font-bold';
      statusText = `⚠ Atrasado (${Math.abs(l._diffDays)}d)`;
    } else if (l._diffDays === 0) {
      borderStyle = 'border-red-400 dark:border-red-805 bg-red-50/5 dark:bg-red-950/5';
      statusBg = 'bg-red-100 dark:bg-red-950 text-red-650 dark:text-red-450 font-bold';
      statusText = '🔴 Cobrar hoy';
    } else if (l._diffDays === 1) {
      borderStyle = 'border-amber-400 dark:border-amber-805 bg-amber-50/5';
      statusBg = 'bg-amber-100 dark:bg-amber-950 text-amber-650 dark:text-amber-450 font-bold';
      statusText = '🟡 Cobro mañana';
    } else {
      borderStyle = 'border-green-300 dark:border-green-800/40 bg-green-50/5';
      statusBg = 'bg-green-100 dark:bg-green-950 text-green-650 dark:text-green-450 font-bold';
      statusText = '🟢 Al día';
    }

    const nextPaymentStr = l._nextPaymentDate ? l._nextPaymentDate.toISOString().split('T')[0] : 'N/A';
    const isSelected = selectedPaymentLoan && selectedPaymentLoan.id === l.id;
    const selectionHighlight = isSelected ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900' : '';

    return `
      <div onclick="selectPaymentLoanById('${l.id}')" id="pay-loan-row-${l.id}" class="p-3 border rounded-2xl cursor-pointer bg-white dark:bg-slate-900 ${borderStyle} ${selectionHighlight} transition hover:shadow-md text-[11px] space-y-2">
        <div class="flex items-center gap-2">
          ${client.photoBase64 ? `<img src="${client.photoBase64}" class="h-6 w-6 rounded-full object-cover">` : `<div class="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-[9px]">${client.fullName.charAt(0).toUpperCase()}</div>`}
          <p class="font-bold text-slate-800 dark:text-white truncate flex-1">${client.fullName}</p>
          <span class="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${statusBg}">${statusText}</span>
        </div>
        <div class="flex justify-between items-center text-[10px]">
          <div>
            <p class="text-slate-400 text-[9px]">Cuota</p>
            <p class="font-bold text-slate-700 dark:text-slate-300">${formatCurrency(l.installmentValue)}</p>
          </div>
          <div class="text-right">
            <p class="text-slate-400 text-[9px]">Saldo restante</p>
            <p class="font-bold text-slate-700 dark:text-slate-300">${formatCurrency(l.balanceOutstanding)}</p>
          </div>
        </div>
        <div class="flex justify-between items-center text-[8px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-1.5">
          <span>Próx: ${nextPaymentStr}</span>
          <span>ID: ${l.id.substring(0, 8)}...</span>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function getSortPriority(loan) {
  if (loan.installmentsLate > 0 || loan._diffDays < 0) return 1; // Late/Overdue
  if (loan._diffDays === 0) return 2; // Due today
  if (loan._diffDays === 1) return 3; // Due tomorrow
  return 4; // Rest
}

function searchPaymentLoans(e) {
  paymentSearchQuery = e.target.value;
  renderPaymentsActiveLoans();
}

async function selectPaymentLoanById(loanId) {
  const loan = paymentsAllLoans.find(l => l.id === loanId);
  if (loan) handleLoanSelection(loan);
}

async function handleLoanSelection(loan) {
  selectedPaymentLoan = loan;

  // Render cards again to apply highlight outline
  renderPaymentsActiveLoans();

  // Show detailed panel wrapper
  document.getElementById('payment-form-placeholder').classList.add('hidden');
  document.getElementById('payment-real-form-wrapper').classList.remove('hidden');
  document.getElementById('payment-receipt-view').classList.add('hidden');
  document.getElementById('payment-form-area').classList.remove('hidden');
  
  document.getElementById('payment-amount').value = loan.installmentValue.toFixed(0);
  document.getElementById('payment-notes').value = '';
  document.getElementById('payment-error').classList.add('hidden');

  // Fill details
  const client = paymentsClientsMap[loan.clientId] || { fullName: 'Cliente Desconocido', dni: '', phone: '', address: '' };

  // Photo
  const photoContainer = document.getElementById('payment-client-photo-container');
  if (client.photoBase64) {
    photoContainer.innerHTML = `<img src="${client.photoBase64}" class="h-full w-full object-cover">`;
  } else {
    photoContainer.innerHTML = `<div class="h-full w-full rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-lg">${client.fullName.charAt(0).toUpperCase()}</div>`;
  }

  document.getElementById('payment-client-name').innerText = client.fullName;
  document.getElementById('payment-client-dni').innerText = client.dni;
  document.getElementById('payment-client-phone').innerText = client.phone;
  document.getElementById('payment-client-address').innerText = client.address || 'N/A';

  // Status Badge
  const statusBadge = document.getElementById('payment-loan-status-badge');
  statusBadge.innerText = loan.status;
  if (loan.status === 'ATRASADO') {
    statusBadge.className = "inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  } else {
    statusBadge.className = "inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300";
  }

  document.getElementById('payment-loan-id-full').innerText = loan.id;

  // Financial values
  document.getElementById('payment-loan-amount').innerText = formatCurrency(loan.amount);
  document.getElementById('payment-loan-total').innerText = formatCurrency(loan.totalToPay);
  document.getElementById('payment-loan-balance').innerText = formatCurrency(loan.balanceOutstanding);
  document.getElementById('payment-loan-installments-text').innerText = `${loan.installmentsPaid} de ${loan.installmentsCount} pagadas`;

  // Details lines
  document.getElementById('payment-loan-type-text').innerText = loan.loanType || 'DIARIO';
  document.getElementById('payment-loan-start-date').innerText = loan.startDate;
  document.getElementById('payment-loan-end-date').innerText = loan.endDateEstimated || 'N/A';

  const nextPaymentStr = loan._nextPaymentDate ? loan._nextPaymentDate.toISOString().split('T')[0] : 'N/A';
  document.getElementById('payment-loan-next-date').innerText = nextPaymentStr;
  
  const daysText = loan._diffDays < 0 ? `${Math.abs(loan._diffDays)} días de retraso` : `${loan._diffDays} días restantes`;
  document.getElementById('payment-loan-days-remaining').innerText = daysText;
  document.getElementById('payment-loan-late-count').innerText = loan.installmentsLate;

  // Status Warning/Banner today
  const banner = document.getElementById('payment-today-status-banner');
  const printBtn = document.getElementById('quick-action-print-btn');

  if (loan._paidToday) {
    banner.className = "p-4 rounded-2xl flex items-center justify-between font-bold text-xs bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 text-emerald-700 dark:text-emerald-450";
    banner.innerHTML = `<span>💰 Pago registrado hoy con éxito</span><span>${formatCurrency(loan.installmentValue)}</span>`;
    
    // Enable print button
    printBtn.disabled = false;
    printBtn.className = "flex items-center justify-center gap-1.5 p-3 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-extrabold text-slate-650 dark:text-slate-300";
  } else if (loan.installmentsLate > 0 || loan._diffDays < 0) {
    banner.className = "p-4 rounded-2xl flex items-center justify-between font-bold text-xs bg-red-100 dark:bg-red-950 border border-red-250 text-red-700 dark:text-red-400";
    banner.innerHTML = `<span>⚠️ Cobro vencido pendiente</span><span>${formatCurrency(loan.installmentValue)}</span>`;
    
    printBtn.disabled = true;
    printBtn.className = "flex items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 dark:border-slate-850 rounded-2xl text-[10px] font-extrabold text-slate-650 dark:text-slate-300 opacity-50 cursor-not-allowed";
  } else if (loan._diffDays === 0) {
    banner.className = "p-4 rounded-2xl flex items-center justify-between font-bold text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-650 dark:text-red-450";
    banner.innerHTML = `<span>🔴 Cobro pendiente hoy</span><span>${formatCurrency(loan.installmentValue)}</span>`;
    
    printBtn.disabled = true;
    printBtn.className = "flex items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 dark:border-slate-850 rounded-2xl text-[10px] font-extrabold text-slate-650 dark:text-slate-300 opacity-50 cursor-not-allowed";
  } else if (loan._diffDays === 1) {
    banner.className = "p-4 rounded-2xl flex items-center justify-between font-bold text-xs bg-amber-50 dark:bg-amber-950/10 border border-amber-200 text-amber-650 dark:text-amber-450";
    banner.innerHTML = `<span>🟡 Cobro programado para mañana</span><span>${formatCurrency(loan.installmentValue)}</span>`;
    
    printBtn.disabled = true;
    printBtn.className = "flex items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 dark:border-slate-850 rounded-2xl text-[10px] font-extrabold text-slate-650 dark:text-slate-300 opacity-50 cursor-not-allowed";
  } else {
    banner.className = "p-4 rounded-2xl flex items-center justify-between font-bold text-xs bg-green-50 dark:bg-green-950/10 border border-green-200 text-green-650 dark:text-green-450";
    banner.innerHTML = `<span>🟢 Al día (Próximo cobro en ${loan._diffDays} días)</span><span>Hoy no corresponde cobro</span>`;
    
    printBtn.disabled = true;
    printBtn.className = "flex items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 dark:border-slate-850 rounded-2xl text-[10px] font-extrabold text-slate-650 dark:text-slate-300 opacity-50 cursor-not-allowed";
  }

  lucide.createIcons();
}

function presetPayment(type) {
  if (!selectedPaymentLoan) return;
  const input = document.getElementById('payment-amount');
  if (type === 'suggested') {
    input.value = selectedPaymentLoan.installmentValue.toFixed(0);
  } else if (type === 'double') {
    input.value = (selectedPaymentLoan.installmentValue * 2).toFixed(0);
  } else if (type === 'total') {
    input.value = selectedPaymentLoan.balanceOutstanding.toFixed(0);
  }
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('payment-error');
  errorDiv.classList.add('hidden');

  const payload = {
    loanId: selectedPaymentLoan.id,
    amount: parseFloat(document.getElementById('payment-amount').value),
    paymentMethod: document.getElementById('payment-method').value,
    notes: document.getElementById('payment-notes').value
  };

  try {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al registrar pago.');
    }

    const pay = await res.json();
    await viewPrintableReceipt(pay.id);
  } catch (error) {
    errorDiv.innerText = error.message;
    errorDiv.classList.remove('hidden');
  }
}

// Quick Actions
function quickActionViewHistory() {
  if (!selectedPaymentLoan) return;
  // Redirect to clients tab, select client, switch tabs
  localStorage.setItem('selectedClientId', selectedPaymentLoan.clientId);
  switchTab('clients');
  // Trigger loading details
  setTimeout(() => {
    viewClientProfile(selectedPaymentLoan.clientId);
  }, 100);
}

function quickActionViewContract() {
  if (!selectedPaymentLoan) return;
  const client = paymentsClientsMap[selectedPaymentLoan.clientId] || {};

  document.getElementById('contract-client-name').innerText = client.fullName || '';
  document.getElementById('contract-client-dni').innerText = client.dni || '';
  document.getElementById('contract-amount').innerText = formatCurrency(selectedPaymentLoan.amount);
  document.getElementById('contract-interest-rate').innerText = selectedPaymentLoan.interestRate;
  document.getElementById('contract-total-to-pay').innerText = formatCurrency(selectedPaymentLoan.totalToPay);
  document.getElementById('contract-installments').innerText = selectedPaymentLoan.installmentsCount;
  document.getElementById('contract-loan-type').innerText = selectedPaymentLoan.loanType || 'DIARIO';
  document.getElementById('contract-installment-value').innerText = formatCurrency(selectedPaymentLoan.installmentValue);
  document.getElementById('contract-start-date').innerText = selectedPaymentLoan.startDate;
  document.getElementById('contract-end-date').innerText = selectedPaymentLoan.endDateEstimated || 'N/A';

  document.getElementById('contract-client-sign-name').innerText = `Firma: ${client.fullName || ''}`;
  document.getElementById('contract-client-sign-dni').innerText = `C.C. ${client.dni || ''}`;

  document.getElementById('modal-view-contract').classList.remove('hidden');
}

function closeContractModal() {
  document.getElementById('modal-view-contract').classList.add('hidden');
}

function quickActionSendWhatsApp() {
  if (!selectedPaymentLoan) return;
  const client = paymentsClientsMap[selectedPaymentLoan.clientId] || {};
  if (!client.phone) {
    alert('El cliente no tiene número de celular registrado.');
    return;
  }

  const message = `Hola ${client.fullName},\nte saludamos de INVERSIONES HOMERO.\n\nTe recordamos que tu cuota de tipo *${selectedPaymentLoan.loanType}* es de *${formatCurrency(selectedPaymentLoan.installmentValue)}*.\nTu saldo pendiente es de *${formatCurrency(selectedPaymentLoan.balanceOutstanding)}*.\n\nQuedamos atentos. ¡Gracias!`;
  const encoded = encodeURIComponent(message);
  
  // Format phone number, clean any non-digit
  let cleanedPhone = client.phone.replace(/\D/g, '');
  if (!cleanedPhone.startsWith('57') && cleanedPhone.length === 10) {
    cleanedPhone = '57' + cleanedPhone; // Colombia country code default
  }
  
  window.open(`https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encoded}`, '_blank');
}

async function quickActionPrintLastReceipt() {
  if (!selectedPaymentLoan || !selectedPaymentLoan.id) return;
  // Find if there is a payment recorded today for this loan
  const paymentToday = paymentsTodayList.find(p => p.loanId === selectedPaymentLoan.id);
  if (paymentToday) {
    await viewPrintableReceipt(paymentToday.id);
  } else {
    alert('No se encontró ningún pago registrado hoy para imprimir.');
  }
}

async function viewPrintableReceipt(paymentId) {
  document.getElementById('payment-form-area').classList.add('hidden');
  const view = document.getElementById('payment-receipt-view');
  view.classList.remove('hidden');
  view.innerHTML = `<div class="flex items-center justify-center p-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>`;

  try {
    const payRes = await fetch(`${API_BASE}/payments/${paymentId}`, { headers: getHeaders() });
    const p = await payRes.json();

    const loanRes = await fetch(`${API_BASE}/loans/${p.loanId}`, { headers: getHeaders() });
    const l = await loanRes.json();

    const clientRes = await fetch(`${API_BASE}/clients/${l.clientId}`, { headers: getHeaders() });
    const c = await clientRes.json();

    view.innerHTML = `
      <div class="flex justify-between items-center gap-3 no-print">
        <button onclick="loadPaymentsTabDetails()" class="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white">
          <i data-lucide="undo-2" class="h-4 w-4"></i> Registrar Otro Pago
        </button>
        <div class="flex gap-2">
          <button onclick="window.print()" class="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-3 rounded-xl text-xs shadow-lg">
            <i data-lucide="printer" class="h-3.5 w-3.5"></i> Imprimir
          </button>
          <button onclick="downloadReceiptTxt('${p.id}', '${c.fullName}', '${c.dni}', '${l.amount}', '${l.interestRate}', '${l.totalToPay}', '${p.paymentMethod}', '${p.amount}', '${l.balanceOutstanding}', '${l.installmentsPaid}', '${l.installmentsCount}', '${l.installmentsRemaining}', '${l.installmentsLate}')" class="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 font-bold py-2 px-3 rounded-xl text-xs">
            <i data-lucide="download" class="h-3.5 w-3.5"></i> Guardar TXT
          </button>
        </div>
      </div>

      <div class="bg-white text-slate-900 p-6 rounded-3xl border border-slate-200 shadow-md font-mono text-xs print-card">
        <div class="text-center space-y-1.5 border-b border-dashed border-slate-300 pb-4 mb-4">
          ${companyConfig?.logoBase64 ? `<img src="${companyConfig.logoBase64}" class="h-10 mx-auto object-contain mb-1.5 rounded">` : ''}
          <h3 class="font-extrabold text-sm uppercase tracking-wide">${companyConfig?.companyName || 'COBRO DIARIO SAS'}</h3>
          <p class="text-[10px] text-slate-500">NIT: ${companyConfig?.nit || '900.123.456-7'}</p>
          <p class="text-[10px] text-slate-500">Tlf: ${companyConfig?.phone || ''}</p>
          <p class="text-[10px] text-slate-500 truncate">${companyConfig?.address || ''}</p>
        </div>

        <div class="space-y-1 mb-4 text-[10px] border-b border-dashed border-slate-300 pb-4">
          <div class="flex justify-between"><span>Nro. Recibo:</span><span class="font-bold">${p.id}</span></div>
          <div class="flex justify-between"><span>Fecha / Hora:</span><span>${new Date(p.paymentDate).toLocaleString('es-CO')}</span></div>
          <div class="flex justify-between"><span>Cliente:</span><span class="font-bold uppercase">${c.fullName}</span></div>
          <div class="flex justify-between"><span>Cédula:</span><span>${c.dni}</span></div>
        </div>

        <div class="space-y-1 mb-4 text-[10px] border-b border-dashed border-slate-300 pb-4">
          <div class="flex justify-between"><span>Capital Prestado:</span><span>${formatCurrency(l.amount)}</span></div>
          <div class="flex justify-between"><span>Interés Aplicado:</span><span>${l.interestRate}%</span></div>
          <div class="flex justify-between"><span>Total a Pagar:</span><span>${formatCurrency(l.totalToPay)}</span></div>
        </div>

        <div class="space-y-1.5 mb-4 border-b border-dashed border-slate-300 pb-4">
          <div class="flex justify-between text-slate-500 text-[10px]"><span>Método de Pago:</span><span class="uppercase font-bold">${p.paymentMethod}</span></div>
          <div class="flex justify-between text-sm font-extrabold"><span>Valor Cobrado:</span><span class="text-emerald-600">${formatCurrency(p.amount)}</span></div>
          <div class="flex justify-between text-slate-800 font-bold"><span>Saldo Pendiente:</span><span>${formatCurrency(l.balanceOutstanding)}</span></div>
        </div>

        <div class="space-y-1 text-[10px] text-slate-650">
          <div class="flex justify-between"><span>Cuotas Pagadas:</span><span class="font-bold">${l.installmentsPaid} de ${l.installmentsCount}</span></div>
          <div class="flex justify-between"><span>Cuotas Pendientes:</span><span>${l.installmentsRemaining}</span></div>
          <div class="flex justify-between"><span>Cuotas Atrasadas:</span><span class="${l.installmentsLate > 0 ? 'text-red-500 font-bold' : ''}">${l.installmentsLate}</span></div>
        </div>

        <div class="text-center space-y-1 mt-6 border-t border-dashed border-slate-300 pt-4">
          <p class="text-[10px] text-slate-500">Cobrado por: ${currentUser.fullName}</p>
          <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2">*** Gracias por su Pago ***</p>
        </div>
      </div>
    `;
    lucide.createIcons();
  } catch (error) {
    view.innerHTML = `<p class="p-6 text-red-500">Error al cargar recibo.</p>`;
  }
}

function downloadReceiptTxt(id, client, dni, initial, rate, total, method, received, balance, paidCuotas, totalCuotas, pendingCuotas, lateCuotas) {
  const text = `
${companyConfig?.companyName || 'COBRO DIARIO'}
NIT: ${companyConfig?.nit || ''}
-----------------------------
RECIBO DE PAGO: ${id}
Cliente: ${client}
C.C: ${dni}
-----------------------------
Capital: ${formatCurrency(parseFloat(initial))}
Interes: ${rate}%
Total: ${formatCurrency(parseFloat(total))}
-----------------------------
Metodo: ${method}
Recibido: ${formatCurrency(parseFloat(received))}
Saldo: ${formatCurrency(parseFloat(balance))}
-----------------------------
Cuotas: ${paidCuotas} de ${totalCuotas}
Pendientes: ${pendingCuotas}
Atrasadas: ${lateCuotas}
-----------------------------
Cobrado por: ${currentUser.fullName}
`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `recibo_${id}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ----------------------------------------------------
// TAB: REPORTS LOGIC
// ----------------------------------------------------
let activeReportType = 'PAYMENTS'; // PAYMENTS, LOANS, EXPENSES, CLOSINGS, CLIENTS

function setReportType(type) {
  activeReportType = type;
  
  // Style report selection buttons
  const types = ['payments', 'loans', 'expenses', 'closings', 'clients'];
  types.forEach(t => {
    const btn = document.getElementById(`btn-report-${t}`);
    if (btn) {
      if (t.toUpperCase() === type) {
        btn.className = 'flex-1 sm:flex-initial py-2 px-3 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm';
      } else {
        btn.className = 'flex-1 sm:flex-initial py-2 px-3 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white';
      }
    }
  });

  loadReportsTabDetails();
}

function handleReportPeriodChange() {
  const period = document.getElementById('report-period').value;
  const startInput = document.getElementById('report-start');
  const endInput = document.getElementById('report-end');
  if (!period) return;

  const today = new Date();
  let start = new Date();
  let end = new Date();

  if (period === 'HOY') {
    start = today;
    end = today;
  } else if (period === 'SEMANA') {
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(today.setDate(diff));
    end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  } else if (period === 'QUINCENA') {
    const dayOfMonth = today.getDate();
    if (dayOfMonth <= 15) {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth(), 15);
    } else {
      start = new Date(today.getFullYear(), today.getMonth(), 16);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
  } else if (period === 'MES') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (period === 'ANIO') {
    start = new Date(today.getFullYear(), 0, 1);
    end = new Date(today.getFullYear(), 11, 31);
  }

  const formatDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  if (period !== 'CUSTOM') {
    startInput.value = formatDate(start);
    endInput.value = formatDate(end);
  }
  fetchReportData();
}

async function loadReportsTabDetails() {
  const grid = document.getElementById('report-filters-grid');
  const table = document.getElementById('reports-table-container');
  table.innerHTML = '';

  let employeeOptions = '';
  if (currentUser.role === 'ROLE_ADMIN') {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
      const list = await res.json();
      employeeOptions = list.filter(u => u.role === 'ROLE_EMPLOYEE').map(u => `<option value="${u.id}">${u.fullName}</option>`).join('');
    } catch (e) {
      console.error(e);
    }
  }

  // Common Date Filter layout
  const dateFiltersHtml = `
    <div>
      <label class="block text-[10px] font-semibold text-slate-500 mb-1">Periodo</label>
      <select id="report-period" onchange="handleReportPeriodChange()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
        <option value="CUSTOM">Rango de fechas</option>
        <option value="HOY">Hoy</option>
        <option value="SEMANA">Esta Semana</option>
        <option value="QUINCENA">Esta Quincena</option>
        <option value="MES">Este Mes</option>
        <option value="ANIO">Este Año</option>
      </select>
    </div>
    <div>
      <label class="block text-[10px] font-semibold text-slate-500 mb-1">Fecha Inicio</label>
      <input type="date" id="report-start" onchange="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
    </div>
    <div>
      <label class="block text-[10px] font-semibold text-slate-500 mb-1">Fecha Fin</label>
      <input type="date" id="report-end" onchange="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
    </div>
  `;

  if (activeReportType === 'PAYMENTS') {
    grid.innerHTML = `
      ${dateFiltersHtml}
      <div>
        <label class="block text-[10px] font-semibold text-slate-500 mb-1">Método de Pago</label>
        <select id="report-method" onchange="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
          <option value="">Todos</option>
          <option value="EFECTIVO">Efectivo</option>
          <option value="NEQUI">Nequi</option>
        </select>
      </div>
      ${currentUser.role === 'ROLE_ADMIN' ? `
        <div>
          <label class="block text-[10px] font-semibold text-slate-500 mb-1">Cobrador</label>
          <select id="report-employee" onchange="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
            <option value="">Todos</option>
            ${employeeOptions}
          </select>
        </div>
      ` : ''}
    `;
  } else if (activeReportType === 'EXPENSES') {
    grid.innerHTML = `
      ${dateFiltersHtml}
      <div>
        <label class="block text-[10px] font-semibold text-slate-500 mb-1">Categoría</label>
        <select id="report-category" onchange="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
          <option value="">Todas</option>
          <option value="Transporte">Transporte</option>
          <option value="Combustible">Combustible</option>
          <option value="Papelería">Papelería</option>
          <option value="Alimentación">Alimentación</option>
          <option value="Servicios">Servicios</option>
          <option value="Mantenimiento">Mantenimiento</option>
          <option value="Nómina">Nómina</option>
          <option value="Comisiones">Comisiones</option>
          <option value="Otros">Otros</option>
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-semibold text-slate-500 mb-1">Responsable</label>
        <input type="text" id="report-responsible" placeholder="Buscar responsable..." oninput="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
      </div>
    `;
  } else if (activeReportType === 'CLOSINGS') {
    grid.innerHTML = `
      ${dateFiltersHtml}
      <div>
        <label class="block text-[10px] font-semibold text-slate-500 mb-1">Usuario que cerró</label>
        <input type="text" id="report-closed-by" placeholder="Nombre de usuario..." oninput="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
      </div>
    `;
  } else if (activeReportType === 'CLIENTS') {
    grid.innerHTML = `
      ${dateFiltersHtml}
      <div>
        <label class="block text-[10px] font-semibold text-slate-500 mb-1">Estado</label>
        <select id="report-client-active" onchange="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>
      ${currentUser.role === 'ROLE_ADMIN' ? `
        <div>
          <label class="block text-[10px] font-semibold text-slate-500 mb-1">Cobrador</label>
          <select id="report-employee" onchange="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
            <option value="">Todos</option>
            ${employeeOptions}
          </select>
        </div>
      ` : ''}
    `;
  } else if (activeReportType === 'RENEWALS') {
    grid.innerHTML = `
      ${dateFiltersHtml}
      ${currentUser.role === 'ROLE_ADMIN' ? `
        <div>
          <label class="block text-[10px] font-semibold text-slate-500 mb-1">Cobrador</label>
          <select id="report-employee" onchange="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
            <option value="">Todos</option>
            ${employeeOptions}
          </select>
        </div>
      ` : ''}
    `;
  } else { // LOANS
    grid.innerHTML = `
      ${dateFiltersHtml}
      <div>
        <label class="block text-[10px] font-semibold text-slate-500 mb-1">Estado de Préstamo</label>
        <select id="report-loan-status" onchange="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
          <option value="">Todos</option>
          <option value="ACTIVO">Activo</option>
          <option value="PAGADO">Pagado</option>
          <option value="ATRASADO">Atrasado</option>
        </select>
      </div>
      ${currentUser.role === 'ROLE_ADMIN' ? `
        <div>
          <label class="block text-[10px] font-semibold text-slate-500 mb-1">Cobrador</label>
          <select id="report-employee" onchange="fetchReportData()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
            <option value="">Todos</option>
            ${employeeOptions}
          </select>
        </div>
      ` : ''}
    `;
  }
  
  // Set default start/end to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const formatDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  document.getElementById('report-start').value = formatDate(firstDay);
  document.getElementById('report-end').value = formatDate(today);

  fetchReportData();
}

async function fetchReportData() {
  const table = document.getElementById('reports-table-container');
  table.innerHTML = `<div class="flex justify-center p-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>`;

  let url = `${API_BASE}/reports`;
  const empSelect = document.getElementById('report-employee');
  const employeeVal = empSelect ? empSelect.value : '';
  const start = document.getElementById('report-start').value;
  const end = document.getElementById('report-end').value;

  if (activeReportType === 'PAYMENTS') {
    const method = document.getElementById('report-method').value;
    url += `/payments?start=${start}&end=${end}&paymentMethod=${method}&employeeId=${employeeVal}`;
  } else if (activeReportType === 'EXPENSES') {
    const category = document.getElementById('report-category').value;
    const responsible = document.getElementById('report-responsible').value;
    url += `/expenses?start=${start}&end=${end}&category=${category}&responsible=${responsible}`;
  } else if (activeReportType === 'CLOSINGS') {
    const closedBy = document.getElementById('report-closed-by').value;
    url += `/closings?start=${start}&end=${end}&closedBy=${closedBy}`;
  } else if (activeReportType === 'CLIENTS') {
    const activeVal = document.getElementById('report-client-active').value;
    url += `/clients?start=${start}&end=${end}&active=${activeVal}&employeeId=${employeeVal}`;
  } else if (activeReportType === 'RENEWALS') {
    url += `/loans`;
  } else { // LOANS
    const status = document.getElementById('report-loan-status').value;
    url += `/loans?start=${start}&end=${end}&status=${status}&employeeId=${employeeVal}`;
  }

  try {
    const res = await fetch(url, { headers: getHeaders() });
    const data = await res.json();

    if (data.length === 0) {
      table.innerHTML = `<p class="p-8 text-center text-slate-400">No se encontraron registros.</p>`;
      return;
    }

    if (activeReportType === 'PAYMENTS') {
      table.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-500 border-b border-slate-200">
                <th class="py-3 px-6">ID Pago</th>
                <th class="py-3 px-6">Fecha / Hora</th>
                <th class="py-3 px-6">Valor</th>
                <th class="py-3 px-6">Método</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${data.map(p => `
                <tr>
                  <td class="py-3 px-6 font-mono">${p.id.substring(0, 10)}...</td>
                  <td class="py-3 px-6">${new Date(p.paymentDate).toLocaleString('es-CO')}</td>
                  <td class="py-3 px-6 font-bold text-slate-850 dark:text-white">${formatCurrency(p.amount)}</td>
                  <td class="py-3 px-6"><span class="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">${p.paymentMethod}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (activeReportType === 'EXPENSES') {
      table.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-500 border-b border-slate-200">
                <th class="py-3 px-6">Fecha / Hora</th>
                <th class="py-3 px-6">Valor</th>
                <th class="py-3 px-6">Categoría</th>
                <th class="py-3 px-6">Responsable</th>
                <th class="py-3 px-6">Justificación</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${data.map(e => `
                <tr>
                  <td class="py-3 px-6">${e.date} ${e.time}</td>
                  <td class="py-3 px-6 font-bold text-rose-500">${formatCurrency(e.value)}</td>
                  <td class="py-3 px-6">${e.category}</td>
                  <td class="py-3 px-6">${e.responsible}</td>
                  <td class="py-3 px-6 truncate max-w-[200px]" title="${e.justification}">${e.justification}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (activeReportType === 'CLOSINGS') {
      table.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-500 border-b border-slate-200">
                <th class="py-3 px-6">Fecha / Hora</th>
                <th class="py-3 px-6">Cerró</th>
                <th class="py-3 px-6">Esperado</th>
                <th class="py-3 px-6">Contado</th>
                <th class="py-3 px-6">Diferencia</th>
                <th class="py-3 px-6">Justificación</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${data.map(c => {
                const diffColor = c.difference === 0 ? 'text-slate-500' : c.difference > 0 ? 'text-emerald-600' : 'text-red-500';
                return `
                  <tr>
                    <td class="py-3 px-6">${c.date} ${c.time}</td>
                    <td class="py-3 px-6">${c.closedBy}</td>
                    <td class="py-3 px-6">${formatCurrency(c.expectedMoney)}</td>
                    <td class="py-3 px-6 font-bold">${formatCurrency(c.realMoney)}</td>
                    <td class="py-3 px-6 font-bold ${diffColor}">${formatCurrency(c.difference)} (${c.differenceType})</td>
                    <td class="py-3 px-6 truncate max-w-[200px]" title="${c.justification || ''}">${c.justification || 'N/A'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (activeReportType === 'CLIENTS') {
      table.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-500 border-b border-slate-200">
                <th class="py-3 px-6">Cliente</th>
                <th class="py-3 px-6">Cédula</th>
                <th class="py-3 px-6">Celular</th>
                <th class="py-3 px-6">Dirección</th>
                <th class="py-3 px-6">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${data.map(c => `
                <tr>
                  <td class="py-3 px-6 font-bold">${c.fullName}</td>
                  <td class="py-3 px-6">${c.dni}</td>
                  <td class="py-3 px-6">${c.phone}</td>
                  <td class="py-3 px-6">${c.address} (${c.neighborhood})</td>
                  <td class="py-3 px-6">
                    <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-650'}">${c.active ? 'Activo' : 'Inactivo'}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (activeReportType === 'RENEWALS') {
      const startLocalDate = start ? new Date(start + 'T00:00:00') : null;
      const endLocalDate = end ? new Date(end + 'T23:59:59') : null;
      
      const renewalsList = [];
      data.forEach(l => {
        if (l.renewals && l.renewals.length > 0) {
          const client = paymentsClientsMap[l.clientId] || { fullName: 'Desconocido', dni: 'N/A' };
          l.renewals.forEach(r => {
            const rDate = new Date(r.renewalDate);
            const dateMatch = (!startLocalDate || rDate >= startLocalDate) && (!endLocalDate || rDate <= endLocalDate);
            const employeeMatch = (employeeVal === '' || employeeVal === l.createdBy);
            if (dateMatch && employeeMatch) {
              renewalsList.push({
                loan: l,
                client: client,
                renewal: r
              });
            }
          });
        }
      });

      if (renewalsList.length === 0) {
        table.innerHTML = `<p class="p-8 text-center text-slate-400">No se encontraron renovaciones en el periodo seleccionado.</p>`;
        return;
      }

      table.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-500 border-b border-slate-200">
                <th class="py-3 px-6">Fecha / Hora</th>
                <th class="py-3 px-6">Cliente</th>
                <th class="py-3 px-6">Saldo Anterior</th>
                <th class="py-3 px-6">Dinero Adicional</th>
                <th class="py-3 px-6">Nuevo Capital</th>
                <th class="py-3 px-6">Nueva Deuda</th>
                <th class="py-3 px-6">Realizado Por</th>
                <th class="py-3 px-6">Observaciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${renewalsList.map(item => `
                <tr>
                  <td class="py-3 px-6">${new Date(item.renewal.renewalDate).toLocaleString('es-CO')}</td>
                  <td class="py-3 px-6 font-bold">
                    ${item.client.fullName}
                    <div class="text-[9px] text-slate-450 mt-0.5">DNI: ${item.client.dni}</div>
                  </td>
                  <td class="py-3 px-6">${formatCurrency(item.renewal.previousOutstandingBalance)}</td>
                  <td class="py-3 px-6 text-emerald-650 font-bold">+${formatCurrency(item.renewal.additionalAmount)}</td>
                  <td class="py-3 px-6">${formatCurrency(item.renewal.newCapital)}</td>
                  <td class="py-3 px-6 text-primary-650 font-bold">${formatCurrency(item.renewal.newTotalToPay)}</td>
                  <td class="py-3 px-6">${item.renewal.createdBy}</td>
                  <td class="py-3 px-6 italic text-slate-505 truncate max-w-[150px]" title="${item.renewal.notes || ''}">${item.renewal.notes || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else { // LOANS
      table.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-500 border-b border-slate-200">
                <th class="py-3 px-6">ID Préstamo</th>
                <th class="py-3 px-6">Monto Inicial</th>
                <th class="py-3 px-6">Tasa</th>
                <th class="py-3 px-6">Total a Pagar</th>
                <th class="py-3 px-6">Total Cobrado</th>
                <th class="py-3 px-6">Saldo Pendiente</th>
                <th class="py-3 px-6">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${data.map(l => `
                <tr>
                  <td class="py-3 px-6 font-mono">${l.id.substring(0, 10)}...</td>
                  <td class="py-3 px-6 font-bold">${formatCurrency(l.amount)}</td>
                  <td class="py-3 px-6">${l.interestRate}%</td>
                  <td class="py-3 px-6">${formatCurrency(l.totalToPay)}</td>
                  <td class="py-3 px-6 text-emerald-650 font-bold">${formatCurrency(l.amountPaid)}</td>
                  <td class="py-3 px-6 text-amber-650 font-bold">${formatCurrency(l.balanceOutstanding)}</td>
                  <td class="py-3 px-6"><span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'PAGADO' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}">${l.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (e) {
    table.innerHTML = `<p class="p-6 text-center text-red-500">Error al cargar reporte.</p>`;
  }
}

async function exportReport() {
  const empSelect = document.getElementById('report-employee');
  const employeeVal = empSelect ? empSelect.value : '';
  const start = document.getElementById('report-start').value;
  const end = document.getElementById('report-end').value;
  
  let url = `${API_BASE}/reports/export?type=${activeReportType}&start=${start}&end=${end}&employeeId=${employeeVal}`;
  
  if (activeReportType === 'PAYMENTS') {
    const method = document.getElementById('report-method').value;
    url += `&extraParam=${method}`;
  } else if (activeReportType === 'EXPENSES') {
    const category = document.getElementById('report-category').value;
    url += `&extraParam=${category}`;
  } else if (activeReportType === 'CLOSINGS') {
    url += `&extraParam=`;
  } else if (activeReportType === 'CLIENTS') {
    const activeVal = document.getElementById('report-client-active').value;
    url += `&extraParam=${activeVal}`;
  } else if (activeReportType === 'RENEWALS') {
    url += `&extraParam=`;
  } else { // LOANS
    const status = document.getElementById('report-loan-status').value;
    url += `&extraParam=${status}`;
  }

  // Download CSV file
  try {
    const response = await fetch(url, { headers: getHeaders() });
    const blob = await response.blob();
    const fileUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', `reporte_${activeReportType.toLowerCase()}_${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert("Error al descargar reporte.");
  }
}

// ----------------------------------------------------
// TAB: USERS MANAGEMENT (Admin-only)
// ----------------------------------------------------
async function loadUsersList() {
  const container = document.getElementById('users-table-container');
  container.innerHTML = `<div class="flex justify-center p-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>`;

  try {
    const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
    const list = await res.json();

    if (list.length === 0) {
      container.innerHTML = `<p class="p-8 text-center text-slate-400">No hay usuarios registrados.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-xs">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-500 border-b border-slate-200">
              <th class="py-4 px-6">Nombre Completo</th>
              <th class="py-4 px-6">Usuario</th>
              <th class="py-4 px-6">Rol</th>
              <th class="py-4 px-6">Estado</th>
              <th class="py-4 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${list.map(u => `
              <tr class="hover:bg-slate-50/50">
                <td class="py-4 px-6 font-bold text-slate-800 dark:text-white">${u.fullName}</td>
                <td class="py-4 px-6 font-mono">${u.username}</td>
                <td class="py-4 px-6">
                  <span class="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${u.role === 'ROLE_ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-indigo-50 text-indigo-700'}">
                    ${u.role === 'ROLE_ADMIN' ? 'Administrador' : 'Empleado'}
                  </span>
                </td>
                <td class="py-4 px-6">
                  <button onclick="toggleUserStatus('${u.id}')" class="font-bold ${u.active ? 'text-emerald-600' : 'text-slate-450'}">
                    ${u.active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td class="py-4 px-6 text-right">
                  <button onclick="openUserModal('${u.id}')" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><i data-lucide="edit-3" class="h-4.5 w-4.5"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    lucide.createIcons();
  } catch (e) {
    container.innerHTML = `<p class="p-6 text-center text-red-500">Error al cargar usuarios.</p>`;
  }
}

async function openUserModal(id = null) {
  const errorDiv = document.getElementById('modal-user-error');
  errorDiv.classList.add('hidden');

  if (id) {
    document.getElementById('modal-user-title').innerText = 'Editar Usuario';
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { headers: getHeaders() });
      const u = await res.json();
      
      document.getElementById('modal-user-id-field').value = u.id;
      document.getElementById('user-fullname').value = u.fullName;
      document.getElementById('user-username').value = u.username;
      document.getElementById('user-password').value = '';
      document.getElementById('user-role').value = u.role;
      document.getElementById('user-active').checked = u.active;
    } catch (e) {
      console.error(e);
    }
  } else {
    document.getElementById('modal-user-title').innerText = 'Registrar Usuario';
    document.getElementById('modal-user-id-field').value = '';
    document.getElementById('modal-user-form').reset();
    document.getElementById('user-active').checked = true;
  }
  document.getElementById('modal-user').classList.remove('hidden');
}

function closeUserModal() {
  document.getElementById('modal-user').classList.add('hidden');
}

async function handleUserSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('modal-user-error');
  errorDiv.classList.add('hidden');

  const id = document.getElementById('modal-user-id-field').value;
  const password = document.getElementById('user-password').value;

  const payload = {
    username: document.getElementById('user-username').value,
    fullName: document.getElementById('user-fullname').value,
    role: document.getElementById('user-role').value,
    active: document.getElementById('user-active').checked
  };

  if (password.trim() !== '') {
    payload.password = password;
  } else if (!id) {
    errorDiv.innerText = 'La contraseña es requerida para nuevos usuarios.';
    errorDiv.classList.remove('hidden');
    return;
  }

  try {
    const url = id ? `${API_BASE}/users/${id}` : `${API_BASE}/users`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al guardar usuario.');
    }

    closeUserModal();
    loadUsersList();
  } catch (error) {
    errorDiv.innerText = error.message;
    errorDiv.classList.remove('hidden');
  }
}

async function toggleUserStatus(id) {
  try {
    const res = await fetch(`${API_BASE}/users/${id}/toggle`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (res.ok) loadUsersList();
  } catch (e) {
    console.error(e);
  }
}

// ----------------------------------------------------
// TAB: SETTINGS LOGIC (Admin-only)
// ----------------------------------------------------
let settingsLogoBase64 = "";

async function loadSettingsTabDetails() {
  document.getElementById('settings-error').classList.add('hidden');
  document.getElementById('settings-success').classList.add('hidden');
  
  if (companyConfig) {
    document.getElementById('settings-company-name').value = companyConfig.companyName || '';
    document.getElementById('settings-nit').value = companyConfig.nit || '';
    document.getElementById('settings-phone').value = companyConfig.phone || '';
    document.getElementById('settings-address').value = companyConfig.address || '';
    document.getElementById('settings-default-rate').value = companyConfig.defaultInterestRate || 10;
    settingsLogoBase64 = companyConfig.logoBase64 || '';
    
    const preview = document.getElementById('settings-logo-preview');
    if (settingsLogoBase64) {
      preview.innerHTML = `<img src="${settingsLogoBase64}" class="h-full w-full object-cover">`;
    } else {
      preview.innerHTML = `<i data-lucide="building" class="h-6 w-6"></i>`;
      lucide.createIcons();
    }
  }
}

function handleSettingsLogoUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      settingsLogoBase64 = reader.result;
      document.getElementById('settings-logo-preview').innerHTML = `<img src="${settingsLogoBase64}" class="h-full w-full object-cover">`;
    };
    reader.readAsDataURL(file);
  }
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('settings-error');
  const successDiv = document.getElementById('settings-success');
  errorDiv.classList.add('hidden');
  successDiv.classList.add('hidden');

  const payload = {
    companyName: document.getElementById('settings-company-name').value,
    nit: document.getElementById('settings-nit').value,
    phone: document.getElementById('settings-phone').value,
    address: document.getElementById('settings-address').value,
    defaultInterestRate: parseFloat(document.getElementById('settings-default-rate').value),
    logoBase64: settingsLogoBase64
  };

  try {
    const res = await fetch(`${API_BASE}/company`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al guardar configuración.');
    }

    successDiv.innerText = 'Configuración actualizada exitosamente.';
    successDiv.classList.remove('hidden');
    await loadCompanyConfig();
  } catch (error) {
    errorDiv.innerText = error.message;
    errorDiv.classList.remove('hidden');
  }
}

// ----------------------------------------------------
// TAB: ALERTS & PAYMENT CORRECTION LOGIC
// ----------------------------------------------------
let alertsViewType = 'INCOMPLETE'; // 'INCOMPLETE' or 'LATE'
let allClientsCached = [];

async function loadAlertsTabDetails() {
  document.getElementById('alerts-table-container').innerHTML = `
    <div class="flex items-center justify-center p-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  `;

  try {
    // 1. Load all clients
    const clientsRes = await fetch(`${API_BASE}/clients`, { headers: getHeaders() });
    allClientsCached = await clientsRes.json();

    // 2. Load all active loans
    const loansRes = await fetch(`${API_BASE}/loans`, { headers: getHeaders() });
    const loansList = await loansRes.json();

    // 3. Load all payments
    const paymentsRes = await fetch(`${API_BASE}/payments`, { headers: getHeaders() });
    const paymentsList = await paymentsRes.json();

    // Calculate Incomplete Payments: payments where amount < loan.installmentValue
    const incompletePayments = [];
    paymentsList.forEach(p => {
      const loan = loansList.find(l => l.id === p.loanId);
      if (loan && p.amount < loan.installmentValue - 0.01) {
        const client = allClientsCached.find(c => c.id === loan.clientId);
        incompletePayments.push({
          payment: p,
          loan: loan,
          client: client
        });
      }
    });

    // Calculate Late Loans: loans with status === 'ATRASADO' or installmentsLate > 0
    const lateLoans = [];
    loansList.forEach(l => {
      if (l.status === 'ATRASADO' || l.installmentsLate > 0) {
        const client = allClientsCached.find(c => c.id === l.clientId);
        lateLoans.push({
          loan: l,
          client: client
        });
      }
    });

    // Update Counter Widgets
    document.getElementById('alert-count-incomplete').innerText = incompletePayments.length;
    document.getElementById('alert-count-late').innerText = lateLoans.length;

    // Render active selection
    renderAlertsTable(incompletePayments, lateLoans);
  } catch (error) {
    console.error("Error loading alerts details:", error);
    document.getElementById('alerts-table-container').innerHTML = `
      <p class="text-center p-6 text-red-500 font-bold text-xs">Error al cargar alertas.</p>
    `;
  }
}

function setAlertsViewType(type) {
  alertsViewType = type;
  
  const btnIncomplete = document.getElementById('btn-alerts-incomplete');
  const btnLate = document.getElementById('btn-alerts-late');
  
  if (type === 'INCOMPLETE') {
    btnIncomplete.className = "py-2 px-4 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm";
    btnLate.className = "py-2 px-4 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white";
  } else {
    btnLate.className = "py-2 px-4 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm";
    btnIncomplete.className = "py-2 px-4 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white";
  }
  
  loadAlertsTabDetails();
}

function renderAlertsTable(incompletePayments, lateLoans) {
  const container = document.getElementById('alerts-table-container');

  if (alertsViewType === 'INCOMPLETE') {
    if (incompletePayments.length === 0) {
      container.innerHTML = `
        <div class="text-center py-16 text-slate-400">
          <i data-lucide="check-circle" class="h-10 w-10 text-emerald-500 mx-auto mb-3"></i>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-350">¡Todo al día!</p>
          <p class="text-xs text-slate-400 mt-1">No hay registros de cobros menores al valor de la cuota normal.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
              <th class="p-4">Cliente</th>
              <th class="p-4">Cuota Normal</th>
              <th class="p-4">Monto Pagado</th>
              <th class="p-4">Diferencia</th>
              <th class="p-4">Fecha</th>
              <th class="p-4">Observaciones</th>
              <th class="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-850">
            ${incompletePayments.map(item => {
              const diff = item.loan.installmentValue - item.payment.amount;
              const phone = item.client?.phone || '';
              const clientName = item.client?.fullName || 'Desconocido';
              const cleanPhone = phone.replace(/\D/g, '');
              const whatsappText = encodeURIComponent(`Hola ${clientName}, nos comunicamos de ${companyConfig?.companyName || 'Cobro Diario'} sobre tu pago de la cuota de hoy. Registramos un abono de ${formatCurrency(item.payment.amount)}, quedando pendiente un valor de ${formatCurrency(diff)}. Por favor dinos si tienes alguna duda.`);
              const whatsappUrl = `https://wa.me/57${cleanPhone}?text=${whatsappText}`;
              
              return `
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                  <td class="p-4 font-bold text-slate-850 dark:text-white">
                    ${clientName}
                    <div class="text-[10px] text-slate-450 mt-0.5">DNI: ${item.client?.dni || 'N/A'} | Tlf: ${phone}</div>
                  </td>
                  <td class="p-4 font-semibold">${formatCurrency(item.loan.installmentValue)}</td>
                  <td class="p-4 text-red-500 font-extrabold">${formatCurrency(item.payment.amount)}</td>
                  <td class="p-4 text-amber-600 font-extrabold">-${formatCurrency(diff)}</td>
                  <td class="p-4 text-slate-450">${new Date(item.payment.paymentDate).toLocaleDateString('es-CO')}</td>
                  <td class="p-4 italic text-slate-500 truncate max-w-[150px]" title="${item.payment.notes || ''}">${item.payment.notes || 'Ninguna'}</td>
                  <td class="p-4 flex items-center justify-center gap-2">
                    <a href="${whatsappUrl}" target="_blank" class="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 flex items-center gap-1 font-bold text-[10px]" title="Contactar por WhatsApp">
                      <i data-lucide="message-square" class="h-3.5 w-3.5"></i> WhatsApp
                    </a>
                    ${currentUser.role === 'ROLE_ADMIN' ? `
                      <button onclick="openEditPaymentModal('${item.payment.id}')" class="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-500 flex items-center gap-1 font-bold text-[10px]" title="Corregir valor cobrado">
                        <i data-lucide="edit-3" class="h-3.5 w-3.5"></i> Corregir
                      </button>
                    ` : `
                      <button onclick="openRequestCorrectionModal('${item.payment.id}', ${item.payment.amount})" class="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-550 flex items-center gap-1 font-bold text-[10px]" title="Solicitar corrección al admin">
                        <i data-lucide="help-circle" class="h-3.5 w-3.5"></i> Solicitar Corrección
                      </button>
                    `}
                    <button onclick="viewClientProfile('${item.client?.id}')" class="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 flex items-center gap-1 font-bold text-[10px]" title="Ver Perfil">
                      <i data-lucide="user" class="h-3.5 w-3.5"></i> Ver Perfil
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    if (lateLoans.length === 0) {
      container.innerHTML = `
        <div class="text-center py-16 text-slate-400">
          <i data-lucide="check-circle" class="h-10 w-10 text-emerald-500 mx-auto mb-3"></i>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-350">¡Ningún cliente en Mora!</p>
          <p class="text-xs text-slate-400 mt-1">Todos los préstamos activos se encuentran al día con sus cuotas.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
              <th class="p-4">Cliente</th>
              <th class="p-4">Monto Prestado</th>
              <th class="p-4">Saldo Pendiente</th>
              <th class="p-4">Cuotas Atrasadas</th>
              <th class="p-4">Último Pago</th>
              <th class="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-850">
            ${lateLoans.map(item => {
              const phone = item.client?.phone || '';
              const clientName = item.client?.fullName || 'Desconocido';
              const cleanPhone = phone.replace(/\D/g, '');
              const whatsappText = encodeURIComponent(`Hola ${clientName}, nos comunicamos de ${companyConfig?.companyName || 'Cobro Diario'} para recordarle que presenta un atraso de ${item.loan.installmentsLate} cuotas en su préstamo activo. Por favor contáctenos para acordar su pago.`);
              const whatsappUrl = `https://wa.me/57${cleanPhone}?text=${whatsappText}`;

              return `
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-955/25 bg-red-50/10 dark:bg-red-950/5">
                  <td class="p-4 font-bold text-slate-850 dark:text-white">
                    ${clientName}
                    <div class="text-[10px] text-slate-450 mt-0.5">DNI: ${item.client?.dni || 'N/A'} | Tlf: ${phone}</div>
                  </td>
                  <td class="p-4">${formatCurrency(item.loan.amount)} (Total: ${formatCurrency(item.loan.totalToPay)})</td>
                  <td class="p-4 font-extrabold text-slate-800 dark:text-slate-250">${formatCurrency(item.loan.balanceOutstanding)}</td>
                  <td class="p-4 font-extrabold text-red-500">
                    <span class="inline-flex px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-[10px] font-bold">${item.loan.installmentsLate} Cuotas</span>
                  </td>
                  <td class="p-4 text-slate-450">${item.loan.amountPaid > 0 ? 'Abonado: ' + formatCurrency(item.loan.amountPaid) : 'Ninguno'}</td>
                  <td class="p-4 flex items-center justify-center gap-2">
                    <a href="${whatsappUrl}" target="_blank" class="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 flex items-center gap-1 font-bold text-[10px]" title="Contactar por WhatsApp">
                      <i data-lucide="message-square" class="h-3.5 w-3.5"></i> WhatsApp
                    </a>
                    <button onclick="navigateRegisterPayment('${item.loan.id}')" class="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-500 flex items-center gap-1 font-bold text-[10px]" title="Cobrar Cuota">
                      <i data-lucide="circle-dollar-sign" class="h-3.5 w-3.5"></i> Cobrar
                    </button>
                    <button onclick="viewClientProfile('${item.client?.id}')" class="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 flex items-center gap-1 font-bold text-[10px]" title="Ver Perfil">
                      <i data-lucide="user" class="h-3.5 w-3.5"></i> Perfil
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  lucide.createIcons();
}

// ----------------------------------------------------
// EDIT PAYMENT MODAL FUNCTIONS
// ----------------------------------------------------
async function openEditPaymentModal(paymentId) {
  const errorDiv = document.getElementById('modal-edit-payment-error');
  errorDiv.classList.add('hidden');
  document.getElementById('modal-edit-payment-id').value = paymentId;

  try {
    const res = await fetch(`${API_BASE}/payments/${paymentId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error al obtener detalles del pago");
    const p = await res.json();

    document.getElementById('modal-edit-payment-amount').value = p.amount;
    document.getElementById('modal-edit-payment-method').value = p.paymentMethod;
    document.getElementById('modal-edit-payment-notes').value = p.notes || '';

    document.getElementById('modal-edit-payment').classList.remove('hidden');
  } catch (error) {
    alert(error.message);
  }
}

function closeEditPaymentModal() {
  document.getElementById('modal-edit-payment').classList.add('hidden');
}

async function handleEditPaymentSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('modal-edit-payment-error');
  errorDiv.classList.add('hidden');

  const id = document.getElementById('modal-edit-payment-id').value;
  const payload = {
    amount: parseFloat(document.getElementById('modal-edit-payment-amount').value),
    paymentMethod: document.getElementById('modal-edit-payment-method').value,
    notes: document.getElementById('modal-edit-payment-notes').value
  };

  try {
    const res = await fetch(`${API_BASE}/payments/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al actualizar pago.');
    }

    closeEditPaymentModal();
    // Refresh alerts if on alerts page
    if (currentTab === 'alerts') {
      loadAlertsTabDetails();
    } else if (currentTab === 'client-profile') {
      // Refresh current client profile
      const loanId = selectedPaymentLoan?.id;
      if (loanId) selectProfileLoan(selectedPaymentLoan);
    } else if (currentTab === 'dashboard') {
      loadDashboardStats();
    }
  } catch (error) {
    errorDiv.innerText = error.message;
    errorDiv.classList.remove('hidden');
  }
}

// ----------------------------------------------------
// SUPPORT REQUESTS LOGIC (EMPLOYEE & ADMIN)
// ----------------------------------------------------
function openRequestCorrectionModal(paymentId, originalAmount) {
  const errorDiv = document.getElementById('modal-request-correction-error');
  errorDiv.classList.add('hidden');
  document.getElementById('modal-request-payment-id').value = paymentId;
  document.getElementById('modal-request-original-amount').value = formatCurrency(originalAmount);
  document.getElementById('modal-request-new-amount').value = '';
  document.getElementById('modal-request-reason').value = '';
  document.getElementById('modal-request-correction').classList.remove('hidden');
}

function closeRequestCorrectionModal() {
  document.getElementById('modal-request-correction').classList.add('hidden');
}

async function handleRequestCorrectionSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('modal-request-correction-error');
  errorDiv.classList.add('hidden');

  const payload = {
    paymentId: document.getElementById('modal-request-payment-id').value,
    requestedAmount: parseFloat(document.getElementById('modal-request-new-amount').value),
    reason: document.getElementById('modal-request-reason').value
  };

  try {
    const res = await fetch(`${API_BASE}/corrections`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al enviar solicitud.');
    }

    closeRequestCorrectionModal();
    alert('Solicitud enviada exitosamente al administrador.');
    if (currentTab === 'corrections-employee') {
      loadCorrectionsEmployeeTab();
    }
  } catch (error) {
    errorDiv.innerText = error.message;
    errorDiv.classList.remove('hidden');
  }
}

async function loadCorrectionsEmployeeTab() {
  const container = document.getElementById('corrections-employee-table-container');
  container.innerHTML = `<div class="flex justify-center p-8"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div></div>`;

  try {
    const res = await fetch(`${API_BASE}/corrections/employee`, { headers: getHeaders() });
    const list = await res.json();

    if (list.length === 0) {
      container.innerHTML = `<p class="text-slate-400 text-xs text-center py-8">No has enviado ninguna solicitud de soporte.</p>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
            <th class="p-4">Cobro ID</th>
            <th class="p-4">Monto Original</th>
            <th class="p-4">Nuevo Monto</th>
            <th class="p-4">Motivo</th>
            <th class="p-4">Estado</th>
            <th class="p-4">Fecha</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-850">
          ${list.map(req => `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
              <td class="p-4 font-mono text-[10px] text-slate-500">${req.paymentId.substring(0, 10)}...</td>
              <td class="p-4">${formatCurrency(req.originalAmount)}</td>
              <td class="p-4 font-bold text-slate-800 dark:text-white">${formatCurrency(req.requestedAmount)}</td>
              <td class="p-4 italic text-slate-500">${req.reason}</td>
              <td class="p-4">
                <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                  req.status === 'APROBADO' ? 'bg-emerald-50 text-emerald-700' :
                  req.status === 'RECHAZADO' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                }">${req.status}</span>
              </td>
              <td class="p-4 text-slate-450">${new Date(req.createdAt).toLocaleString('es-CO')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML = `<p class="text-red-500 text-xs text-center py-8">Error al cargar solicitudes.</p>`;
  }
}

async function loadCorrectionsAdminTab() {
  const container = document.getElementById('corrections-admin-table-container');
  container.innerHTML = `<div class="flex justify-center p-8"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div></div>`;

  try {
    const res = await fetch(`${API_BASE}/corrections`, { headers: getHeaders() });
    const list = await res.json();

    if (list.length === 0) {
      container.innerHTML = `<p class="text-slate-400 text-xs text-center py-8">No hay peticiones de soporte registradas.</p>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
            <th class="p-4">Empleado</th>
            <th class="p-4">Cobro ID</th>
            <th class="p-4">Original</th>
            <th class="p-4">Solicitado</th>
            <th class="p-4">Diferencia</th>
            <th class="p-4">Motivo / Error</th>
            <th class="p-4">Estado</th>
            <th class="p-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-850">
          ${list.map(req => {
            const diff = req.originalAmount - req.requestedAmount;
            return `
              <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                <td class="p-4 font-bold text-slate-850 dark:text-white">
                  ${req.employeeName}
                  <div class="text-[9px] text-slate-450 mt-0.5">ID: ${req.employeeId.substring(0, 10)}...</div>
                </td>
                <td class="p-4 font-mono text-[10px] text-slate-550">${req.paymentId.substring(0, 10)}...</td>
                <td class="p-4">${formatCurrency(req.originalAmount)}</td>
                <td class="p-4 font-bold text-primary-600">${formatCurrency(req.requestedAmount)}</td>
                <td class="p-4 text-amber-600 font-bold">${diff > 0 ? '-' : '+'}${formatCurrency(Math.abs(diff))}</td>
                <td class="p-4 italic text-slate-650">${req.reason}</td>
                <td class="p-4">
                  <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                    req.status === 'APROBADO' ? 'bg-emerald-50 text-emerald-700' :
                    req.status === 'RECHAZADO' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  }">${req.status}</span>
                </td>
                <td class="p-4 flex items-center justify-center gap-2">
                  ${req.status === 'PENDIENTE' ? `
                    <button onclick="approveCorrectionRequest('${req.id}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] shadow-sm">
                      Aprobar
                    </button>
                    <button onclick="rejectCorrectionRequest('${req.id}')" class="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-[10px] shadow-sm">
                      Rechazar
                    </button>
                  ` : `<span class="text-slate-400 text-[10px] italic">Procesado</span>`}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML = `<p class="text-red-500 text-xs text-center py-8">Error al cargar solicitudes.</p>`;
  }
}

async function approveCorrectionRequest(id) {
  if (!confirm('¿Está seguro de que desea aprobar esta corrección? Se aplicará al cobro de inmediato y recalculará los saldos.')) return;
  try {
    const res = await fetch(`${API_BASE}/corrections/${id}/approve`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (res.ok) {
      alert('Solicitud aprobada y cobro corregido.');
      loadCorrectionsAdminTab();
    } else {
      const err = await res.json();
      alert(err.message || 'Error al aprobar.');
    }
  } catch (e) {
    console.error(e);
  }
}

async function rejectCorrectionRequest(id) {
  if (!confirm('¿Está seguro de que desea rechazar esta corrección?')) return;
  try {
    const res = await fetch(`${API_BASE}/corrections/${id}/reject`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (res.ok) {
      alert('Solicitud rechazada.');
      loadCorrectionsAdminTab();
    } else {
      const err = await res.json();
      alert(err.message || 'Error al rechazar.');
    }
  } catch (e) {
    console.error(e);
  }
}

// ----------------------------------------------------
// TAB: EXPENSES LOGIC
// ----------------------------------------------------
let uploadExpenseEvidenceBase64 = "";

async function loadExpensesList() {
  const container = document.getElementById('expenses-table-container');
  container.innerHTML = `<div class="flex justify-center p-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>`;

  try {
    const res = await fetch(`${API_BASE}/expenses`, { headers: getHeaders() });
    const list = await res.json();

    if (list.length === 0) {
      container.innerHTML = `<p class="p-8 text-center text-slate-400">No hay gastos registrados.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-xs">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-500 border-b border-slate-200">
              <th class="py-4 px-6">Fecha / Hora</th>
              <th class="py-4 px-6">Valor</th>
              <th class="py-4 px-6">Categoría</th>
              <th class="py-4 px-6">Responsable</th>
              <th class="py-4 px-6">Método de Pago</th>
              <th class="py-4 px-6">Justificación</th>
              <th class="py-4 px-6">Evidencia</th>
              <th class="py-4 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${list.map(e => `
              <tr class="hover:bg-slate-50/50">
                <td class="py-4 px-6 font-semibold">${e.date} ${e.time}</td>
                <td class="py-4 px-6 font-extrabold text-rose-500">${formatCurrency(e.value)}</td>
                <td class="py-4 px-6">${e.category}</td>
                <td class="py-4 px-6">${e.responsible}</td>
                <td class="py-4 px-6 font-medium">${e.paymentMethod}</td>
                <td class="py-4 px-6 truncate max-w-[150px]" title="${e.justification}">${e.justification}</td>
                <td class="py-4 px-6">
                  ${e.evidenceBase64 ? `
                    <a href="${e.evidenceBase64}" download="evidencia_gasto_${e.id}.png" class="text-primary-650 hover:underline font-bold flex items-center gap-1">
                      <i data-lucide="download" class="h-3 w-3"></i> Descargar
                    </a>
                  ` : '<span class="text-slate-400">Ninguna</span>'}
                </td>
                <td class="py-4 px-6 text-right space-x-2">
                  <button onclick="openExpenseModal('${e.id}')" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 inline-flex items-center" title="Editar"><i data-lucide="edit-3" class="h-4 w-4"></i></button>
                  <button onclick="deleteExpense('${e.id}')" class="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-rose-600 inline-flex items-center" title="Eliminar"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    lucide.createIcons();
  } catch (e) {
    container.innerHTML = `<p class="p-6 text-center text-red-500">Error al cargar la lista de gastos.</p>`;
  }
}

async function openExpenseModal(id = null) {
  const errorDiv = document.getElementById('modal-expense-error');
  errorDiv.classList.add('hidden');
  uploadExpenseEvidenceBase64 = "";
  document.getElementById('expense-evidence-input').value = "";
  document.getElementById('expense-evidence-preview').innerText = "No hay archivo adjunto.";

  if (id) {
    document.getElementById('modal-expense-title').innerText = 'Editar Gasto';
    try {
      const res = await fetch(`${API_BASE}/expenses/${id}`, { headers: getHeaders() });
      const e = await res.json();
      
      document.getElementById('modal-expense-id-field').value = e.id;
      document.getElementById('expense-date').value = e.date;
      document.getElementById('expense-time').value = e.time;
      document.getElementById('expense-value').value = e.value;
      document.getElementById('expense-category').value = e.category;
      document.getElementById('expense-responsible').value = e.responsible;
      document.getElementById('expense-payment-method').value = e.paymentMethod;
      document.getElementById('expense-justification').value = e.justification;
      document.getElementById('expense-observations').value = e.observations || '';
      
      if (e.evidenceBase64) {
        uploadExpenseEvidenceBase64 = e.evidenceBase64;
        document.getElementById('expense-evidence-preview').innerHTML = `
          <div class="flex items-center gap-2 mt-1">
            <span class="text-emerald-600 font-semibold text-[10px]">✔ Evidencia existente</span>
            <a href="${e.evidenceBase64}" target="_blank" class="text-primary-600 text-[10px] underline font-bold">Ver actual</a>
          </div>
        `;
      }
    } catch (err) {
      console.error(err);
    }
  } else {
    document.getElementById('modal-expense-title').innerText = 'Registrar Gasto';
    document.getElementById('modal-expense-id-field').value = '';
    document.getElementById('modal-expense-form').reset();
    
    // Set defaults (date today, time now)
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('expense-date').value = `${today.getFullYear()}-${mm}-${dd}`;
    document.getElementById('expense-time').value = today.toTimeString().split(' ')[0];
    document.getElementById('expense-responsible').value = currentUser.fullName;
  }
  document.getElementById('modal-expense').classList.remove('hidden');
}

function closeExpenseModal() {
  document.getElementById('modal-expense').classList.add('hidden');
}

function handleExpenseEvidenceUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      uploadExpenseEvidenceBase64 = reader.result;
      document.getElementById('expense-evidence-preview').innerHTML = `
        <span class="text-emerald-600 font-semibold text-[10px]">✔ Archivo cargado (${file.name})</span>
      `;
    };
    reader.readAsDataURL(file);
  }
}

async function handleExpenseSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('modal-expense-error');
  errorDiv.classList.add('hidden');

  const id = document.getElementById('modal-expense-id-field').value;
  const val = parseFloat(document.getElementById('expense-value').value);
  const justification = document.getElementById('expense-justification').value;

  if (val <= 0) {
    errorDiv.innerText = "El valor del gasto debe ser mayor a cero.";
    errorDiv.classList.remove('hidden');
    return;
  }

  if (!justification || justification.trim() === "") {
    errorDiv.innerText = "La justificación del gasto es obligatoria.";
    errorDiv.classList.remove('hidden');
    return;
  }

  const payload = {
    date: document.getElementById('expense-date').value,
    time: document.getElementById('expense-time').value,
    value: val,
    category: document.getElementById('expense-category').value,
    responsible: document.getElementById('expense-responsible').value,
    paymentMethod: document.getElementById('expense-payment-method').value,
    justification: justification,
    observations: document.getElementById('expense-observations').value,
    status: 'APROBADO',
    evidenceBase64: uploadExpenseEvidenceBase64
  };

  try {
    const url = id ? `${API_BASE}/expenses/${id}` : `${API_BASE}/expenses`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al guardar gasto.');
    }

    closeExpenseModal();
    loadExpensesList();
  } catch (error) {
    errorDiv.innerText = error.message;
    errorDiv.classList.remove('hidden');
  }
}

async function deleteExpense(id) {
  if (!confirm('¿Está seguro de que desea eliminar este gasto?')) return;
  try {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      loadExpensesList();
    } else {
      const err = await res.json();
      alert(err.message || 'Error al eliminar el gasto.');
    }
  } catch (e) {
    console.error(e);
  }
}

// ----------------------------------------------------
// TAB: CASH CLOSING LOGIC
// ----------------------------------------------------
let lastCalculatedExpectedCash = 0;

async function loadCashClosingDetails() {
  document.getElementById('cash-closing-form-error').classList.add('hidden');
  document.getElementById('cash-closing-form-success').classList.add('hidden');
  document.getElementById('close-real-money').value = "";
  
  try {
    const res = await fetch(`${API_BASE}/cash-closing/preview`, { headers: getHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();

    document.getElementById('close-calc-payments').innerText = formatCurrency(data.totalPayments);
    document.getElementById('close-calc-capital').innerText = formatCurrency(data.capitalRecovered);
    document.getElementById('close-calc-interest').innerText = formatCurrency(data.interestCollected);
    document.getElementById('close-calc-expenses').innerText = formatCurrency(data.totalExpenses);
    document.getElementById('close-calc-expected').innerText = formatCurrency(data.expectedCash);
    
    lastCalculatedExpectedCash = data.expectedCash;
    document.getElementById('close-real-money').value = data.expectedCash;
    
    calculateClosingDifference();
    loadCashClosingHistory();
  } catch (e) {
    console.error(e);
  }
}

function calculateClosingDifference() {
  const realMoney = parseFloat(document.getElementById('close-real-money').value) || 0;
  const difference = realMoney - lastCalculatedExpectedCash;
  const container = document.getElementById('close-difference-container');
  const valSpan = document.getElementById('close-difference-value');
  const justArea = document.getElementById('close-justification-area');

  valSpan.innerText = formatCurrency(difference);

  if (Math.abs(difference) < 0.01) {
    container.className = "p-4 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 flex items-center justify-between font-bold text-xs";
    valSpan.innerText = "Caja Cuadrada ($0)";
    justArea.classList.add('hidden');
    document.getElementById('close-justification-select').removeAttribute('required');
  } else if (difference > 0) {
    container.className = "p-4 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 flex items-center justify-between font-bold text-xs";
    valSpan.innerText = `Sobrante de ${formatCurrency(difference)}`;
    justArea.classList.remove('hidden');
    document.getElementById('close-justification-select').setAttribute('required', 'required');
  } else {
    container.className = "p-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 flex items-center justify-between font-bold text-xs";
    valSpan.innerText = `Faltante de ${formatCurrency(difference)}`;
    justArea.classList.remove('hidden');
    document.getElementById('close-justification-select').setAttribute('required', 'required');
  }
  handleClosingJustificationChange();
}

function handleClosingJustificationChange() {
  const select = document.getElementById('close-justification-select');
  const text = document.getElementById('close-justification-text');
  
  if (select.value === 'OTRO') {
    text.classList.remove('hidden');
    text.setAttribute('required', 'required');
  } else {
    text.classList.add('hidden');
    text.removeAttribute('required');
  }
}

async function handleClosingSubmit() {
  const errorDiv = document.getElementById('cash-closing-form-error');
  const successDiv = document.getElementById('cash-closing-form-success');
  errorDiv.classList.add('hidden');
  successDiv.classList.add('hidden');

  const realMoney = parseFloat(document.getElementById('close-real-money').value);
  if (isNaN(realMoney) || realMoney < 0) {
    errorDiv.innerText = "El valor del dinero real contado no es válido.";
    errorDiv.classList.remove('hidden');
    return;
  }

  const difference = realMoney - lastCalculatedExpectedCash;
  let justification = "";

  if (Math.abs(difference) > 0.01) {
    const select = document.getElementById('close-justification-select').value;
    const text = document.getElementById('close-justification-text').value;
    if (select === 'OTRO') {
      justification = text;
    } else {
      justification = select;
    }

    if (!justification || justification.trim() === "") {
      errorDiv.innerText = "Para cajas descuadradas, debe seleccionar o escribir una justificación obligatoria.";
      errorDiv.classList.remove('hidden');
      return;
    }
  }

  const payload = {
    expectedMoney: lastCalculatedExpectedCash,
    realMoney: realMoney,
    justification: justification
  };

  try {
    const res = await fetch(`${API_BASE}/cash-closing`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al procesar el cierre de caja.');
    }

    successDiv.innerText = "Cierre de caja registrado exitosamente.";
    successDiv.classList.remove('hidden');
    
    // Refresh page details and load closing
    await loadCashClosingDetails();
    await loadDashboardStats();
  } catch (error) {
    errorDiv.innerText = error.message;
    errorDiv.classList.remove('hidden');
  }
}

async function loadCashClosingHistory() {
  const container = document.getElementById('closings-history-table-container');
  container.innerHTML = `<div class="flex justify-center py-6"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div></div>`;

  try {
    const res = await fetch(`${API_BASE}/cash-closing/history`, { headers: getHeaders() });
    const list = await res.json();

    if (list.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 py-6 text-center">No hay cierres de caja registrados en el historial.</p>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full border-collapse text-left text-xs">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-500 border-b border-slate-200">
            <th class="py-3 px-4">Fecha / Hora</th>
            <th class="py-3 px-4">Responsable</th>
            <th class="py-3 px-4">Esperado</th>
            <th class="py-3 px-4">Contado</th>
            <th class="py-3 px-4">Diferencia</th>
            <th class="py-3 px-4">Justificación</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-850">
          ${list.map(c => {
            const diffColor = c.difference === 0 ? 'text-slate-500' : c.difference > 0 ? 'text-emerald-600' : 'text-red-500';
            return `
              <tr class="hover:bg-slate-50/50">
                <td class="py-3 px-4 font-semibold">${c.date} ${c.time}</td>
                <td class="py-3 px-4">${c.closedBy}</td>
                <td class="py-3 px-4">${formatCurrency(c.expectedMoney)}</td>
                <td class="py-3 px-4 font-bold text-slate-800 dark:text-white">${formatCurrency(c.realMoney)}</td>
                <td class="py-3 px-4 font-extrabold ${diffColor}">${formatCurrency(c.difference)} (${c.differenceType})</td>
                <td class="py-3 px-4 italic text-slate-500 max-w-[150px] truncate" title="${c.justification || ''}">${c.justification || 'N/A'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML = `<p class="text-xs text-red-500 text-center py-6">Error al cargar historial.</p>`;
  }
}

function startLoginClock() {
  const updateClock = () => {
    const timeEl = document.getElementById('login-current-time');
    const dateEl = document.getElementById('login-current-date');
    if (!timeEl || !dateEl) return;
    
    const now = new Date();
    timeEl.innerText = now.toLocaleTimeString('es-CO', { hour12: true });
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('es-CO', options);
    dateEl.innerText = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };
  
  updateClock();
  setInterval(updateClock, 1000);
}

function openQuickGuideModal() {
  const modal = document.getElementById('modal-quick-guide');
  if (modal) {
    modal.classList.remove('hidden');
    lucide.createIcons();
  }
}

function closeQuickGuideModal() {
  const modal = document.getElementById('modal-quick-guide');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ==========================================
// RENEW / INCREASE LOAN FUNCTIONS
// ==========================================
let currentRenewingLoan = null;

async function openRenewLoanModal(loanId) {
  const errorDiv = document.getElementById('modal-renew-loan-error');
  if (errorDiv) errorDiv.classList.add('hidden');
  const form = document.getElementById('modal-renew-loan-form');
  if (form) form.reset();

  try {
    const res = await fetch(`${API_BASE}/loans/${loanId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al cargar detalles del préstamo');
    const loan = await res.json();
    currentRenewingLoan = loan;

    // Fill current loan info card
    document.getElementById('renew-info-capital').innerText = formatCurrency(loan.amount);
    document.getElementById('renew-info-amountPaid').innerText = formatCurrency(loan.amountPaid);
    document.getElementById('renew-info-balanceOutstanding').innerText = formatCurrency(loan.balanceOutstanding);
    document.getElementById('renew-info-interestRate').innerText = `${loan.interestRate}%`;
    document.getElementById('renew-info-status').innerText = loan.status;
    document.getElementById('renew-info-status').className = `font-bold uppercase ${loan.status === 'ATRASADO' ? 'text-red-500' : 'text-blue-500'}`;
    document.getElementById('renew-info-installmentsRemaining').innerText = loan.installmentsRemaining;

    // Set hidden inputs
    document.getElementById('modal-renew-loan-id-field').value = loan.id;
    document.getElementById('modal-renew-loan-client-id').value = loan.clientId;

    // Set form fields defaults
    document.getElementById('renew-loan-type').value = loan.loanType || 'DIARIO';
    document.getElementById('renew-loan-installments').value = loan.installmentsCount || 30;
    document.getElementById('renew-loan-start-date').value = getLocalDateString();
    
    const rate = loan.interestRate;
    const rateSelect = document.getElementById('renew-loan-interest-rate');
    const customInput = document.getElementById('renew-loan-interest-custom');
    if (rate === 10 || rate === 15 || rate === 20) {
      rateSelect.value = rate.toString();
      customInput.classList.add('hidden');
      customInput.required = false;
    } else {
      rateSelect.value = 'CUSTOM';
      customInput.classList.remove('hidden');
      customInput.required = true;
      customInput.value = rate;
    }

    liveCalculateRenewLoan();
    document.getElementById('modal-renew-loan').classList.remove('hidden');
    lucide.createIcons();
  } catch (e) {
    alert(e.message);
  }
}

function closeRenewLoanModal() {
  document.getElementById('modal-renew-loan').classList.add('hidden');
}

function toggleRenewCustomInterest() {
  const select = document.getElementById('renew-loan-interest-rate');
  const customInput = document.getElementById('renew-loan-interest-custom');
  if (select.value === 'CUSTOM') {
    customInput.classList.remove('hidden');
    customInput.required = true;
  } else {
    customInput.classList.add('hidden');
    customInput.required = false;
    customInput.value = '';
  }
}

function liveCalculateRenewLoan() {
  if (!currentRenewingLoan) return;
  const oldBalance = currentRenewingLoan.balanceOutstanding || 0;
  const additional = parseFloat(document.getElementById('renew-loan-additional-amount').value) || 0;
  const newCapital = oldBalance + additional;

  const selectRate = document.getElementById('renew-loan-interest-rate').value;
  const customRate = parseFloat(document.getElementById('renew-loan-interest-custom').value) || 0;
  const rate = selectRate === 'CUSTOM' ? customRate : parseFloat(selectRate);
  const installments = parseInt(document.getElementById('renew-loan-installments').value) || 1;
  const startDateStr = document.getElementById('renew-loan-start-date').value;
  const type = document.getElementById('renew-loan-type').value;

  const interestVal = newCapital * (rate / 100);
  const total = newCapital + interestVal;
  const installmentVal = total / installments;

  document.getElementById('renew-calc-old-balance').innerText = formatCurrency(oldBalance);
  document.getElementById('renew-calc-additional').innerText = formatCurrency(additional);
  document.getElementById('renew-calc-new-capital').innerText = formatCurrency(newCapital);
  document.getElementById('renew-calc-rate').innerText = `${rate}%`;
  document.getElementById('renew-calc-new-total').innerText = formatCurrency(total);
  document.getElementById('renew-calc-new-installment').innerText = formatCurrency(installmentVal);

  if (startDateStr) {
    const d = new Date(startDateStr + 'T12:00:00');
    if (type === 'SEMANAL') {
      d.setDate(d.getDate() + (installments * 7));
    } else if (type === 'QUINCENAL') {
      d.setDate(d.getDate() + (installments * 15));
    } else if (type === 'MENSUAL') {
      d.setMonth(d.getMonth() + installments);
    } else {
      d.setDate(d.getDate() + installments);
    }
    document.getElementById('renew-calc-end-date').innerText = d.toISOString().split('T')[0];
  } else {
    document.getElementById('renew-calc-end-date').innerText = 'N/A';
  }
}

async function handleRenewLoanSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('modal-renew-loan-error');
  if (errorDiv) errorDiv.classList.add('hidden');

  const additional = parseFloat(document.getElementById('renew-loan-additional-amount').value);
  if (isNaN(additional) || additional <= 0) {
    if (errorDiv) {
      errorDiv.innerText = "El nuevo dinero a prestar debe ser mayor a cero.";
      errorDiv.classList.remove('hidden');
    }
    return;
  }

  if (!confirm('¿Está seguro de que desea confirmar esta renovación? Se sumará el saldo pendiente anterior a este nuevo capital y se generará una nueva deuda.')) {
    return;
  }

  const id = document.getElementById('modal-renew-loan-id-field').value;
  const selectRate = document.getElementById('renew-loan-interest-rate').value;
  const customRate = parseFloat(document.getElementById('renew-loan-interest-custom').value) || 0;
  const rate = selectRate === 'CUSTOM' ? customRate : parseFloat(selectRate);

  const payload = {
    clientId: document.getElementById('modal-renew-loan-client-id').value,
    amount: additional,
    loanType: document.getElementById('renew-loan-type').value,
    interestRate: rate,
    installmentsCount: parseInt(document.getElementById('renew-loan-installments').value),
    startDate: document.getElementById('renew-loan-start-date').value,
    notes: document.getElementById('renew-loan-notes').value
  };

  try {
    const res = await fetch(`${API_BASE}/loans/${id}/renew`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al renovar préstamo.');
    }

    closeRenewLoanModal();
    alert('Préstamo renovado con éxito.');
    if (currentTab === 'client-profile') {
      viewClientProfile(payload.clientId);
    } else {
      switchTab('clients');
    }
  } catch (error) {
    if (errorDiv) {
      errorDiv.innerText = error.message;
      errorDiv.classList.remove('hidden');
    } else {
      alert(error.message);
    }
  }
}
