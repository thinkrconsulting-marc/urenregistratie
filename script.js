document.addEventListener('DOMContentLoaded', () => {
    // --- Users Database (Hardcoded for local use) ---
    const users = {
        'marc@thinkrconsulting.be': { password: 'Tyson69413012', role: 'admin' },
        'olivier.nachtergaele@uzleuven.be': { password: 'UZLeuven12345', role: 'viewer' }
    };

    // --- DOM Elements ---
    // Login
    const loginContainer = document.getElementById('login-container');
    const mainApp = document.getElementById('main-app');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    // App
    const formSection = document.querySelector('.form-section');
    const form = document.getElementById('hours-form');
    const entryIdInput = document.getElementById('entry-id');
    const dateInput = document.getElementById('date');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const descriptionInput = document.getElementById('description');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const formTitle = document.getElementById('form-title');
    const entriesList = document.getElementById('entries-list');
    const noEntriesMsg = document.getElementById('no-entries-msg');
    const totalHoursDisplay = document.getElementById('total-hours-display');
    
    // Exports
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');

    // State
    let entries = JSON.parse(localStorage.getItem('workHours')) || [];
    let isEditing = false;
    let currentUserRole = sessionStorage.getItem('currentUserRole');

    // Initialize
    checkAuth();
    
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // --- Event Listeners ---
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    form.addEventListener('submit', handleSubmit);
    cancelBtn.addEventListener('click', resetForm);
    exportPdfBtn.addEventListener('click', exportToPDF);
    exportExcelBtn.addEventListener('click', exportToExcel);

    // --- Auth Functions ---
    function handleLogin(e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (users[email] && users[email].password === password) {
            currentUserRole = users[email].role;
            sessionStorage.setItem('currentUserRole', currentUserRole);
            loginError.style.display = 'none';
            checkAuth();
        } else {
            loginError.style.display = 'block';
        }
    }

    function handleLogout() {
        sessionStorage.removeItem('currentUserRole');
        currentUserRole = null;
        emailInput.value = '';
        passwordInput.value = '';
        checkAuth();
    }

    function checkAuth() {
        if (currentUserRole) {
            loginContainer.style.display = 'none';
            mainApp.style.display = 'flex';
            
            if (currentUserRole === 'viewer') {
                formSection.style.display = 'none';
            } else {
                formSection.style.display = 'block';
            }
            renderEntries();
        } else {
            loginContainer.style.display = 'flex';
            mainApp.style.display = 'none';
        }
    }

    // --- App Functions ---
    function calculateDuration(start, end) {
        const [startHours, startMinutes] = start.split(':').map(Number);
        const [endHours, endMinutes] = end.split(':').map(Number);
        
        let startTotalMinutes = startHours * 60 + startMinutes;
        let endTotalMinutes = endHours * 60 + endMinutes;
        
        if (endTotalMinutes < startTotalMinutes) {
            endTotalMinutes += 24 * 60;
        }
        
        const diffMinutes = endTotalMinutes - startTotalMinutes;
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        
        return { hours, minutes, totalMinutes: diffMinutes };
    }

    function formatDuration(hours, minutes) {
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }

    function formatDate(dateString) {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('nl-NL', options);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (currentUserRole !== 'admin') return;

        const date = dateInput.value;
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        const description = descriptionInput.value;

        const durationInfo = calculateDuration(startTime, endTime);

        const entry = {
            id: isEditing ? entryIdInput.value : Date.now().toString(),
            date,
            startTime,
            endTime,
            durationHours: durationInfo.hours,
            durationMinutes: durationInfo.minutes,
            totalMinutes: durationInfo.totalMinutes,
            description
        };

        if (isEditing) {
            const index = entries.findIndex(e => e.id === entry.id);
            if (index !== -1) entries[index] = entry;
        } else {
            entries.push(entry);
        }

        entries.sort((a, b) => {
            if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
            return b.startTime.localeCompare(a.startTime);
        });

        saveEntries();
        renderEntries();
        resetForm();
    }

    function editEntry(id) {
        if (currentUserRole !== 'admin') return;
        const entry = entries.find(e => e.id === id);
        if (!entry) return;

        isEditing = true;
        entryIdInput.value = entry.id;
        dateInput.value = entry.date;
        startTimeInput.value = entry.startTime;
        endTimeInput.value = entry.endTime;
        descriptionInput.value = entry.description;

        formTitle.textContent = 'Uren Bewerken';
        submitBtn.textContent = 'Bijwerken';
        cancelBtn.classList.remove('hidden');
        
        document.querySelector('#main-app').scrollIntoView({ behavior: 'smooth' });
    }

    function deleteEntry(id) {
        if (currentUserRole !== 'admin') return;
        if (confirm('Weet je zeker dat je deze registratie wilt verwijderen?')) {
            entries = entries.filter(e => e.id !== id);
            saveEntries();
            renderEntries();
            if (isEditing && entryIdInput.value === id) resetForm();
        }
    }

    function resetForm() {
        isEditing = false;
        entryIdInput.value = '';
        dateInput.value = new Date().toISOString().split('T')[0];
        startTimeInput.value = '';
        endTimeInput.value = '';
        descriptionInput.value = '';

        formTitle.textContent = 'Nieuwe Uren Toevoegen';
        submitBtn.textContent = 'Opslaan';
        cancelBtn.classList.add('hidden');
    }

    function saveEntries() {
        localStorage.setItem('workHours', JSON.stringify(entries));
    }

    function renderEntries() {
        entriesList.innerHTML = '';
        
        if (entries.length === 0) {
            noEntriesMsg.style.display = 'block';
            totalHoursDisplay.textContent = '0:00';
            return;
        }

        noEntriesMsg.style.display = 'none';
        let totalAppMinutes = 0;

        entries.forEach(entry => {
            totalAppMinutes += entry.totalMinutes;
            
            const li = document.createElement('li');
            li.className = 'entry-card';
            
            let actionsHtml = '';
            if (currentUserRole === 'admin') {
                actionsHtml = `
                <div class="entry-actions">
                    <button class="btn-small btn-edit" onclick="window.editEntryHandler('${entry.id}')">Bewerken</button>
                    <button class="btn-small btn-delete" onclick="window.deleteEntryHandler('${entry.id}')">Verwijderen</button>
                </div>`;
            }

            li.innerHTML = `
                <div class="entry-header">
                    <span class="entry-date">${formatDate(entry.date)}</span>
                    <span class="entry-time">${entry.startTime} - ${entry.endTime}</span>
                </div>
                <div class="entry-body">
                    <span class="entry-desc">${entry.description}</span>
                    <span class="entry-duration">${formatDuration(entry.durationHours, entry.durationMinutes)} uur</span>
                </div>
                ${actionsHtml}
            `;
            entriesList.appendChild(li);
        });

        const totalHours = Math.floor(totalAppMinutes / 60);
        const totalMinutes = totalAppMinutes % 60;
        totalHoursDisplay.textContent = formatDuration(totalHours, totalMinutes);
    }

    // --- Export Functions ---
    function getExportData() {
        // Prepare data for export
        const data = entries.map(entry => {
            return {
                Datum: entry.date,
                Starttijd: entry.startTime,
                Eindtijd: entry.endTime,
                Duur: formatDuration(entry.durationHours, entry.durationMinutes),
                Beschrijving: entry.description
            };
        });
        
        // Calculate total
        let totalMins = entries.reduce((acc, curr) => acc + curr.totalMinutes, 0);
        const totalH = Math.floor(totalMins / 60);
        const totalM = totalMins % 60;
        
        return { data, total: formatDuration(totalH, totalM) };
    }

    function exportToPDF() {
        if (entries.length === 0) {
            alert("Er zijn geen gegevens om te exporteren.");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("Urenregistratie Rapport", 14, 22);
        
        const { data, total } = getExportData();
        
        const tableColumn = ["Datum", "Starttijd", "Eindtijd", "Duur (u:m)", "Beschrijving"];
        const tableRows = [];

        data.forEach(item => {
            const rowData = [
                item.Datum,
                item.Starttijd,
                item.Eindtijd,
                item.Duur,
                item.Beschrijving
            ];
            tableRows.push(rowData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'striped',
            styles: { font: 'helvetica' }
        });

        const finalY = doc.lastAutoTable.finalY || 30;
        doc.setFontSize(14);
        doc.text(`Totaal gewerkte uren: ${total}`, 14, finalY + 10);

        doc.save('urenregistratie.pdf');
    }

    function exportToExcel() {
        if (entries.length === 0) {
            alert("Er zijn geen gegevens om te exporteren.");
            return;
        }
        const { data, total } = getExportData();
        
        // Add total row at the end
        data.push({
            Datum: 'Totaal:',
            Starttijd: '',
            Eindtijd: '',
            Duur: total,
            Beschrijving: ''
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Uren");

        // Adjust column widths
        const wscols = [
            {wch: 12}, // Datum
            {wch: 10}, // Start
            {wch: 10}, // Eind
            {wch: 10}, // Duur
            {wch: 40}  // Beschrijving
        ];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, "urenregistratie.xlsx");
    }

    // Expose handlers to window object for inline onclick attributes
    window.editEntryHandler = editEntry;
    window.deleteEntryHandler = deleteEntry;
});
