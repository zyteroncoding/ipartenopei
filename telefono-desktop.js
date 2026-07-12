// Su desktop non ha senso cliccare un link "tel:" (non c'è un'app
// telefono collegata), quindi mostriamo un pannello con il numero al
// posto di tentare una chiamata che non può partire. Su telefono, invece,
// lasciamo che il link tel: funzioni normalmente (avvia la chiamata).

document.addEventListener('DOMContentLoaded', () => {
    inizializzaPannelloChiamata();
});

function inizializzaPannelloChiamata() {
    const pulsanti = document.querySelectorAll('[data-chiama-intelligente]');
    const overlay = document.getElementById('overlay-chiamata');

    if (pulsanti.length === 0 || !overlay) return;

    const pannello = overlay.querySelector('.pannello-chiamata');
    const bottoneChiudi = document.getElementById('chiudi-pannello-chiamata');
    const bottoneCopia = document.getElementById('copia-numero-telefono');

    // Rileva se il dispositivo ha davvero un mouse/hover (desktop) invece
    // di basarsi sulla larghezza schermo, che può ingannare (es. finestra
    // stretta su PC, o tablet con mouse collegato)
    function isDesktopVero() {
        return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }

    pulsanti.forEach((pulsante) => {
        pulsante.addEventListener('click', (evento) => {
            if (isDesktopVero()) {
                evento.preventDefault();
                apriPannello();
            }
            // Su telefono non facciamo nulla: il link tel: parte da solo
        });
    });

    function apriPannello() {
        overlay.hidden = false;
        // Un piccolo timeout permette alla transizione CSS di partire
        // dallo stato iniziale invece di "saltare" già aperta
        requestAnimationFrame(() => {
            overlay.classList.add('visibile');
        });
        document.addEventListener('keydown', chiudiConEsc);
    }

    function chiudiPannello() {
        overlay.classList.remove('visibile');
        document.removeEventListener('keydown', chiudiConEsc);
        // Aspetta la fine della transizione prima di nascondere del tutto
        setTimeout(() => {
            overlay.hidden = true;
        }, 300);
    }

    function chiudiConEsc(evento) {
        if (evento.key === 'Escape') chiudiPannello();
    }

    bottoneChiudi.addEventListener('click', chiudiPannello);

    // Clic fuori dal pannello (sull'overlay scuro) lo chiude
    overlay.addEventListener('click', (evento) => {
        if (evento.target === overlay) chiudiPannello();
    });

    // Copia il numero negli appunti con conferma visiva
    bottoneCopia.addEventListener('click', async () => {
        const numero = '045 2244631';
        try {
            await navigator.clipboard.writeText(numero);
            const testoOriginale = bottoneCopia.textContent;
            bottoneCopia.textContent = 'Copiato!';
            setTimeout(() => {
                bottoneCopia.textContent = testoOriginale;
            }, 1800);
        } catch (errore) {
            // Se il clipboard non è disponibile (raro, permessi negati),
            // il numero è comunque visibile e selezionabile a mano
            console.warn('Copia non riuscita, il numero resta comunque visibile.', errore);
        }
    });
}
