// ============================================================
// 2026 Insurance Tier Data
// ============================================================
const ALL_TIERS = [
    1500, 3000, 4500, 6000, 7500, 8700, 9900, 11100,
    12540, 13500, 15840, 16500, 17280, 17880, 19047,
    20008, 21009, 22000, 23100, 24000, 25250, 26400,
    27600, 28590, 29500, 30300, 31800, 33300, 34800,
    36300, 38200, 40100, 42000, 43900, 45800,
    48200, 50600, 53000, 55400, 57800, 60800, 63800,
    66800, 69800, 72800, 76500, 80200, 83900, 87600,
    92100, 96600, 101100, 105600, 110100, 115500, 120900,
    126300, 131700, 137100, 142500, 147900, 150000,
    156400, 162800, 169200, 175600, 182000, 189500,
    197000, 204500, 212000, 219500, 228200, 236900,
    245600, 254300, 263000, 273000, 283000, 293000,
    303000, 313000
];

const LABOR_MIN = 11100, LABOR_MAX = 45800;
const HEALTH_MIN = 29500, HEALTH_MAX = 313000;
const PENSION_MIN = 1500, PENSION_MAX = 150000;
const OCCUPATIONAL_MIN = 29500, OCCUPATIONAL_MAX = 72800;

const HEALTH_RATE = 0.0517;
const OCCUPATIONAL_RATE = 0.0011;
const WAGE_FUND_RATE = 0.00025;
const AVG_DEPENDENTS = 0.56;

const STORAGE_KEY = 'tis_payslip_entries';
const EMPLOYEES_KEY = 'tis_employees';

function getTiers(min, max) {
    return ALL_TIERS.filter(t => t >= min && t <= max);
}

function findTier(salary, min, max) {
    const tiers = getTiers(min, max);
    if (salary <= 0) return tiers[0];
    for (const t of tiers) { if (salary <= t) return t; }
    return tiers[tiers.length - 1];
}

// ============================================================
// Calculation Functions (verified against official PDF table)
// ============================================================
function calcLaborEmployee(tier) {
    return Math.round(tier * 0.115 * 0.2) + Math.round(tier * 0.01 * 0.2);
}
function calcLaborEmployer(tier) {
    return Math.round(tier * 0.115 * 0.7) + Math.round(tier * 0.01 * 0.7);
}
function calcOccupational(pensionTier) {
    // Occupational tier uses actual salary (via pension tier, up to 150k), capped at 72,800
    const occTier = findTier(pensionTier, OCCUPATIONAL_MIN, OCCUPATIONAL_MAX);
    return Math.round(occTier * OCCUPATIONAL_RATE);
}
function calcWageFund(tier) {
    return Math.ceil(tier * WAGE_FUND_RATE);
}
function calcHealthEmployee(tier, dependents) {
    // 先算單人整數金額，再乘以人數 (本人 + 眷屬)
    const perPerson = Math.round(tier * HEALTH_RATE * 0.3);
    return perPerson * (1 + dependents);
}
function calcHealthEmployer(tier) {
    return Math.round(tier * HEALTH_RATE * 0.6 * (1 + AVG_DEPENDENTS));
}
function calcPensionEmployer(tier) {
    return Math.round(tier * 0.06);
}
function calcPensionVoluntary(tier, rate) {
    return Math.round(tier * rate / 100);
}

// Full breakdown for an entry
function calcBreakdown(e) {
    const laborTier = e.laborTier;
    const healthTier = e.healthTier;
    const pensionTier = e.pensionTier;

    const grossEarnings = e.baseSalary + e.mealAllowance + e.transportAllowance
        + e.otherAllowance + e.overtime + e.bonus + e.leaveDeduction + e.otherEarning;

    const laborEmp = calcLaborEmployee(laborTier);
    const healthEmp = calcHealthEmployee(healthTier, e.dependents);
    const pensionVol = calcPensionVoluntary(pensionTier, e.voluntaryPensionRate);
    const totalDeductions = laborEmp + healthEmp + pensionVol + e.incomeTax + e.otherDeduction;
    const netPay = grossEarnings - totalDeductions;

    const laborEr = calcLaborEmployer(laborTier);
    const occupational = calcOccupational(pensionTier);
    const wageFund = calcWageFund(laborTier);
    const healthEr = calcHealthEmployer(healthTier);
    const pensionEr = calcPensionEmployer(pensionTier);
    const totalEmployer = laborEr + occupational + wageFund + healthEr + pensionEr;

    return {
        grossEarnings, laborEmp, healthEmp, pensionVol,
        totalDeductions, netPay,
        laborEr, occupational, wageFund, healthEr, pensionEr, totalEmployer
    };
}

// ============================================================
// Storage
// ============================================================
function loadEntries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}
function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ============================================================
// UI Helpers
// ============================================================
function parseMoneyValue(str) {
    // Strip commas and whitespace, parse as integer
    return parseInt(String(str).replace(/,/g, '').trim()) || 0;
}
function formatWithCommas(n) {
    return n.toLocaleString('en-US');
}
function getVal(id) { return parseMoneyValue(document.getElementById(id).value); }
function getStr(id) { return document.getElementById(id).value.trim(); }
function fmt(n) { return '$' + n.toLocaleString(); }

// ============================================================
// Money Input Formatting
// ============================================================
function initMoneyInputs() {
    document.querySelectorAll('.money-input').forEach(input => {
        // On focus: select all text so user can just type to replace
        input.addEventListener('focus', function() {
            const raw = parseMoneyValue(this.value);
            if (raw === 0) {
                this.value = '';
            } else {
                // Show raw number for editing
                this.value = raw.toString();
            }
            this.select();
        });

        // On blur: format with commas
        input.addEventListener('blur', function() {
            const isNeg = this.classList.contains('money-input-negative');
            let raw = parseMoneyValue(this.value);
            if (isNeg && raw > 0) raw = -raw; // force negative for leave deduction
            if (raw === 0) {
                this.value = '0';
            } else {
                this.value = formatWithCommas(raw);
            }
        });

        // On input: strip non-numeric chars (allow minus for negative fields)
        input.addEventListener('input', function() {
            const isNeg = this.classList.contains('money-input-negative');
            const cursorPos = this.selectionStart;
            const before = this.value;
            if (isNeg) {
                this.value = this.value.replace(/[^0-9\-]/g, '');
            } else {
                this.value = this.value.replace(/[^0-9]/g, '');
            }
        });
    });
}

function fmtDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.getFullYear() + '/' +
        String(d.getMonth() + 1).padStart(2, '0') + '/' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
}

// ============================================================
// Header Clock
// ============================================================
function updateClock() {
    const el = document.getElementById('headerClock');
    if (!el) return;
    const now = new Date();
    el.textContent = now.getFullYear() + '/' +
        String(now.getMonth() + 1).padStart(2, '0') + '/' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');
}

function populateSelect(selectId, min, max, preselect) {
    const select = document.getElementById(selectId);
    const tiers = getTiers(min, max);
    select.innerHTML = '';
    tiers.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t.toLocaleString() + ' 元';
        if (t === preselect) opt.selected = true;
        select.appendChild(opt);
    });
}

function initSelects() {
    populateSelect('laborTier', LABOR_MIN, LABOR_MAX, LABOR_MIN);
    populateSelect('healthTier', HEALTH_MIN, HEALTH_MAX, HEALTH_MIN);
    populateSelect('pensionTier', PENSION_MIN, PENSION_MAX, PENSION_MIN);
}

// ============================================================
// Tab Navigation
// ============================================================
let currentTab = 'entry';

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.id === 'tab-' + tab);
        c.classList.remove('print-target');
    });
    if (tab === 'saved') renderSavedEntries();
    if (tab === 'employer') renderEmployerSummary();
    if (tab === 'employees') renderEmployeeList();
}

// ============================================================
// Tier Auto-Suggest
// ============================================================
function suggestTiers() {
    const baseSalary = getVal('baseSalary');
    const mealAllowance = getVal('mealAllowance');
    const otherAllowance = getVal('otherAllowance');

    // 經常性給付 = 本薪 + 伙食津貼 + 其他津貼 (for health insurance)
    const regularPay = baseSalary + mealAllowance + otherAllowance;

    if (baseSalary <= 0) {
        document.getElementById('tierInfo').innerHTML = '輸入本薪後，系統將自動建議適用的投保級距。';
        return;
    }

    const laborTier = findTier(baseSalary, LABOR_MIN, LABOR_MAX);
    const healthTier = findTier(regularPay, HEALTH_MIN, HEALTH_MAX);
    const pensionWage = baseSalary + mealAllowance;
    const pensionTier = findTier(pensionWage, PENSION_MIN, PENSION_MAX);

    document.getElementById('laborTier').value = laborTier;
    document.getElementById('healthTier').value = healthTier;
    document.getElementById('pensionTier').value = pensionTier;

    document.getElementById('tierInfo').innerHTML =
        `經常性給付 <span>${regularPay.toLocaleString()}</span> 元（本薪＋伙食＋其他津貼）<br>` +
        `勞保 <span>${laborTier.toLocaleString()}</span>（依本薪）、` +
        `健保 <span>${healthTier.toLocaleString()}</span>（依經常性給付）、` +
        `勞退 <span>${pensionTier.toLocaleString()}</span>（依本薪＋伙食 ${pensionWage.toLocaleString()} 元）`;
}

// ============================================================
// Payslip Line Builder
// ============================================================
function addLine(container, label, value) {
    if (value === 0) return;
    const div = document.createElement('div');
    div.className = 'payslip-line';
    div.innerHTML = '<span class="line-label">' + label + '</span><span class="line-value">' + fmt(value) + '</span>';
    container.appendChild(div);
}

// ============================================================
// Live Preview Update
// ============================================================
function updatePayslip() {
    const entry = readFormData();
    const b = calcBreakdown(entry);

    document.getElementById('pEmpName').textContent = entry.empName || '-';
    document.getElementById('pEmpId').textContent = entry.empId || '-';
    document.getElementById('pDept').textContent = entry.empDept || '-';
    document.getElementById('pTitle').textContent = entry.empTitle || '-';
    document.getElementById('pPeriod').textContent = entry.payPeriod ? entry.payPeriod.replace('-', ' 年 ') + ' 月' : '-';
    document.getElementById('pPayDate').textContent = entry.payDate || '-';

    const ec = document.getElementById('earningsLines');
    ec.innerHTML = '';
    addLine(ec, '本薪', entry.baseSalary);
    addLine(ec, '伙食津貼', entry.mealAllowance);
    addLine(ec, '交通津貼', entry.transportAllowance);
    addLine(ec, '其他津貼', entry.otherAllowance);
    addLine(ec, '加班費', entry.overtime);
    addLine(ec, '獎金', entry.bonus);
    if (entry.otherEarning) addLine(ec, entry.otherEarningName || '其他加項', entry.otherEarning);
    if (entry.leaveDeduction) addLine(ec, '請假扣款', entry.leaveDeduction);
    document.getElementById('pGrossTotal').textContent = fmt(b.grossEarnings);

    const dc = document.getElementById('deductionsLines');
    dc.innerHTML = '';
    addLine(dc, '勞保費（個人）', b.laborEmp);
    addLine(dc, '健保費（個人' + (entry.dependents > 0 ? ' + 眷屬' + entry.dependents + '人' : '') + '）', b.healthEmp);
    if (b.pensionVol) addLine(dc, '勞退自提 ' + entry.voluntaryPensionRate + '%', b.pensionVol);
    if (entry.incomeTax) addLine(dc, '所得稅預扣', entry.incomeTax);
    if (entry.otherDeduction) addLine(dc, entry.otherDeductionName || '其他扣款', entry.otherDeduction);
    document.getElementById('pDeductionsTotal').textContent = fmt(b.totalDeductions);
    document.getElementById('pNetPay').textContent = fmt(b.netPay);

    const erc = document.getElementById('employerLines');
    erc.innerHTML = '';
    addLine(erc, '勞保費（雇主 70%）', b.laborEr);
    addLine(erc, '職災保險費', b.occupational);
    addLine(erc, '工資墊償基金', b.wageFund);
    addLine(erc, '健保費（雇主 60% × 1.56）', b.healthEr);
    addLine(erc, '勞退提繳 6%', b.pensionEr);
    document.getElementById('pEmployerTotal').textContent = fmt(b.totalEmployer);
}

// ============================================================
// Form Data Read/Write
// ============================================================
function readFormData() {
    return {
        empName: getStr('empName'), empId: getStr('empId'),
        empDept: getStr('empDept'), empTitle: getStr('empTitle'),
        payPeriod: document.getElementById('payPeriod').value,
        payDate: document.getElementById('payDate').value,
        baseSalary: getVal('baseSalary'), mealAllowance: getVal('mealAllowance'),
        transportAllowance: getVal('transportAllowance'), otherAllowance: getVal('otherAllowance'),
        overtime: getVal('overtime'), bonus: getVal('bonus'),
        leaveDeduction: getVal('leaveDeduction'), otherEarning: getVal('otherEarning'),
        otherEarningName: getStr('otherEarningName'),
        laborTier: getVal('laborTier'), healthTier: getVal('healthTier'),
        pensionTier: getVal('pensionTier'), voluntaryPensionRate: getVal('voluntaryPensionRate'),
        dependents: getVal('dependents'), incomeTax: getVal('incomeTax'),
        otherDeduction: getVal('otherDeduction'), otherDeductionName: getStr('otherDeductionName'),
    };
}

function setMoneyField(id, val) {
    const v = val || 0;
    document.getElementById(id).value = v === 0 ? '0' : formatWithCommas(v);
}

function writeFormData(e) {
    document.getElementById('empName').value = e.empName || '';
    document.getElementById('empId').value = e.empId || '';
    document.getElementById('empDept').value = e.empDept || '';
    document.getElementById('empTitle').value = e.empTitle || '';
    document.getElementById('payPeriod').value = e.payPeriod || '';
    document.getElementById('payDate').value = e.payDate || '';
    setMoneyField('baseSalary', e.baseSalary);
    setMoneyField('mealAllowance', e.mealAllowance);
    setMoneyField('transportAllowance', e.transportAllowance);
    setMoneyField('otherAllowance', e.otherAllowance);
    setMoneyField('overtime', e.overtime);
    setMoneyField('bonus', e.bonus);
    setMoneyField('leaveDeduction', e.leaveDeduction);
    setMoneyField('otherEarning', e.otherEarning);
    document.getElementById('otherEarningName').value = e.otherEarningName || '';
    document.getElementById('laborTier').value = e.laborTier || LABOR_MIN;
    document.getElementById('healthTier').value = e.healthTier || HEALTH_MIN;
    document.getElementById('pensionTier').value = e.pensionTier || PENSION_MIN;
    document.getElementById('voluntaryPensionRate').value = e.voluntaryPensionRate || 0;
    document.getElementById('dependents').value = e.dependents || 0;
    setMoneyField('incomeTax', e.incomeTax);
    setMoneyField('otherDeduction', e.otherDeduction);
    document.getElementById('otherDeductionName').value = e.otherDeductionName || '';
    suggestTiers();
    updatePayslip();
}

// Currently editing entry ID (null = new entry)
let editingId = null;

// ============================================================
// Save Entry
// ============================================================
function saveEntry() {
    const data = readFormData();
    if (!data.empName) { alert('請填寫員工姓名'); return; }
    if (!data.payPeriod) { alert('請選擇薪資年月'); return; }
    if (data.baseSalary <= 0) { alert('請填寫本薪'); return; }

    const entries = loadEntries();

    if (editingId) {
        const idx = entries.findIndex(e => e.id === editingId);
        if (idx >= 0) {
            data.id = editingId;
            data.updatedAt = new Date().toISOString();
            data.createdAt = entries[idx].createdAt;
            entries[idx] = data;
        }
    } else {
        data.id = generateId();
        data.createdAt = new Date().toISOString();
        data.updatedAt = data.createdAt;
        entries.push(data);
    }

    saveEntries(entries);
    editingId = null;
    document.getElementById('editingBanner').style.display = 'none';
    alert('薪資條已儲存！（' + fmtDateTime(data.updatedAt) + '）');
}

// ============================================================
// Reset Form
// ============================================================
function resetForm() {
    editingId = null;
    document.getElementById('editingBanner').style.display = 'none';
    document.getElementById('empSelect').value = '';
    document.querySelectorAll('#tab-entry .money-input').forEach(el => el.value = '0');
    document.querySelectorAll('#tab-entry input[type="text"]:not(.money-input)').forEach(el => el.value = '');
    document.getElementById('voluntaryPensionRate').value = 0;
    document.getElementById('dependents').value = 0;
    initSelects();
    const now = new Date();
    document.getElementById('payPeriod').value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('tierInfo').innerHTML = '輸入本薪後，系統將自動建議適用的投保級距。';
    updatePayslip();
}

// ============================================================
// Saved Entries Tab
// ============================================================
function renderSavedEntries() {
    const entries = loadEntries();
    const container = document.getElementById('savedEntriesBody');
    const filterMonth = document.getElementById('filterMonth').value;

    const filtered = filterMonth ? entries.filter(e => e.payPeriod === filterMonth) : entries;

    if (filtered.length === 0) {
        container.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-icon">&#128196;</div><p>尚無儲存的薪資條記錄</p></td></tr>';
        return;
    }

    // Sort by payPeriod desc, then name
    filtered.sort((a, b) => (b.payPeriod || '').localeCompare(a.payPeriod || '') || (a.empName || '').localeCompare(b.empName || ''));

    container.innerHTML = filtered.map(e => {
        const b = calcBreakdown(e);
        return '<tr>' +
            '<td>' + (e.payPeriod || '-') + '</td>' +
            '<td>' + (e.empName || '-') + '</td>' +
            '<td>' + (e.empId || '-') + '</td>' +
            '<td class="amount">' + fmt(b.grossEarnings) + '</td>' +
            '<td class="amount">' + fmt(b.totalDeductions) + '</td>' +
            '<td class="amount" style="font-weight:700;color:var(--success)">' + fmt(b.netPay) + '</td>' +
            '<td class="timestamp-cell">' + fmtDateTime(e.updatedAt) + '</td>' +
            '<td><div class="actions-cell">' +
                '<button class="btn btn-sm btn-primary" onclick="editEntry(\'' + e.id + '\')">編輯</button>' +
                '<button class="btn btn-sm btn-secondary" onclick="printSavedEntry(\'' + e.id + '\')">列印</button>' +
                '<button class="btn btn-sm btn-danger" onclick="deleteEntry(\'' + e.id + '\')">刪除</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');
}

function editEntry(id) {
    const entries = loadEntries();
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    editingId = id;
    initSelects();
    writeFormData(entry);
    document.getElementById('editingBanner').style.display = 'block';
    document.getElementById('editingBannerText').textContent = '正在編輯：' + entry.empName + '（' + entry.payPeriod + '）';
    switchTab('entry');
}

function deleteEntry(id) {
    if (!confirm('確定要刪除此筆記錄？')) return;
    const entries = loadEntries().filter(e => e.id !== id);
    saveEntries(entries);
    renderSavedEntries();
}

function printSavedEntry(id) {
    const entries = loadEntries();
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    printEntryPayslip(entry);
}

function printEntryPayslip(entry) {
    initSelects();
    writeFormData(entry);
    updatePayslip();
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('print-target'));
    document.getElementById('tab-entry').classList.add('print-target');
    setTimeout(() => window.print(), 100);
}

function exportPayslipPDF() {
    // Export uses the browser's print-to-PDF via Save as PDF destination
    const entry = readFormData();
    if (!entry.empName) { alert('請先填寫員工資料'); return; }
    initSelects();
    writeFormData(entry);
    updatePayslip();
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('print-target'));
    document.getElementById('tab-entry').classList.add('print-target');
    // Brief instructions then trigger print dialog (user selects "Save as PDF")
    alert('請在列印對話框中選擇「另存為 PDF」或「Save as PDF」作為目的地。');
    setTimeout(() => window.print(), 100);
}

// ============================================================
// Employer Summary Tab
// ============================================================
function renderEmployerSummary() {
    const entries = loadEntries();
    const summaryMonth = document.getElementById('summaryMonth').value;
    const filtered = summaryMonth ? entries.filter(e => e.payPeriod === summaryMonth) : entries;

    const tableBody = document.getElementById('employerTableBody');

    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" class="empty-state"><div class="empty-icon">&#127970;</div><p>該月份尚無記錄</p></td></tr>';
        document.getElementById('sumGrossAll').textContent = '$0';
        document.getElementById('sumDeductAll').textContent = '$0';
        document.getElementById('sumPayoutAll').textContent = '$0';
        document.getElementById('sumEmployerAll').textContent = '$0';
        document.getElementById('sumTotalCost').textContent = '$0';
        return;
    }

    let totals = { gross: 0, laborEmp: 0, healthEmp: 0, pensionVol: 0, deductions: 0, netPay: 0,
                   laborEr: 0, occupational: 0, wageFund: 0, healthEr: 0, pensionEr: 0, employer: 0 };

    const rows = filtered.map(e => {
        const b = calcBreakdown(e);
        totals.gross += b.grossEarnings;
        totals.laborEmp += b.laborEmp;
        totals.healthEmp += b.healthEmp;
        totals.pensionVol += b.pensionVol;
        totals.deductions += b.totalDeductions;
        totals.netPay += b.netPay;
        totals.laborEr += b.laborEr;
        totals.occupational += b.occupational;
        totals.wageFund += b.wageFund;
        totals.healthEr += b.healthEr;
        totals.pensionEr += b.pensionEr;
        totals.employer += b.totalEmployer;

        return '<tr>' +
            '<td>' + (e.empName || '-') + '</td>' +
            '<td>' + fmt(b.grossEarnings) + '</td>' +
            '<td>' + fmt(b.laborEmp) + '</td>' +
            '<td>' + fmt(b.healthEmp) + '</td>' +
            '<td>' + fmt(b.pensionVol) + '</td>' +
            '<td style="font-weight:600;color:var(--success)">' + fmt(b.netPay) + '</td>' +
            '<td>' + fmt(b.laborEr + b.occupational + b.wageFund) + '</td>' +
            '<td>' + fmt(b.healthEr) + '</td>' +
            '<td>' + fmt(b.pensionEr) + '</td>' +
            '<td style="font-weight:600;color:var(--warning)">' + fmt(b.totalEmployer) + '</td>' +
        '</tr>';
    }).join('');

    const totalRow = '<tr class="total-row">' +
        '<td>合計（' + filtered.length + ' 人）</td>' +
        '<td>' + fmt(totals.gross) + '</td>' +
        '<td>' + fmt(totals.laborEmp) + '</td>' +
        '<td>' + fmt(totals.healthEmp) + '</td>' +
        '<td>' + fmt(totals.pensionVol) + '</td>' +
        '<td style="color:var(--success)">' + fmt(totals.netPay) + '</td>' +
        '<td>' + fmt(totals.laborEr + totals.occupational + totals.wageFund) + '</td>' +
        '<td>' + fmt(totals.healthEr) + '</td>' +
        '<td>' + fmt(totals.pensionEr) + '</td>' +
        '<td style="color:var(--warning)">' + fmt(totals.employer) + '</td>' +
    '</tr>';

    tableBody.innerHTML = rows + totalRow;

    // Summary cards
    document.getElementById('sumGrossAll').textContent = fmt(totals.gross);
    document.getElementById('sumDeductAll').textContent = fmt(totals.deductions);
    document.getElementById('sumPayoutAll').textContent = fmt(totals.netPay);
    document.getElementById('sumEmployerAll').textContent = fmt(totals.employer);
    document.getElementById('sumTotalCost').textContent = fmt(totals.gross + totals.employer);
}

// ============================================================
// Print Employer Summary
// ============================================================
function printEmployerSummary() {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('print-target'));
    document.getElementById('tab-employer').classList.add('print-target');
    setTimeout(() => window.print(), 100);
}

// ============================================================
// Employee Master Data (4th pillar)
// ============================================================
function loadEmployees() {
    try { return JSON.parse(localStorage.getItem(EMPLOYEES_KEY)) || []; }
    catch { return []; }
}
function saveEmployeesData(list) {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(list));
}

let editingEmpMasterId = null;

function saveEmployee() {
    const name = document.getElementById('mEmpName').value.trim();
    const empId = document.getElementById('mEmpId').value.trim();
    if (!name) { alert('請填寫員工姓名'); return; }
    if (!empId) { alert('請填寫員工編號'); return; }

    const data = {
        empName: name,
        empId: empId,
        empDept: document.getElementById('mEmpDept').value.trim(),
        empTitle: document.getElementById('mEmpTitle').value.trim(),
        baseSalary: parseMoneyValue(document.getElementById('mBaseSalary').value),
        mealAllowance: parseMoneyValue(document.getElementById('mMealAllowance').value),
        transportAllowance: parseMoneyValue(document.getElementById('mTransportAllowance').value),
        otherAllowance: parseMoneyValue(document.getElementById('mOtherAllowance').value),
        voluntaryPensionRate: parseInt(document.getElementById('mVoluntaryPensionRate').value) || 0,
        dependents: parseInt(document.getElementById('mDependents').value) || 0,
    };

    const employees = loadEmployees();

    if (editingEmpMasterId) {
        const idx = employees.findIndex(e => e.id === editingEmpMasterId);
        if (idx >= 0) {
            data.id = editingEmpMasterId;
            data.updatedAt = new Date().toISOString();
            data.createdAt = employees[idx].createdAt;
            employees[idx] = data;
        }
    } else {
        data.id = generateId();
        data.createdAt = new Date().toISOString();
        data.updatedAt = data.createdAt;
        employees.push(data);
    }

    saveEmployeesData(employees);
    editingEmpMasterId = null;
    document.getElementById('empEditBanner').style.display = 'none';
    alert('員工資料已儲存！');
    resetEmployeeForm();
    renderEmployeeList();
    populateEmployeeSelect();
}

function resetEmployeeForm() {
    editingEmpMasterId = null;
    document.getElementById('empEditBanner').style.display = 'none';
    document.getElementById('mEmpName').value = '';
    document.getElementById('mEmpId').value = '';
    document.getElementById('mEmpDept').value = '';
    document.getElementById('mEmpTitle').value = '';
    document.querySelectorAll('#tab-employees .money-input').forEach(el => el.value = '0');
    document.getElementById('mVoluntaryPensionRate').value = 0;
    document.getElementById('mDependents').value = 0;
}

function renderEmployeeList() {
    const employees = loadEmployees();
    const body = document.getElementById('employeeListBody');

    if (employees.length === 0) {
        body.innerHTML = '<tr><td colspan="11" class="empty-state"><div class="empty-icon">&#128101;</div><p>尚無員工資料，請新增員工</p></td></tr>';
        return;
    }

    employees.sort((a, b) => (a.empId || '').localeCompare(b.empId || ''));

    body.innerHTML = employees.map(e => {
        return '<tr>' +
            '<td>' + (e.empId || '-') + '</td>' +
            '<td style="font-weight:600">' + (e.empName || '-') + '</td>' +
            '<td>' + (e.empDept || '-') + '</td>' +
            '<td>' + (e.empTitle || '-') + '</td>' +
            '<td class="amount">' + fmt(e.baseSalary || 0) + '</td>' +
            '<td class="amount">' + fmt(e.mealAllowance || 0) + '</td>' +
            '<td class="amount">' + fmt(e.transportAllowance || 0) + '</td>' +
            '<td class="amount">' + fmt(e.otherAllowance || 0) + '</td>' +
            '<td>' + (e.voluntaryPensionRate || 0) + '%</td>' +
            '<td>' + (e.dependents || 0) + '人</td>' +
            '<td><div class="actions-cell">' +
                '<button class="btn btn-sm btn-primary" onclick="editEmployee(\'' + e.id + '\')">編輯</button>' +
                '<button class="btn btn-sm btn-danger" onclick="deleteEmployee(\'' + e.id + '\')">刪除</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');
}

function editEmployee(id) {
    const employees = loadEmployees();
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    editingEmpMasterId = id;
    document.getElementById('mEmpName').value = emp.empName || '';
    document.getElementById('mEmpId').value = emp.empId || '';
    document.getElementById('mEmpDept').value = emp.empDept || '';
    document.getElementById('mEmpTitle').value = emp.empTitle || '';
    setMoneyField('mBaseSalary', emp.baseSalary);
    setMoneyField('mMealAllowance', emp.mealAllowance);
    setMoneyField('mTransportAllowance', emp.transportAllowance);
    setMoneyField('mOtherAllowance', emp.otherAllowance);
    document.getElementById('mVoluntaryPensionRate').value = emp.voluntaryPensionRate || 0;
    document.getElementById('mDependents').value = emp.dependents || 0;
    document.getElementById('empEditBanner').style.display = 'block';
    document.getElementById('empEditBannerText').textContent = '正在編輯：' + emp.empName + '（' + emp.empId + '）';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteEmployee(id) {
    if (!confirm('確定要刪除此員工資料？')) return;
    const employees = loadEmployees().filter(e => e.id !== id);
    saveEmployeesData(employees);
    renderEmployeeList();
    populateEmployeeSelect();
}

// ============================================================
// Employee Select Dropdown (on payslip entry tab)
// ============================================================
function populateEmployeeSelect() {
    const select = document.getElementById('empSelect');
    const employees = loadEmployees();
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- 請選擇員工 --</option>';
    employees.sort((a, b) => (a.empId || '').localeCompare(b.empId || ''));
    employees.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.empId + ' — ' + e.empName;
        select.appendChild(opt);
    });
    // Restore selection if still valid
    if (currentVal && employees.some(e => e.id === currentVal)) {
        select.value = currentVal;
    }
}

function onEmployeeSelect() {
    const select = document.getElementById('empSelect');
    const empMasterId = select.value;
    if (!empMasterId) {
        // Clear employee fields
        document.getElementById('empName').value = '';
        document.getElementById('empId').value = '';
        document.getElementById('empDept').value = '';
        document.getElementById('empTitle').value = '';
        return;
    }
    const employees = loadEmployees();
    const emp = employees.find(e => e.id === empMasterId);
    if (!emp) return;

    // Fill employee info fields
    document.getElementById('empName').value = emp.empName || '';
    document.getElementById('empId').value = emp.empId || '';
    document.getElementById('empDept').value = emp.empDept || '';
    document.getElementById('empTitle').value = emp.empTitle || '';

    // Fill salary defaults from master
    setMoneyField('baseSalary', emp.baseSalary);
    setMoneyField('mealAllowance', emp.mealAllowance);
    setMoneyField('transportAllowance', emp.transportAllowance);
    setMoneyField('otherAllowance', emp.otherAllowance);

    // Fill insurance settings
    document.getElementById('voluntaryPensionRate').value = emp.voluntaryPensionRate || 0;
    document.getElementById('dependents').value = emp.dependents || 0;

    // Auto-suggest tiers based on loaded salary
    suggestTiers();
    updatePayslip();
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initSelects();
    initMoneyInputs();
    populateEmployeeSelect();
    updateClock();
    setInterval(updateClock, 1000);

    const now = new Date();
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('payPeriod').value = ym;
    document.getElementById('filterMonth').value = ym;
    document.getElementById('summaryMonth').value = ym;

    // Auto-suggest tiers when salary fields change (input, change, and blur)
    ['baseSalary', 'mealAllowance', 'otherAllowance'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', () => { suggestTiers(); updatePayslip(); });
        el.addEventListener('change', () => { suggestTiers(); updatePayslip(); });
        el.addEventListener('blur', () => { suggestTiers(); updatePayslip(); });
    });

    // Update payslip on any input change
    document.querySelectorAll('#tab-entry input, #tab-entry select').forEach(el => {
        el.addEventListener('input', updatePayslip);
        el.addEventListener('change', updatePayslip);
    });

    updatePayslip();
});
