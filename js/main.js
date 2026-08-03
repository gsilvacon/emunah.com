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
  const COUNT_API = 'https://countapi.mileshilliard.com/api/v1';

  function getLocalCount(key) {
    const val = localStorage.getItem(STORAGE_PREFIX + key);
    return val ? parseInt(val, 10) : 0;
  }

  function setLocalCount(key, count) {
    localStorage.setItem(STORAGE_PREFIX + key, count);
  }

  async function getRemoteCount(key) {
    try {
      const res = await fetch(COUNT_API + '/get/' + key, { mode: 'cors' });
      if (!res.ok) return null;
      const data = await res.json();
      return (data && typeof data.value === 'number') ? data.value : null;
    } catch (e) {
      return null;
    }
  }

  async function hitRemoteCount(key) {
    try {
      const res = await fetch(COUNT_API + '/hit/' + key, { mode: 'cors', keepalive: true });
      if (!res.ok) return null;
      const data = await res.json();
      return (data && typeof data.value === 'number') ? data.value : null;
    } catch (e) {
      return null;
    }
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
      countEl.textContent = formatCount(getLocalCount(key));

      getRemoteCount(key).then(remote => {
        if (remote !== null) {
          setLocalCount(key, remote);
          countEl.textContent = formatCount(remote);
        }
      });
    }

    if (btn && key) {
      btn.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;

        hitRemoteCount(key).then(remote => {
          if (remote !== null) {
            setLocalCount(key, remote);
            if (countEl) countEl.textContent = formatCount(remote);
          } else {
            const fallback = getLocalCount(key) + 1;
            setLocalCount(key, fallback);
            if (countEl) countEl.textContent = formatCount(fallback);
          }
        });

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
