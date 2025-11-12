/**
 * Admin Dashboard Script - Simplified Version
 * Shows demo data (Firebase disabled for now)
 */

// DOM elements
const loadingState = document.getElementById('loadingState');
const accessDenied = document.getElementById('accessDenied');
const dashboardContent = document.getElementById('dashboardContent');

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminAccess();
});

async function checkAdminAccess() {
  // Check if user is logged in
  const { user } = await chrome.storage.local.get(['user']);
  
  // Check URL parameters for tab routing
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get('tab');
  
  if (!user || !user.loggedIn) {
    // Not logged in - redirect to login
    window.location.href = chrome.runtime.getURL('extension/popup/login.html');
    return;
  }
  
  // User is logged in
  loadingState.style.display = 'none';
  
  // Show appropriate content based on role
  if (user.role === 'admin') {
    // Admin can see everything
    dashboardContent.style.display = 'block';
    document.querySelector('header h1').textContent = '👑 Admin Dashboard';
    loadDashboard();
  } else {
    // Regular user - show history only
    if (requestedTab === 'history' || requestedTab === 'profile') {
      dashboardContent.style.display = 'block';
      document.querySelector('header h1').textContent = '📊 My Scan History';
      document.querySelector('header .subtitle').textContent = `Welcome, ${user.name || user.email}`;
      
      // Hide admin-only sections
      const statsGrid = document.querySelector('.stats-grid');
      if (statsGrid) statsGrid.style.display = 'none';
      
      const chartsGrid = document.querySelector('.charts-grid');
      if (chartsGrid) chartsGrid.style.display = 'none';
      
      const topUsers = document.getElementById('topUsers');
      if (topUsers) topUsers.style.display = 'none';
      
      loadUserHistory();
    } else {
      // Trying to access admin features without permission
      accessDenied.style.display = 'flex';
    }
  }
  
  // Add logout button
  addLogoutButton(user);
}

function addLogoutButton(user) {
  const header = document.querySelector('header');
  const userInfo = document.createElement('div');
  userInfo.style.cssText = 'margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
  userInfo.innerHTML = `
    <span style="font-size: 14px; color: #666;">
      ${user.role === 'admin' ? '👑' : '👤'} ${user.email}
    </span>
    <button id="logoutBtn" style="padding: 6px 16px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
      Logout
    </button>
  `;
  header.appendChild(userInfo);
  
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await chrome.storage.local.remove('user');
    window.location.href = chrome.runtime.getURL('extension/popup/login.html');
  });
}

function loadUserHistory() {
  // Load user's personal scan history
  chrome.storage.local.get(['scanHistory'], (result) => {
    const history = result.scanHistory || [];
    const recentDetections = document.getElementById('recentDetections');
    if (!recentDetections) return;
    
    const tbody = recentDetections.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 32px; color: #999;">No scans yet. Start scanning to see results here!</td></tr>';
      return;
    }
    
    history.slice(0, 20).forEach(scan => {
      const row = document.createElement('tr');
      const date = new Date(scan.timestamp).toLocaleString();
      const result = scan.result?.label || scan.result || 'Unknown';
      const confidence = scan.result?.aiScore || scan.confidence || 0;
      
      row.innerHTML = `
        <td>${date}</td>
        <td><img src="${scan.imageUrl}" style="max-width: 80px; max-height: 60px; border-radius: 4px;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 60\\'%3E%3Crect fill=\\'%23e9ecef\\' width=\\'100\\' height=\\'60\\'/%3E%3C/svg%3E'"></td>
        <td><span class="badge badge-${result.toLowerCase().includes('ai') ? 'ai' : 'human'}">${result}</span></td>
        <td>${confidence}%</td>
      `;
      tbody.appendChild(row);
    });
  });
}

async function loadDashboard() {
  loadSystemStats();
  loadCharts();
  loadRecentDetections();
  loadTopUsers();
  setupEventListeners();
  updateLastUpdated();
}

function loadSystemStats() {
  // Demo data
  document.getElementById('totalUsers').textContent = '0';
  document.getElementById('totalDetections').textContent = '0';
  document.getElementById('aiPercentage').textContent = '0%';
  document.getElementById('activeUsers').textContent = '0';
}

function loadCharts() {
  // Skip charts if Chart.js not loaded (CSP blocks CDN)
  const trendsCtx = document.getElementById('trendsChart');
  const distCtx = document.getElementById('distributionChart');
  
  if (!window.Chart) {
    // Hide chart sections if Chart.js not available
    const chartsGrid = document.querySelector('.charts-grid');
    if (chartsGrid) {
      chartsGrid.innerHTML = '<p style="text-align: center; padding: 32px; color: #666;">Charts disabled (Chart.js not loaded due to CSP)</p>';
    }
    return;
  }
  
  // Trends Chart
  if (trendsCtx) {
    new Chart(trendsCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Detections',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#3b82f6',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
  
  // Distribution Chart
  if (distCtx) {
    new Chart(distCtx, {
      type: 'doughnut',
      data: {
        labels: ['Real (0-10%)', 'Likely Real (10-45%)', 'Suspicious (45-90%)', 'AI Generated (90-100%)'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}

function loadRecentDetections() {
  const table = document.getElementById('detectionsTable');
  table.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 2rem; color: #9ca3af;">
        No detections yet. Start analyzing images to see data here.
      </td>
    </tr>
  `;
}

function loadTopUsers() {
  const table = document.getElementById('topUsersTable');
  table.innerHTML = `
    <tr>
      <td colspan="4" style="text-align: center; padding: 2rem; color: #9ca3af;">
        No users yet. Sign in functionality coming soon.
      </td>
    </tr>
  `;
}

function setupEventListeners() {
  // Refresh button
  document.getElementById('refreshBtn')?.addEventListener('click', () => {
    loadDashboard();
  });
  
  // Search button
  document.getElementById('searchBtn')?.addEventListener('click', () => {
    const email = document.getElementById('userSearch').value;
    if (email) {
      alert('User search feature coming soon!');
    }
  });
  
  // Export button
  document.getElementById('exportData')?.addEventListener('click', async () => {
    const data = await chrome.storage.local.get(null);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seethroughai-admin-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  
  // Pagination
  document.getElementById('prevPage')?.addEventListener('click', () => {
    alert('Pagination coming soon');
  });
  
  document.getElementById('nextPage')?.addEventListener('click', () => {
    alert('Pagination coming soon');
  });
}

function updateLastUpdated() {
  document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
}
