let allAccounts = [];
let filteredAccounts = [];
let currentPage = 1;
const recordsPerPage = 25;
let sortField = null;
let sortDirection = 'asc';

document.addEventListener('DOMContentLoaded', function () {
  loadAccounts();
  setupEventListeners();
});

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function setupEventListeners() {
  document.getElementById('search-input').addEventListener('input', debounce(applyFilters, 300));
  document.getElementById('apply-filters').addEventListener('click', applyFilters);
  document.getElementById('clear-filters').addEventListener('click', clearFilters);
  document.getElementById('refresh-btn').addEventListener('click', loadAccounts);
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
  document.getElementById('next-page').addEventListener('click', () => changePage(1));

  document.querySelectorAll('[data-sort]').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.getAttribute('data-sort');
      if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortDirection = 'asc';
      }
      applyFilters();
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('account-modal')) {
      closeModal();
    }
  });
}

function loadAccounts() {
  showLoading(true);
  hideError();

  fetch('/api/accounts')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      allAccounts = data;
      updateStatistics();
      applyFilters();
      showLoading(false);
    })
    .catch(error => {
      console.error('Error loading accounts:', error);
      showError('Failed to load accounts data. Please check your connection and try again.');
      showLoading(false);
    });
}

function applyFilters() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const typeFilter = document.getElementById('type-filter').value;
  const statusFilter = document.getElementById('status-filter').value;
  const riskFilter = document.getElementById('risk-filter').value;

  filteredAccounts = allAccounts.filter(account => {
    const matchesSearch = !searchTerm ||
      account.account_id.toString().includes(searchTerm) ||
      `${account.first_name} ${account.last_name}`.toLowerCase().includes(searchTerm) ||
      account.account_type.toLowerCase().includes(searchTerm);

    const matchesType = typeFilter === 'all' || account.account_type.toLowerCase() === typeFilter;
    const matchesStatus = statusFilter === 'all' || account.account_status === statusFilter;

    let matchesRisk = true;
    if (riskFilter !== 'all' && account.risk_score !== null) {
      switch (riskFilter) {
        case 'high': matchesRisk = account.risk_score >= 80; break;
        case 'medium': matchesRisk = account.risk_score >= 50 && account.risk_score < 80; break;
        case 'low': matchesRisk = account.risk_score < 50; break;
      }
    } else if (riskFilter !== 'all' && account.risk_score === null) {
      matchesRisk = false;
    }

    return matchesSearch && matchesType && matchesStatus && matchesRisk;
  });

  if (sortField) {
    filteredAccounts.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'customer') {
        aVal = `${a.first_name} ${a.last_name}`;
        bVal = `${b.first_name} ${b.last_name}`;
      }

      if (sortField === 'balance' || sortField === 'risk_score') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (sortField === 'creation_date' || sortField === 'last_updated') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  currentPage = 1;
  renderTable();
  updatePagination();
}

function renderTable() {
  const tableBody = document.getElementById('accounts-table');
  tableBody.innerHTML = '';

  const start = (currentPage - 1) * recordsPerPage;
  const end = start + recordsPerPage;
  const pageAccounts = filteredAccounts.slice(start, end);

  pageAccounts.forEach(acc => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${acc.account_id}</td>
      <td>${acc.first_name} ${acc.last_name}</td>
      <td>${acc.account_type}</td>
      <td>$${parseFloat(acc.balance || 0).toFixed(2)}</td>
      <td>${acc.account_status}</td>
      <td>${acc.risk_score !== null ? acc.risk_score : 'N/A'}</td>
      <td>${acc.creation_date ? new Date(acc.creation_date).toLocaleDateString() : 'N/A'}</td>
      <td>${acc.last_updated ? new Date(acc.last_updated).toLocaleDateString() : 'N/A'}</td>
      <td><button class="view-btn" data-account='${JSON.stringify(acc)}'>View</button></td>
    `;
    tableBody.appendChild(row);

    const viewBtn = row.querySelector('.view-btn');
    viewBtn.addEventListener('click', function () {
      const account = JSON.parse(this.dataset.account);
      showAccountModal(account);
    });
  });
}

function showAccountModal(account) {
  const modal = document.getElementById('account-modal');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <h2>Account Details</h2>
    <ul>
      <li><strong>Account ID:</strong> ${account.account_id}</li>
      <li><strong>Customer:</strong> ${account.first_name} ${account.last_name}</li>
      <li><strong>Type:</strong> ${account.account_type}</li>
      <li><strong>Balance:</strong> $${parseFloat(account.balance || 0).toFixed(2)}</li>
      <li><strong>Status:</strong> ${account.account_status}</li>
      <li><strong>Risk Score:</strong> ${account.risk_score ?? 'N/A'}</li>
      <li><strong>Created:</strong> ${account.creation_date ? new Date(account.creation_date).toLocaleDateString() : 'N/A'}</li>
      <li><strong>Last Updated:</strong> ${account.last_updated ? new Date(account.last_updated).toLocaleDateString() : 'N/A'}</li>
    </ul>
    <button id="close-modal">Close</button>
  `;

  modal.classList.remove('hidden');

  document.getElementById('close-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

function closeModal() {
  document.getElementById('account-modal').classList.add('hidden');
}

// Placeholder functions for completeness
function updatePagination() {
  const totalPages = Math.ceil(filteredAccounts.length / recordsPerPage);
  document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prev-page').disabled = currentPage === 1;
  document.getElementById('next-page').disabled = currentPage === totalPages;

  const start = (currentPage - 1) * recordsPerPage + 1;
  const end = Math.min(start + recordsPerPage - 1, filteredAccounts.length);
  document.getElementById('showing-from').textContent = filteredAccounts.length ? start : 0;
  document.getElementById('showing-to').textContent = filteredAccounts.length ? end : 0;
  document.getElementById('total-records').textContent = filteredAccounts.length;
}

function changePage(delta) {
  const totalPages = Math.ceil(filteredAccounts.length / recordsPerPage);
  currentPage = Math.max(1, Math.min(currentPage + delta, totalPages));
  renderTable();
  updatePagination();
}

function updateStatistics() {
  document.getElementById('total-accounts').textContent = allAccounts.length;
  document.getElementById('active-accounts').textContent = allAccounts.filter(a => a.account_status === 'Active').length;
  document.getElementById('suspended-accounts').textContent = allAccounts.filter(a => a.account_status === 'Suspended').length;
  document.getElementById('high-risk-accounts').textContent = allAccounts.filter(a => a.risk_score >= 80).length;
}

function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
}

function showError(msg) {
  const el = document.getElementById('error-message');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  const el = document.getElementById('error-message');
  el.textContent = '';
  el.classList.add('hidden');
}

function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('type-filter').value = 'all';
  document.getElementById('status-filter').value = 'all';
  document.getElementById('risk-filter').value = 'all';
  applyFilters();
}

function exportData() {
  const headers = ['Account ID', 'Customer', 'Type', 'Balance', 'Status', 'Risk Score', 'Created', 'Last Updated'];
  const rows = filteredAccounts.map(acc => [
    acc.account_id,
    `${acc.first_name} ${acc.last_name}`,
    acc.account_type,
    acc.balance,
    acc.account_status,
    acc.risk_score ?? 'N/A',
    acc.creation_date,
    acc.last_updated,
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(val => `"${val}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'accounts_export.csv';
  link.click();
}
