// FILE: public/js/risklevel.js
document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/risk-levels')
    .then(res => res.json())
    .then(data => {
      const tableBody = document.querySelector('#risk-levels-table tbody');
      tableBody.innerHTML = '';

      data.forEach(entry => {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${entry.account_id}</td>
          <td>${entry.first_name} ${entry.last_name}</td>
          <td class="${getRiskClass(entry.risk_score)}">${entry.risk_score}</td>
          <td>${entry.device_os || 'Unknown'} (${entry.device_type})</td>
          <td>${new Date(entry.last_assessment_date).toLocaleDateString()}</td>
        `;

        tableBody.appendChild(row);
      });
    })
    .catch(error => {
      console.error('Error loading risk levels:', error);
    });
});

function getRiskClass(score) {
  if (score >= 90) return 'risk-critical';
  if (score >= 80) return 'risk-high';
  if (score >= 70) return 'risk-medium';
  return 'risk-low';
}
