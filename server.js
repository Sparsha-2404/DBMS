const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection config - update with your DB info
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Password@123',
  database: 'Frauddetection',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Async handler wrapper to reduce try-catch duplication
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// --- Banks APIs ---

// Validation helper for bank fields
const validateBank = (body) => {
  const requiredFields = [
    'bank_name', 'bank_code', 'country', 'swift_code', 'routing_number',
    'risk_rating', 'fraud_incidents', 'total_transactions',
    'success_rate', 'connection_status'
  ];
  for (const field of requiredFields) {
    if (body[field] === undefined) return `Missing field: ${field}`;
  }
  return null;
};

// Get all banks
app.get('/api/banks', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM Banks ORDER BY bank_id');
  res.json(rows);
}));

// Add a new bank
app.post('/api/banks', asyncHandler(async (req, res) => {
  const validationError = validateBank(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const {
    bank_name, bank_code, country, swift_code, routing_number,
    risk_rating, fraud_incidents, total_transactions,
    success_rate, connection_status
  } = req.body;

  const [result] = await pool.query(
    `INSERT INTO Banks
    (bank_name, bank_code, country, swift_code, routing_number,
    risk_rating, fraud_incidents, total_transactions,
    success_rate, connection_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      bank_name, bank_code, country, swift_code, routing_number,
      risk_rating, fraud_incidents, total_transactions,
      success_rate, connection_status
    ]
  );

  res.status(201).json({ message: 'Bank added', bank_id: result.insertId });
}));

// Update a bank by ID
app.put('/api/banks/:id', asyncHandler(async (req, res) => {
  const validationError = validateBank(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const bankId = req.params.id;
  const {
    bank_name, bank_code, country, swift_code, routing_number,
    risk_rating, fraud_incidents, total_transactions,
    success_rate, connection_status
  } = req.body;

  const [result] = await pool.query(
    `UPDATE Banks SET
      bank_name = ?, bank_code = ?, country = ?, swift_code = ?, routing_number = ?,
      risk_rating = ?, fraud_incidents = ?, total_transactions = ?,
      success_rate = ?, connection_status = ?, updated_at = NOW()
    WHERE bank_id = ?`,
    [
      bank_name, bank_code, country, swift_code, routing_number,
      risk_rating, fraud_incidents, total_transactions,
      success_rate, connection_status,
      bankId
    ]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Bank not found' });
  }

  res.json({ message: 'Bank updated' });
}));

// Delete a bank by ID
app.delete('/api/banks/:id', asyncHandler(async (req, res) => {
  const bankId = req.params.id;
  const [result] = await pool.query('DELETE FROM Banks WHERE bank_id = ?', [bankId]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Bank not found' });
  }

  res.json({ message: 'Bank deleted' });
}));

// --- RiskLevel APIs ---

// Validation helper for risk level
const validateRiskLevel = (body) => {
  const requiredFields = ['account_id', 'device_at_risk', 'risk_score'];
  for (const field of requiredFields) {
    if (body[field] === undefined) return `Missing field: ${field}`;
  }
  return null;
};

// Get all risk levels
app.get('/api/risklevels', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM RiskLevel ORDER BY last_assessment_date DESC');
  res.json(rows);
}));

// Add a risk level
app.post('/api/risklevels', asyncHandler(async (req, res) => {
  const validationError = validateRiskLevel(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { account_id, device_at_risk, risk_score, last_assessment_date } = req.body;

  const assessmentDate = last_assessment_date ? new Date(last_assessment_date) : new Date();

  const [result] = await pool.query(
    `INSERT INTO RiskLevel (account_id, device_at_risk, risk_score, last_assessment_date)
     VALUES (?, ?, ?, ?)`,
    [account_id, device_at_risk, risk_score, assessmentDate]
  );

  res.status(201).json({ message: 'Risk level added' });
}));

// Update a risk level by account_id & device_at_risk
app.put('/api/risklevels/:account_id/:device_at_risk', asyncHandler(async (req, res) => {
  const { account_id, device_at_risk } = req.params;
  const { risk_score, last_assessment_date } = req.body;

  if (risk_score === undefined) {
    return res.status(400).json({ error: 'Missing field: risk_score' });
  }

  const assessmentDate = last_assessment_date ? new Date(last_assessment_date) : new Date();

  const [result] = await pool.query(
    `UPDATE RiskLevel SET risk_score = ?, last_assessment_date = ?
     WHERE account_id = ? AND device_at_risk = ?`,
    [risk_score, assessmentDate, account_id, device_at_risk]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Risk level not found' });
  }

  res.json({ message: 'Risk level updated' });
}));

// Delete a risk level by account_id & device_at_risk
app.delete('/api/risklevels/:account_id/:device_at_risk', asyncHandler(async (req, res) => {
  const { account_id, device_at_risk } = req.params;

  const [result] = await pool.query(
    'DELETE FROM RiskLevel WHERE account_id = ? AND device_at_risk = ?',
    [account_id, device_at_risk]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Risk level not found' });
  }

  res.json({ message: 'Risk level deleted' });
}));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Internal server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Customers APIs
 */

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Customers ORDER BY customer_id');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

// Get single customer by ID
app.get('/api/customers/:id', async (req, res) => {
  try {
    const customerId = req.params.id;
    const [rows] = await pool.query('SELECT * FROM Customers WHERE customer_id = ?', [customerId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch customer' });
  }
});

// Add new customer
app.post('/api/customers', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone_number,
      address, profession, date_of_birth, customer_since
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO Customers
      (first_name, last_name, email, phone_number, address, profession, date_of_birth, customer_since)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, phone_number, address, profession, date_of_birth, customer_since || null]
    );

    res.status(201).json({ message: 'Customer added', customer_id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add customer', error: error.sqlMessage });
  }
});

// Update customer by ID
app.put('/api/customers/:id', async (req, res) => {
  try {
    const customerId = req.params.id;
    const {
      first_name, last_name, email, phone_number,
      address, profession, date_of_birth, customer_since
    } = req.body;

    const [result] = await pool.query(
      `UPDATE Customers SET
        first_name = ?, last_name = ?, email = ?, phone_number = ?,
        address = ?, profession = ?, date_of_birth = ?, customer_since = ?
      WHERE customer_id = ?`,
      [first_name, last_name, email, phone_number, address, profession, date_of_birth, customer_since || null, customerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Customer updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update customer', error: error.sqlMessage });
  }
});

// Delete customer by ID
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const customerId = req.params.id;
    const [result] = await pool.query('DELETE FROM Customers WHERE customer_id = ?', [customerId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

/**
 * Accounts APIs
 */

// Get all accounts
app.get('/api/accounts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Accounts ORDER BY account_id');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch accounts' });
  }
});

// Get single account by ID
app.get('/api/accounts/:id', async (req, res) => {
  try {
    const accountId = req.params.id;
    const [rows] = await pool.query('SELECT * FROM Accounts WHERE account_id = ?', [accountId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch account' });
  }
});

// Add new account
app.post('/api/accounts', async (req, res) => {
  try {
    const {
      customer_id, account_type, balance,
      account_status, creation_date, last_updated
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO Accounts
      (customer_id, account_type, balance, account_status, creation_date, last_updated)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customer_id, account_type, balance || 0.0,
        account_status, creation_date || null, last_updated || null
      ]
    );

    res.status(201).json({ message: 'Account added', account_id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add account', error: error.sqlMessage });
  }
});

// Update account by ID
app.put('/api/accounts/:id', async (req, res) => {
  try {
    const accountId = req.params.id;
    const {
      customer_id, account_type, balance,
      account_status, creation_date, last_updated
    } = req.body;

    const [result] = await pool.query(
      `UPDATE Accounts SET
        customer_id = ?, account_type = ?, balance = ?,
        account_status = ?, creation_date = ?, last_updated = ?
      WHERE account_id = ?`,
      [
        customer_id, account_type, balance || 0.0,
        account_status, creation_date || null, last_updated || null,
        accountId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ message: 'Account updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update account', error: error.sqlMessage });
  }
});

// Delete account by ID
app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const accountId = req.params.id;
    const [result] = await pool.query('DELETE FROM Accounts WHERE account_id = ?', [accountId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ message: 'Account deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

// Devices Routes
app.get('/api/devices', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT device_id, customer_id, ip_address, device_type, device_os, first_used, last_used 
       FROM Devices ORDER BY last_used DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch devices" });
  }
});

app.post('/api/devices', async (req, res) => {
  try {
    const { customer_id, ip_address, device_type, device_os } = req.body;
    const now = new Date();

    const [existing] = await pool.query(
      `SELECT * FROM Devices 
       WHERE customer_id = ? AND ip_address = ? AND device_os = ?`,
      [customer_id, ip_address, device_os]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE Devices 
         SET last_used = ? 
         WHERE device_id = ?`,
        [now, existing[0].device_id]
      );
      return res.json({ message: 'Device updated' });
    }

    await pool.query(
      `INSERT INTO Devices (customer_id, ip_address, device_type, device_os, first_used, last_used)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_id, ip_address, device_type, device_os, now, now]
    );

    res.status(201).json({ message: 'Device registered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to register device", error: err.sqlMessage });
  }
});

// Function to insert dummy login attempts (optional, uncomment to use)
async function insertDummyLoginAttempts() {
  const dummyData = [
    { customer_id: 1, device_id: 1, login_status: 'success', location: 'New York, USA' },
    { customer_id: 2, device_id: 2, login_status: 'failure', location: 'Berlin, Germany' },
    { customer_id: 1, device_id: 3, login_status: 'failure', location: 'Mumbai, India' }
  ];

  try {
    for (const attempt of dummyData) {
      await pool.query(
        `INSERT INTO LoginAttempts (customer_id, device_id, login_status, location)
         VALUES (?, ?, ?, ?)`,
        [attempt.customer_id, attempt.device_id, attempt.login_status, attempt.location]
      );
    }
    console.log('Dummy login attempts inserted.');
  } catch (error) {
    console.error('Error inserting dummy login attempts:', error);
  }
}

// Uncomment the next line to seed your DB once, then comment it again
// insertDummyLoginAttempts();

// GET route to fetch login attempts
app.get('/api/loginattempts', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        la.login_id, 
        la.customer_id,
        la.login_date,
        la.device_id,
        la.login_status
      FROM LoginAttempts la
      JOIN Customers c ON la.customer_id = c.customer_id
      ORDER BY la.login_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch login attempts' });
  }
});

// NEW: POST route to insert a login attempt
app.post('/api/loginattempts', async (req, res) => {
  const { customer_id, device_id, login_status, location } = req.body;

  if (!customer_id || !device_id || !login_status || !location) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    await pool.query(
      `INSERT INTO LoginAttempts (customer_id, device_id, login_status)
       VALUES (?, ?, ?)`,
      [customer_id, device_id, login_status]
    );
    res.status(201).json({ message: 'Login attempt recorded' });
  } catch (error) {
    console.error('Error inserting login attempt:', error);
    res.status(500).json({ message: 'Failed to insert login attempt' });
  }
});

// Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Transactions ORDER BY transaction_date DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
