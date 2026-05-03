(function() {    
    const STORAGE_KEY = 'monthlyData';

    function getMonthlyData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveMonthlyData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function getPeriodKey(year, month) {
        return `${year}-${month}`;
    }

    function getCurrentPeriodData() {
        const data = getMonthlyData();
        const key = getPeriodKey(state.currentYear, state.currentMonth);
        if (!data[key]) {
            data[key] = { employees: [], projects: [] };
            saveMonthlyData(data);
        }
        return data[key];
    }

    function saveCurrentPeriodData(periodData) {
        const data = getMonthlyData();
        const key = getPeriodKey(state.currentYear, state.currentMonth);
        data[key] = periodData;
        saveMonthlyData(data);
    }

    function generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function getWorkingDaysInMonth(year, month) {
        let count = 0;
        const days = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= days; d++) {
            const dow = new Date(year, month, d).getDay();
            if (dow !== 0 && dow !== 6) count++;
        }
        return count;
    }

    function getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    function calculateVacationCoefficient(employee, year, month) {
        const workingDays = getWorkingDaysInMonth(year, month);
        const vacations = employee.vacationDays || [];
        let vacationWorkingDays = 0;
        for (const vd of vacations) {
            const dow = new Date(year, month, vd).getDay();
            if (dow !== 0 && dow !== 6) vacationWorkingDays++;
        }
        if (workingDays === 0) return 1;
        return (workingDays - vacationWorkingDays) / workingDays;
    }

    function calculateEffectiveCapacity(assignedCapacity, fit, vacationCoefficient) {
        return assignedCapacity * fit * vacationCoefficient;
    }
const state = {
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth(),
        activeTab: 'projects',
        sortColumn: null,
        sortDirection: 'asc',
        filters: {}, // { column: value }
        sidebarCollapsed: false,
    };
    if (state.currentYear < 2025) state.currentYear = 2025;
    if (state.currentYear > 2027) state.currentYear = 2027;
function getEmployeeAssignments(employeeId, periodData) {
        const assignments = [];
        for (const project of periodData.projects) {
            const empAssign = (project.assignedEmployees || []).find(a => a.employeeId === employeeId);
            if (empAssign) {
                assignments.push({ ...empAssign, projectId: project.id, projectName: project.projectName,
                    companyName: project.companyName, budget: project.budget, projectCapacity: project.employeeCapacity });
            }
        }
        return assignments;
    }

    function getProjectAssignments(projectId, periodData) {
        const project = periodData.projects.find(p => p.id === projectId);
        if (!project) return [];
        return (project.assignedEmployees || []).map(a => {
            const emp = periodData.employees.find(e => e.id === a.employeeId);
            return { ...a, employeeName: emp ? `${emp.name} ${emp.surname}` : 'Unknown',
                employeeSalary: emp ? emp.salary : 0, employeePosition: emp ? emp.position : '',
                vacationDays: emp ? (emp.vacationDays || []) : [] };
        });
    }

    function calculateProjectFinancials(project, periodData, year, month) {
        const assignments = getProjectAssignments(project.id, periodData);
        let totalEffectiveCapacity = 0;
        let totalCost = 0;
        const employeeDetails = [];

        for (const a of assignments) {
            const emp = periodData.employees.find(e => e.id === a.employeeId);
            if (!emp) continue;
            const vacCoef = calculateVacationCoefficient(emp, year, month);
            const effCap = calculateEffectiveCapacity(a.capacity, a.fit, vacCoef);
            totalEffectiveCapacity += effCap;
            const cost = emp.salary * Math.max(0.5, a.capacity);
            totalCost += cost;
            employeeDetails.push({
                ...a,
                effectiveCapacity: effCap,
                cost,
                vacationCoefficient: vacCoef,
            });
        }

        const capacityForRevenue = Math.max(project.employeeCapacity, totalEffectiveCapacity);
        const revenuePerEffectiveCapacity = capacityForRevenue > 0 ? project.budget / capacityForRevenue : 0;
        const totalRevenue = revenuePerEffectiveCapacity * totalEffectiveCapacity;
        const estimatedIncome = totalRevenue - totalCost;

        return {
            totalEffectiveCapacity,
            totalCost,
            totalRevenue,
            estimatedIncome,
            capacityForRevenue,
            revenuePerEffectiveCapacity,
            employeeDetails,
        };
    }

    function calculateAllProjectFinancials(periodData, year, month) {
        let totalEstimatedIncome = 0;
        const projectFinancials = [];
        const assignedEmployeeIds = new Set();

        for (const project of periodData.projects) {
            const fin = calculateProjectFinancials(project, periodData, year, month);
            projectFinancials.push({ project, ...fin });
            totalEstimatedIncome += fin.estimatedIncome;
            for (const a of (project.assignedEmployees || [])) {
                assignedEmployeeIds.add(a.employeeId);
            }
        }
let totalBenchCost = 0;
        for (const emp of periodData.employees) {
            if (!assignedEmployeeIds.has(emp.id)) {
                totalBenchCost += emp.salary * 0.5;
            }
        }
        totalEstimatedIncome -= totalBenchCost;

        return { projectFinancials, totalEstimatedIncome, totalBenchCost, assignedEmployeeIds };
    }

    function calculateEmployeeFinancials(employee, periodData, year, month) {
        const assignments = getEmployeeAssignments(employee.id, periodData);
        let totalEstimatedPayment = 0;
        let totalProjectedIncome = 0;
        const assignmentDetails = [];
        const vacCoef = calculateVacationCoefficient(employee, year, month);

        for (const a of assignments) {
            const project = periodData.projects.find(p => p.id === a.projectId);
            if (!project) continue;
            const effCap = calculateEffectiveCapacity(a.capacity, a.fit, vacCoef);
            const cost = employee.salary * Math.max(0.5, a.capacity);
            totalEstimatedPayment += cost;

            const projFin = calculateProjectFinancials(project, periodData, year, month);
            const revenuePerEffCap = projFin.revenuePerEffectiveCapacity;
            const revenue = revenuePerEffCap * effCap;
            const profit = revenue - cost;
            totalProjectedIncome += profit;

            assignmentDetails.push({
                ...a,
                effectiveCapacity: effCap,
                cost,
                revenue,
                profit,
                vacationCoefficient: vacCoef,
                projectName: project.projectName,
                companyName: project.companyName,
                budget: project.budget,
            });
        }

        if (assignments.length === 0) {
            totalEstimatedPayment = employee.salary * 0.5;
        }

        return {
            totalEstimatedPayment,
            totalProjectedIncome,
            assignmentDetails,
            totalAssignedCapacity: assignments.reduce((s, a) => s + a.capacity, 0),
            vacationCoefficient: vacCoef,
        };
    }
function $(sel, ctx = document) { return ctx.querySelector(sel); }
    function $$(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

    function formatCurrency(num) {
        return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function formatNumber(num, decimals = 2) {
        return num.toFixed(decimals);
    }

    function createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        for (const [key, val] of Object.entries(attrs)) {
            if (key === 'className') el.className = val;
            else if (key === 'innerHTML') el.innerHTML = val;
            else if (key === 'textContent') el.textContent = val;
            else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
            else el.setAttribute(key, val);
        }
        for (const child of children) {
            if (typeof child === 'string') el.appendChild(document.createTextNode(child));
            else el.appendChild(child);
        }
        return el;
    }

    function showOverlay() { $('#overlay').classList.remove('hidden'); }
    function hideOverlay() { $('#overlay').classList.add('hidden'); }

    function closeAllPopups() {
        $('#modalContainer').innerHTML = '';
        $('#actionMenuContainer').innerHTML = '';
        $('#filterPopupContainer').innerHTML = '';
        hideOverlay();
    }
function getPeriodDataSafe() {
        const data = getMonthlyData();
        const key = getPeriodKey(state.currentYear, state.currentMonth);
        if (!data[key]) {
            data[key] = { employees: [], projects: [] };
        }
        return data[key];
    }

    function renderAll() {
        updatePeriodInfo();
        updateViewTitle();
        updateAddButton();
        if (state.activeTab === 'projects') renderProjectsTable();
        else renderEmployeesTable();
        renderFilterChips();
        updateSidebarSelection();
    }

    function updatePeriodInfo() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
            'October', 'November', 'December'
        ];
        $('#periodInfo').textContent = `${months[state.currentMonth]} ${state.currentYear}`;
        $('#monthSelect').value = state.currentMonth;
        $('#yearSelect').value = state.currentYear;
    }

    function updateViewTitle() {
        $('#viewTitle').textContent = state.activeTab === 'projects' ? 'Projects' : 'Employees';
    }

    function updateAddButton() {
        const btn = $('#addBtn');
        btn.textContent = state.activeTab === 'projects' ? '+ Add Project' : '+ Add Employee';
    }

    function updateSidebarSelection() {
        $$('.nav-tab').forEach(t => t.classList.remove('active'));
        const tab = $(`.nav-tab[data-tab="${state.activeTab}"]`);
        if (tab) tab.classList.add('active');
    }

    function renderFilterChips() {
        const container = $('#filterChips');
        container.innerHTML = '';
        const entries = Object.entries(state.filters).filter(([, v]) => v);
        if (entries.length === 0) return;
        for (const [col, val] of entries) {
            const chip = createElement('span', { className: 'filter-chip' }, [
                `${col}: ${val}`,
                createElement('span', {
                    className: 'chip-close',
                    onClick: () => { delete state.filters[col]; renderAll(); }
                }, ['×'])
            ]);
            container.appendChild(chip);
        }
        if (entries.length >= 2) {
            const clearChip = createElement('span', {
                className: 'filter-chip clear-filters-chip',
                onClick: () => { state.filters = {}; renderAll(); }
            }, ['Clear Filters']);
            container.appendChild(clearChip);
        }
    }

    function getFilteredAndSortedItems(items, sortableColumns) {
        let result = [...items];
        // Apply filters
        for (const [col, val] of Object.entries(state.filters)) {
            if (!val) continue;
            result = result.filter(item => {
                const itemVal = String(getItemColumnValue(item, col) || '').toLowerCase();
                return itemVal.includes(val.toLowerCase());
            });
        }
        // Apply sort
        if (state.sortColumn && sortableColumns.includes(state.sortColumn)) {
            result.sort((a, b) => {
                let va = getItemColumnValue(a, state.sortColumn);
                let vb = getItemColumnValue(b, state.sortColumn);
                if (typeof va === 'string') va = va.toLowerCase();
                if (typeof vb === 'string') vb = vb.toLowerCase();
                if (va == null) va = 0;
                if (vb == null) vb = 0;
                if (va < vb) return state.sortDirection === 'asc' ? -1 : 1;
                if (va > vb) return state.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }

    function getItemColumnValue(item, column) {
        const periodData = getPeriodDataSafe();
        switch (column) {
            case 'Company Name': return item.companyName || '';
            case 'Project Name': return item.projectName || '';
            case 'Budget': return item.budget || 0;
            case 'Employee Capacity': return item.employeeCapacity || 0;
            case 'Estimated Income': {
                const fin = calculateAllProjectFinancials(periodData, state.currentYear, state.currentMonth);
                const pf = fin.projectFinancials.find(p => p.project.id === item.id);
                return pf ? pf.estimatedIncome : 0;
            }
            case 'Name': return item.name || '';
            case 'Surname': return item.surname || '';
            case 'Age': return calculateAge(item.dateOfBirth);
            case 'Position': return item.position || '';
            case 'Salary': return item.salary || 0;
            case 'Estimated Payment': {
                const efin = calculateEmployeeFinancials(item, periodData, state.currentYear, state.currentMonth);
                return efin.totalEstimatedPayment;
            }
            case 'Projected Income': {
                const efin = calculateEmployeeFinancials(item, periodData, state.currentYear, state.currentMonth);
                return efin.totalProjectedIncome;
            }
            default: return '';
        }
    }

    function calculateAge(dateOfBirth) {
        if (!dateOfBirth) return 0;
        const dob = new Date(dateOfBirth);
        const now = new Date(state.currentYear, state.currentMonth, 1);
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
        return age;
    }

    function renderProjectsTable() {
        const periodData = getPeriodDataSafe();
        const financials = calculateAllProjectFinancials(periodData, state.currentYear, state.currentMonth);
        const sortableColumns = ['Company Name', 'Project Name', 'Budget', 'Employee Capacity', 'Estimated Income'];
        const filterableColumns = ['Company Name', 'Project Name'];
        const projects = getFilteredAndSortedItems(periodData.projects, sortableColumns);

        let html = '<table><thead><tr>';
        const columns = ['Company Name', 'Project Name', 'Budget', 'Employee Capacity', 'Employees', 'Estimated Income', 'Actions'];
        for (const col of columns) {
            const isSortable = sortableColumns.includes(col);
            const isFilterable = filterableColumns.includes(col);
            const sortIcon = state.sortColumn === col ? (state.sortDirection === 'asc' ? ' ↑' : ' ↓') : ' ⇅';
            const sortClass = state.sortColumn === col ? ' active' : '';
            const filterClass = state.filters[col] ? ' has-filter' : '';
            html += `<th class="${isSortable ? 'sortable' : ''}" data-column="${col}">
                ${col}
                ${isSortable ? `<span class="sort-icon${sortClass}">${sortIcon}</span>` : ''}
                ${isFilterable ? `<span class="filter-icon${filterClass}" data-filter-col="${col}">⌕</span>` : ''}
              </th>`;
        }
        html += '</tr></thead><tbody>';

        if (projects.length === 0) {
            html += `<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">No projects found</td></tr>`;
        } else {
            for (const project of projects) {
                const pf = financials.projectFinancials.find(p => p.project.id === project.id);
                const usedCap = pf ? pf.totalEffectiveCapacity : 0;
                const totalCap = project.employeeCapacity;
                const capClass = usedCap > totalCap ? 'over' : '';
                const income = pf ? pf.estimatedIncome : 0;
                const incomeClass = income >= 0 ? 'income-positive' : 'income-negative';
                const empCount = (project.assignedEmployees || []).length;
                html += `
                <tr>
                  <td>${escapeHtml(project.companyName)}</td>
                  <td>${escapeHtml(project.projectName)}</td>
                  <td>${formatCurrency(project.budget)}</td>
                  <td><span class="capacity-used ${capClass}">${formatNumber(usedCap,1)}/${totalCap}</span></td>
                  <td><button class="btn-sm primary show-employees-btn" data-project-id="${project.id}">Show Employees (${empCount})</button></td>
                  <td class="${incomeClass}">${formatCurrency(income)}</td>
                  <td><button class="btn-sm danger delete-project-btn" data-project-id="${project.id}">Delete</button></td>
                </tr>`;
            }
        }

        // Total row
        html += `<tr class="total-row">
              <td colspan="5" style="text-align:right;">Total Estimated Income:</td>
              <td class="${financials.totalEstimatedIncome >= 0 ? 'income-positive' : 'income-negative'}">${formatCurrency(financials.totalEstimatedIncome)}</td>
              <td></td>
            </tr>`;

        html += '</tbody></table>';
        $('#tableContainer').innerHTML = html;
        attachProjectTableEvents();
    }

    function renderEmployeesTable() {
        const periodData = getPeriodDataSafe();
        const sortableColumns = ['Name', 'Surname', 'Age', 'Position', 'Salary', 'Estimated Payment', 'Projected Income'];
        const filterableColumns = ['Name', 'Surname', 'Position'];
        const employees = getFilteredAndSortedItems(periodData.employees, sortableColumns);

        let html = '<table><thead><tr>';
        const columns = ['Name', 'Surname', 'Age', 'Position', 'Salary', 'Estimated Payment', 'Project', 'Projected Income', 'Actions'];
        for (const col of columns) {
            const isSortable = sortableColumns.includes(col);
            const isFilterable = filterableColumns.includes(col);
            const sortIcon = state.sortColumn === col ? (state.sortDirection === 'asc' ? ' ↑' : ' ↓') : ' ⇅';
            const sortClass = state.sortColumn === col ? ' active' : '';
            const filterClass = state.filters[col] ? ' has-filter' : '';
            html += `<th class="${isSortable ? 'sortable' : ''}" data-column="${col}">
                ${col}
                ${isSortable ? `<span class="sort-icon${sortClass}">${sortIcon}</span>` : ''}
                ${isFilterable ? `<span class="filter-icon${filterClass}" data-filter-col="${col}">⌕</span>` : ''}
              </th>`;
        }
        html += '</tr></thead><tbody>';

        if (employees.length === 0) {
            html += `<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">No employees found</td></tr>`;
        } else {
            for (const emp of employees) {
                const efin = calculateEmployeeFinancials(emp, periodData, state.currentYear, state.currentMonth);
                const age = calculateAge(emp.dateOfBirth);
                const capUsed = efin.totalAssignedCapacity;
                const capMax = 1.5;
                const assignments = getEmployeeAssignments(emp.id, periodData);
                const incomeClass = efin.totalProjectedIncome >= 0 ? 'income-positive' : 'income-negative';
                const canAssign = capUsed < 1.5;
                html += `
                <tr>
                  <td>${escapeHtml(emp.name)}</td>
                  <td>${escapeHtml(emp.surname)}</td>
                  <td>${age}</td>
                  <td><span class="inline-edit position-edit" data-emp-id="${emp.id}">${escapeHtml(emp.position)}</span></td>
                  <td><span class="inline-edit salary-edit" data-emp-id="${emp.id}">${formatCurrency(emp.salary)}</span></td>
                  <td>${formatCurrency(efin.totalEstimatedPayment)}</td>
                  <td><button class="btn-sm primary show-assignments-btn" data-emp-id="${emp.id}">Show Assignments (${assignments.length}) ${formatNumber(capUsed,1)}/${capMax}</button></td>
                  <td class="${incomeClass}">${formatCurrency(efin.totalProjectedIncome)}</td>
                  <td>
                    <button class="btn-sm availability-btn" data-emp-id="${emp.id}">📅</button>
                    <button class="btn-sm primary assign-btn" data-emp-id="${emp.id}" ${canAssign ? '' : 'disabled'}>Assign</button>
                    <button class="btn-sm danger delete-emp-btn" data-emp-id="${emp.id}">Delete</button>
                  </td>
                </tr>`;
            }
        }
        html += '</tbody></table>';
        $('#tableContainer').innerHTML = html;
        attachEmployeeTableEvents();
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function attachProjectTableEvents() {
        $$('.show-employees-btn').forEach(btn => {
            btn.addEventListener('click', () => showProjectEmployeesPopup(btn.dataset.projectId));
        });
        $$('.delete-project-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteProject(btn.dataset.projectId));
        });
        $$('th.sortable').forEach(th => {
            th.addEventListener('click', (e) => {
                if (e.target.closest('.filter-icon')) return;
                const col = th.dataset.column;
                if (state.sortColumn === col) {
                    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    state.sortColumn = col;
                    state.sortDirection = 'asc';
                }
                renderAll();
            });
        });
        $$('th .filter-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                openFilterPopup(icon.dataset.filterCol, icon);
            });
        });
    }

    function attachEmployeeTableEvents() {
        $$('.position-edit').forEach(span => {
            span.addEventListener('click', () => startPositionEdit(span));
        });
        $$('.salary-edit').forEach(span => {
            span.addEventListener('click', () => startSalaryEdit(span));
        });
        $$('.show-assignments-btn').forEach(btn => {
            btn.addEventListener('click', () => showEmployeeAssignmentsPopup(btn.dataset.empId));
        });
        $$('.assign-btn').forEach(btn => {
            btn.addEventListener('click', () => openAssignPopup(btn.dataset.empId, btn));
        });
        $$('.delete-emp-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteEmployee(btn.dataset.empId));
        });
        $$('.availability-btn').forEach(btn => {
            btn.addEventListener('click', () => openAvailabilityCalendar(btn.dataset.empId));
        });
        $$('th.sortable').forEach(th => {
            th.addEventListener('click', (e) => {
                if (e.target.closest('.filter-icon')) return;
                const col = th.dataset.column;
                if (state.sortColumn === col) {
                    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    state.sortColumn = col;
                    state.sortDirection = 'asc';
                }
                renderAll();
            });
        });
        $$('th .filter-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const col = icon.dataset.filterCol;
                if (col === 'Position') {
                    openPositionFilterPopup(icon);
                } else {
                    openFilterPopup(col, icon);
                }
            });
        });
    }
function openFilterPopup(column, anchorEl) {
        closeAllPopups();
        const rect = anchorEl.getBoundingClientRect();
        const popup = createElement('div', {
            className: 'action-menu',
            style: `position:fixed;z-index:800;top:${rect.bottom + 4}px;left:${Math.min(rect.left, window.innerWidth - 220)}px;min-width:200px;padding:12px;`,
        });
        const input = createElement('input', {
            type: 'text',
            placeholder: `Filter ${column}...`,
            value: state.filters[column] || '',
            style: 'width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.85rem;',
        });
        const btnRow = createElement('div', { style: 'display:flex;gap:8px;margin-top:8px;' });
        const applyBtn = createElement('button', {
            className: 'btn-sm primary',
            textContent: 'Apply',
            onClick: () => {
                state.filters[column] = input.value.trim() || '';
                if (!state.filters[column]) delete state.filters[column];
                closeAllPopups();
                renderAll();
            }
        });
        const cancelBtn = createElement('button', {
            className: 'btn-sm',
            textContent: 'Cancel',
            onClick: () => { closeAllPopups(); renderAll(); }
        });
        btnRow.appendChild(applyBtn);
        btnRow.appendChild(cancelBtn);
        popup.appendChild(input);
        popup.appendChild(btnRow);
        document.body.appendChild(popup);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { applyBtn.click(); }
            if (e.key === 'Escape') { cancelBtn.click(); }
        });
        input.focus();
        setTimeout(() => {
            const handler = (e) => {
                if (!popup.contains(e.target) && e.target !== anchorEl) {
                    closeAllPopups();
                    document.removeEventListener('click', handler);
                }
            };
            document.addEventListener('click', handler);
        }, 100);
    }

    function openPositionFilterPopup(anchorEl) {
        closeAllPopups();
        const rect = anchorEl.getBoundingClientRect();
        const popup = createElement('div', {
            className: 'action-menu',
            style: `position:fixed;z-index:800;top:${rect.bottom + 4}px;left:${Math.min(rect.left, window.innerWidth - 220)}px;min-width:180px;padding:8px;`,
        });
        const positions = ['Junior', 'Middle', 'Senior', 'Lead', 'Architect', 'BO'];
        for (const pos of positions) {
            const btn = createElement('button', {
                textContent: pos,
                onClick: () => {
                    state.filters['Position'] = pos;
                    closeAllPopups();
                    renderAll();
                }
            });
            if (state.filters['Position'] === pos) btn.style.background = '#eff6ff';
            popup.appendChild(btn);
        }
        const clearBtn = createElement('button', {
            textContent: 'Clear Filter',
            className: 'danger-action',
            onClick: () => { delete state.filters['Position']; closeAllPopups(); renderAll(); }
        });
        popup.appendChild(clearBtn);
        document.body.appendChild(popup);
        setTimeout(() => {
            const handler = (e) => {
                if (!popup.contains(e.target) && e.target !== anchorEl) {
                    closeAllPopups();
                    document.removeEventListener('click', handler);
                }
            };
            document.addEventListener('click', handler);
        }, 100);
    }
function startPositionEdit(span) {
        const empId = span.dataset.empId;
        const periodData = getPeriodDataSafe();
        const emp = periodData.employees.find(e => e.id === empId);
        if (!emp) return;
        const select = createElement('select', {});
        const positions = ['Junior', 'Middle', 'Senior', 'Lead', 'Architect', 'BO'];
        for (const pos of positions) {
            const opt = createElement('option', { value: pos, textContent: pos });
            if (pos === emp.position) opt.selected = true;
            select.appendChild(opt);
        }
        span.innerHTML = '';
        span.appendChild(select);
        select.focus();
        const save = () => {
            emp.position = select.value;
            saveCurrentPeriodData(periodData);
            renderAll();
        };
        select.addEventListener('change', save);
        select.addEventListener('blur', save);
    }

    function startSalaryEdit(span) {
        const empId = span.dataset.empId;
        const periodData = getPeriodDataSafe();
        const emp = periodData.employees.find(e => e.id === empId);
        if (!emp) return;
        const input = createElement('input', { type: 'number', value: emp.salary, step: '0.01', min: '0' });
        span.innerHTML = '';
        span.appendChild(input);
        input.focus();
        const save = () => {
            const val = parseFloat(input.value);
            if (!isNaN(val) && val > 0) {
                emp.salary = val;
                saveCurrentPeriodData(periodData);
            }
            renderAll();
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { input.blur(); }
            if (e.key === 'Escape') { renderAll(); }
        });
    }
function openSlidePanel(title, bodyHTML, onSubmit) {
        const panel = $('#slidePanel');
        $('#slidePanelTitle').textContent = title;
        $('#slidePanelBody').innerHTML = bodyHTML;
        panel.classList.remove('hidden');
        showOverlay();
        const submitBtn = $('#slidePanelBody').querySelector('.submit-btn');
        if (submitBtn && onSubmit) {
            submitBtn.addEventListener('click', () => onSubmit());
        }
    }

    function closeSlidePanel() {
        $('#slidePanel').classList.add('hidden');
        hideOverlay();
    }

    function openAddProjectPanel() {
        const bodyHTML = `
              <div class="form-group">
                <label>Project Name *</label>
                <input type="text" id="projName" placeholder="Enter project name" minlength="3">
                <span class="error-msg" id="projNameErr"></span>
              </div>
              <div class="form-group">
                <label>Company Name *</label>
                <input type="text" id="projCompany" placeholder="Enter company name" minlength="2">
                <span class="error-msg" id="projCompanyErr"></span>
              </div>
              <div class="form-group">
                <label>Budget *</label>
                <input type="number" id="projBudget" placeholder="Enter budget" step="0.01" min="0.01">
                <span class="error-msg" id="projBudgetErr"></span>
              </div>
              <div class="form-group">
                <label>Employee Capacity *</label>
                <input type="number" id="projCapacity" placeholder="Enter capacity" step="1" min="1">
                <span class="error-msg" id="projCapacityErr"></span>
              </div>
              <button class="submit-btn" id="addProjectSubmit" disabled>Add Project</button>
            `;
        openSlidePanel('Add New Project', bodyHTML, submitAddProject);
        setupProjectValidation();
    }

    function setupProjectValidation() {
        const nameInput = $('#projName');
        const companyInput = $('#projCompany');
        const budgetInput = $('#projBudget');
        const capacityInput = $('#projCapacity');
        const submitBtn = $('#addProjectSubmit');

        function validate() {
            let valid = true;
            const name = nameInput.value.trim();
            const company = companyInput.value.trim();
            const budget = parseFloat(budgetInput.value);
            const capacity = parseInt(capacityInput.value);

            if (!name || name.length < 3 || !/^[a-zA-Z0-9\s]+$/.test(name)) {
                $('#projNameErr').textContent = 'Min 3 characters, alphanumeric';
                nameInput.classList.add('error');
                valid = false;
            } else {
                $('#projNameErr').textContent = '';
                nameInput.classList.remove('error');
            }
            if (!company || company.length < 2 || !/^[a-zA-Z0-9\s]+$/.test(company)) {
                $('#projCompanyErr').textContent = 'Min 2 characters, alphanumeric';
                companyInput.classList.add('error');
                valid = false;
            } else {
                $('#projCompanyErr').textContent = '';
                companyInput.classList.remove('error');
            }
            if (isNaN(budget) || budget <= 0) {
                $('#projBudgetErr').textContent = 'Must be a positive number';
                budgetInput.classList.add('error');
                valid = false;
            } else {
                $('#projBudgetErr').textContent = '';
                budgetInput.classList.remove('error');
            }
            if (isNaN(capacity) || capacity < 1 || !Number.isInteger(capacity)) {
                $('#projCapacityErr').textContent = 'Must be an integer ≥ 1';
                capacityInput.classList.add('error');
                valid = false;
            } else {
                $('#projCapacityErr').textContent = '';
                capacityInput.classList.remove('error');
            }
            submitBtn.disabled = !valid;
        }

        [nameInput, companyInput, budgetInput, capacityInput].forEach(el => {
            el.addEventListener('input', validate);
            el.addEventListener('blur', validate);
        });
        validate();
    }

    function submitAddProject() {
        const name = $('#projName').value.trim();
        const company = $('#projCompany').value.trim();
        const budget = parseFloat($('#projBudget').value);
        const capacity = parseInt($('#projCapacity').value);
        if (!name || name.length < 3 || !company || company.length < 2 || isNaN(budget) || budget <= 0 || isNaN(capacity) || capacity < 1) return;
        const periodData = getPeriodDataSafe();
        const newProject = {
            id: generateId(),
            projectName: name,
            companyName: company,
            budget,
            employeeCapacity: capacity,
            assignedEmployees: [],
        };
        periodData.projects.push(newProject);
        saveCurrentPeriodData(periodData);
        closeSlidePanel();
        renderAll();
    }

    function openAddEmployeePanel() {
        const bodyHTML = `
              <div class="form-group">
                <label>Name *</label>
                <input type="text" id="empName" placeholder="Enter name" minlength="3">
                <span class="error-msg" id="empNameErr"></span>
              </div>
              <div class="form-group">
                <label>Surname *</label>
                <input type="text" id="empSurname" placeholder="Enter surname" minlength="3">
                <span class="error-msg" id="empSurnameErr"></span>
              </div>
              <div class="form-group">
                <label>Date of Birth *</label>
                <input type="date" id="empDob">
                <span class="error-msg" id="empDobErr"></span>
              </div>
              <div class="form-group">
                <label>Position *</label>
                <select id="empPosition">
                  <option value="">Select position</option>
                  <option value="Junior">Junior</option>
                  <option value="Middle">Middle</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
                  <option value="Architect">Architect</option>
                  <option value="BO">BO</option>
                </select>
                <span class="error-msg" id="empPositionErr"></span>
              </div>
              <div class="form-group">
                <label>Salary *</label>
                <input type="number" id="empSalary" placeholder="Enter salary" step="0.01" min="0.01">
                <span class="error-msg" id="empSalaryErr"></span>
              </div>
              <button class="submit-btn" id="addEmployeeSubmit" disabled>Add Employee</button>
            `;
        openSlidePanel('Add New Employee', bodyHTML, submitAddEmployee);
        setupEmployeeValidation();
    }

    function setupEmployeeValidation() {
        const nameInput = $('#empName');
        const surnameInput = $('#empSurname');
        const dobInput = $('#empDob');
        const positionSelect = $('#empPosition');
        const salaryInput = $('#empSalary');
        const submitBtn = $('#addEmployeeSubmit');

        function validate() {
            let valid = true;
            const name = nameInput.value.trim();
            const surname = surnameInput.value.trim();
            const dob = dobInput.value;
            const position = positionSelect.value;
            const salary = parseFloat(salaryInput.value);

            if (!name || name.length < 3 || !/^[a-zA-Z]+$/.test(name)) {
                $('#empNameErr').textContent = 'Min 3 letters, letters only';
                nameInput.classList.add('error');
                valid = false;
            } else {
                $('#empNameErr').textContent = '';
                nameInput.classList.remove('error');
            }
            if (!surname || surname.length < 3 || !/^[a-zA-Z]+$/.test(surname)) {
                $('#empSurnameErr').textContent = 'Min 3 letters, letters only';
                surnameInput.classList.add('error');
                valid = false;
            } else {
                $('#empSurnameErr').textContent = '';
                surnameInput.classList.remove('error');
            }
            if (!dob) {
                $('#empDobErr').textContent = 'Date of birth is required';
                dobInput.classList.add('error');
                valid = false;
            } else {
                const age = calculateAgeFromDob(dob);
                if (age < 18) {
                    $('#empDobErr').textContent = 'Must be 18+ years old';
                    dobInput.classList.add('error');
                    valid = false;
                } else {
                    $('#empDobErr').textContent = '';
                    dobInput.classList.remove('error');
                }
            }
            if (!position) {
                $('#empPositionErr').textContent = 'Position is required';
                positionSelect.classList.add('error');
                valid = false;
            } else {
                $('#empPositionErr').textContent = '';
                positionSelect.classList.remove('error');
            }
            if (isNaN(salary) || salary <= 0) {
                $('#empSalaryErr').textContent = 'Must be a positive number';
                salaryInput.classList.add('error');
                valid = false;
            } else {
                $('#empSalaryErr').textContent = '';
                salaryInput.classList.remove('error');
            }
            submitBtn.disabled = !valid;
        }

        function calculateAgeFromDob(dobStr) {
            const dob = new Date(dobStr);
            const now = new Date(state.currentYear, state.currentMonth, 1);
            let age = now.getFullYear() - dob.getFullYear();
            const m = now.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
            return age;
        }

        [nameInput, surnameInput, dobInput, positionSelect, salaryInput].forEach(el => {
            el.addEventListener('input', validate);
            el.addEventListener('blur', validate);
            el.addEventListener('change', validate);
        });
        validate();
    }

    function submitAddEmployee() {
        const name = $('#empName').value.trim();
        const surname = $('#empSurname').value.trim();
        const dob = $('#empDob').value;
        const position = $('#empPosition').value;
        const salary = parseFloat($('#empSalary').value);
        if (!name || !surname || !dob || !position || isNaN(salary) || salary <= 0) return;
        const periodData = getPeriodDataSafe();
        const newEmployee = {
            id: generateId(),
            name,
            surname,
            dateOfBirth: dob,
            position,
            salary,
            vacationDays: [],
        };
        periodData.employees.push(newEmployee);
        saveCurrentPeriodData(periodData);
        closeSlidePanel();
        renderAll();
    }
 function showProjectEmployeesPopup(projectId) {
        closeAllPopups();
        const periodData = getPeriodDataSafe();
        const project = periodData.projects.find(p => p.id === projectId);
        if (!project) return;
        const assignments = getProjectAssignments(projectId, periodData);
        const fin = calculateProjectFinancials(project, periodData, state.currentYear, state.currentMonth);

        let detailsHTML = `
              <table class="details-table"><thead><tr>
                <th>Employee</th><th>Capacity</th><th>Fit</th><th>Vacation Days</th>
                <th>Effective Cap.</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Actions</th>
              </tr></thead><tbody>`;
        if (assignments.length === 0) {
            detailsHTML += `<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8;">No employees assigned</td></tr>`;
        } else {
            for (const a of assignments) {
                const emp = periodData.employees.find(e => e.id === a.employeeId);
                const vacDays = emp ? (emp.vacationDays || []).length : 0;
                const detail = fin.employeeDetails.find(d => d.employeeId === a.employeeId);
                const effCap = detail ? detail.effectiveCapacity : 0;
                const cost = detail ? detail.cost : 0;
                const revenue = detail ? (fin.revenuePerEffectiveCapacity * effCap) : 0;
                const profit = revenue - cost;
                const profitClass = profit >= 0 ? 'income-positive' : 'income-negative';
                detailsHTML += `
                <tr>
                  <td class="link-cell emp-link" data-emp-id="${a.employeeId}">${escapeHtml(a.employeeName)}</td>
                  <td>${formatNumber(a.capacity,2)}</td>
                  <td>${formatNumber(a.fit,2)}</td>
                  <td>${vacDays}</td>
                  <td>${formatNumber(effCap,3)}</td>
                  <td>${formatCurrency(revenue)}</td>
                  <td>${formatCurrency(cost)}</td>
                  <td class="${profitClass}">${formatCurrency(profit)}</td>
                  <td>
                    <button class="btn-sm edit-assign-btn" data-emp-id="${a.employeeId}" data-project-id="${projectId}">Edit</button>
                    <button class="btn-sm danger unassign-btn" data-emp-id="${a.employeeId}" data-project-id="${projectId}">Unassign</button>
                  </td>
                </tr>`;
            }
        }
        detailsHTML += '</tbody></table>';

        const modal = createModal(`Project: ${escapeHtml(project.projectName)} - Employees`, detailsHTML);
        document.body.appendChild(modal);
        showOverlay();
        setupModalClose(modal);

        modal.querySelectorAll('.emp-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                openEmpActionMenu(link.dataset.empId, link, modal);
            });
        });
        modal.querySelectorAll('.edit-assign-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                closeAllPopups();
                openEditAssignmentPopup(btn.dataset.empId, btn.dataset.projectId);
            });
        });
        modal.querySelectorAll('.unassign-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                closeAllPopups();
                openUnassignConfirmation(btn.dataset.empId, btn.dataset.projectId);
            });
        });
    }

    function showEmployeeAssignmentsPopup(employeeId) {
        closeAllPopups();
        const periodData = getPeriodDataSafe();
        const emp = periodData.employees.find(e => e.id === employeeId);
        if (!emp) return;
        const efin = calculateEmployeeFinancials(emp, periodData, state.currentYear, state.currentMonth);
        const vacDays = (emp.vacationDays || []).length;

        let detailsHTML = `
              <table class="details-table"><thead><tr>
                <th>Project</th><th>Capacity</th><th>Fit</th><th>Vacation Days</th>
                <th>Effective Cap.</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Actions</th>
              </tr></thead><tbody>`;
        if (efin.assignmentDetails.length === 0) {
            detailsHTML += `<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8;">No assignments</td></tr>`;
        } else {
            for (const a of efin.assignmentDetails) {
                const profitClass = a.profit >= 0 ? 'income-positive' : 'income-negative';
                detailsHTML += `
                <tr>
                  <td class="link-cell proj-link" data-project-id="${a.projectId}">${escapeHtml(a.projectName)}</td>
                  <td>${formatNumber(a.capacity,2)}</td>
                  <td>${formatNumber(a.fit,2)}</td>
                  <td>${vacDays}</td>
                  <td>${formatNumber(a.effectiveCapacity,3)}</td>
                  <td>${formatCurrency(a.revenue)}</td>
                  <td>${formatCurrency(a.cost)}</td>
                  <td class="${profitClass}">${formatCurrency(a.profit)}</td>
                  <td>
                    <button class="btn-sm edit-assign-btn" data-emp-id="${employeeId}" data-project-id="${a.projectId}">Edit</button>
                    <button class="btn-sm danger unassign-btn" data-emp-id="${employeeId}" data-project-id="${a.projectId}">Unassign</button>
                  </td>
                </tr>`;
            }
        }
        detailsHTML += '</tbody></table>';

        const modal = createModal(`Employee: ${escapeHtml(emp.name)} ${escapeHtml(emp.surname)} - Assignments`, detailsHTML);
        document.body.appendChild(modal);
        showOverlay();
        setupModalClose(modal);

        modal.querySelectorAll('.proj-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                openProjActionMenu(link.dataset.projectId, link, modal);
            });
        });
        modal.querySelectorAll('.edit-assign-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                closeAllPopups();
                openEditAssignmentPopup(btn.dataset.empId, btn.dataset.projectId);
            });
        });
        modal.querySelectorAll('.unassign-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                closeAllPopups();
                openUnassignConfirmation(btn.dataset.empId, btn.dataset.projectId);
            });
        });
    }

    function createModal(title, bodyHTML) {
        const modal = createElement('div', { className: 'modal', style: 'top:50%;left:50%;transform:translate(-50%,-50%);' });
        modal.innerHTML = `
              <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">×</button>
              </div>
              <div class="modal-body">${bodyHTML}</div>
            `;
        return modal;
    }

    function setupModalClose(modal) {
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
            hideOverlay();
        });
        const handler = (e) => {
            if (!modal.contains(e.target) && !e.target.closest('.action-menu') && !e.target.closest('.modal')) {
                modal.remove();
                hideOverlay();
                document.removeEventListener('click', handler);
            }
        };
        setTimeout(() => document.addEventListener('click', handler), 100);
    }

    function openEmpActionMenu(empId, anchorEl, parentModal) {
        const periodData = getPeriodDataSafe();
        const emp = periodData.employees.find(e => e.id === empId);
        if (!emp) return;
        const rect = anchorEl.getBoundingClientRect();
        const menu = createElement('div', {
            className: 'action-menu',
            style: `position:fixed;z-index:850;top:${rect.bottom}px;left:${rect.left}px;`,
        });
        const seeBtn = createElement('button', {
            textContent: 'See at Employees',
            onClick: () => {
                state.activeTab = 'employees';
                state.filters = { 'Name': emp.name, 'Surname': emp.surname };
                closeAllPopups();
                if (parentModal) { parentModal.remove(); hideOverlay(); }
                renderAll();
            }
        });
        menu.appendChild(seeBtn);
        document.body.appendChild(menu);
        setTimeout(() => {
            const handler = (e) => {
                if (!menu.contains(e.target) && e.target !== anchorEl) {
                    menu.remove();
                    document.removeEventListener('click', handler);
                }
            };
            document.addEventListener('click', handler);
        }, 100);
    }

    function openProjActionMenu(projectId, anchorEl, parentModal) {
        const periodData = getPeriodDataSafe();
        const project = periodData.projects.find(p => p.id === projectId);
        if (!project) return;
        const rect = anchorEl.getBoundingClientRect();
        const menu = createElement('div', {
            className: 'action-menu',
            style: `position:fixed;z-index:850;top:${rect.bottom}px;left:${rect.left}px;`,
        });
        const seeBtn = createElement('button', {
            textContent: 'See at Projects',
            onClick: () => {
                state.activeTab = 'projects';
                state.filters = { 'Project Name': project.projectName };
                closeAllPopups();
                if (parentModal) { parentModal.remove(); hideOverlay(); }
                renderAll();
            }
        });
        menu.appendChild(seeBtn);
        document.body.appendChild(menu);
        setTimeout(() => {
            const handler = (e) => {
                if (!menu.contains(e.target) && e.target !== anchorEl) {
                    menu.remove();
                    document.removeEventListener('click', handler);
                }
            };
            document.addEventListener('click', handler);
        }, 100);
    }

    function openAssignPopup(employeeId, anchorBtn) {
        closeAllPopups();
        const periodData = getPeriodDataSafe();
        const emp = periodData.employees.find(e => e.id === employeeId);
        if (!emp) return;
        const efin = calculateEmployeeFinancials(emp, periodData, state.currentYear, state.currentMonth);
        const currentCap = efin.totalAssignedCapacity;
        const availableCap = 1.5 - currentCap;
        if (availableCap <= 0) return;

        const rect = anchorBtn.getBoundingClientRect();
        const popupTop = Math.min(rect.bottom + 8, window.innerHeight - 400);
        const popupLeft = Math.min(rect.left, window.innerWidth - 380);

        const popup = createElement('div', {
            className: 'modal',
            style: `position:fixed;z-index:700;top:${popupTop}px;left:${popupLeft}px;min-width:360px;max-width:400px;`,
        });

        const availableProjects = periodData.projects.filter(p => {
            const projAssigns = getProjectAssignments(p.id, periodData);
            const usedEff = projAssigns.reduce((s, a) => {
                const e = periodData.employees.find(em => em.id === a.employeeId);
                const vc = e ? calculateVacationCoefficient(e, state.currentYear, state.currentMonth) : 1;
                return s + calculateEffectiveCapacity(a.capacity, a.fit, vc);
            }, 0);
            return true; // Allow over-capacity with warning
        });

        let projectOptions = availableProjects.map(p => {
            const projAssigns = getProjectAssignments(p.id, periodData);
            const usedEff = projAssigns.reduce((s, a) => {
                const e = periodData.employees.find(em => em.id === a.employeeId);
                const vc = e ? calculateVacationCoefficient(e, state.currentYear, state.currentMonth) : 1;
                return s + calculateEffectiveCapacity(a.capacity, a.fit, vc);
            }, 0);
            return `<option value="${p.id}">${escapeHtml(p.projectName)} (${formatNumber(usedEff,1)}/${p.employeeCapacity})</option>`;
        }).join('');

        popup.innerHTML = `
              <div class="modal-header">
                <h3>Assign to Project</h3>
                <button class="modal-close">×</button>
              </div>
              <div class="modal-body">
                <p>Current capacity: <strong>${formatNumber(currentCap,1)}/1.5</strong> | Available: <strong>${formatNumber(availableCap,1)}</strong></p>
                <div class="form-group">
                  <label>Project</label>
                  <select id="assignProject">${projectOptions}</select>
                </div>
                <div class="slider-group">
                  <label>Capacity: <span id="capVal">0.5</span></label>
                  <input type="range" id="assignCapacity" min="0.1" max="${Math.min(1.5, availableCap + currentCap)}" step="0.1" value="0.5">
                </div>
                <div class="slider-group">
                  <label>Project Fit: <span id="fitVal">0.5</span></label>
                  <input type="range" id="assignFit" min="0.0" max="1.0" step="0.1" value="0.5">
                </div>
                <p id="assignWarning" style="color:#f59e0b;font-size:0.85rem;"></p>
                <p>Effective Capacity: <strong id="effCapDisplay">0.250</strong></p>
                <p>Predicted capacity after: <strong id="predCapDisplay">${formatNumber(currentCap + 0.5,1)}/1.5</strong></p>
                <button class="submit-btn" id="confirmAssign">Assign</button>
              </div>
            `;
        document.body.appendChild(popup);
        showOverlay();

        const capSlider = popup.querySelector('#assignCapacity');
        const fitSlider = popup.querySelector('#assignFit');
        const capVal = popup.querySelector('#capVal');
        const fitVal = popup.querySelector('#fitVal');
        const effCapDisplay = popup.querySelector('#effCapDisplay');
        const predCapDisplay = popup.querySelector('#predCapDisplay');
        const warning = popup.querySelector('#assignWarning');
        const projectSelect = popup.querySelector('#assignProject');

        function updateDisplay() {
            const cap = parseFloat(capSlider.value);
            const fit = parseFloat(fitSlider.value);
            const vacCoef = calculateVacationCoefficient(emp, state.currentYear, state.currentMonth);
            const effCap = calculateEffectiveCapacity(cap, fit, vacCoef);
            capVal.textContent = formatNumber(cap, 1);
            fitVal.textContent = formatNumber(fit, 1);
            effCapDisplay.textContent = formatNumber(effCap, 3);
            predCapDisplay.textContent = `${formatNumber(currentCap + cap,1)}/1.5`;

            const selProjectId = projectSelect.value;
            const selProject = periodData.projects.find(p => p.id === selProjectId);
            if (selProject) {
                const projAssigns = getProjectAssignments(selProject.id, periodData);
                const usedEff = projAssigns.reduce((s, a) => {
                    const e = periodData.employees.find(em => em.id === a.employeeId);
                    const vc = e ? calculateVacationCoefficient(e, state.currentYear, state.currentMonth) : 1;
                    return s + calculateEffectiveCapacity(a.capacity, a.fit, vc);
                }, 0);
                const newTotal = usedEff + effCap;
                if (newTotal > selProject.employeeCapacity) {
                    warning.textContent = `⚠ Warning: Project capacity will be exceeded (${formatNumber(newTotal,1)}/${selProject.employeeCapacity})`;
                } else {
                    warning.textContent = '';
                }
            }
        }

        capSlider.addEventListener('input', updateDisplay);
        fitSlider.addEventListener('input', updateDisplay);
        projectSelect.addEventListener('change', updateDisplay);
        updateDisplay();

        popup.querySelector('.modal-close').addEventListener('click', () => {
            popup.remove();
            hideOverlay();
        });
        popup.querySelector('#confirmAssign').addEventListener('click', () => {
            const cap = parseFloat(capSlider.value);
            const fit = parseFloat(fitSlider.value);
            const selProjectId = projectSelect.value;
            if (!selProjectId || isNaN(cap) || isNaN(fit)) return;
            if (currentCap + cap > 1.5 + 0.001) return;
            const selProject = periodData.projects.find(p => p.id === selProjectId);
            if (!selProject) return;
            if (!selProject.assignedEmployees) selProject.assignedEmployees = [];
            const existingIdx = selProject.assignedEmployees.findIndex(a => a.employeeId === employeeId);
            if (existingIdx >= 0) {
                selProject.assignedEmployees[existingIdx] = { employeeId, capacity: cap, fit };
            } else {
                selProject.assignedEmployees.push({ employeeId, capacity: cap, fit });
            }
            saveCurrentPeriodData(periodData);
            popup.remove();
            hideOverlay();
            renderAll();
        });

        setTimeout(() => {
            const handler = (e) => {
                if (!popup.contains(e.target) && e.target !== anchorBtn && !e.target.closest('.action-menu')) {
                    popup.remove();
                    hideOverlay();
                    document.removeEventListener('click', handler);
                }
            };
            document.addEventListener('click', handler);
        }, 100);
    }

    function openEditAssignmentPopup(employeeId, projectId) {
        closeAllPopups();
        const periodData = getPeriodDataSafe();
        const project = periodData.projects.find(p => p.id === projectId);
        if (!project) return;
        const assign = (project.assignedEmployees || []).find(a => a.employeeId === employeeId);
        if (!assign) return;
        const emp = periodData.employees.find(e => e.id === employeeId);
        if (!emp) return;
        const efin = calculateEmployeeFinancials(emp, periodData, state.currentYear, state.currentMonth);
        const currentCap = efin.totalAssignedCapacity - assign.capacity;
        const availableCap = 1.5 - currentCap;
        const vacCoef = calculateVacationCoefficient(emp, state.currentYear, state.currentMonth);
        const currentEffCap = calculateEffectiveCapacity(assign.capacity, assign.fit, vacCoef);

        const popup = createElement('div', {
            className: 'modal',
            style: 'position:fixed;z-index:700;top:50%;left:50%;transform:translate(-50%,-50%);min-width:380px;max-width:420px;',
        });
        popup.innerHTML = `
              <div class="modal-header">
                <h3>Edit Assignment</h3>
                <button class="modal-close">×</button>
              </div>
              <div class="modal-body">
                <p>Employee: <strong>${escapeHtml(emp.name)} ${escapeHtml(emp.surname)}</strong></p>
                <p>Project: <strong>${escapeHtml(project.projectName)}</strong></p>
                <p>Current: Capacity ${formatNumber(assign.capacity,1)}, Fit ${formatNumber(assign.fit,1)}, Eff.Cap ${formatNumber(currentEffCap,3)}</p>
                <div class="slider-group">
                  <label>Capacity: <span id="editCapVal">${formatNumber(assign.capacity,1)}</span></label>
                  <input type="range" id="editCapacity" min="0.0" max="${Math.min(1.5, availableCap + assign.capacity)}" step="0.1" value="${assign.capacity}">
                </div>
                <div class="slider-group">
                  <label>Project Fit: <span id="editFitVal">${formatNumber(assign.fit,1)}</span></label>
                  <input type="range" id="editFit" min="0.0" max="1.0" step="0.1" value="${assign.fit}">
                </div>
                <p>Effective Capacity: <strong id="editEffCap">${formatNumber(currentEffCap,3)}</strong></p>
                <button class="submit-btn" id="confirmEdit">Save Changes</button>
              </div>
            `;
        document.body.appendChild(popup);
        showOverlay();

        const capSlider = popup.querySelector('#editCapacity');
        const fitSlider = popup.querySelector('#editFit');

        function update() {
            const cap = parseFloat(capSlider.value);
            const fit = parseFloat(fitSlider.value);
            popup.querySelector('#editCapVal').textContent = formatNumber(cap, 1);
            popup.querySelector('#editFitVal').textContent = formatNumber(fit, 1);
            popup.querySelector('#editEffCap').textContent = formatNumber(calculateEffectiveCapacity(cap, fit, vacCoef), 3);
        }
        capSlider.addEventListener('input', update);
        fitSlider.addEventListener('input', update);

        popup.querySelector('.modal-close').addEventListener('click', () => { popup.remove(); hideOverlay(); });
        popup.querySelector('#confirmEdit').addEventListener('click', () => {
            assign.capacity = parseFloat(capSlider.value);
            assign.fit = parseFloat(fitSlider.value);
            saveCurrentPeriodData(periodData);
            popup.remove();
            hideOverlay();
            renderAll();
        });

        setTimeout(() => {
            const handler = (e) => {
                if (!popup.contains(e.target) && !e.target.closest('.action-menu')) {
                    popup.remove();
                    hideOverlay();
                    document.removeEventListener('click', handler);
                }
            };
            document.addEventListener('click', handler);
        }, 100);
    }

    function openUnassignConfirmation(employeeId, projectId) {
        closeAllPopups();
        const periodData = getPeriodDataSafe();
        const project = periodData.projects.find(p => p.id === projectId);
        const emp = periodData.employees.find(e => e.id === employeeId);
        if (!project || !emp) return;
        const assign = (project.assignedEmployees || []).find(a => a.employeeId === employeeId);
        if (!assign) return;
        const efin = calculateEmployeeFinancials(emp, periodData, state.currentYear, state.currentMonth);
        const fin = calculateProjectFinancials(project, periodData, state.currentYear, state.currentMonth);
        const detail = fin.employeeDetails.find(d => d.employeeId === employeeId);
        const cost = detail ? detail.cost : (emp.salary * Math.max(0.5, assign.capacity));
        const revenue = detail ? (fin.revenuePerEffectiveCapacity * (detail.effectiveCapacity || 0)) : 0;
        const profit = revenue - cost;
        const profitClass = profit >= 0 ? 'income-positive' : 'income-negative';
        const projIncomeBefore = fin.estimatedIncome;
        const projIncomeAfter = projIncomeBefore - profit;

        const popup = createElement('div', {
            className: 'modal',
            style: 'position:fixed;z-index:700;top:50%;left:50%;transform:translate(-50%,-50%);min-width:400px;max-width:450px;',
        });
        popup.innerHTML = `
              <div class="modal-header">
                <h3>Unassign Confirmation</h3>
                <button class="modal-close">×</button>
              </div>
              <div class="modal-body">
                <p><strong>Employee:</strong> ${escapeHtml(emp.name)} ${escapeHtml(emp.surname)}</p>
                <p><strong>Project:</strong> ${escapeHtml(project.projectName)}</p>
                <p><strong>Assigned Capacity:</strong> ${formatNumber(assign.capacity,2)}</p>
                <p><strong>Employee Salary Share:</strong> ${formatCurrency(cost)}</p>
                <p><strong>Budget Share:</strong> ${formatCurrency(revenue)}</p>
                <p><strong>Estimated Income:</strong> <span class="${profitClass}">${formatCurrency(profit)}</span></p>
                <hr style="margin:12px 0;border-color:#e2e8f0;">
                <p><strong>Project Income Before:</strong> <span class="${projIncomeBefore >= 0 ? 'income-positive' : 'income-negative'}">${formatCurrency(projIncomeBefore)}</span></p>
                <p><strong>Project Income After:</strong> <span class="${projIncomeAfter >= 0 ? 'income-positive' : 'income-negative'}">${formatCurrency(projIncomeAfter)}</span></p>
                <div style="display:flex;gap:10px;margin-top:16px;">
                  <button class="submit-btn" style="background:#ef4444;" id="confirmUnassign">Confirm Unassign</button>
                  <button class="btn-sm" id="cancelUnassign">Cancel</button>
                </div>
              </div>
            `;
        document.body.appendChild(popup);
        showOverlay();

        popup.querySelector('.modal-close').addEventListener('click', () => { popup.remove(); hideOverlay(); });
        popup.querySelector('#cancelUnassign').addEventListener('click', () => { popup.remove(); hideOverlay(); });
        popup.querySelector('#confirmUnassign').addEventListener('click', () => {
            project.assignedEmployees = (project.assignedEmployees || []).filter(a => a.employeeId !== employeeId);
            saveCurrentPeriodData(periodData);
            popup.remove();
            hideOverlay();
            renderAll();
        });
    }

    function openAvailabilityCalendar(employeeId) {
        closeAllPopups();
        const periodData = getPeriodDataSafe();
        const emp = periodData.employees.find(e => e.id === employeeId);
        if (!emp) return;
        const year = state.currentYear;
        const month = state.currentMonth;
        const daysInMonth = getDaysInMonth(year, month);
        const vacationDays = new Set(emp.vacationDays || []);
        const selectedDays = new Set(vacationDays);
        const workingDaysTotal = getWorkingDaysInMonth(year, month);

        function countWorkingDays(selected) {
            let wd = 0;
            for (const d of selected) {
                const dow = new Date(year, month, d).getDay();
                if (dow !== 0 && dow !== 6) wd++;
            }
            return wd;
        }

        function formatVacationRanges(days) {
            if (days.length === 0) return 'None';
            const sorted = [...days].sort((a, b) => a - b);
            const ranges = [];
            let start = sorted[0];
            let end = sorted[0];
            for (let i = 1; i < sorted.length; i++) {
                if (sorted[i] === end + 1 || (sorted[i] > end + 1 && isOnlyWeekendsBetween(end + 1, sorted[i] - 1))) {
                    end = sorted[i];
                } else {
                    ranges.push({ start, end });
                    start = sorted[i];
                    end = sorted[i];
                }
            }
            ranges.push({ start, end });
            return ranges.map(r => {
                if (r.start === r.end) return `${String(r.start).padStart(2,'0')}.${String(month+1).padStart(2,'0')}`;
                return `${String(r.start).padStart(2,'0')}.${String(month+1).padStart(2,'0')}-${String(r.end).padStart(2,'0')}.${String(month+1).padStart(2,'0')}`;
            }).join(', ');
        }

        function isOnlyWeekendsBetween(d1, d2) {
            for (let d = d1; d <= d2; d++) {
                const dow = new Date(year, month, d).getDay();
                if (dow !== 0 && dow !== 6) return false;
            }
            return true;
        }

        const popup = createElement('div', {
            className: 'modal',
            style: 'position:fixed;z-index:700;top:50%;left:50%;transform:translate(-50%,-50%);min-width:380px;max-width:420px;',
        });
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        popup.innerHTML = `
              <div class="modal-header">
                <h3>Availability - ${months[month]} ${year}</h3>
                <button class="modal-close">×</button>
              </div>
              <div class="modal-body">
                <div class="calendar-grid" id="calendarGrid"></div>
                <p style="margin-top:12px;"><strong>Working Days:</strong> <span id="wdDisplay"></span></p>
                <p><strong>Vacation Days:</strong> <span id="vacDisplay"></span></p>
                <button class="submit-btn" id="setVacationBtn">Set Vacation</button>
              </div>
            `;
        document.body.appendChild(popup);
        showOverlay();

        function renderCalendar() {
            const grid = popup.querySelector('#calendarGrid');
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            let html = dayNames.map(d => `<div class="calendar-day-name">${d}</div>`).join('');
            const firstDow = new Date(year, month, 1).getDay();
            for (let i = 0; i < firstDow; i++) {
                html += '<div class="calendar-day empty"></div>';
            }
            const today = new Date();
            for (let d = 1; d <= daysInMonth; d++) {
                const dow = new Date(year, month, d).getDay();
                const isWeekend = dow === 0 || dow === 6;
                const isVac = selectedDays.has(d);
                const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
                let cls = 'calendar-day';
                if (isWeekend) cls += ' weekend';
                if (isVac) cls += ' vacation';
                if (isToday) cls += ' today';
                html += `<div class="${cls}" data-day="${d}">${d}</div>`;
            }
            grid.innerHTML = html;

            const selWD = countWorkingDays(selectedDays);
            const actualWD = workingDaysTotal - selWD;
            popup.querySelector('#wdDisplay').textContent = `${actualWD}/${workingDaysTotal} days`;
            popup.querySelector('#vacDisplay').textContent = formatVacationRanges([...selectedDays]);

            grid.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
                dayEl.addEventListener('click', () => {
                    const day = parseInt(dayEl.dataset.day);
                    if (selectedDays.has(day)) selectedDays.delete(day);
                    else selectedDays.add(day);
                    renderCalendar();
                });
            });
        }
        renderCalendar();

        popup.querySelector('.modal-close').addEventListener('click', () => { popup.remove(); hideOverlay(); });
        popup.querySelector('#setVacationBtn').addEventListener('click', () => {
            emp.vacationDays = [...selectedDays];
            saveCurrentPeriodData(periodData);
            popup.remove();
            hideOverlay();
            renderAll();
        });

        setTimeout(() => {
            const handler = (e) => {
                if (!popup.contains(e.target) && !e.target.closest('.action-menu')) {
                    popup.remove();
                    hideOverlay();
                    document.removeEventListener('click', handler);
                }
            };
            document.addEventListener('click', handler);
        }, 100);
    }
function deleteProject(projectId) {
        closeAllPopups();
        const periodData = getPeriodDataSafe();
        const project = periodData.projects.find(p => p.id === projectId);
        if (!project) return;
        const popup = createElement('div', {
            className: 'modal',
            style: 'position:fixed;z-index:700;top:50%;left:50%;transform:translate(-50%,-50%);min-width:350px;',
        });
        popup.innerHTML = `
              <div class="modal-header"><h3>Delete Project</h3><button class="modal-close">×</button></div>
              <div class="modal-body">
                <p>Are you sure you want to delete <strong>${escapeHtml(project.projectName)}</strong>?</p>
                <p style="color:#ef4444;">All employee assignments will be removed.</p>
                <div style="display:flex;gap:10px;margin-top:12px;">
                  <button class="submit-btn" style="background:#ef4444;" id="confirmDelete">Delete</button>
                  <button class="btn-sm" id="cancelDelete">Cancel</button>
                </div>
              </div>
            `;
        document.body.appendChild(popup);
        showOverlay();
        popup.querySelector('.modal-close').addEventListener('click', () => { popup.remove(); hideOverlay(); });
        popup.querySelector('#cancelDelete').addEventListener('click', () => { popup.remove(); hideOverlay(); });
        popup.querySelector('#confirmDelete').addEventListener('click', () => {
            periodData.projects = periodData.projects.filter(p => p.id !== projectId);
            saveCurrentPeriodData(periodData);
            popup.remove();
            hideOverlay();
            renderAll();
        });
    }

    function deleteEmployee(employeeId) {
        closeAllPopups();
        const periodData = getPeriodDataSafe();
        const emp = periodData.employees.find(e => e.id === employeeId);
        if (!emp) return;
        const popup = createElement('div', {
            className: 'modal',
            style: 'position:fixed;z-index:700;top:50%;left:50%;transform:translate(-50%,-50%);min-width:350px;',
        });
        popup.innerHTML = `
              <div class="modal-header"><h3>Delete Employee</h3><button class="modal-close">×</button></div>
              <div class="modal-body">
                <p>Are you sure you want to delete <strong>${escapeHtml(emp.name)} ${escapeHtml(emp.surname)}</strong>?</p>
                <p style="color:#ef4444;">All project assignments will be removed.</p>
                <div style="display:flex;gap:10px;margin-top:12px;">
                  <button class="submit-btn" style="background:#ef4444;" id="confirmDeleteEmp">Delete</button>
                  <button class="btn-sm" id="cancelDeleteEmp">Cancel</button>
                </div>
              </div>
            `;
        document.body.appendChild(popup);
        showOverlay();
        popup.querySelector('.modal-close').addEventListener('click', () => { popup.remove(); hideOverlay(); });
        popup.querySelector('#cancelDeleteEmp').addEventListener('click', () => { popup.remove(); hideOverlay(); });
        popup.querySelector('#confirmDeleteEmp').addEventListener('click', () => {
            periodData.employees = periodData.employees.filter(e => e.id !== employeeId);
            for (const project of periodData.projects) {
                project.assignedEmployees = (project.assignedEmployees || []).filter(a => a.employeeId !== employeeId);
            }
            saveCurrentPeriodData(periodData);
            popup.remove();
            hideOverlay();
            renderAll();
        });
    }
 function openSeedDataPopup() {
        closeAllPopups();
        const data = getMonthlyData();
        const currentKey = getPeriodKey(state.currentYear, state.currentMonth);
        const availableMonths = Object.entries(data).filter(([key]) => key !== currentKey && data[key] && (data[key].employees?.length > 0 || data[key].projects?.length > 0));

        const popup = createElement('div', {
            className: 'modal',
            style: 'position:fixed;z-index:700;top:50%;left:50%;transform:translate(-50%,-50%);min-width:450px;max-width:500px;max-height:70vh;overflow-y:auto;',
        });
        let listHTML = '';
        if (availableMonths.length === 0) {
            listHTML = '<p style="text-align:center;padding:20px;color:#94a3b8;">No data available in other months</p>';
        } else {
            for (const [key, monthData] of availableMonths) {
                const [y, m] = key.split('-').map(Number);
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const fin = calculateAllProjectFinancials(monthData, y, m);
                const incomeClass = fin.totalEstimatedIncome >= 0 ? 'income-positive' : 'income-negative';
                listHTML += `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;border-bottom:1px solid #e2e8f0;">
                  <div>
                    <strong>${months[m]} ${y}</strong><br>
                    <small>Projects: ${monthData.projects?.length || 0} | Employees: ${monthData.employees?.length || 0}</small><br>
                    <small class="${incomeClass}">Income: ${formatCurrency(fin.totalEstimatedIncome)}</small>
                  </div>
                  <button class="btn-sm primary seed-month-btn" data-key="${key}">Seed</button>
                </div>`;
            }
        }
        popup.innerHTML = `
              <div class="modal-header"><h3>Seed Data</h3><button class="modal-close">×</button></div>
              <div class="modal-body">${listHTML}</div>
            `;
        document.body.appendChild(popup);
        showOverlay();
        popup.querySelector('.modal-close').addEventListener('click', () => { popup.remove(); hideOverlay(); });

        popup.querySelectorAll('.seed-month-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                const sourceData = data[key];
                if (!sourceData) return;
                const [y, m] = key.split('-').map(Number);
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                if (confirm(`Copy all data from ${months[m]} ${y} to current month? Current data will be overwritten.`)) {
                    const periodData = getPeriodDataSafe();
                    const copiedEmployees = (sourceData.employees || []).map(e => ({ ...e, vacationDays: [], id: generateId() }));
                    const copiedProjects = (sourceData.projects || []).map(p => ({ ...p, assignedEmployees: (p.assignedEmployees || []).map(a => ({ ...a })), id: generateId() }));
                    periodData.employees = copiedEmployees;
                    periodData.projects = copiedProjects;
                    saveCurrentPeriodData(periodData);
                    popup.remove();
                    hideOverlay();
                    renderAll();
                }
            });
        });
    }
function initializeSampleData() {
        const data = getMonthlyData();
        const key = getPeriodKey(state.currentYear, state.currentMonth);
        if (!data[key] || (data[key].employees?.length === 0 && data[key].projects?.length === 0)) {
            const sampleEmployees = [
                { id: generateId(), name: 'John', surname: 'Doe', dateOfBirth: '1990-05-15', position: 'Senior', salary: 85000, vacationDays: [] },
                { id: generateId(), name: 'Jane', surname: 'Smith', dateOfBirth: '1992-08-22', position: 'Middle', salary: 65000, vacationDays: [5, 6, 7] },
                { id: generateId(), name: 'Bob', surname: 'Johnson', dateOfBirth: '1988-03-10', position: 'Lead', salary: 105000, vacationDays: [] },
                { id: generateId(), name: 'Alice', surname: 'Williams', dateOfBirth: '1995-11-30', position: 'Junior', salary: 45000, vacationDays: [15] },
            ];
            const sampleProjects = [
                { id: generateId(), projectName: 'Project Alpha', companyName: 'TechCorp', budget: 200000, employeeCapacity: 3, assignedEmployees: [] },
                { id: generateId(), projectName: 'Project Beta', companyName: 'InnovateInc', budget: 350000, employeeCapacity: 5, assignedEmployees: [] },
            ];
            if (sampleEmployees.length >= 2 && sampleProjects.length >= 1) {
                sampleProjects[0].assignedEmployees = [
                    { employeeId: sampleEmployees[0].id, capacity: 1.0, fit: 0.8 },
                    { employeeId: sampleEmployees[1].id, capacity: 0.8, fit: 0.9 },
                ];
            }
            if (sampleEmployees.length >= 4 && sampleProjects.length >= 2) {
                sampleProjects[1].assignedEmployees = [
                    { employeeId: sampleEmployees[2].id, capacity: 1.2, fit: 0.7 },
                    { employeeId: sampleEmployees[3].id, capacity: 0.5, fit: 1.0 },
                ];
            }
            if (!data[key]) data[key] = {};
            data[key].employees = sampleEmployees;
            data[key].projects = sampleProjects;
            saveMonthlyData(data);
        }
    }
function setupGlobalEvents() {
        $('#sidebarToggle').addEventListener('click', () => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
            if (state.sidebarCollapsed) {
                $('#sidebar').classList.add('collapsed');
                $('#sidebarOpenBtn').classList.remove('hidden');
            } else {
                $('#sidebar').classList.remove('collapsed');
                $('#sidebarOpenBtn').classList.add('hidden');
            }
        });

        $('#sidebarOpenBtn').addEventListener('click', () => {
            state.sidebarCollapsed = false;
            $('#sidebar').classList.remove('collapsed');
            $('#sidebarOpenBtn').classList.add('hidden');
        });

        $('#monthSelect').addEventListener('change', () => {
            state.currentMonth = parseInt($('#monthSelect').value);
            state.sortColumn = null;
            state.filters = {};
            renderAll();
        });

        $('#yearSelect').addEventListener('change', () => {
            state.currentYear = parseInt($('#yearSelect').value);
            state.sortColumn = null;
            state.filters = {};
            renderAll();
        });

        $$('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                state.activeTab = tab.dataset.tab;
                state.sortColumn = null;
                state.filters = {};
                renderAll();
            });
        });

        $('#addBtn').addEventListener('click', () => {
            closeAllPopups();
            if (state.activeTab === 'projects') openAddProjectPanel();
            else openAddEmployeePanel();
        });

        $('#closeSlidePanel').addEventListener('click', closeSlidePanel);
        $('#overlay').addEventListener('click', () => {
            closeSlidePanel();
            closeAllPopups();
        });

        $('#seedDataBtn').addEventListener('click', openSeedDataPopup);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSlidePanel();
                closeAllPopups();
            }
        });

        window.addEventListener('resize', () => {
            closeAllPopups();
        });
    }
function init() {
        initializeSampleData();
        setupGlobalEvents();
        updatePeriodInfo();
        renderAll();
    }

    init();

    console.log('✅ Employee & Project Dashboard initialized');
    console.log('📊 Data stored in localStorage key:', STORAGE_KEY);
    console.log('📅 Current period:', getPeriodKey(state.currentYear, state.currentMonth));
    console.log('👥 Active tab:', state.activeTab);
})();