// Su desktop non ha senso avviare una chiamata (non c'è un'app telefono
// collegata), quindi mostriamo un pannello con il numero. Su telefono,
// invece, avviamo noi stessi la chiamata via JavaScript.
//
// Questi pulsanti sono <button>, non <a href="tel:...">, apposta: alcuni
// browser (es. Brave) decidono se aprire un'app esterna per i link tel:
// a un livello che "preventDefault()" non riesce sempre a bloccare del
// tutto. Con un <button> non c'è alcuna navigazione automatica da fermare:
// controlliamo noi al 100% cosa succede al click.

document.addEventListener('DOMContentLoaded', () => {
    inizializzaPannelloChiamata();
});

function inizializzaPannelloChiamata() {
    const pulsanti = document.querySelectorAll('[data-chiama-intelligente]');
    const overlay = document.getElementById('overlay-chiamata');

    if (pulsanti.length === 0 || !overlay) return;

    const bottoneChiudi = document.getElementById('chiudi-pannello-chiamata');
    const bottoneCopia = document.getElementById('copia-numero-telefono');
    const toastCopiato = document.getElementById('toast-copiato');

    function isDesktopVero() {
        return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }

    pulsanti.forEach((pulsante) => {
        pulsante.addEventListener('click', () => {
            if (isDesktopVero()) {
                apriPannello();
            } else {
                // Su telefono: avviamo noi la chiamata, leggendo il
                // numero dall'attributo del pulsante
                const numero = pulsante.dataset.numeroTelefono;
                window.location.href = `tel:${numero}`;
            }
        });
    });

    function apriPannello() {
        overlay.classList.add('aperto');
        // Doppio requestAnimationFrame: garantisce che il browser abbia
        // già applicato "display: flex" (dalla classe aperto) PRIMA di
        // aggiungere la classe che avvia la transizione, altrimenti
        // l'animazione di apertura rischia di non partire
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.classList.add('visibile');
            });
        });
        document.addEventListener('keydown', chiudiConEsc);
    }

    function chiudiPannello() {
        overlay.classList.remove('visibile');
        document.removeEventListener('keydown', chiudiConEsc);
        // Aspetta la fine della transizione prima di nascondere del tutto
        setTimeout(() => {
            overlay.classList.remove('aperto');
        }, 300);
    }

    function chiudiConEsc(evento) {
        if (evento.key === 'Escape') chiudiPannello();
    }

    if (bottoneChiudi) {
        bottoneChiudi.addEventListener('click', chiudiPannello);
    }

    // Clic fuori dal pannello (sull'overlay scuro) lo chiude
    overlay.addEventListener('click', (evento) => {
        if (evento.target === overlay) chiudiPannello();
    });

    // Copia il numero negli appunti, mostrando un avviso animato invece
    // di modificare il pulsante stesso
    if (bottoneCopia && toastCopiato) {
        let timeoutToast;

        bottoneCopia.addEventListener('click', async () => {
            const numero = '045 2244631';
            try {
                await navigator.clipboard.writeText(numero);
                mostraToast();
            } catch (errore) {
                // Se il clipboard non è disponibile (raro, permessi negati),
                // il numero resta comunque visibile e selezionabile a mano
                console.warn('Copia non riuscita, il numero resta comunque visibile.', errore);
            }
        });

        function mostraToast() {
            clearTimeout(timeoutToast);
            toastCopiato.classList.add('visibile');
            timeoutToast = setTimeout(() => {
                toastCopiato.classList.remove('visibile');
            }, 1800);
        }
    }
}
