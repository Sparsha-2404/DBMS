function generateReport(type) {
  switch (type) {
    case 'monthly':
      fetch('/api/alerts')
        .then(res => res.json())
        .then(data => {
          const monthlyCounts = {};
          data.forEach(alert => {
            const month = new Date(alert.alert_date).toLocaleString('default', { month: 'short', year: 'numeric' });
            monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
          });

          new Chart(document.getElementById('monthlyChart'), {
            type: 'line',
            data: {
              labels: Object.keys(monthlyCounts),
              datasets: [{
                label: 'Fraud Alerts',
                data: Object.values(monthlyCounts),
                borderColor: '#FF6384',
                fill: false
              }]
            },
            options: { responsive: true }
          });
        });
      break;

    case 'risk':
      fetch('/api/high-risk-accounts')
        .then(res => res.json())
        .then(data => {
          const riskBuckets = { '90-100': 0, '80-89': 0, '70-79': 0 };
          data.forEach(acc => {
            if (acc.risk_score >= 90) riskBuckets['90-100']++;
            else if (acc.risk_score >= 80) riskBuckets['80-89']++;
            else if (acc.risk_score >= 70) riskBuckets['70-79']++;
          });

          new Chart(document.getElementById('riskChart'), {
            type: 'bar',
            data: {
              labels: Object.keys(riskBuckets),
              datasets: [{
                label: 'Accounts',
                data: Object.values(riskBuckets),
                backgroundColor: '#36A2EB'
              }]
            },
            options: { responsive: true }
          });
        });
      break;

    case 'suspicious':
      fetch('/api/suspicious-login-attempts')
        .then(res => res.json())
        .then(data => {
          const suspiciousCounts = {};
          data.forEach(login => {
            const date = new Date(login.login_date).toLocaleDateString();
            suspiciousCounts[date] = (suspiciousCounts[date] || 0) + 1;
          });

          new Chart(document.getElementById('suspiciousChart'), {
            type: 'bar',
            data: {
              labels: Object.keys(suspiciousCounts),
              datasets: [{
                label: 'Login Attempts',
                data: Object.values(suspiciousCounts),
                backgroundColor: '#FFCE56'
              }]
            },
            options: { responsive: true }
          });
        });
      break;

    case 'compliance':
      fetch('/api/accounts')
        .then(res => res.json())
        .then(accounts => {
          const total = accounts.length;
          const highRisk = accounts.filter(acc => acc.risk_score >= 90).length;
          const compliant = total - highRisk;
          document.getElementById('complianceReport').innerHTML = `
            <p><strong>Total Accounts:</strong> ${total}</p>
            <p><strong>Compliant Accounts:</strong> ${compliant}</p>
            <p><strong>High Risk Accounts:</strong> ${highRisk}</p>
            <p><strong>Compliance Rate:</strong> ${(compliant / total * 100).toFixed(2)}%</p>
          `;
        });
      break;
  }
}
