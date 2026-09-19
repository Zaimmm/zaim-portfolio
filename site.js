(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let motion = null;
  let lenis = null;

  const select = (selector, root = document) => root.querySelector(selector);
  const selectAll = (selector, root = document) => [...root.querySelectorAll(selector)];

  const setYear = () => {
    selectAll('[data-year]').forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  };

  const initLenis = () => {
    if (reduceMotion || typeof window.Lenis !== 'function') return;
    lenis = new window.Lenis({
      autoRaf: true,
      anchors: true,
      lerp: 0.085,
      smoothWheel: true,
      stopInertiaOnNavigate: true,
      respectReducedMotion: true
    });
  };

  const runLoader = () => {
    const loader = select('[data-loader]');
    if (!loader) return Promise.resolve();

    let seen = false;
    try {
      seen = sessionStorage.getItem('zaim-intro-seen') === '1';
    } catch (error) {
      seen = false;
    }

    if (seen || reduceMotion) {
      loader.hidden = true;
      document.documentElement.classList.add('intro-complete');
      return Promise.resolve();
    }

    const greeting = select('[data-loader-greeting]', loader);
    const count = select('[data-loader-count]', loader);
    const greetings = ['Hello', 'Salam', 'Assalomu alaykum'];
    const duration = 1150;
    const started = performance.now();
    let previousGreeting = -1;

    document.documentElement.classList.add('intro-running');

    return new Promise((resolve) => {
      const tick = (now) => {
        const progress = Math.min(1, (now - started) / duration);
        const value = Math.round(progress * 100);
        const greetingIndex = Math.min(greetings.length - 1, Math.floor(progress * greetings.length));
        count.textContent = String(value).padStart(3, '0');

        if (greetingIndex !== previousGreeting) {
          previousGreeting = greetingIndex;
          greeting.textContent = greetings[greetingIndex];
        }

        if (progress < 1) {
          requestAnimationFrame(tick);
          return;
        }

        loader.classList.add('is-leaving');
        window.setTimeout(() => {
          loader.hidden = true;
          document.documentElement.classList.remove('intro-running');
          document.documentElement.classList.add('intro-complete');
          try {
            sessionStorage.setItem('zaim-intro-seen', '1');
          } catch (error) {
            // The site still works when storage is unavailable.
          }
          resolve();
        }, 560);
      };

      requestAnimationFrame(tick);
    });
  };

  const setMenuState = (open) => {
    const toggle = select('[data-menu-toggle]');
    const close = select('[data-menu-close]');
    const menu = select('[data-menu]');
    if (!toggle || !menu) return;

    toggle.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    lenis?.[open ? 'stop' : 'start']();

    if (open) {
      document.body.classList.remove('menu-closing');
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.add('menu-closing');
    }

    const bands = selectAll('.menu-curtain__band', menu);
    const panel = select('.menu-panel', menu);
    const links = selectAll('.menu-nav a', menu);

    if (motion && !reduceMotion) {
      if (open) {
        motion.animate(bands, { transform: ['translate3d(0, 105%, 0)', 'translate3d(0, 0%, 0)'] }, {
          duration: 0.58,
          delay: motion.stagger(0.055),
          ease: [0.22, 0.78, 0.24, 1]
        });
        motion.animate(panel, { opacity: [0, 1] }, { duration: 0.2, delay: 0.26 });
        motion.animate(links, { opacity: [0, 1], transform: ['translate3d(0, 22px, 0)', 'translate3d(0, 0, 0)'] }, {
          duration: 0.42,
          delay: motion.stagger(0.05, { startDelay: 0.3 }),
          ease: [0.22, 0.78, 0.24, 1]
        });
      } else {
        motion.animate(panel, { opacity: [1, 0] }, { duration: 0.16 });
        motion.animate([...bands].reverse(), { transform: ['translate3d(0, 0%, 0)', 'translate3d(0, -105%, 0)'] }, {
          duration: 0.46,
          delay: motion.stagger(0.04),
          ease: [0.7, 0, 0.84, 0]
        });
      }
    }

    if (open) {
      window.setTimeout(() => close?.focus(), reduceMotion ? 0 : 430);
    } else {
      window.setTimeout(() => {
        document.body.classList.remove('menu-open', 'menu-closing');
        toggle.focus();
      }, reduceMotion ? 0 : 520);
    }
  };

  const initMenu = () => {
    const toggle = select('[data-menu-toggle]');
    const close = select('[data-menu-close]');
    const menu = select('[data-menu]');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => setMenuState(true));
    close?.addEventListener('click', () => setMenuState(false));
    menu.addEventListener('click', (event) => {
      if (event.target.matches('[data-menu-scrim]')) setMenuState(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
        setMenuState(false);
      }

      if (event.key === 'Tab' && document.body.classList.contains('menu-open')) {
        const focusable = selectAll('a[href], button:not([disabled])', menu)
          .filter((node) => node.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  };

  const initScrollProgress = () => {
    const bar = select('[data-scroll-progress]');
    if (!bar) return;

    const update = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const progress = distance > 0 ? window.scrollY / distance : 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  };

  const revealFallback = () => {
    const nodes = selectAll('[data-reveal], [data-hero-reveal]');
    if (!nodes.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    nodes.forEach((node) => observer.observe(node));
  };

  const initMotion = async () => {
    if (reduceMotion) {
      revealFallback();
      return;
    }

    try {
      motion = await Promise.race([
        import('https://cdn.jsdelivr.net/npm/motion@12.23.24/+esm'),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('Motion import timed out.')), 2800);
        })
      ]);
    } catch (error) {
      console.warn('Motion enhancements unavailable.', error);
      revealFallback();
      return;
    }

    const heroItems = selectAll('[data-hero-reveal]');
    if (heroItems.length) {
      motion.animate(heroItems, {
        opacity: [0, 1],
        transform: ['translate3d(0, 24px, 0) scale(1.015)', 'translate3d(0, 0, 0) scale(1)'],
        filter: ['blur(8px)', 'blur(0px)']
      }, {
        duration: 0.72,
        delay: motion.stagger(0.085, { startDelay: 0.08 }),
        ease: [0.22, 0.78, 0.24, 1]
      });
    }

    selectAll('[data-reveal]').forEach((node) => {
      motion.inView(node, () => {
        motion.animate(node, {
          opacity: [0, 1],
          transform: ['translate3d(0, 28px, 0) scale(1.012)', 'translate3d(0, 0, 0) scale(1)'],
          filter: ['blur(7px)', 'blur(0px)']
        }, {
          duration: 0.68,
          ease: [0.22, 0.78, 0.24, 1]
        });
        return () => {};
      }, { margin: '0px 0px -10% 0px', amount: 0.18 });
    });
  };

  const initGlassSpotlights = () => {
    if (!finePointer || reduceMotion) return;
    selectAll('[data-spotlight]').forEach((surface) => {
      surface.addEventListener('pointermove', (event) => {
        const box = surface.getBoundingClientRect();
        surface.style.setProperty('--spot-x', `${event.clientX - box.left}px`);
        surface.style.setProperty('--spot-y', `${event.clientY - box.top}px`);
        surface.style.setProperty('--spot-opacity', '1');
      }, { passive: true });
      surface.addEventListener('pointerleave', () => {
        surface.style.setProperty('--spot-opacity', '0');
      });
    });
  };

  const shouldTransition = (event, link) => {
    if (event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target === '_blank' || link.hasAttribute('download')) return false;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.hash) return false;
    return true;
  };

  const initRouteTransitions = () => {
    const overlay = select('[data-route-transition]');
    if (!overlay || reduceMotion) return;
    const bands = selectAll('.route-transition__band', overlay);

    window.addEventListener('pageshow', () => {
      overlay.classList.remove('is-active');
      bands.forEach((band) => band.style.removeProperty('transform'));
      document.body.classList.remove('menu-open', 'menu-closing');
    });

    selectAll('a[href]').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (!shouldTransition(event, link)) return;
        event.preventDefault();
        const destination = link.href;
        overlay.classList.add('is-active');

        if (motion) {
          motion.animate(bands, { transform: ['scaleX(0)', 'scaleX(1)'] }, {
            duration: 0.42,
            delay: motion.stagger(0.045),
            ease: [0.76, 0, 0.24, 1]
          });
        }

        window.setTimeout(() => {
          window.location.href = destination;
        }, motion ? 520 : 420);
      });
    });
  };

  const initContactForm = () => {
    const form = select('[data-contact-form]');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const message = String(data.get('message') || '').trim();
      const subject = encodeURIComponent(`Website enquiry from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
      window.location.href = `mailto:me@zaimsharoon.com?subject=${subject}&body=${body}`;
      const status = select('[data-form-status]', form);
      if (status) status.textContent = 'Your email draft is ready.';
    });
  };

  const boot = async () => {
    setYear();
    initLenis();
    initMenu();
    initScrollProgress();
    initGlassSpotlights();
    initContactForm();
    await runLoader();
    await initMotion();
    initRouteTransitions();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
