// ============================================================
// Expense & Reimbursement Module
// ============================================================
const APPROVAL_LABELS = { pending: '待審核', approved: '已核准', rejected: '已駁回' };
const PAYMENT_LABELS = { unpaid: '未付款', paid: '已付款' };
const PAYMENT_METHOD_LABELS = { bank_transfer: '銀行轉帳', cash: '現金', company_card: '公司卡' };

function parseMoneyValue(str) { return parseInt(String(str).replace(/,/g, '').trim()) || 0; }
function formatWithCommas(n) { return n.toLocaleString('en-US'); }
function fmt(n) { return '$' + n.toLocaleString(); }
function setMoneyField(id, val) {
    const v = val || 0;
    document.getElementById(id).value = v === 0 ? '0' : formatWithCommas(v);
}
function getField(id) { return (document.getElementById(id).value || '').trim(); }

function initMoneyInputs() {
    document.querySelectorAll('.money-input:not([readonly])').forEach(input => {
        input.addEventListener('focus', function() {
            const raw = parseMoneyValue(this.value);
            if (raw === 0) { this.value = ''; } else { this.value = raw.toString(); }
            this.select();
        });
        input.addEventListener('blur', function() {
            let raw = parseMoneyValue(this.value);
            this.value = raw === 0 ? '0' : formatWithCommas(raw);
        });
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    });
}

// ============================================================
// Tax auto-calc
// ============================================================
function setupTaxCalc() {
    const beforeEl = document.getElementById('expAmountBeforeTax');
    const taxEl = document.getElementById('expTax');
    const afterEl = document.getElementById('expAmountAfterTax');
    const infoEl = document.getElementById('taxCalcInfo');

    function recalc() {
        const before = parseMoneyValue(beforeEl.value);
        const tax = parseMoneyValue(taxEl.value);
        const total = before + tax;
        afterEl.value = total === 0 ? '0' : formatWithCommas(total);
        if (before > 0) {
            infoEl.style.display = 'block';
            infoEl.innerHTML = '未稅 ' + fmt(before) + ' + 稅 ' + fmt(tax) + ' = 含稅 <strong>' + fmt(total) + '</strong>';
        } else {
            infoEl.style.display = 'none';
        }
    }

    // Auto-fill 5% tax when before-tax changes
    beforeEl.addEventListener('blur', () => {
        const before = parseMoneyValue(beforeEl.value);
        const currentTax = parseMoneyValue(taxEl.value);
        if (before > 0 && currentTax === 0) {
            const autoTax = Math.round(before * 0.05);
            taxEl.value = formatWithCommas(autoTax);
        }
        recalc();
    });
    taxEl.addEventListener('blur', recalc);
    // Also recalc on input
    [beforeEl, taxEl].forEach(el => el.addEventListener('input', () => {
        const before = parseMoneyValue(beforeEl.value);
        const tax = parseMoneyValue(taxEl.value);
        afterEl.value = (before + tax) === 0 ? '0' : formatWithCommas(before + tax);
    }));
}

// ============================================================
// Approval status toggle
// ============================================================
function setupApprovalToggle() {
    document.getElementById('expApprovalStatus').addEventListener('change', function() {
        document.getElementById('rejectReasonRow').style.display = this.value === 'rejected' ? 'block' : 'none';
    });
}

// ============================================================
// Data
// ============================================================
let _expenses = [];
let _employees = [];

async function loadExpenses() {
    try { const r = await fetch('/api/expenses'); _expenses = await r.json(); }
    catch { _expenses = []; }
    return _expenses;
}
async function loadEmployees() {
    try { const r = await fetch('/api/employees'); _employees = await r.json(); }
    catch { _employees = []; }
    return _employees;
}

function populateApplicantSelect() {
    const select = document.getElementById('expApplicant');
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- 請選擇 --</option>';
    const active = _employees.filter(e => e.status !== 'inactive');
    active.sort((a, b) => (a.empId || '').localeCompare(b.empId || ''));
    active.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.empName;
        opt.textContent = e.empId + ' — ' + e.empName;
        select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
}

// ============================================================
// Tab Navigation
// ============================================================
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
    if (tab === 'list') renderExpenseList();
    if (tab === 'summary') renderSummary();
}

// ============================================================
// Form Read/Write
// ============================================================
function readForm() {
    return {
        applicant: getField('expApplicant'),
        category: getField('expCategory'),
        expDate: getField('expDate'),
        invoiceNo: getField('expInvoiceNo'),
        description: getField('expDescription'),
        amountBeforeTax: parseMoneyValue(document.getElementById('expAmountBeforeTax').value),
        tax: parseMoneyValue(document.getElementById('expTax').value),
        amountAfterTax: parseMoneyValue(document.getElementById('expAmountAfterTax').value),
        approvalStatus: getField('expApprovalStatus'),
        approvalDate: getField('expApprovalDate'),
        rejectReason: getField('expRejectReason'),
        expectedPayDate: getField('expExpectedPayDate'),
        paymentStatus: getField('expPaymentStatus'),
        actualPayDate: getField('expActualPayDate'),
        paymentMethod: getField('expPaymentMethod'),
        notes: getField('expNotes'),
    };
}

function writeForm(e) {
    document.getElementById('expApplicant').value = e.applicant || '';
    document.getElementById('expCategory').value = e.category || '交通費';
    document.getElementById('expDate').value = e.expDate || '';
    document.getElementById('expInvoiceNo').value = e.invoiceNo || '';
    document.getElementById('expDescription').value = e.description || '';
    setMoneyField('expAmountBeforeTax', e.amountBeforeTax);
    setMoneyField('expTax', e.tax);
    setMoneyField('expAmountAfterTax', e.amountAfterTax);
    document.getElementById('expApprovalStatus').value = e.approvalStatus || 'pending';
    document.getElementById('expApprovalDate').value = e.approvalDate || '';
    document.getElementById('expRejectReason').value = e.rejectReason || '';
    document.getElementById('expExpectedPayDate').value = e.expectedPayDate || '';
    document.getElementById('expPaymentStatus').value = e.paymentStatus || 'unpaid';
    document.getElementById('expActualPayDate').value = e.actualPayDate || '';
    document.getElementById('expPaymentMethod').value = e.paymentMethod || '';
    document.getElementById('expNotes').value = e.notes || '';
    // Toggle reject reason row
    document.getElementById('rejectReasonRow').style.display = e.approvalStatus === 'rejected' ? 'block' : 'none';
}

let editingId = null;

async function saveExpense() {
    const data = readForm();
    if (!data.applicant) { alert('請選擇申請人'); return; }
    if (!data.expDate) { alert('請選擇費用日期'); return; }
    if (!data.description) { alert('請填寫用途說明'); return; }
    if (data.amountBeforeTax <= 0 && data.amountAfterTax <= 0) { alert('請填寫金額'); return; }

    try {
        if (editingId) {
            await fetch('/api/expenses/' + editingId, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            await fetch('/api/expenses', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        await loadExpenses();
        editingId = null;
        document.getElementById('editBanner').style.display = 'none';
        alert('費用報銷已儲存！');
        resetForm();
    } catch (err) { alert('儲存失敗：' + err.message); }
}

function resetForm() {
    editingId = null;
    document.getElementById('editBanner').style.display = 'none';
    document.getElementById('expApplicant').value = '';
    document.getElementById('expCategory').value = '交通費';
    document.getElementById('expDate').value = '';
    document.getElementById('expInvoiceNo').value = '';
    document.getElementById('expDescription').value = '';
    document.querySelectorAll('#tab-new .money-input').forEach(el => el.value = '0');
    document.getElementById('expApprovalStatus').value = 'pending';
    document.getElementById('expApprovalDate').value = '';
    document.getElementById('expRejectReason').value = '';
    document.getElementById('rejectReasonRow').style.display = 'none';
    document.getElementById('expExpectedPayDate').value = '';
    document.getElementById('expPaymentStatus').value = 'unpaid';
    document.getElementById('expActualPayDate').value = '';
    document.getElementById('expPaymentMethod').value = '';
    document.getElementById('expNotes').value = '';
    document.getElementById('taxCalcInfo').style.display = 'none';
}

// ============================================================
// Expense List
// ============================================================
function renderExpenseList() {
    const filterMonth = document.getElementById('filterMonth').value;
    const filterStatus = document.getElementById('filterStatus').value;
    const filterPayment = document.getElementById('filterPayment').value;

    let filtered = [..._expenses];
    if (filterMonth) filtered = filtered.filter(e => (e.expDate || '').startsWith(filterMonth));
    if (filterStatus) filtered = filtered.filter(e => e.approvalStatus === filterStatus);
    if (filterPayment) filtered = filtered.filter(e => e.paymentStatus === filterPayment);

    filtered.sort((a, b) => (b.expDate || '').localeCompare(a.expDate || ''));

    const body = document.getElementById('expenseListBody');
    if (filtered.length === 0) {
        body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:48px;color:#7f8c8d;"><div style="font-size:48px;">&#128179;</div><p>尚無報銷記錄</p></td></tr>';
        document.getElementById('listSummary').innerHTML = '';
        return;
    }

    let totalAmount = 0;
    body.innerHTML = filtered.map(e => {
        totalAmount += e.amountAfterTax || 0;
        return '<tr>' +
            '<td>' + (e.expDate || '-') + '</td>' +
            '<td>' + (e.applicant || '-') + '</td>' +
            '<td>' + (e.category || '-') + '</td>' +
            '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (e.description || '') + '">' + (e.description || '-') + '</td>' +
            '<td class="amount" style="font-weight:600">' + fmt(e.amountAfterTax || 0) + '</td>' +
            '<td><span class="status-badge ' + (e.approvalStatus || 'pending') + '">' + (APPROVAL_LABELS[e.approvalStatus] || '待審核') + '</span></td>' +
            '<td><span class="status-badge ' + (e.paymentStatus || 'unpaid') + '">' + (PAYMENT_LABELS[e.paymentStatus] || '未付款') + '</span></td>' +
            '<td><div style="display:flex;gap:6px;white-space:nowrap;">' +
                '<button class="btn btn-sm btn-primary" onclick="editExpense(\'' + e.id + '\')">編輯</button>' +
                '<button class="btn btn-sm btn-danger" onclick="deleteExpense(\'' + e.id + '\')">刪除</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');

    const pendingCount = filtered.filter(e => e.approvalStatus === 'pending').length;
    const unpaidCount = filtered.filter(e => e.paymentStatus === 'unpaid' && e.approvalStatus === 'approved').length;
    document.getElementById('listSummary').innerHTML =
        '<div class="ls-item">共 <span class="ls-value">' + filtered.length + '</span> 筆</div>' +
        '<div class="ls-item">含稅合計 <span class="ls-value">' + fmt(totalAmount) + '</span></div>' +
        '<div class="ls-item">待審核 <span class="ls-value" style="color:#b7950b">' + pendingCount + '</span></div>' +
        '<div class="ls-item">已核准未付 <span class="ls-value" style="color:#e74c3c">' + unpaidCount + '</span></div>';
}

function editExpense(id) {
    const exp = _expenses.find(e => e.id === id);
    if (!exp) return;
    editingId = id;
    writeForm(exp);
    document.getElementById('editBanner').style.display = 'block';
    document.getElementById('editBannerText').textContent = '正在編輯：' + exp.applicant + '（' + exp.expDate + ' ' + exp.category + '）';
    switchTab('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteExpense(id) {
    if (!confirm('確定要刪除此筆報銷記錄？')) return;
    try {
        await fetch('/api/expenses/' + id, { method: 'DELETE' });
        await loadExpenses();
        renderExpenseList();
    } catch (err) { alert('刪除失敗：' + err.message); }
}

function clearFilters() {
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterPayment').value = '';
    renderExpenseList();
}

// ============================================================
// Summary
// ============================================================
function renderSummary() {
    const summaryMonth = document.getElementById('summaryMonth').value;
    let filtered = [..._expenses];
    if (summaryMonth) filtered = filtered.filter(e => (e.expDate || '').startsWith(summaryMonth));

    // Only count approved + pending (not rejected)
    const valid = filtered.filter(e => e.approvalStatus !== 'rejected');

    const totalBefore = valid.reduce((s, e) => s + (e.amountBeforeTax || 0), 0);
    const totalTax = valid.reduce((s, e) => s + (e.tax || 0), 0);
    const totalAfter = valid.reduce((s, e) => s + (e.amountAfterTax || 0), 0);
    const paidAmount = valid.filter(e => e.paymentStatus === 'paid').reduce((s, e) => s + (e.amountAfterTax || 0), 0);
    const unpaidAmount = totalAfter - paidAmount;

    document.getElementById('summaryCards').innerHTML =
        '<div class="summary-card"><div class="sc-label">報銷筆數</div><div class="sc-value">' + valid.length + '</div></div>' +
        '<div class="summary-card"><div class="sc-label">未稅合計</div><div class="sc-value">' + fmt(totalBefore) + '</div></div>' +
        '<div class="summary-card"><div class="sc-label">營業稅合計</div><div class="sc-value">' + fmt(totalTax) + '</div></div>' +
        '<div class="summary-card"><div class="sc-label">含稅合計</div><div class="sc-value" style="color:#2c3e50">' + fmt(totalAfter) + '</div></div>' +
        '<div class="summary-card"><div class="sc-label">已付款</div><div class="sc-value" style="color:#27ae60">' + fmt(paidAmount) + '</div></div>' +
        '<div class="summary-card"><div class="sc-label">未付款</div><div class="sc-value" style="color:#e74c3c">' + fmt(unpaidAmount) + '</div></div>';

    // Group by category
    const byCategory = {};
    for (const e of valid) {
        const cat = e.category || '未分類';
        if (!byCategory[cat]) byCategory[cat] = { count: 0, before: 0, tax: 0, after: 0 };
        byCategory[cat].count++;
        byCategory[cat].before += e.amountBeforeTax || 0;
        byCategory[cat].tax += e.tax || 0;
        byCategory[cat].after += e.amountAfterTax || 0;
    }

    const cats = Object.keys(byCategory).sort();
    const tbody = document.getElementById('summaryTableBody');
    if (cats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#7f8c8d;">無資料</td></tr>';
        return;
    }

    let html = cats.map(cat => {
        const d = byCategory[cat];
        return '<tr><td>' + cat + '</td><td>' + d.count + '</td><td>' + fmt(d.before) + '</td><td>' + fmt(d.tax) + '</td><td style="font-weight:600">' + fmt(d.after) + '</td></tr>';
    }).join('');

    html += '<tr class="total-row"><td>合計</td><td>' + valid.length + '</td><td>' + fmt(totalBefore) + '</td><td>' + fmt(totalTax) + '</td><td>' + fmt(totalAfter) + '</td></tr>';
    tbody.innerHTML = html;
}

function printSummary() {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('print-target'));
    document.getElementById('tab-summary').classList.add('print-target');
    setTimeout(() => window.print(), 100);
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    initMoneyInputs();
    setupTaxCalc();
    setupApprovalToggle();

    await loadEmployees();
    await loadExpenses();
    populateApplicantSelect();

    // Default filter month to current
    const now = new Date();
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('filterMonth').value = ym;
    document.getElementById('summaryMonth').value = ym;
});
