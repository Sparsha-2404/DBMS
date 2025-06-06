let banks = [];
let editingBank = null;

// Global error message element (add this to your HTML)
const errorMessageElement = document.createElement('div');
errorMessageElement.id = 'error-message';
errorMessageElement.style.color = 'red';

// Global form error element (add this to your HTML, probably near the form)
const formErrorElement = document.createElement('div');
formErrorElement.id = 'form-error';
formErrorElement.style.color = 'red';

async function fetchBanks() {
    try {
        const res = await fetch('/api/banks');
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        banks = await res.json();
        renderBanks();
        errorMessageElement.textContent = ''; // Clear any previous errors
    } catch (err) {
        console.error('Failed to fetch banks:', err);
        errorMessageElement.textContent = 'Failed to load bank data.'; // Display error
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const bankContainer = document.getElementById('bankContainer');
    if (bankContainer) {
        bankContainer.before(errorMessageElement); // Insert before bankContainer
    }

    const bankForm = document.getElementById('bankForm');
    if (bankForm) {
        bankForm.before(formErrorElement); // Insert before bankForm
    }

    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const riskFilter = document.getElementById("riskFilter");

    searchInput.addEventListener("input", renderBanks);  // For search as you type
    statusFilter.addEventListener("change", renderBanks);
    riskFilter.addEventListener("change", renderBanks);

    fetchBanks();
});

function renderBanks() {
    const container = document.getElementById("bankContainer");
    const empty = document.getElementById("emptyState");
    const search = document.getElementById("searchInput").value.toLowerCase();
    const status = document.getElementById("statusFilter").value;
    const risk = document.getElementById("riskFilter").value;

    if (!Array.isArray(banks)) {
        console.error("Expected array, got:", banks);
        return;
    }

    const filtered = banks.filter(b =>
        (!status || b.connection_status?.toLowerCase() === status.toLowerCase()) &&
        (!risk || b.risk_rating?.toLowerCase() === risk.toLowerCase()) &&
        (b.bank_name?.toLowerCase().includes(search) || b.bank_code?.toLowerCase().includes(search))
    );

    container.innerHTML = "";
    if (filtered.length === 0) {
        empty.classList.remove("d-none");
        return;
    }

    empty.classList.add("d-none");
    filtered.forEach(bank => {
        const card = document.createElement("div");
        card.className = "col-md-4";
        card.innerHTML = `
      <div class="card shadow-sm p-3">
        <div class="d-flex justify-content-between">
          <h5>${bank.bank_name}</h5>
          <small class="text-muted">${bank.bank_code}</small>
        </div>
        <p>${bank.country}</p>
        <p>Status: ${bank.connection_status}</p>
        <p>Risk: ${bank.risk_rating}</p>
        <div>Fraud: ${bank.fraud_incidents} | Tx: ${bank.total_transactions} | Success: ${bank.success_rate}%</div>
      </div>
    `;
        container.appendChild(card);
    });
}

document.getElementById('bankForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const bankName = document.getElementById('bankName').value.trim();
    const bankCode = document.getElementById('bankCode').value.trim();
    const bankCountry = document.getElementById('bankCountry').value.trim();
    const swiftCode = document.getElementById('swiftCode').value.trim();
    const routingNumber = document.getElementById('routingNumber').value.trim();
    const status = document.getElementById('status').value;
    const risk = document.getElementById('risk').value;
    const fraudCases = document.getElementById('fraudCases').value.trim();
    const transactions = document.getElementById('transactions').value.trim();
    const successRate = document.getElementById('successRate').value.trim();

    if (!bankName || !bankCode || !bankCountry || !swiftCode || !routingNumber || !status || !risk || !fraudCases || !transactions || !successRate) {
        formErrorElement.textContent = 'Please fill in all fields.';
        return;
    }

    if (isNaN(parseInt(fraudCases)) || isNaN(parseInt(transactions)) || isNaN(parseFloat(successRate))) {
        formErrorElement.textContent = 'Invalid number format.';
        return;
    }

    if (parseFloat(successRate) < 0 || parseFloat(successRate) > 100) {
        formErrorElement.textContent = 'Success rate must be between 0 and 100.';
        return;
    }

    const data = {
        bank_name: bankName,
        bank_code: bankCode,
        country: bankCountry,
        swift_code: swiftCode,
        routing_number: routingNumber,
        connection_status: status,
        risk_rating: risk,
        fraud_incidents: Number(fraudCases),
        total_transactions: Number(transactions),
        success_rate: Number(successRate),
    };

    try {
        const res = await fetch('/api/banks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }

        const result = await res.json();
        if (result.success) {
            fetchBanks();
            bootstrap.Modal.getInstance(document.getElementById('addBankModal')).hide();
            formErrorElement.textContent = ''; // Clear any previous errors
        } else {
            console.error('Submission failed:', result.error || 'Unknown error');
            formErrorElement.textContent = result.error || 'Unknown error';
        }
    } catch (err) {
        console.error('Submission failed:', err);
        formErrorElement.textContent = 'Failed to submit the form.';
    }
});