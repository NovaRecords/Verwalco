// Globale Variablen
let tooltips = {};
let collapsedAccounts = new Set(JSON.parse(localStorage.getItem('collapsedAccounts') || '[]'));

// Zahlungstage-Dropdown befüllen
document.addEventListener('DOMContentLoaded', function() {
    const zahlungstagSelect = document.getElementById('zahlungstag');
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        zahlungstagSelect.appendChild(option);
    }

    // Form-Handler initialisieren
    document.getElementById('kostenForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            bezeichnung: document.getElementById('bezeichnung').value,
            betrag: (() => {
                const rawValue = document.getElementById('betrag').value;
                console.log('Raw value:', rawValue);
                
                // Entferne zuerst alle nicht-numerischen Zeichen außer . und ,
                let processedValue = rawValue
                    .replace(/\s/g, '')
                    .replace(/[^0-9,.]/g, '');
                
                // Wenn ein Komma vorhanden ist, nutze es als Dezimaltrennzeichen
                if (processedValue.includes(',')) {
                    processedValue = processedValue
                        .replace(/\./g, '')  // Entferne alle Punkte (Tausendertrennzeichen)
                        .replace(',', '.');   // Ersetze Komma durch Punkt
                }
                // Wenn kein Komma vorhanden ist, behalte den letzten Punkt als Dezimaltrennzeichen
                else if (processedValue.includes('.')) {
                    const parts = processedValue.split('.');
                    // Behalte nur den letzten Teil nach dem Punkt
                    processedValue = parts[0].replace(/\./g, '') + '.' + parts[parts.length - 1];
                }
                
                console.log('Processed value:', processedValue);
                return processedValue;
            })(),
            zahlungstag: document.getElementById('zahlungstag').value,
            konto: document.getElementById('konto').value
        };

        try {
            const response = await fetch('/api/kosten', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (result.success) {
                // Form zurücksetzen
                document.getElementById('kostenForm').reset();
                // Kosten neu laden
                loadKosten();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Initial laden
    loadKosten();
    loadKonten();
});

// Konten laden und Datalist aktualisieren
async function loadKonten() {
    try {
        const response = await fetch('/api/konten');
        const konten = await response.json();
        const datalist = document.getElementById('konten-list');
        datalist.innerHTML = '';
        konten.forEach(konto => {
            const option = document.createElement('option');
            option.value = konto;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading konten:', error);
    }
}

// Funktion zum Umbenennen eines Kontos
async function renameKonto(oldName) {
    const newName = prompt('Neuer Name für Konto "' + oldName + '":', oldName);
    if (newName && newName !== oldName) {
        try {
            const response = await fetch('/api/konten/rename', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    old_name: oldName,
                    new_name: newName
                })
            });

            const result = await response.json();
            if (result.success) {
                loadKosten();
                loadKonten();
            } else {
                alert('Fehler beim Umbenennen: ' + (result.error || 'Unbekannter Fehler'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Fehler beim Umbenennen des Kontos');
        }
    }
}

// Globale Variable für die Summenberechnung
let selectedSums = {};

// Funktion zum Aktualisieren der Summenanzeige
function updateSumDisplay(konto) {
    const kontoHeader = document.querySelector(`.konto-group[data-konto="${konto}"] .konto-header`);
    const sumDisplay = kontoHeader.querySelector('.sum-display');
    const renameButton = kontoHeader.querySelector('.btn-outline-secondary');
    
    if (selectedSums[konto] && selectedSums[konto] > 0) {
        if (!sumDisplay) {
            const newSumDisplay = document.createElement('span');
            newSumDisplay.className = 'sum-display';
            kontoHeader.appendChild(newSumDisplay);
        }
        const displayElement = sumDisplay || kontoHeader.querySelector('.sum-display');
        const formattedSum = new Intl.NumberFormat('de-DE', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true
        }).format(selectedSums[konto]);
        
        displayElement.textContent = `Summe: ${formattedSum}`;
        displayElement.style.display = 'inline-block';
        // Hide rename button when sum is displayed
        if (renameButton) {
            renameButton.style.display = 'none';
        }
    } else {
        if (sumDisplay) {
            sumDisplay.style.display = 'none';
        }
        // Show rename button when no sum is displayed
        if (renameButton) {
            renameButton.style.display = 'inline-block';
        }
    }
}

// Funktion zum Aktualisieren der ausgewählten Summe
function updateSelectedSum(checkbox, betrag, konto) {
    if (!selectedSums[konto]) {
        selectedSums[konto] = 0;
    }

    // Convert German number format to float
    const amount = parseFloat(
        betrag.replace(/\./g, '')  // Remove thousand separators
             .replace(',', '.')     // Replace decimal comma with point
    );

    if (checkbox.checked) {
        selectedSums[konto] = (selectedSums[konto] * 100 + amount * 100) / 100; // Avoid floating point errors
    } else {
        selectedSums[konto] = (selectedSums[konto] * 100 - amount * 100) / 100; // Avoid floating point errors
        // Verhindere negative Werte durch Rundungsfehler
        if (Math.abs(selectedSums[konto]) < 0.01) {
            selectedSums[konto] = 0;
        }
    }
    
    updateSumDisplay(konto);
    
    // Aktualisiere die Gesamtsumme der ausgewählten Beträge
    let totalSelectedSum = 0;
    Object.values(selectedSums).forEach(sum => {
        totalSelectedSum = (totalSelectedSum * 100 + sum * 100) / 100; // Avoid floating point errors
    });
    
    // Zeige die Gesamtsumme der ausgewählten Beträge an
    const totalDisplay = document.getElementById('selected-total');
    if (!totalDisplay) {
        const newTotalDisplay = document.createElement('div');
        newTotalDisplay.id = 'selected-total';
        newTotalDisplay.className = 'selected-total-display';
        document.getElementById('kostenListe').insertAdjacentElement('afterend', newTotalDisplay);
    }
    
    const displayElement = document.getElementById('selected-total');
    if (totalSelectedSum > 0) {
        const formattedTotal = new Intl.NumberFormat('de-DE', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true
        }).format(totalSelectedSum);
        
        displayElement.textContent = `Summe der ausgewählten Beträge: ${formattedTotal}`;
        displayElement.style.display = 'block';
    } else {
        displayElement.style.display = 'none';
    }
}

// Funktion zum Aktualisieren des Tooltips
function updateTooltip(e, konto) {
    if (!tooltips[konto]) {
        tooltips[konto] = document.createElement('div');
        tooltips[konto].className = 'custom-tooltip';
        document.body.appendChild(tooltips[konto]);
    }
    
    tooltips[konto].style.display = 'block';
    tooltips[konto].style.left = e.pageX + 'px';
    tooltips[konto].style.top = e.pageY + 'px';
    tooltips[konto].innerHTML = `Summe: ${new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(selectedSums[konto])}`;
}

// Funktion zum Ausblenden des Tooltips
function hideTooltip(konto) {
    if (tooltips[konto]) {
        tooltips[konto].style.display = 'none';
    }
}

// Event-Listener für das Verlassen des Dokuments
document.addEventListener('mouseleave', () => {
    Object.keys(tooltips).forEach(konto => {
        hideTooltip(konto);
    });
});

// Kosten nach Konten gruppieren
function groupByKonto(kosten) {
    const groups = {};
    kosten.forEach(k => {
        if (!groups[k.konto]) {
            groups[k.konto] = [];
        }
        groups[k.konto].push(k);
    });
    return groups;
}

// Kosten laden
async function loadKosten() {
    const response = await fetch('/api/kosten');
    const kosten = await response.json();
    displayKosten(kosten);
}

// Kosten anzeigen
function displayKosten(kostenListe) {
    const kostenListeElement = document.getElementById('kostenListe');
    const kontoGruppen = groupByKonto(kostenListe);
    
    kostenListeElement.innerHTML = '';
    selectedSums = {}; // Reset der Summen beim Neuladen
    
    // Gesamtsumme berechnen
    let gesamtsumme = 0;
    kostenListe.forEach(k => {
        if (!k.bezahlt) {
            const betrag = Number(k.betrag);
            gesamtsumme += betrag;
        }
    });
    document.getElementById('gesamtsumme').textContent = new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(gesamtsumme);

    Object.keys(kontoGruppen).sort().forEach(konto => {
        const kontoGruppe = document.createElement('div');
        kontoGruppe.className = 'konto-group';
        kontoGruppe.dataset.konto = konto;
        
        // Konto-Header mit Rename-Button und Toggle-Button
        const kontoHeader = document.createElement('div');
        kontoHeader.className = 'konto-header d-flex justify-content-between align-items-center';
        
        const headerLeft = document.createElement('div');
        headerLeft.className = 'd-flex align-items-center';
        
        const toggleButton = document.createElement('button');
        toggleButton.className = 'btn btn-link btn-sm me-2 toggle-btn';
        toggleButton.innerHTML = collapsedAccounts.has(konto) ? 
            '<i class="fas fa-chevron-right"></i>' : 
            '<i class="fas fa-chevron-down"></i>';
        toggleButton.style.textDecoration = 'none';
        toggleButton.onclick = (e) => {
            e.preventDefault();
            toggleKontoCollapse(konto);
        };
        
        const kontoTitle = document.createElement('h5');
        kontoTitle.className = 'mb-0';
        kontoTitle.textContent = konto;
        
        headerLeft.appendChild(toggleButton);
        headerLeft.appendChild(kontoTitle);
        
        const renameButton = document.createElement('button');
        renameButton.className = 'btn btn-outline-secondary btn-sm ms-2';
        renameButton.innerHTML = '<i class="fas fa-edit"></i>';
        renameButton.title = 'Konto umbenennen';
        renameButton.onclick = () => renameKonto(konto);
        
        kontoHeader.appendChild(headerLeft);
        kontoHeader.appendChild(renameButton);
        kontoGruppe.appendChild(kontoHeader);

        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        tableContainer.style.transition = 'height 0.3s ease-in-out';
        if (collapsedAccounts.has(konto)) {
            tableContainer.style.height = '0';
            tableContainer.style.overflow = 'hidden';
        }

        const table = document.createElement('table');
        table.className = 'table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 30px"></th>
                    <th class="col-bezeichnung">Bezeichnung</th>
                    <th class="col-betrag">Betrag</th>
                    <th class="col-sum" style="width: 80px">Summe</th>
                    <th class="col-zahlungstag">Zahlungstag</th>
                    <th class="col-bezahlt">Bezahlt</th>
                    <th class="col-aktionen">Aktionen</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        kontoGruppen[konto].forEach(k => {
            const tr = document.createElement('tr');
            tr.draggable = true;
            tr.dataset.id = k.id;
            tr.dataset.konto = konto;
            tr.className = 'draggable';
            
            tr.addEventListener('dragstart', handleDragStart);
            tr.addEventListener('dragend', handleDragEnd);
            tr.addEventListener('dragover', handleDragOver);
            tr.addEventListener('drop', handleDrop);
            
            const betragFormatted = new Intl.NumberFormat('de-DE', { 
                style: 'decimal', 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(parseFloat(k.betrag));
            
            tr.innerHTML = `
                <td>
                    <span class="drag-handle">
                        <i class="fas fa-grip-vertical"></i>
                    </span>
                </td>
                <td class="col-bezeichnung">${k.bezeichnung}</td>
                <td class="col-betrag">${betragFormatted} €</td>
                <td class="col-sum">
                    <div class="form-check" style="margin: 0; padding: 0; display: flex; justify-content: center;">
                        <input type="checkbox" class="form-check-input sum-checkbox" 
                            style="margin: 0; cursor: pointer;"
                            onchange="updateSelectedSum(this, '${betragFormatted}', '${konto}')">
                    </div>
                </td>
                <td class="col-zahlungstag">${k.zahlungstag}</td>
                <td class="col-bezahlt">
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" 
                            ${k.bezahlt ? 'checked' : ''} 
                            onchange="updateBezahlt(${k.id}, this.checked)">
                    </div>
                </td>
                <td class="col-aktionen">
                    <button class="btn btn-sm btn-primary" onclick="startEdit(${k.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteKosten(${k.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        tableContainer.appendChild(table);
        kontoGruppe.appendChild(tableContainer);
        kostenListeElement.appendChild(kontoGruppe);
    });
}

// Funktion zum Umschalten des Collapse-Status eines Kontos
function toggleKontoCollapse(konto) {
    const kontoGruppe = document.querySelector(`.konto-group[data-konto="${konto}"]`);
    const tableContainer = kontoGruppe.querySelector('.table-container');
    const toggleBtn = kontoGruppe.querySelector('.toggle-btn i');
    const table = tableContainer.querySelector('table');
    
    if (collapsedAccounts.has(konto)) {
        // Expand
        const height = table.offsetHeight;
        tableContainer.style.height = height + 'px';
        toggleBtn.className = 'fas fa-chevron-down';
        collapsedAccounts.delete(konto);
        // After animation completes, remove fixed height
        setTimeout(() => {
            tableContainer.style.height = 'auto';
        }, 300);
    } else {
        // Collapse
        const height = table.offsetHeight;
        tableContainer.style.height = height + 'px';
        // Force a reflow
        tableContainer.offsetHeight;
        tableContainer.style.height = '0';
        toggleBtn.className = 'fas fa-chevron-right';
        collapsedAccounts.add(konto);
    }
    
    // Save state to localStorage
    localStorage.setItem('collapsedAccounts', JSON.stringify([...collapsedAccounts]));
}

// Drag and Drop Funktionalität
let draggedItem = null;
let draggedKonto = null;

function handleDragStart(e) {
    draggedItem = e.target;
    draggedKonto = e.target.closest('.konto-group').dataset.konto;
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedItem = null;
    draggedKonto = null;
}

function handleDragOver(e) {
    e.preventDefault();
    const row = e.target.closest('tr');
    if (!row || !draggedItem || row === draggedItem) return;

    const currentKonto = row.closest('.konto-group').dataset.konto;
    if (currentKonto !== draggedKonto) return;

    const box = row.getBoundingClientRect();
    const offset = e.clientY - box.top;
    
    if (offset < box.height / 2) {
        row.parentNode.insertBefore(draggedItem, row);
    } else {
        row.parentNode.insertBefore(draggedItem, row.nextSibling);
    }
}

function handleDrop(e) {
    e.preventDefault();
    updatePositions();
}

async function updatePositions() {
    const rows = document.querySelectorAll('tr[data-id]');
    const positions = Array.from(rows).map((row, index) => ({
        id: row.dataset.id,
        position: index + 1
    }));

    try {
        const response = await fetch('/api/kosten/reorder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(positions)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update positions');
        }
    } catch (error) {
        console.error('Error updating positions:', error);
    }
}

function startEdit(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    const cells = row.querySelectorAll('td');
    
    const bezeichnung = cells[1].textContent;
    // Get the original betrag text and clean it
    const originalBetrag = cells[2].textContent;
    console.log('Original betrag:', originalBetrag);
    
    // Clean up the betrag value, keeping the comma
    const betrag = originalBetrag.replace('€', '').trim();
    console.log('Cleaned betrag:', betrag);
    
    const zahlungstag = cells[4].textContent;
    
    cells[1].innerHTML = `<input type="text" class="form-control" value="${bezeichnung}" style="min-width: 100px">`;
    cells[2].innerHTML = `<input type="text" class="form-control" value="${betrag}" style="min-width: 80px">`;
    cells[4].innerHTML = `
        <select class="form-control" style="min-width: 70px">
            ${Array.from({length: 31}, (_, i) => i + 1)
                .map(day => `<option value="${day}" ${day == zahlungstag ? 'selected' : ''}>${day}</option>`)
                .join('')}
        </select>
    `;
    
    const aktionenCell = cells[6];
    aktionenCell.innerHTML = `
        <button onclick="saveEdit(${id})" class="btn btn-success btn-sm">
            <i class="fas fa-save"></i>
        </button>
    `;
}

async function saveEdit(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    const bezeichnung = row.querySelector('td:nth-child(2) input').value;
    const betragStr = row.querySelector('td:nth-child(3) input').value;
    console.log('Betrag from input:', betragStr);
    
    // Convert German number format to international format
    const betrag = (() => {
        let value = betragStr.trim();
        if (value.includes(',')) {
            // Split at last comma and remove dots from integer part
            const parts = value.split(',');
            const integerPart = parts[0].replace(/\./g, '');
            const decimalPart = parts[1] || '0';
            return integerPart + '.' + decimalPart;
        }
        return value;
    })();
    console.log('Converted betrag:', betrag);
    
    const zahlungstag = row.querySelector('td:nth-child(5) select').value;
    const konto = row.closest('.konto-group').dataset.konto;

    // Log the data being sent
    console.log('Saving data:', { id, bezeichnung, betrag, zahlungstag, konto });

    try {
        const response = await fetch(`/api/kosten/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bezeichnung, betrag, zahlungstag, konto })
        });

        const responseData = await response.json();
        console.log('Server response:', responseData);

        if (response.ok) {
            await loadKosten();
        } else {
            console.error('Failed to save:', responseData.error || 'Unknown error');
            alert('Fehler beim Speichern: ' + (responseData.error || 'Unbekannter Fehler'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fehler beim Speichern: ' + error.message);
    }
}

async function updateBezahlt(id, bezahlt) {
    try {
        const response = await fetch(`/api/kosten/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bezahlt })
        });

        const responseData = await response.json();
        console.log('Server response:', responseData);

        if (!response.ok) {
            throw new Error('Failed to update bezahlt status');
        }

        // Aktualisiere den Bezahlstatus visuell
        const row = document.querySelector(`tr[data-id="${id}"]`);
        if (row) {
            if (bezahlt) {
                row.classList.add('bezahlt');
            } else {
                row.classList.remove('bezahlt');
            }
        }

        // Aktualisiere nur die Gesamtsumme
        const kostenResponse = await fetch('/api/kosten');
        const kostenListe = await kostenResponse.json();
        let gesamtsumme = 0;
        kostenListe.forEach(k => {
            if (!k.bezahlt) {
                const betrag = Number(k.betrag);
                gesamtsumme += betrag;
            }
        });
        document.getElementById('gesamtsumme').textContent = new Intl.NumberFormat('de-DE', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(gesamtsumme);
    } catch (error) {
        console.error('Error updating bezahlt status:', error);
        // Checkbox auf den vorherigen Zustand zurücksetzen
        const checkbox = document.querySelector(`tr[data-id="${id}"] input[type="checkbox"]`);
        if (checkbox) {
            checkbox.checked = !bezahlt;
        }
    }
}

async function deleteKosten(id) {
    if (!confirm('Möchten Sie diesen Eintrag wirklich löschen?')) return;

    try {
        const response = await fetch(`/api/kosten/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadKosten();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
