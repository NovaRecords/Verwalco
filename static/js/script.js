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
            betrag: document.getElementById('betrag').value,
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
    
    // Gesamtsumme berechnen
    let gesamtsumme = 0;
    console.log('Kostenberechnung startet:', kostenListe);
    kostenListe.forEach(k => {
        console.log('Prüfe Kosten:', k);
        console.log('Bezahlt Status:', k.bezahlt);
        console.log('Betrag (original):', k.betrag, 'Typ:', typeof k.betrag);
        if (!k.bezahlt) {
            const betrag = Number(k.betrag);
            console.log('Betrag (konvertiert):', betrag);
            gesamtsumme += betrag;
            console.log('Zwischensumme:', gesamtsumme);
        }
    });
    console.log('Finale Gesamtsumme:', gesamtsumme);
    document.getElementById('gesamtsumme').textContent = new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR' 
    }).format(gesamtsumme);
    
    Object.keys(kontoGruppen).sort().forEach(konto => {
        const kontoGruppe = document.createElement('div');
        kontoGruppe.className = 'konto-group';
        kontoGruppe.dataset.konto = konto;
        
        const kontoHeader = document.createElement('div');
        kontoHeader.className = 'konto-header';
        kontoHeader.textContent = konto;
        
        const table = document.createElement('table');
        table.className = 'table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 30px"></th>
                    <th class="col-bezeichnung">Bezeichnung</th>
                    <th class="col-betrag">Betrag</th>
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
            
            tr.innerHTML = `
                <td>
                    <span class="drag-handle">
                        <i class="fas fa-grip-vertical"></i>
                    </span>
                </td>
                <td class="col-bezeichnung">${k.bezeichnung}</td>
                <td class="col-betrag">${parseFloat(k.betrag).toFixed(2)} €</td>
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
        const response = await fetch('/api/kosten/positions', {
            method: 'PUT',
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
    const betrag = cells[2].textContent.replace('€', '').trim();
    const zahlungstag = cells[3].textContent;
    
    cells[1].innerHTML = `<input type="text" class="form-control" value="${bezeichnung}">`;
    cells[2].innerHTML = `<input type="number" step="0.01" class="form-control" value="${betrag}">`;
    cells[3].innerHTML = `
        <select class="form-control">
            ${Array.from({length: 31}, (_, i) => i + 1)
                .map(day => `<option value="${day}" ${day == zahlungstag ? 'selected' : ''}>${day}</option>`)
                .join('')}
        </select>
    `;
    
    const aktionenCell = cells[5];
    aktionenCell.innerHTML = `
        <button onclick="saveEdit(${id})" class="btn btn-success btn-sm">
            <i class="fas fa-save"></i>
        </button>
    `;
}

async function saveEdit(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    const bezeichnung = row.querySelector('td:nth-child(2) input').value;
    const betrag = row.querySelector('td:nth-child(3) input').value;
    const zahlungstag = row.querySelector('td:nth-child(4) select').value;
    const konto = row.closest('.konto-group').dataset.konto;

    try {
        const response = await fetch(`/api/kosten/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bezeichnung, betrag, zahlungstag, konto })
        });

        if (response.ok) {
            loadKosten();
        }
    } catch (error) {
        console.error('Error:', error);
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

        if (!response.ok) {
            throw new Error('Failed to update bezahlt status');
        }

        await loadKosten(); // Neu laden der Daten nach erfolgreicher Aktualisierung
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
