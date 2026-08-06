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

  // ---- COUNTER HELPERS ----
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

  async function applyCount(key, countEl) {
    const local = getLocalCount(key);
    if (countEl) countEl.textContent = formatCount(local);
    const remote = await getRemoteCount(key);
    if (remote !== null) {
      setLocalCount(key, remote);
      if (countEl) countEl.textContent = formatCount(remote);
    }
  }

  function bindDownloadCount(btn, key, countEl, onCount) {
    if (!btn || !key) return;
    btn.addEventListener('click', function () {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;

      hitRemoteCount(key).then(remote => {
        let val;
        if (remote !== null) {
          setLocalCount(key, remote);
          val = remote;
        } else {
          val = getLocalCount(key) + 1;
          setLocalCount(key, val);
        }
        if (countEl) countEl.textContent = formatCount(val);
        if (onCount) onCount(val);
      });

      showToast('Download iniciado!');
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

  // ---- DOWNLOAD CARDS ----
  document.querySelectorAll('.download-card').forEach(card => {
    const key = card.dataset.dlKey;
    const countEl = card.querySelector('.download-count strong');
    const btn = card.querySelector('.btn');

    if (key && countEl) applyCount(key, countEl);
    bindDownloadCount(btn, key, countEl);
  });

  // ---- AUDIO PLAYER ----
  const AUDIO_MANIFEST = 'audio/manifest.json';
  const AUDIO_INDICE = 'audio/Audiobook%20-%20indice.txt';
  const AUDIO_KEY_PREFIX = 'audio_';
  const AUDIO_POS_KEY = 'audio_pos';
  const AUDIO_ORDER = [
    '00_prefacio',
    'cap_01', 'cap_02', 'cap_03', 'cap_04', 'cap_05',
    'cap_06', 'cap_07', 'cap_08', 'cap_09', 'cap_10',
    'cap_11', 'cap_12', 'cap_13', 'cap_14', 'cap_15',
    'cap_16', 'cap_17', 'cap_18', 'cap_19', 'cap_20',
    'epilogo'
  ];

  const audioEl = document.getElementById('audio-el');
  if (audioEl) initAudioPlayer();

  function initAudioPlayer() {
    const tracks = [];
    const trackRows = [];
    let current = -1;
    let saved = null;

    const titleEl = document.getElementById('audio-title');
    const playBtn = document.getElementById('btn-play');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const seekEl = document.getElementById('audio-seek');
    const currentEl = document.getElementById('audio-current');
    const durationEl = document.getElementById('audio-duration');
    const dlBtn = document.getElementById('audio-download');
    const dlCountEl = document.getElementById('audio-dl-count');
    const listEl = document.getElementById('audio-tracks');
    const playerEl = document.querySelector('.player');

    if (!listEl) return;

    try { saved = JSON.parse(localStorage.getItem(AUDIO_POS_KEY) || 'null'); } catch (e) { saved = null; }

    function fetchJSON(url) {
      return fetch(url, { mode: 'same-origin' })
        .then(res => {
          if (!res.ok) throw new Error('http');
          return res.json();
        })
        .then(data => (Array.isArray(data) ? data : null));
    }

    function inlineJSON(id) {
      try {
        const el = document.getElementById(id);
        if (!el) return null;
        const data = JSON.parse(el.textContent);
        return Array.isArray(data) ? data : null;
      } catch (e) {
        return null;
      }
    }

    function fetchText(url) {
      return fetch(url, { mode: 'same-origin' })
        .then(res => {
          if (!res.ok) throw new Error('http');
          return res.text();
        });
    }

    function inlineText(id) {
      const el = document.getElementById(id);
      return el ? el.textContent : null;
    }

    function loadManifest() {
      return fetchJSON(AUDIO_MANIFEST).catch(() => inlineJSON('audio-manifest-fallback'));
    }

    function loadIndice() {
      return fetchText(AUDIO_INDICE).catch(() => inlineText('audio-indice-fallback'));
    }

    function fmtTime(sec) {
      if (!isFinite(sec) || sec < 0) return '0:00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return m + ':' + String(s).padStart(2, '0');
    }

    function buildTracks(indiceText, manifestData) {
      const dur = {};
      (manifestData || []).forEach(m => { dur[m.id] = m.duration_min; });
      const items = [];
      let fileIdx = 0;
      String(indiceText || '').split(/\r?\n/).forEach(line => {
        const t = line.trim();
        if (!t) return;
        if (/^audiobook$/i.test(t)) return;
        if (/^parte\b/i.test(t)) {
          items.push({ type: 'part', label: t });
          return;
        }
        if (fileIdx >= AUDIO_ORDER.length) return;
        const id = AUDIO_ORDER[fileIdx++];
        items.push({ type: 'track', id, title: t, durationMin: dur[id] || null });
      });
      return items;
    }

    function renderState() {
      trackRows.forEach((row, i) => {
        row.classList.toggle('audio-track--current', i === current);
        row.classList.toggle('audio-track--active', i === current && !audioEl.paused);
      });
      playBtn.classList.toggle('player-btn--playing', !audioEl.paused);
      if (playerEl) playerEl.classList.toggle('player--playing', !audioEl.paused);
    }

    function loadTrack(i, autoplay) {
      if (i < 0 || i >= tracks.length) return;
      current = i;
      const t = tracks[i];
      const file = t.id + '.mp3';
      audioEl.src = 'audio/' + file;
      dlBtn.setAttribute('href', 'audio/' + file);
      dlBtn.setAttribute('download', file);
      titleEl.textContent = t.title;
      currentEl.textContent = '0:00';
      durationEl.textContent = t.durationMin ? fmtTime(t.durationMin * 60) : '0:00';
      seekEl.value = 0;
      if (dlCountEl) applyCount(AUDIO_KEY_PREFIX + t.id, dlCountEl);
      renderState();
      if (autoplay) audioEl.play().catch(function () {});
    }

    function togglePlay(idx) {
      if (idx === current) {
        if (audioEl.paused) audioEl.play().catch(function () {});
        else audioEl.pause();
      } else {
        loadTrack(idx, true);
      }
    }

    function saveProgress() {
      if (current < 0 || !audioEl.src) return;
      try {
        localStorage.setItem(AUDIO_POS_KEY, JSON.stringify({
          id: tracks[current].id,
          t: audioEl.currentTime
        }));
      } catch (e) {}
    }

    playBtn.addEventListener('click', function () {
      if (current < 0) return;
      if (audioEl.paused) audioEl.play().catch(function () {});
      else audioEl.pause();
    });

    prevBtn.addEventListener('click', function () {
      if (current < 0) return;
      if (audioEl.currentTime > 3) {
        audioEl.currentTime = 0;
      } else {
        loadTrack(current - 1, true);
      }
    });

    nextBtn.addEventListener('click', function () {
      if (current < 0) return;
      loadTrack(current + 1, true);
    });

    audioEl.addEventListener('play', renderState);
    audioEl.addEventListener('pause', renderState);
    audioEl.addEventListener('ended', function () { loadTrack(current + 1, true); });

    audioEl.addEventListener('timeupdate', function () {
      if (!audioEl.duration) return;
      seekEl.max = audioEl.duration;
      seekEl.value = audioEl.currentTime;
      seekEl.style.setProperty('--seek', (audioEl.currentTime / audioEl.duration * 100) + '%');
      currentEl.textContent = fmtTime(audioEl.currentTime);
      durationEl.textContent = fmtTime(audioEl.duration);
      saveProgress();
    });

    seekEl.addEventListener('input', function () {
      if (!audioEl.duration) return;
      audioEl.currentTime = parseFloat(seekEl.value);
      currentEl.textContent = fmtTime(audioEl.currentTime);
    });

    dlBtn.addEventListener('click', function () {
      const href = this.getAttribute('href');
      if (!href || href === '#' || current < 0) return;
      const key = AUDIO_KEY_PREFIX + tracks[current].id;
      hitRemoteCount(key).then(remote => {
        let val;
        if (remote !== null) { setLocalCount(key, remote); val = remote; }
        else { val = getLocalCount(key) + 1; setLocalCount(key, val); }
        dlCountEl.textContent = formatCount(val);
      });
      showToast('Download iniciado!');
    });

    window.addEventListener('pagehide', saveProgress);

    function renderList(items) {
      listEl.innerHTML = '';
      items.forEach(item => {
        if (item.type === 'part') {
          const p = document.createElement('div');
          p.className = 'audio-part';
          p.textContent = item.label;
          listEl.appendChild(p);
          return;
        }

        const idx = tracks.length;
        tracks.push(item);

        const row = document.createElement('div');
        row.className = 'audio-track';
        row.setAttribute('role', 'listitem');

        const play = document.createElement('button');
        play.className = 'audio-track-play';
        play.setAttribute('aria-label', 'Ouvir: ' + item.title);
        play.innerHTML =
          '<span class="audio-track-play-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg></span>' +
          '<span class="audio-track-pause"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></span>';
        play.addEventListener('click', function () {
          togglePlay(idx);
        });

        const main = document.createElement('div');
        main.className = 'audio-track-main';
        main.setAttribute('role', 'button');
        main.setAttribute('tabindex', '0');
        main.setAttribute('aria-label', 'Ouvir: ' + item.title);
        main.addEventListener('click', function () {
          togglePlay(idx);
        });
        main.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePlay(idx);
          }
        });

        const title = document.createElement('div');
        title.className = 'audio-track-title';
        title.textContent = item.title;

        const meta = document.createElement('div');
        meta.className = 'audio-track-meta';
        if (item.durationMin) {
          const dur = document.createElement('span');
          dur.textContent = item.durationMin + ' min';
          meta.appendChild(dur);
        }

        main.appendChild(title);
        main.appendChild(meta);

        const dl = document.createElement('a');
        dl.className = 'audio-track-dl';
        dl.setAttribute('href', 'audio/' + item.id + '.mp3');
        dl.setAttribute('download', item.id + '.mp3');
        dl.setAttribute('aria-label', 'Baixar: ' + item.title);
        dl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>';
        bindDownloadCount(dl, AUDIO_KEY_PREFIX + item.id);

        row.appendChild(play);
        row.appendChild(main);
        row.appendChild(dl);
        listEl.appendChild(row);
        trackRows[idx] = row;
      });
    }

    Promise.all([loadIndice(), loadManifest()])
      .then(results => {
        const items = buildTracks(results[0], results[1]);
        if (!items.some(it => it.type === 'track')) throw new Error('lista vazia');
        renderList(items);

        if (saved && saved.id) {
          const idx = tracks.findIndex(t => t.id === saved.id);
          if (idx >= 0) {
            loadTrack(idx, false);
            if (saved.t > 5) {
              audioEl.addEventListener('loadedmetadata', function () {
                try { audioEl.currentTime = saved.t; } catch (e) {}
              }, { once: true });
            }
            showToast('Retomando de onde você parou');
          }
        }
      })
      .catch(() => {
        listEl.innerHTML = '<p class="audio-tracks-error">Não foi possível carregar a lista de capítulos.</p>';
      });
  }

  // ---- PIX COPY (chave) ----
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

  // ---- PIX GENERATOR (valor preenchido) ----
  const PIX_KEY = 'givaldosilvacon@gmail.com';
  const chipEls = document.querySelectorAll('.pix-chip');
  const pixValueInput = document.getElementById('pix-value');
  const pixGenerateBtn = document.getElementById('pix-generate');
  const pixQr = document.getElementById('pix-qr');
  const pixTitular = document.getElementById('pix-titular');
  const copyBlock = document.getElementById('pix-copy-block');
  const amountLabel = document.getElementById('pix-amount-label');
  const copyCode = document.getElementById('pix-copy-code');
  const copyCopyBtn = document.getElementById('pix-copy-copy');

  function fmtBRL(v) {
    return 'R$ ' + parseFloat(v).toFixed(2).replace('.', ',');
  }

  function setActiveChip(chip) {
    chipEls.forEach(c => c.classList.toggle('pix-chip--active', c === chip));
  }

  function generatePix(value) {
    try {
      const payload = window.EmunahPix.buildPayload({ key: PIX_KEY, amount: value });
      const label = fmtBRL(window.EmunahPix.amountToBRCode(value));
      const dataUrl = window.EmunahPix.getQRDataURL(payload);
      pixQr.innerHTML = '<img src="' + dataUrl + '" alt="QR Code PIX de ' + label + '">';
      if (pixTitular) pixTitular.textContent = 'Pix — ' + label;
      copyCode.textContent = payload;
      amountLabel.textContent = label;
      copyBlock.hidden = false;
      showToast('Pix de ' + label + ' gerado!');
    } catch (e) {
      showToast('Digite um valor válido (ex.: 10,00).');
    }
  }

  chipEls.forEach(chip => {
    chip.addEventListener('click', function () {
      setActiveChip(this);
      if (pixValueInput) pixValueInput.value = '';
      generatePix(this.dataset.value);
    });
  });

  if (pixGenerateBtn && pixValueInput) {
    pixGenerateBtn.addEventListener('click', function () {
      setActiveChip(null);
      generatePix(pixValueInput.value);
    });
    pixValueInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        setActiveChip(null);
        generatePix(pixValueInput.value);
      }
    });
  }

  if (copyCopyBtn && copyCode) {
    copyCopyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyCode.textContent.trim());
        copyCopyBtn.textContent = 'Copiado!';
        showToast('Pix Copia e Cola copiado!');
        setTimeout(() => { copyCopyBtn.textContent = 'Copiar'; }, 2000);
      } catch {
        showToast('Erro ao copiar. Selecione manualmente.');
      }
    });
  }

  // ---- YEAR ----
  const yearEl = document.querySelector('.footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
