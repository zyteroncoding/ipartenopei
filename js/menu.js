// Carica il menù dal backend e lo mostra nella pagina menu.html

document.addEventListener('DOMContentLoaded', caricaMenu);

async function caricaMenu() {
    const contenitore = document.getElementById('menu-contenitore');
    if (!contenitore) return;

    try {
        const risposta = await fetch(`${API_BASE_URL}/api/menu`);
        if (!risposta.ok) throw new Error('Risposta non valida dal server');

        const dati = await risposta.json();
        const categorie = dati.menu || [];

        if (categorie.length === 0) {
            contenitore.innerHTML = '<p class="menu-stato">Il menù non è ancora disponibile online. Chiamaci per saperne di più.</p>';
            return;
        }

        contenitore.innerHTML = categorie.map(renderCategoria).join('');

    } catch (errore) {
        console.error('Errore nel caricamento del menù:', errore);
        contenitore.innerHTML = '<p class="menu-stato">Non è stato possibile caricare il menù in questo momento. Riprova più tardi o chiamaci al 045 2244631.</p>';
    }
}

// Costruisce l'HTML di una singola categoria con i suoi piatti
function renderCategoria(categoria) {
    const piattiVisibili = (categoria.piatti || []);

    if (piattiVisibili.length === 0) {
        return '';
    }

    const piattiHtml = piattiVisibili.map(renderPiatto).join('');

    return `
        <div class="categoria-menu">
            <h3>${escapeHtml(categoria.nome)}</h3>
            ${piattiHtml}
        </div>
    `;
}

// Costruisce l'HTML di un singolo piatto
function renderPiatto(piatto) {
    const nonDisponibile = !piatto.disponibile
        ? '<span class="non-disponibile">Non disponibile</span>'
        : '';

    const descrizione = piatto.descrizione
        ? `<p class="piatto-descrizione">${escapeHtml(piatto.descrizione)}</p>`
        : '';

    const prezzoFormattato = Number(piatto.prezzo).toFixed(2).replace('.', ',');

    return `
        <div class="piatto">
            <div class="piatto-info">
                <p class="piatto-nome">${escapeHtml(piatto.nome)}${nonDisponibile}</p>
                ${descrizione}
            </div>
            <p class="piatto-prezzo">€ ${prezzoFormattato}</p>
        </div>
    `;
}

// Evita che testi inseriti dall'admin possano rompere l'HTML della pagina
function escapeHtml(testo) {
    const div = document.createElement('div');
    div.textContent = testo;
    return div.innerHTML;
}
