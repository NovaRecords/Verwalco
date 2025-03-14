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
            betrag: document.getElementById('betrag').value.replace(/\./g, '').replace(',', '.'), // Entferne Tausendertrennzeichen und konvertiere zu Dezimalpunkt
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
});

// Globale Variable für die Summenberechnung
let selectedSums = {};

// Funktion zum Aktualisieren der Summenanzeige
function updateSumDisplay(konto) {
    const kontoHeader = document.querySelector(`.konto-group[data-konto="${konto}"] .konto-header`);
    const sumDisplay = kontoHeader.querySelector('.sum-display');
    
    if (selectedSums[konto] && selectedSums[konto] > 0) {
        if (!sumDisplay) {
            const newSumDisplay = document.createElement('span');
            newSumDisplay.className = 'sum-display';
            kontoHeader.appendChild(newSumDisplay);
        }
        const displayElement = sumDisplay || kontoHeader.querySelector('.sum-display');
        displayElement.textContent = `Summe: ${new Intl.NumberFormat('de-DE', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(selectedSums[konto])}`;
        displayElement.style.display = 'inline-block';
    } else if (sumDisplay) {
        sumDisplay.style.display = 'none';
    }
}

// Funktion zum Aktualisieren der ausgewählten Summe
function updateSelectedSum(checkbox, betrag, konto) {
    if (!selectedSums[konto]) {
        selectedSums[konto] = 0;
    }

    const amount = parseFloat(betrag.replace(',', '.'));
    if (checkbox.checked) {
        selectedSums[konto] += amount;
    } else {
        selectedSums[konto] -= amount;
        // Verhindere negative Werte durch Rundungsfehler
        if (Math.abs(selectedSums[konto]) < 0.01) {
            selectedSums[konto] = 0;
        }
    }
    
    updateSumDisplay(konto);
    
    // Aktualisiere die Gesamtsumme der ausgewählten Beträge
    let totalSelectedSum = 0;
    Object.values(selectedSums).forEach(sum => {
        totalSelectedSum += sum;
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
        displayElement.textContent = `Summe der ausgewählten Beträge: ${new Intl.NumberFormat('de-DE', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(totalSelectedSum)}`;
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
        
        const kontoHeader = document.createElement('div');
        kontoHeader.className = 'konto-header';
        kontoHeader.innerHTML = `
            <span class="konto-name">${konto}</span>
        `;
        
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
        
        kontoGruppe.appendChild(kontoHeader);
        kontoGruppe.appendChild(table);
        kostenListeElement.appendChild(kontoGruppe);
    });
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
    
    // Convert German number format (comma) to international format (period)
    const betrag = betragStr.replace(',', '.');
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
