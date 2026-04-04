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

// Money input formatting
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

async function saveEmployee() {
    const name = document.getElementById('mEmpName').value.trim();
    const empId = document.getElementById('mEmpId').value.trim();
    if (!name) { alert('請填寫員工姓名'); return; }
    if (!empId) { alert('請填寫員工編號'); return; }

    const data = {
        empName: name, empId: empId,
        empDept: document.getElementById('mEmpDept').value.trim(),
        empTitle: document.getElementById('mEmpTitle').value.trim(),
        startDate: document.getElementById('mStartDate').value,
        status: document.getElementById('mStatus').value,
        baseSalary: parseMoneyValue(document.getElementById('mBaseSalary').value),
        mealAllowance: parseMoneyValue(document.getElementById('mMealAllowance').value),
        transportAllowance: parseMoneyValue(document.getElementById('mTransportAllowance').value),
        otherAllowance: parseMoneyValue(document.getElementById('mOtherAllowance').value),
        voluntaryPensionRate: parseInt(document.getElementById('mVoluntaryPensionRate').value) || 0,
        dependents: parseInt(document.getElementById('mDependents').value) || 0,
    };

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
    document.getElementById('mEmpName').value = '';
    document.getElementById('mEmpId').value = '';
    document.getElementById('mEmpDept').value = '';
    document.getElementById('mEmpTitle').value = '';
    document.getElementById('mStartDate').value = '';
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
        body.innerHTML = '<tr><td colspan="13" style="text-align:center;padding:48px;color:#7f8c8d;"><div style="font-size:48px;">&#128101;</div><p>尚無員工資料，請新增員工</p></td></tr>';
        return;
    }
    const sorted = [..._employees].sort((a, b) => (a.empId || '').localeCompare(b.empId || ''));
    body.innerHTML = sorted.map(e => {
        const statusLabel = e.status === 'inactive' ? '<span style="color:#e74c3c;font-weight:600;">離職</span>' : '<span style="color:#27ae60;font-weight:600;">在職</span>';
        return '<tr' + (e.status === 'inactive' ? ' style="opacity:0.5"' : '') + '>' +
            '<td>' + (e.empId || '-') + '</td>' +
            '<td style="font-weight:600">' + (e.empName || '-') + '</td>' +
            '<td>' + (e.empDept || '-') + '</td>' +
            '<td>' + (e.empTitle || '-') + '</td>' +
            '<td>' + (e.startDate || '-') + '</td>' +
            '<td>' + statusLabel + '</td>' +
            '<td class="amount">' + fmt(e.baseSalary || 0) + '</td>' +
            '<td class="amount">' + fmt(e.mealAllowance || 0) + '</td>' +
            '<td class="amount">' + fmt(e.transportAllowance || 0) + '</td>' +
            '<td class="amount">' + fmt(e.otherAllowance || 0) + '</td>' +
            '<td>' + (e.voluntaryPensionRate || 0) + '%</td>' +
            '<td>' + (e.dependents || 0) + '人</td>' +
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
    document.getElementById('mEmpName').value = emp.empName || '';
    document.getElementById('mEmpId').value = emp.empId || '';
    document.getElementById('mEmpDept').value = emp.empDept || '';
    document.getElementById('mEmpTitle').value = emp.empTitle || '';
    document.getElementById('mStartDate').value = emp.startDate || '';
    document.getElementById('mStatus').value = emp.status || 'active';
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

async function deleteEmployee(id) {
    if (!confirm('確定要刪除此員工資料？')) return;
    try {
        await fetch('/api/employees/' + id, { method: 'DELETE' });
        await loadEmployees();
        renderEmployeeList();
    } catch (err) { alert('刪除失敗：' + err.message); }
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    initMoneyInputs();
    await loadEmployees();
    renderEmployeeList();
});
