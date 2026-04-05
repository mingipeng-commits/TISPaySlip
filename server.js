const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Data file paths
const ENTRIES_FILE = path.join(DATA_DIR, 'entries.json');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');

// Initialize data files if they don't exist
function initFile(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
    }
}
initFile(ENTRIES_FILE);
initFile(EMPLOYEES_FILE);
initFile(EXPENSES_FILE);

// Helpers
function readJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return [];
    }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Portal root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'portal.html'));
});

// ============================================================
// Payslip Entries API
// ============================================================

// GET all entries
app.get('/api/entries', (req, res) => {
    res.json(readJSON(ENTRIES_FILE));
});

// POST create entry
app.post('/api/entries', (req, res) => {
    const entries = readJSON(ENTRIES_FILE);
    const data = req.body;
    data.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    entries.push(data);
    writeJSON(ENTRIES_FILE, entries);
    res.json(data);
});

// PUT update entry
app.put('/api/entries/:id', (req, res) => {
    const entries = readJSON(ENTRIES_FILE);
    const idx = entries.findIndex(e => e.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Entry not found' });
    const data = req.body;
    data.id = req.params.id;
    data.createdAt = entries[idx].createdAt;
    data.updatedAt = new Date().toISOString();
    entries[idx] = data;
    writeJSON(ENTRIES_FILE, entries);
    res.json(data);
});

// DELETE entry
app.delete('/api/entries/:id', (req, res) => {
    let entries = readJSON(ENTRIES_FILE);
    const before = entries.length;
    entries = entries.filter(e => e.id !== req.params.id);
    if (entries.length === before) return res.status(404).json({ error: 'Entry not found' });
    writeJSON(ENTRIES_FILE, entries);
    res.json({ success: true });
});

// ============================================================
// Employees API
// ============================================================

// GET all employees
app.get('/api/employees', (req, res) => {
    res.json(readJSON(EMPLOYEES_FILE));
});

// POST create employee
app.post('/api/employees', (req, res) => {
    const employees = readJSON(EMPLOYEES_FILE);
    const data = req.body;
    data.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    employees.push(data);
    writeJSON(EMPLOYEES_FILE, employees);
    res.json(data);
});

// PUT update employee
app.put('/api/employees/:id', (req, res) => {
    const employees = readJSON(EMPLOYEES_FILE);
    const idx = employees.findIndex(e => e.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Employee not found' });
    const data = req.body;
    data.id = req.params.id;
    data.createdAt = employees[idx].createdAt;
    data.updatedAt = new Date().toISOString();
    employees[idx] = data;
    writeJSON(EMPLOYEES_FILE, employees);
    res.json(data);
});

// DELETE employee
app.delete('/api/employees/:id', (req, res) => {
    let employees = readJSON(EMPLOYEES_FILE);
    const before = employees.length;
    employees = employees.filter(e => e.id !== req.params.id);
    if (employees.length === before) return res.status(404).json({ error: 'Employee not found' });
    writeJSON(EMPLOYEES_FILE, employees);
    res.json({ success: true });
});

// ============================================================
// Expenses API
// ============================================================
app.get('/api/expenses', (req, res) => {
    res.json(readJSON(EXPENSES_FILE));
});
app.post('/api/expenses', (req, res) => {
    const expenses = readJSON(EXPENSES_FILE);
    const data = req.body;
    data.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    expenses.push(data);
    writeJSON(EXPENSES_FILE, expenses);
    res.json(data);
});
app.put('/api/expenses/:id', (req, res) => {
    const expenses = readJSON(EXPENSES_FILE);
    const idx = expenses.findIndex(e => e.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Expense not found' });
    const data = req.body;
    data.id = req.params.id;
    data.createdAt = expenses[idx].createdAt;
    data.updatedAt = new Date().toISOString();
    expenses[idx] = data;
    writeJSON(EXPENSES_FILE, expenses);
    res.json(data);
});
app.delete('/api/expenses/:id', (req, res) => {
    let expenses = readJSON(EXPENSES_FILE);
    const before = expenses.length;
    expenses = expenses.filter(e => e.id !== req.params.id);
    if (expenses.length === before) return res.status(404).json({ error: 'Expense not found' });
    writeJSON(EXPENSES_FILE, expenses);
    res.json({ success: true });
});

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`TIS Back Office Portal running on port ${PORT}`);
});
