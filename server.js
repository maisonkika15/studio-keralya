const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      wa TEXT,
      zone TEXT,
      note TEXT,
      items TEXT,
      total INTEGER DEFAULT 0,
      saving INTEGER DEFAULT 0,
      time TEXT,
      source TEXT DEFAULT 'site'
    );
    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY,
      qty INTEGER DEFAULT 30
    );
    INSERT INTO stock (id, qty) VALUES (0,30),(1,30),(2,30),(3,30)
    ON CONFLICT (id) DO NOTHING;
  `);
}
init();

app.get('/api/orders', async (req, res) => {
  const r = await pool.query('SELECT * FROM orders ORDER BY id DESC');
  const rows = r.rows.map(o => {
    try { o.items = JSON.parse(o.items); } catch(e) { o.items = []; }
    return o;
  });
  res.json(rows);
});

app.post('/api/orders', async (req, res) => {
  const { name, wa, zone, note, items, total, saving } = req.body;
  const r = await pool.query(
    'INSERT INTO orders (name,wa,zone,note,items,total,saving,time,source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [name, wa||'', zone||'', note||'', JSON.stringify(items||[]), total||0, saving||0, new Date().toLocaleString('fr-FR'), 'site']
  );
  res.json({ id: r.rows[0].id });
});

app.post('/api/orders/manual', async (req, res) => {
  const { name, wa, zone, note, items, total, saving } = req.body;
  const r = await pool.query(
    'INSERT INTO orders (name,wa,zone,note,items,total,saving,time,source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [name||'', wa||'', zone||'', note||'', JSON.stringify(items||[]), total||0, saving||0, new Date().toLocaleString('fr-FR'), 'manuel']
  );
  res.json({ id: r.rows[0].id });
});

app.delete('/api/orders/:id', async (req, res) => {
  await pool.query('DELETE FROM orders WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/stock', async (req, res) => {
  const r = await pool.query('SELECT * FROM stock ORDER BY id');
  res.json(r.rows);
});

app.put('/api/stock/:id', async (req, res) => {
  await pool.query('UPDATE stock SET qty=$1 WHERE id=$2', [req.body.qty, req.params.id]);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('Studio Keralya sur port ' + PORT));
