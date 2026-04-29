require('dotenv').config();

const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const upload = multer();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString && connectionString.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : false,
  max: 2
});

app.get('/', (req, res) => {
  const sql = 'SELECT * FROM PRODUCT ORDER BY PROD_ID';

  pool.query(sql, [], (err, result) => {
    let message = '';
    let model = {};

    if (err) {
      message = `Error - ${err.message}`;
    } else {
      message = 'success';
      model = result.rows;
    }

    res.render('index', {
      message,
      model,
    });
  });
});

app.get('/input', (req, res) => {
  res.render('input');
});

app.post('/input', upload.single('filename'), (req, res) => {
  if (!req.file || Object.keys(req.file).length === 0) {
    return res.send('Error: Import file not uploaded');
  }

  const buffer = req.file.buffer;
  const lines = buffer
    .toString()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  lines.forEach((line) => {
    const product = line.split(',');
    const sql = 'INSERT INTO PRODUCT(prod_id, prod_name, prod_desc, prod_price) VALUES ($1, $2, $3, $4)';

    pool.query(sql, product, (err) => {
      if (err) {
        console.log(`Insert Error. Error message: ${err.message}`);
      } else {
        console.log('Inserted successfully');
      }
    });
  });

  const message = `Processing Complete - Processed ${lines.length} records`;
  res.send(message);
});

app.get('/output', (req, res) => {
  res.render('output', { message: '' });
});

app.post('/output', (req, res) => {
  const sql = 'SELECT * FROM PRODUCT ORDER BY PROD_ID';

  pool.query(sql, [], (err, result) => {
    let message = '';

    if (err) {
      message = `Error - ${err.message}`;
      res.render('output', { message });
    } else {
      let output = '';
      result.rows.forEach((product) => {
        output += `${product.prod_id},${product.prod_name},${product.prod_desc},${product.prod_price}\r\n`;
      });

      res.header('Content-Type', 'text/csv');
      res.attachment('export.csv');
      return res.send(output);
    }
  });
});

app.listen(port, () => {
  console.log(`Server started (http://localhost:${port}/) !`);
});
