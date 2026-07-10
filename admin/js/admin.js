// Logica del pannello di amministrazione

const CHIAVE_TOKEN = 'ipartenopei_admin_token';

document.addEventListener('DOMContentLoaded', () => {
    const siamoNelLogin = !!document.getElementById('form-login');
    const siamoNellaDashboard = !!document.getElementById('categorie-contenitore');

    if (siamoNelLogin) {
        inizializzaLogin();
    }

    if (siamoNellaDashboard) {
        // Se non c'è un token salvato, torna al login
        if (!sessionStorage.getItem(CHIAVE_TOKEN)) {
            window.location.href = 'login.html';
            return;
        }
        inizializzaDashboard();
    }
});

/* ==========================================================================
   LOGIN
   ========================================================================== */

function inizializzaLogin() {
    const form = document.getElementById('form-login');
    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const bottone = document.getElementById('bottone-login');
        const esito = document.getElementById('messaggio-esito');

        const username = form.username.value.trim();
        const password = form.password.value;

        bottone.disabled = true;
        bottone.textContent = 'Accesso in corso...';

        try {
            const risposta = await fetch(`${API_BASE_URL}/api/auth-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const risultato = await risposta.json();

            if (!risposta.ok) {
                throw new Error(risultato.errore || 'Accesso non riuscito.');
            }

            sessionStorage.setItem(CHIAVE_TOKEN, risultato.token);
            window.location.href = 'dashboard.html';

        } catch (errore) {
            esito.textContent = errore.message;
            esito.className = 'messaggio-esito visibile errore';
            bottone.disabled = false;
            bottone.textContent = 'Accedi';
        }
    });
}

/* ==========================================================================
   UTILITY CONDIVISE
   ========================================================================== */

function getToken() {
    return sessionStorage.getItem(CHIAVE_TOKEN);
}

// Wrapper per le chiamate fetch autenticate verso il backend
async function chiamataAutenticata(percorso, opzioni = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...(opzioni.headers || {}),
    };

    const risposta = await fetch(`${API_BASE_URL}${percorso}`, { ...opzioni, headers });

    if (risposta.status === 401) {
        // Sessione scaduta o non valida: torna al login
        sessionStorage.removeItem(CHIAVE_TOKEN);
        window.location.href = 'login.html';
        throw new Error('Sessione scaduta.');
    }

    const dati = await risposta.json();

    if (!risposta.ok) {
        throw new Error(dati.errore || 'Si è verificato un errore.');
    }

    return dati;
}

function mostraEsitoAdmin(testo, tipo) {
    const esito = document.getElementById('messaggio-esito-admin');
    esito.textContent = testo;
    esito.className = `messaggio-esito visibile ${tipo}`;
    setTimeout(() => esito.classList.remove('visibile'), 4000);
}

function escapeHtml(testo) {
    const div = document.createElement('div');
    div.textContent = testo || '';
    return div.innerHTML;
}

/* ==========================================================================
   DASHBOARD
   ========================================================================== */

function inizializzaDashboard() {
    document.getElementById('bottone-logout').addEventListener('click', () => {
        sessionStorage.removeItem(CHIAVE_TOKEN);
        window.location.href = 'login.html';
    });

    inizializzaTab();
    caricaMenuAdmin();
    caricaTestiAdmin();

    document.getElementById('bottone-nuova-categoria').addEventListener('click', creaCategoria);
}

function inizializzaTab() {
    const bottoni = document.querySelectorAll('.tab-bottone');
    bottoni.forEach((bottone) => {
        bottone.addEventListener('click', () => {
            bottoni.forEach((b) => b.classList.remove('attivo'));
            document.querySelectorAll('.pannello').forEach((p) => p.classList.remove('attivo'));

            bottone.classList.add('attivo');
            document.getElementById(`pannello-${bottone.dataset.tab}`).classList.add('attivo');
        });
    });
}

/* ---------- Gestione MENÙ ---------- */

async function caricaMenuAdmin() {
    const contenitore = document.getElementById('categorie-contenitore');

    try {
        const dati = await chiamataAutenticata('/api/menu', { method: 'GET' });
        const categorie = dati.menu || [];

        if (categorie.length === 0) {
            contenitore.innerHTML = '<p class="menu-stato">Nessuna categoria ancora. Creane una qui sopra.</p>';
            return;
        }

        contenitore.innerHTML = categorie.map(renderBloccoCategoria).join('');
        collegaEventiMenu();

    } catch (errore) {
        contenitore.innerHTML = `<p class="menu-stato">Errore nel caricamento: ${escapeHtml(errore.message)}</p>`;
    }
}

function renderBloccoCategoria(categoria) {
    const righePiatti = (categoria.piatti || []).map(renderRigaPiatto).join('');

    return `
        <div class="blocco-categoria" data-categoria-id="${categoria.id}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-style: italic; margin: 0;">${escapeHtml(categoria.nome)}</h3>
                <button class="bottone-piccolo elimina" data-azione="elimina-categoria" data-id="${categoria.id}">Elimina categoria</button>
            </div>

            <div class="righe-piatti" style="margin-top: 1rem;">
                ${righePiatti || '<p class="menu-stato">Nessun piatto in questa categoria.</p>'}
            </div>

            <div class="riga-piatto" data-nuovo-piatto="${categoria.id}">
                <input type="text" placeholder="Nome piatto" class="input-nome">
                <input type="number" step="0.01" placeholder="Prezzo" class="input-prezzo">
                <input type="text" placeholder="Descrizione (opzionale)" class="input-descrizione">
                <span></span>
                <span></span>
                <button class="bottone-piccolo" data-azione="aggiungi-piatto" data-categoria="${categoria.id}">+ Aggiungi</button>
            </div>
        </div>
    `;
}

function renderRigaPiatto(piatto) {
    return `
        <div class="riga-piatto" data-piatto-id="${piatto.id}">
            <input type="text" class="input-nome" value="${escapeHtml(piatto.nome)}">
            <input type="number" step="0.01" class="input-prezzo" value="${piatto.prezzo}">
            <input type="text" class="input-descrizione" value="${escapeHtml(piatto.descrizione || '')}">
            <label style="font-size:0.8rem; display:flex; align-items:center; gap:0.3rem;">
                <input type="checkbox" class="input-disponibile" ${piatto.disponibile ? 'checked' : ''}> Attivo
            </label>
            <button class="bottone-piccolo" data-azione="salva-piatto" data-id="${piatto.id}">Salva</button>
            <button class="bottone-piccolo elimina" data-azione="elimina-piatto" data-id="${piatto.id}">Elimina</button>
        </div>
    `;
}

function collegaEventiMenu() {
    document.querySelectorAll('[data-azione="salva-piatto"]').forEach((bottone) => {
        bottone.addEventListener('click', () => salvaPiatto(bottone));
    });
    document.querySelectorAll('[data-azione="elimina-piatto"]').forEach((bottone) => {
        bottone.addEventListener('click', () => eliminaPiatto(bottone));
    });
    document.querySelectorAll('[data-azione="aggiungi-piatto"]').forEach((bottone) => {
        bottone.addEventListener('click', () => aggiungiPiatto(bottone));
    });
    document.querySelectorAll('[data-azione="elimina-categoria"]').forEach((bottone) => {
        bottone.addEventListener('click', () => eliminaCategoria(bottone));
    });
}

async function salvaPiatto(bottone) {
    const riga = bottone.closest('.riga-piatto');
    const id = riga.dataset.piattoId;

    const corpo = {
        id: Number(id),
        nome: riga.querySelector('.input-nome').value.trim(),
        prezzo: parseFloat(riga.querySelector('.input-prezzo').value),
        descrizione: riga.querySelector('.input-descrizione').value.trim(),
        disponibile: riga.querySelector('.input-disponibile').checked ? 1 : 0,
    };

    try {
        await chiamataAutenticata('/api/menu', { method: 'PUT', body: JSON.stringify(corpo) });
        mostraEsitoAdmin('Piatto aggiornato.', 'successo');
    } catch (errore) {
        mostraEsitoAdmin(errore.message, 'errore');
    }
}

async function eliminaPiatto(bottone) {
    const id = bottone.dataset.id;
    if (!confirm('Eliminare questo piatto dal menù?')) return;

    try {
        await chiamataAutenticata('/api/menu', { method: 'DELETE', body: JSON.stringify({ id: Number(id) }) });
        mostraEsitoAdmin('Piatto eliminato.', 'successo');
        caricaMenuAdmin();
    } catch (errore) {
        mostraEsitoAdmin(errore.message, 'errore');
    }
}

async function aggiungiPiatto(bottone) {
    const riga = bottone.closest('.riga-piatto');
    const categoriaId = bottone.dataset.categoria;

    const nome = riga.querySelector('.input-nome').value.trim();
    const prezzo = parseFloat(riga.querySelector('.input-prezzo').value);
    const descrizione = riga.querySelector('.input-descrizione').value.trim();

    if (!nome || isNaN(prezzo)) {
        mostraEsitoAdmin('Inserisci almeno nome e prezzo del piatto.', 'errore');
        return;
    }

    try {
        await chiamataAutenticata('/api/menu', {
            method: 'POST',
            body: JSON.stringify({ categoria_id: Number(categoriaId), nome, prezzo, descrizione }),
        });
        mostraEsitoAdmin('Piatto aggiunto.', 'successo');
        caricaMenuAdmin();
    } catch (errore) {
        mostraEsitoAdmin(errore.message, 'errore');
    }
}

async function eliminaCategoria(bottone) {
    const id = bottone.dataset.id;
    if (!confirm('Eliminare questa categoria e tutti i piatti al suo interno?')) return;

    try {
        await chiamataAutenticata('/api/categorie', { method: 'DELETE', body: JSON.stringify({ id: Number(id) }) });
        mostraEsitoAdmin('Categoria eliminata.', 'successo');
        caricaMenuAdmin();
    } catch (errore) {
        mostraEsitoAdmin(errore.message, 'errore');
    }
}

async function creaCategoria() {
    const input = document.getElementById('nuova-categoria-nome');
    const nome = input.value.trim();

    if (!nome) {
        mostraEsitoAdmin('Inserisci un nome per la categoria.', 'errore');
        return;
    }

    try {
        await chiamataAutenticata('/api/categorie', { method: 'POST', body: JSON.stringify({ nome }) });
        mostraEsitoAdmin('Categoria creata.', 'successo');
        input.value = '';
        caricaMenuAdmin();
    } catch (errore) {
        mostraEsitoAdmin(errore.message, 'errore');
    }
}

/* ---------- Gestione TESTI DEL SITO ---------- */

async function caricaTestiAdmin() {
    const contenitore = document.getElementById('testi-contenitore');

    try {
        const dati = await chiamataAutenticata('/api/contenuti', { method: 'GET' });
        const testi = dati.contenuti || {};

        const chiavi = Object.keys(testi);
        if (chiavi.length === 0) {
            contenitore.innerHTML = '<p class="menu-stato">Nessun testo configurato.</p>';
            return;
        }

        contenitore.innerHTML = chiavi.map((chiave) => `
            <div class="blocco-testo" data-chiave="${escapeHtml(chiave)}">
                <label style="font-family: var(--font-utility); font-size: 0.75rem; text-transform: uppercase; display:block; margin-bottom:0.4rem;">
                    ${escapeHtml(chiave)}
                </label>
                <textarea class="input-testo">${escapeHtml(testi[chiave])}</textarea>
                <button class="bottone-piccolo" style="margin-top:0.6rem;" data-azione="salva-testo">Salva</button>
            </div>
        `).join('');

        document.querySelectorAll('[data-azione="salva-testo"]').forEach((bottone) => {
            bottone.addEventListener('click', () => salvaTesto(bottone));
        });

    } catch (errore) {
        contenitore.innerHTML = `<p class="menu-stato">Errore nel caricamento: ${escapeHtml(errore.message)}</p>`;
    }
}

async function salvaTesto(bottone) {
    const blocco = bottone.closest('.blocco-testo');
    const chiave = blocco.dataset.chiave;
    const valore = blocco.querySelector('.input-testo').value;

    try {
        await chiamataAutenticata('/api/contenuti', {
            method: 'PUT',
            body: JSON.stringify({ chiave, valore }),
        });
        mostraEsitoAdmin('Testo aggiornato.', 'successo');
    } catch (errore) {
        mostraEsitoAdmin(errore.message, 'errore');
    }
}
