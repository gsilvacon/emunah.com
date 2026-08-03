(function () {
  'use strict';

  // ---- NAV ----
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--solid', window.scrollY > 60);
  });

  toggle.addEventListener('click', () => {
    links.classList.toggle('nav-links--open');
    toggle.classList.toggle('nav-toggle--active');
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('nav-links--open');
      toggle.classList.remove('nav-toggle--active');
    });
  });

  // ---- SCROLL ANIMATIONS ----
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in--visible');
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // ---- DOWNLOAD COUNTERS ----
  const STORAGE_PREFIX = 'book_dl_';

  function getCount(key) {
    const val = localStorage.getItem(STORAGE_PREFIX + key);
    return val ? parseInt(val, 10) : 0;
  }

  function setCount(key, count) {
    localStorage.setItem(STORAGE_PREFIX + key, count);
  }

  function incrementCount(key) {
    const count = getCount(key) + 1;
    setCount(key, count);
    return count;
  }

  function formatCount(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    return n;
  }

  document.querySelectorAll('.download-card').forEach(card => {
    const key = card.dataset.dlKey;
    const countEl = card.querySelector('.download-count strong');
    const btn = card.querySelector('.btn');

    if (key && countEl) {
      countEl.textContent = formatCount(getCount(key));
    }

    if (btn && key) {
      btn.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;

        const newCount = incrementCount(key);
        if (countEl) countEl.textContent = formatCount(newCount);

        showToast('Download iniciado!');
      });
    }
  });

  // ---- PIX COPY ----
  const pixCode = document.querySelector('.pix-key-box code');
  const pixCopyBtn = document.querySelector('.pix-copy-btn');

  if (pixCopyBtn && pixCode) {
    pixCopyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pixCode.textContent.trim());
        pixCopyBtn.textContent = 'Copiado!';
        showToast('Chave PIX copiada!');
        setTimeout(() => { pixCopyBtn.textContent = 'Copiar'; }, 2000);
      } catch {
        showToast('Erro ao copiar. Selecione manualmente.');
      }
    });
  }

  // ---- TOAST ----
  let toastEl = document.querySelector('.toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }

  let toastTimeout;

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('toast--visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('toast--visible');
    }, 2500);
  }

  // ---- YEAR ----
  const yearEl = document.querySelector('.footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
