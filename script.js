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
