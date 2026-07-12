// Sistema di animazioni allo scroll, ispirato al modo in cui Apple anima
// le sue pagine prodotto: non semplici "appaio quando mi vedi", ma
// transizioni legate CONTINUAMENTE alla posizione dello scroll, più un
// effetto di messa a fuoco graduale (leggermente sfocato -> nitido) sui
// testi principali.
//
// Aggiunge SUBITO la classe "js-animazioni" a <html>: è quella classe che
// attiva lo stato "in attesa di animarsi" in style.css. Se questo script
// non dovesse partire per qualsiasi motivo, la classe non viene mai
// aggiunta e il contenuto resta semplicemente visibile (l'animazione è
// solo un miglioramento, mai un requisito per vedere il sito).
document.documentElement.classList.add('js-animazioni');

document.addEventListener('DOMContentLoaded', () => {
    attivaRevealAlloScroll();
    attivaScrollContinuo();
    attivaContatoreNumeri();
});

/* ==========================================================================
   REVEAL "a scatto" (fade + leggero movimento + messa a fuoco)
   Usato per titoli, paragrafi, schede: appaiono una volta e restano.
   ========================================================================== */

function attivaRevealAlloScroll() {
    const elementi = document.querySelectorAll('[data-reveal]');
    if (elementi.length === 0) return;

    elementi.forEach((el) => {
        const gruppo = el.closest('[data-reveal-gruppo]');
        if (gruppo) {
            const fratelli = Array.from(gruppo.querySelectorAll('[data-reveal]'));
            const indice = fratelli.indexOf(el);
            el.style.transitionDelay = `${Math.min(indice * 0.1, 0.5)}s`;
        }
    });

    if (!('IntersectionObserver' in window)) {
        elementi.forEach((el) => el.classList.add('visibile'));
        return;
    }

    const osservatore = new IntersectionObserver((voci) => {
        voci.forEach((voce) => {
            if (voce.isIntersecting) {
                voce.target.classList.add('visibile');
                osservatore.unobserve(voce.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
    });

    elementi.forEach((el) => osservatore.observe(el));

    // Rete di sicurezza: se dopo 2,5s qualcosa non si è animato, mostralo
    // comunque. Meglio senza animazione che invisibile per sempre.
    setTimeout(() => {
        elementi.forEach((el) => el.classList.add('visibile'));
    }, 2500);
}

/* ==========================================================================
   SCROLL CONTINUO (in stile Apple): non un semplice on/off, ma un valore
   che segue con precisione quanto l'elemento è scorso nella pagina, usato
   per il parallax dell'hero e per far "crescere e schiarirsi" alcuni
   elementi mentre arrivano al centro dello schermo.
   ========================================================================== */

function attivaScrollContinuo() {
    const heroImmagine = document.querySelector('.hero-immagine');
    const elementiScrub = document.querySelectorAll('[data-scrub]');
    const preferisceMenoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if ((!heroImmagine && elementiScrub.length === 0) || preferisceMenoMovimento) return;

    let ticking = false;

    function aggiorna() {
        const scrollY = window.scrollY;
        const alt = window.innerHeight;

        // Parallax + leggero zoom continuo dell'immagine hero: più scendi,
        // più la foto si sposta lentamente e si ingrandisce appena, come
        // se la stessimo "attraversando"
        if (heroImmagine) {
            const spostamento = scrollY * 0.35;
            const zoomExtra = Math.min(scrollY * 0.00012, 0.06);
            heroImmagine.style.setProperty('--parallax-y', `${spostamento}px`);
            heroImmagine.style.setProperty('--parallax-zoom', `${1.08 + zoomExtra}`);
        }

        // Per ogni elemento "scrubbato": calcola quanto è vicino al centro
        // dello schermo (0 = ai bordi/fuori vista, 1 = perfettamente al
        // centro) e usa quel valore per una transizione morbida e continua,
        // non un semplice interruttore acceso/spento
        elementiScrub.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const centroElemento = rect.top + rect.height / 2;
            const centroSchermo = alt / 2;
            const distanza = Math.abs(centroElemento - centroSchermo);
            const progresso = 1 - Math.min(distanza / (alt * 0.7), 1);
            el.style.setProperty('--scrub', progresso.toFixed(3));
        });

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(aggiorna);
            ticking = true;
        }
    }, { passive: true });

    aggiorna();
}

/* ==========================================================================
   NUMERI CHE CONTANO: quando una statistica entra nello schermo, il suo
   valore sale da 0 fino al numero vero in circa un secondo, invece di
   comparire già scritto (dettaglio che rende una pagina più "viva")
   ========================================================================== */

function attivaContatoreNumeri() {
    const elementi = document.querySelectorAll('[data-conta-fino]');
    if (elementi.length === 0) return;

    if (!('IntersectionObserver' in window)) return; // restano già col valore statico nell'HTML

    const osservatore = new IntersectionObserver((voci) => {
        voci.forEach((voce) => {
            if (voce.isIntersecting) {
                animaContatore(voce.target);
                osservatore.unobserve(voce.target);
            }
        });
    }, { threshold: 0.5 });

    elementi.forEach((el) => osservatore.observe(el));
}

function animaContatore(elemento) {
    const valoreFinale = parseFloat(elemento.dataset.contaFino);
    const decimali = elemento.dataset.contaFino.includes('.') ? 1 : 0;
    const suffisso = elemento.dataset.contaSuffisso || '';
    const durata = 1100;
    const inizio = performance.now();

    function passo(adesso) {
        const frazione = Math.min((adesso - inizio) / durata, 1);
        // Easing "ease-out" per un rallentamento naturale verso la fine
        const frazioneAddolcita = 1 - Math.pow(1 - frazione, 3);
        const valoreAttuale = valoreFinale * frazioneAddolcita;

        elemento.textContent = valoreAttuale.toFixed(decimali).replace('.', ',') + suffisso;

        if (frazione < 1) {
            requestAnimationFrame(passo);
        } else {
            elemento.textContent = valoreFinale.toString().replace('.', ',') + suffisso;
        }
    }

    requestAnimationFrame(passo);
}
