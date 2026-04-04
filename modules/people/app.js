// ============================================================
// People Management Module
// ============================================================

function parseMoneyValue(str) {
    return parseInt(String(str).replace(/,/g, '').trim()) || 0;
}
function formatWithCommas(n) { return n.toLocaleString('en-US'); }
function fmt(n) { return '$' + n.toLocaleString(); }
function setMoneyField(id, val) {
    const v = val || 0;
    document.getElementById(id).value = v === 0 ? '0' : formatWithCommas(v);
}
function getField(id) { return (document.getElementById(id).value || '').trim(); }

function initMoneyInputs() {
    document.querySelectorAll('.money-input').forEach(input => {
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
// API
// ============================================================
let _employees = [];

async function loadEmployees() {
    try { const r = await fetch('/api/employees'); _employees = await r.json(); }
    catch { _employees = []; }
    return _employees;
}

let editingEmpId = null;

// All fields for employee record
function readEmployeeForm() {
    return {
        empName: getField('mEmpName'), empId: getField('mEmpId'),
        empDept: getField('mEmpDept'), empTitle: getField('mEmpTitle'),
        idNumber: getField('mIdNumber'), contractType: getField('mContractType'),
        startDate: getField('mStartDate'), status: getField('mStatus'),
        endDate: getField('mEndDate'),
        phone: getField('mPhone'), email: getField('mEmail'), address: getField('mAddress'),
        emergencyName: getField('mEmergencyName'),
        emergencyRelation: getField('mEmergencyRelation'),
        emergencyPhone: getField('mEmergencyPhone'),
        bankName: getField('mBankName'), bankBranch: getField('mBankBranch'),
        bankAccount: getField('mBankAccount'),
        baseSalary: parseMoneyValue(document.getElementById('mBaseSalary').value),
        mealAllowance: parseMoneyValue(document.getElementById('mMealAllowance').value),
        transportAllowance: parseMoneyValue(document.getElementById('mTransportAllowance').value),
        otherAllowance: parseMoneyValue(document.getElementById('mOtherAllowance').value),
        voluntaryPensionRate: parseInt(document.getElementById('mVoluntaryPensionRate').value) || 0,
        dependents: parseInt(document.getElementById('mDependents').value) || 0,
        notes: getField('mNotes'),
    };
}

function writeEmployeeForm(e) {
    document.getElementById('mEmpName').value = e.empName || '';
    document.getElementById('mEmpId').value = e.empId || '';
    document.getElementById('mEmpDept').value = e.empDept || '';
    document.getElementById('mEmpTitle').value = e.empTitle || '';
    document.getElementById('mIdNumber').value = e.idNumber || '';
    document.getElementById('mContractType').value = e.contractType || 'full-time';
    document.getElementById('mStartDate').value = e.startDate || '';
    document.getElementById('mStatus').value = e.status || 'active';
    document.getElementById('mEndDate').value = e.endDate || '';
    document.getElementById('mPhone').value = e.phone || '';
    document.getElementById('mEmail').value = e.email || '';
    document.getElementById('mAddress').value = e.address || '';
    document.getElementById('mEmergencyName').value = e.emergencyName || '';
    document.getElementById('mEmergencyRelation').value = e.emergencyRelation || '';
    document.getElementById('mEmergencyPhone').value = e.emergencyPhone || '';
    document.getElementById('mBankName').value = e.bankName || '';
    document.getElementById('mBankBranch').value = e.bankBranch || '';
    document.getElementById('mBankAccount').value = e.bankAccount || '';
    setMoneyField('mBaseSalary', e.baseSalary);
    setMoneyField('mMealAllowance', e.mealAllowance);
    setMoneyField('mTransportAllowance', e.transportAllowance);
    setMoneyField('mOtherAllowance', e.otherAllowance);
    document.getElementById('mVoluntaryPensionRate').value = e.voluntaryPensionRate || 0;
    document.getElementById('mDependents').value = e.dependents || 0;
    document.getElementById('mNotes').value = e.notes || '';
}

async function saveEmployee() {
    const data = readEmployeeForm();
    if (!data.empName) { alert('請填寫員工姓名'); return; }
    if (!data.empId) { alert('請填寫員工編號'); return; }

    try {
        if (editingEmpId) {
            await fetch('/api/employees/' + editingEmpId, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            await fetch('/api/employees', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        await loadEmployees();
        editingEmpId = null;
        document.getElementById('empEditBanner').style.display = 'none';
        alert('員工資料已儲存！');
        resetEmployeeForm();
        renderEmployeeList();
    } catch (err) { alert('儲存失敗：' + err.message); }
}

function resetEmployeeForm() {
    editingEmpId = null;
    document.getElementById('empEditBanner').style.display = 'none';
    const fields = ['mEmpName','mEmpId','mEmpDept','mEmpTitle','mIdNumber','mStartDate',
        'mEndDate','mPhone','mEmail','mAddress','mEmergencyName','mEmergencyRelation',
        'mEmergencyPhone','mBankName','mBankBranch','mBankAccount','mNotes'];
    fields.forEach(id => document.getElementById(id).value = '');
    document.getElementById('mContractType').value = 'full-time';
    document.getElementById('mStatus').value = 'active';
    document.querySelectorAll('.money-input').forEach(el => el.value = '0');
    document.getElementById('mVoluntaryPensionRate').value = 0;
    document.getElementById('mDependents').value = 0;
}

function renderStats() {
    const total = _employees.length;
    const active = _employees.filter(e => e.status !== 'inactive').length;
    const inactive = total - active;
    document.getElementById('peopleStats').innerHTML =
        '<div class="stat-card"><div class="stat-label">在職人數</div><div class="stat-value" style="color:#27ae60">' + active + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">離職人數</div><div class="stat-value" style="color:#e74c3c">' + inactive + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">總人數</div><div class="stat-value">' + total + '</div></div>';
}

function renderEmployeeList() {
    renderStats();
    const body = document.getElementById('employeeListBody');
    if (_employees.length === 0) {
        body.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:48px;color:#7f8c8d;"><div style="font-size:48px;">&#128101;</div><p>尚無員工資料，請新增員工</p></td></tr>';
        return;
    }
    const sorted = [..._employees].sort((a, b) => (a.empId || '').localeCompare(b.empId || ''));
    const typeMap = { 'full-time': '全職', 'part-time': '兼職', 'contract': '約聘' };
    body.innerHTML = sorted.map(e => {
        const statusLabel = e.status === 'inactive'
            ? '<span style="color:#e74c3c;font-weight:600;">離職</span>'
            : '<span style="color:#27ae60;font-weight:600;">在職</span>';
        return '<tr' + (e.status === 'inactive' ? ' style="opacity:0.5"' : '') + '>' +
            '<td>' + (e.empId || '-') + '</td>' +
            '<td style="font-weight:600">' + (e.empName || '-') + '</td>' +
            '<td>' + (e.empDept || '-') + '</td>' +
            '<td>' + (e.empTitle || '-') + '</td>' +
            '<td>' + (typeMap[e.contractType] || '全職') + '</td>' +
            '<td>' + (e.startDate || '-') + '</td>' +
            '<td>' + statusLabel + '</td>' +
            '<td class="amount">' + fmt(e.baseSalary || 0) + '</td>' +
            '<td><div style="display:flex;gap:6px;white-space:nowrap;">' +
                '<button class="btn btn-sm btn-primary" onclick="editEmployee(\'' + e.id + '\')">編輯</button>' +
                '<button class="btn btn-sm btn-danger" onclick="deleteEmployee(\'' + e.id + '\')">刪除</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');
}

function editEmployee(id) {
    const emp = _employees.find(e => e.id === id);
    if (!emp) return;
    editingEmpId = id;
    writeEmployeeForm(emp);
    document.getElementById('empEditBanner').style.display = 'block';
    document.getElementById('empEditBannerText').textContent = '正在編輯：' + emp.empName + '（' + emp.empId + '）';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteEmployee(id) {
    if (!confirm('確定要刪除此員工資料？')) return;
    try {
        await fetch('/api/employees/' + id, { method: 'DELETE' });
        await loadEmployees();
        renderEmployeeList();
    } catch (err) { alert('刪除失敗：' + err.message); }
}

document.addEventListener('DOMContentLoaded', async () => {
    initMoneyInputs();
    await loadEmployees();
    renderEmployeeList();
});
