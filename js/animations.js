// Animazioni allo scroll: reveal degli elementi quando entrano nello
// schermo, e parallax dell'immagine principale dell'hero.
//
// Questo script aggiunge SUBITO la classe "js-animazioni" a <html>: è
// quella classe che attiva lo stato "nascosto in attesa di animarsi" in
// style.css. Se questo script non dovesse partire per qualsiasi motivo,
// la classe non viene mai aggiunta e tutto il contenuto resta
// semplicemente visibile fin da subito (nessun elemento invisibile
// "per sbaglio" — l'animazione è solo un miglioramento, mai un requisito).
document.documentElement.classList.add('js-animazioni');

document.addEventListener('DOMContentLoaded', () => {
    attivaRevealAlloScroll();
    attivaParallaxHero();
});

// Osserva tutti gli elementi con l'attributo data-reveal e aggiunge
// la classe "visibile" quando entrano nella viewport, facendo partire
// la transizione CSS (fade + movimento) definita in style.css.
// Gli elementi dentro uno stesso [data-reveal-gruppo] vengono ritardati
// in sequenza (calcolato qui in JS: funziona con qualsiasi numero di
// elementi, non solo fino a 4 come farebbe un CSS nth-child).
function attivaRevealAlloScroll() {
    const elementi = document.querySelectorAll('[data-reveal]');
    if (elementi.length === 0) return;

    elementi.forEach((el) => {
        const gruppo = el.closest('[data-reveal-gruppo]');
        if (gruppo) {
            const fratelli = Array.from(gruppo.querySelectorAll('[data-reveal]'));
            const indice = fratelli.indexOf(el);
            el.style.transitionDelay = `${Math.min(indice * 0.12, 0.6)}s`;
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
                osservatore.unobserve(voce.target); // anima una sola volta
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
    });

    elementi.forEach((el) => osservatore.observe(el));

    // Rete di sicurezza: se dopo 2.5 secondi qualcosa non si è ancora
    // animato (es. per un layout imprevisto), lo mostriamo comunque.
    // Meglio senza animazione che invisibile per sempre.
    setTimeout(() => {
        elementi.forEach((el) => el.classList.add('visibile'));
    }, 2500);
}

// Effetto parallax: l'immagine dell'hero si muove più lentamente dello
// scroll della pagina, creando un effetto di profondità.
function attivaParallaxHero() {
    const immagine = document.querySelector('.hero-immagine');
    if (!immagine) return;

    const preferisceMenoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (preferisceMenoMovimento) return;

    let ultimoScroll = -1;
    let ticking = false;

    function aggiornaParallax() {
        const scrollY = window.scrollY;

        if (scrollY !== ultimoScroll) {
            const spostamento = scrollY * 0.35;
            immagine.style.setProperty('--parallax-y', `${spostamento}px`);
            ultimoScroll = scrollY;
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(aggiornaParallax);
            ticking = true;
        }
    }, { passive: true });

    aggiornaParallax();
}
