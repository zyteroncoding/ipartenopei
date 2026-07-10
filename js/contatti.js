// Gestisce l'invio del form contatti verso il backend

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-contatti');
    if (!form) return;

    form.addEventListener('submit', gestisciInvioForm);
});

async function gestisciInvioForm(evento) {
    evento.preventDefault();

    const form = evento.target;
    const bottone = document.getElementById('bottone-invia');
    const esito = document.getElementById('messaggio-esito');

    const dati = {
        nome: form.nome.value.trim(),
        email: form.email.value.trim(),
        messaggio: form.messaggio.value.trim(),
    };

    // Validazione base lato client (il backend rivalida comunque tutto)
    if (!dati.nome || !dati.email || !dati.messaggio) {
        mostraEsito(esito, 'Compila tutti i campi prima di inviare.', 'errore');
        return;
    }

    bottone.disabled = true;
    bottone.textContent = 'Invio in corso...';

    try {
        const risposta = await fetch(`${API_BASE_URL}/api/contatti`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dati),
        });

        const risultato = await risposta.json();

        if (!risposta.ok) {
            throw new Error(risultato.errore || 'Errore durante l\'invio.');
        }

        mostraEsito(esito, 'Messaggio inviato! Ti risponderemo al più presto.', 'successo');
        form.reset();

    } catch (errore) {
        console.error('Errore invio form:', errore);
        mostraEsito(esito, 'Non è stato possibile inviare il messaggio. Prova a chiamarci direttamente al 045 2244631.', 'errore');
    } finally {
        bottone.disabled = false;
        bottone.textContent = 'Invia messaggio';
    }
}

function mostraEsito(elemento, testo, tipo) {
    elemento.textContent = testo;
    elemento.className = `messaggio-esito visibile ${tipo}`;
}
