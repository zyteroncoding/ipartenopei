// Script condiviso da tutte le pagine pubbliche del sito

document.addEventListener('DOMContentLoaded', () => {
    attivaMenuMobile();
    caricaContenutiDinamici();
});

// Apre/chiude il menu di navigazione su mobile
function attivaMenuMobile() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav-principale');

    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        const aperto = nav.classList.toggle('aperto');
        toggle.setAttribute('aria-expanded', aperto ? 'true' : 'false');
    });
}

// Cerca tutti gli elementi con l'attributo data-contenuto="chiave"
// e li riempie con il testo corrispondente preso dal database
// (tabella contenuti_sito), gestibile dal pannello admin.
async function caricaContenutiDinamici() {
    const elementi = document.querySelectorAll('[data-contenuto]');
    if (elementi.length === 0) return;

    try {
        const risposta = await fetch(`${API_BASE_URL}/api/contenuti`);
        if (!risposta.ok) throw new Error('Risposta non valida dal server');

        const dati = await risposta.json();
        const testi = dati.contenuti || {};

        elementi.forEach((elemento) => {
            const chiave = elemento.getAttribute('data-contenuto');
            if (testi[chiave] !== undefined) {
                elemento.textContent = testi[chiave];
            }
        });
    } catch (errore) {
        // Se il backend non risponde (es. non ancora deployato), il sito
        // resta comunque leggibile con i testi statici già presenti nell'HTML
        console.warn('Contenuti dinamici non caricati, uso i testi di default.', errore);
    }
}
