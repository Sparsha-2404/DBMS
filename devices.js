let devices = [];

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("devicesTableBody");
  const searchInput = document.getElementById("searchInput");
  const typeFilter = document.getElementById("typeFilter");

  function formatDate(dateStr) {
    return dateStr ? new Date(dateStr).toLocaleString() : "—";
  }

  function renderDevices(data) {
    tbody.innerHTML = "";
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-gray-500 text-center">No devices found</td></tr>`;
      return;
    }

    data.forEach(device => {
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      row.innerHTML = `
        <td class="px-6 py-4">${device.device_id}</td>
        <td class="px-6 py-4">${device.ip_address}</td>
        <td class="px-6 py-4">${device.device_type}</td>
        <td class="px-6 py-4">${device.device_os || "—"}</td>
        <td class="px-6 py-4">${formatDate(device.first_used)}</td>
        <td class="px-6 py-4">${formatDate(device.last_used)}</td>
      `;
      tbody.appendChild(row);
    });
  }

  function filterDevices() {
    const term = searchInput.value.toLowerCase();
    const type = typeFilter.value;

    const filtered = devices.filter(d =>
      (!type || d.device_type === type) &&
      (
        d.ip_address.toLowerCase().includes(term) ||
        (d.device_os && d.device_os.toLowerCase().includes(term))
      )
    );

    renderDevices(filtered);
  }

  searchInput.addEventListener("input", filterDevices);
  typeFilter.addEventListener("change", filterDevices);

  // Initial empty render
  renderDevices([]);

  // Fetch data
  fetch('http://localhost:3000/api/devices')
    .then(res => res.json())
    .then(data => {
      devices = data;
      renderDevices(devices);
    })
    .catch(err => {
      console.error('Error loading devices:', err);
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-red-500 text-center">Failed to load devices</td></tr>`;
    });
});
