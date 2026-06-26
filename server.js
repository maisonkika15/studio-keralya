const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database(path.join(__dirname, 'keralya.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  INSERT OR IGNORE INTO stock (id, qty) VALUES (0, 30);
  INSERT OR IGNORE INTO stock (id, qty) VALUES (1, 30);
  INSERT OR IGNORE INTO stock (id, qty) VALUES (2, 30);
  INSERT OR IGNORE INTO stock (id, qty) VALUES (3, 30);
`);

// Toutes les commandes
app.get('/api/orders', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  orders.forEach(o => {
    try { o.items = JSON.parse(o.items); } catch(e) { o.items = []; }
  });
  res.json(orders);
});

// Nouvelle commande depuis le site
app.post('/api/orders', (req, res) => {
  const { name, wa, zone, note, items, total, saving } = req.body;
  const r = db.prepare(
    'INSERT INTO orders (name,wa,zone,note,items,total,saving,time,source) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(name, wa||'', zone||'', note||'', JSON.stringify(items||[]), total||0, saving||0, new Date().toLocaleString('fr-FR'), 'site');
  res.json({ id: r.lastInsertRowid });
});

// Commande manuelle depuis le dashboard
app.post('/api/orders/manual', (req, res) => {
  const { name, wa, zone, note, items, total, saving } = req.body;
  const r = db.prepare(
    'INSERT INTO orders (name,wa,zone,note,items,total,saving,time,source) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(name||'', wa||'', zone||'', note||'', JSON.stringify(items||[]), total||0, saving||0, new Date().toLocaleString('fr-FR'), 'manuel');
  res.json({ id: r.lastInsertRowid });
});

// Supprimer une commande
app.delete('/api/orders/:id', (req, res) => {
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Stock
app.get('/api/stock', (req, res) => {
  res.json(db.prepare('SELECT * FROM stock ORDER BY id').all());
});

app.put('/api/stock/:id', (req, res) => {
  db.prepare('UPDATE stock SET qty=? WHERE id=?').run(req.body.qty, req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('Studio Keralya sur port ' + PORT));
