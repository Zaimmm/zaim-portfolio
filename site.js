document.documentElement.classList.add('has-js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

requestAnimationFrame(() => {
  document.documentElement.classList.add('is-ready');
});

const menuButton = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');

function closeMenu() {
  if (!menuButton || !menu) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menu.classList.remove('is-open');
}

if (menuButton && menu) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menu.classList.toggle('is-open', !isOpen);
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      menuButton.focus();
    }
  });
}

document.querySelectorAll('[data-year]').forEach((item) => {
  item.textContent = String(new Date().getFullYear());
});

const progress = document.querySelector('[data-scroll-progress]');

if (progress) {
  let progressFrame = 0;

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    progress.style.transform = `scaleX(${ratio})`;
    progressFrame = 0;
  };

  const requestProgressUpdate = () => {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  };

  updateProgress();
  window.addEventListener('scroll', requestProgressUpdate, { passive: true });
  window.addEventListener('resize', requestProgressUpdate);
}

const reveals = document.querySelectorAll('.reveal');
const animatedTracks = document.querySelectorAll('[data-method], [data-approach-track]');

if (reduceMotion || !('IntersectionObserver' in window)) {
  reveals.forEach((item) => item.classList.add('is-visible'));
  animatedTracks.forEach((item) => item.classList.add('is-active'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  );

  reveals.forEach((item) => revealObserver.observe(item));

  const trackObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-active');
        trackObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );

  animatedTracks.forEach((item) => trackObserver.observe(item));
}

const contactForm = document.querySelector('[data-contact-form]');

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) return;

    const formData = new FormData(contactForm);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();
    const subject = `Portfolio enquiry from ${name}`;
    const body = `Hi Zaim,\n\n${message}\n\nFrom: ${name}\nEmail: ${email}`;
    const status = contactForm.querySelector('[data-form-status]');

    if (status) {
      status.textContent = 'Opening your email app. Nothing has been sent yet.';
    }

    window.location.href = `mailto:me@zaimsharoon.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

const typePreview = document.querySelector('[data-type-preview]');
const typeControls = document.querySelectorAll('[data-font-option]');
const typeNote = document.querySelector('[data-font-note]');

if (typePreview && typeControls.length) {
  const notes = {
    orchard: 'A · Bricolage + Hanken — recommended. The “Orchard Ledger” pairing from your personal portfolio explorations: expressive where it should be, calm where it needs to read.',
    garnet: 'B · Syne + General Sans — the “Garnet Citron” direction. More geometric and art-led, with a stronger poster voice.',
    vietnam: 'C · Be Vietnam Pro — the cleanest single-family system. Precise and modern, with less contrast between display and reading text.'
  };

  typeControls.forEach((control) => {
    control.addEventListener('click', () => {
      const font = control.dataset.fontOption;
      typePreview.dataset.font = font;
      typeControls.forEach((item) => {
        item.setAttribute('aria-pressed', String(item === control));
      });
      if (typeNote) typeNote.textContent = notes[font];
    });
  });
}
