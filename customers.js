const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const app = express();

app.use(express.static('views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Password@123',
  database: 'Frauddetection'
});

function formatDate(dateInput) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

app.get('/', (req, res) => {
  fs.readFile('./views/test.html', 'utf-8', (err, html) => {
    if (err) return res.status(500).send('Error loading HTML');

    connection.query('SELECT * FROM Customers', (err, results) => {
      if (err) return res.status(500).send('Database query error');

      const rows = results.map(row => `
        <tr data-id="${row.customer_id}">
          <td>${row.customer_id}</td>
          <td contenteditable="false">${row.first_name}</td>
          <td contenteditable="false">${row.last_name}</td>
          <td contenteditable="false">${row.email}</td>
          <td contenteditable="false">${row.phone_number}</td>
          <td contenteditable="false">${row.address}</td>
          <td contenteditable="false">${row.profession}</td>
          <td contenteditable="false">${formatDate(row.date_of_birth)}</td>
          <td>${formatDate(row.customer_since)}</td>
          <td><button class="edit-btn">Edit</button></td>
        </tr>
      `).join('');

      res.send(html.replace('{{rows}}', rows));
    });
  });
});

app.get('/search', (req, res) => {
  const q = req.query.q || '';
  const like = `%${q}%`;

  const sql = `
    SELECT * FROM Customers
    WHERE
      customer_id LIKE ? OR
      first_name LIKE ? OR
      last_name LIKE ? OR
      email LIKE ? OR
      phone_number LIKE ? OR
      address LIKE ? OR
      profession LIKE ? OR
      date_of_birth LIKE ? OR
      customer_since LIKE ?
  `;

  const values = Array(9).fill(like);

  connection.query(sql, values, (err, results) => {
    if (err) return res.status(500).send('Database error');

    const rows = results.map(row => `
      <tr data-id="${row.customer_id}">
        <td>${row.customer_id}</td>
        <td contenteditable="false">${row.first_name}</td>
        <td contenteditable="false">${row.last_name}</td>
        <td contenteditable="false">${row.email}</td>
        <td contenteditable="false">${row.phone_number}</td>
        <td contenteditable="false">${row.address}</td>
        <td contenteditable="false">${row.profession}</td>
        <td contenteditable="false">${formatDate(row.date_of_birth)}</td>
        <td>${formatDate(row.customer_since)}</td>
        <td><button class="edit-btn">Edit</button></td>
      </tr>
    `).join('');

    res.send(rows);
  });
});

app.get('/search-by-date', (req, res) => {
  const { field, start, end } = req.query;
  const allowedFields = ['date_of_birth', 'customer_since'];
  if (!allowedFields.includes(field)) {
    return res.status(400).send('Invalid date field');
  }

  const sql = `SELECT * FROM Customers WHERE ${field} BETWEEN ? AND ?`;

  connection.query(sql, [start, end], (err, results) => {
    if (err) return res.status(500).send('Database error');

    const rows = results.map(row => `
      <tr data-id="${row.customer_id}">
        <td>${row.customer_id}</td>
        <td contenteditable="false">${row.first_name}</td>
        <td contenteditable="false">${row.last_name}</td>
        <td contenteditable="false">${row.email}</td>
        <td contenteditable="false">${row.phone_number}</td>
        <td contenteditable="false">${row.address}</td>
        <td contenteditable="false">${row.profession}</td>
        <td contenteditable="false">${formatDate(row.date_of_birth)}</td>
        <td>${formatDate(row.customer_since)}</td>
        <td><button class="edit-btn">Edit</button></td>
      </tr>
    `).join('');

    res.send(rows);
  });
});

app.post('/add-customer', (req, res) => {
  const { first_name, last_name, email, phone_number, address, profession, date_of_birth, customer_since } = req.body;

  const sql = `
    INSERT INTO Customers (first_name, last_name, email, phone_number, address, profession, date_of_birth, customer_since)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [first_name, last_name, email, phone_number, address, profession, date_of_birth, customer_since];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error("Insert error:", err);
      return res.status(500).json({ error: 'Failed to insert customer into database.' });
    }

    console.log("✅ Inserted into DB. ID:", result.insertId); // Added log

    const customer_id = result.insertId;
    res.json({
      customer_id,
      first_name,
      last_name,
      email,
      phone_number,
      address,
      profession,
      date_of_birth,
      customer_since
    });
  });
});

app.put('/edit-customer/:id', (req, res) => {
  const id = req.params.id;
  const { first_name, last_name, email, phone_number, address, profession, date_of_birth } = req.body;

  const sql = `
    UPDATE Customers
    SET first_name = ?, last_name = ?, email = ?, phone_number = ?, address = ?, profession = ?, date_of_birth = ?
    WHERE customer_id = ?
  `;
  const values = [first_name, last_name, email, phone_number, address, profession, date_of_birth, id];

  connection.query(sql, values, (err) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send('Update failed');
    }
    console.log("✅ Customer updated. ID:", id); // Added log
    res.sendStatus(200);
  });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
