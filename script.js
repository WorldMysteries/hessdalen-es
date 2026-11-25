/* Hessdalen field dossier — vanilla JavaScript only. */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const page = document.body.dataset.page;
  document.querySelectorAll('[data-page-link]').forEach((link) => {
    if (link.dataset.pageLink === page) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // Accessible mobile navigation.
  const menuToggle = document.querySelector('.menu-toggle');
  const primaryNav = document.querySelector('#primary-nav');
  const setMenuOpen = (open) => {
    if (!menuToggle || !primaryNav) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    primaryNav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-is-open', open);
  };
  if (menuToggle && primaryNav) {
    menuToggle.addEventListener('click', () => {
      setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
    });
    primaryNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    });
    document.addEventListener('click', (event) => {
      if (menuToggle.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) setMenuOpen(false);
    });
  }

  // Progressive reveal; content remains visible when motion is reduced or JS is unavailable.
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  // Timeline category filter.
  const filterButtons = document.querySelectorAll('[data-filter]');
  const timelineItems = document.querySelectorAll('.timeline-item[data-category]');
  const timelineEmpty = document.querySelector('.timeline-empty');
  if (filterButtons.length && timelineItems.length) {
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        let visibleCount = 0;
        filterButtons.forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)));
        timelineItems.forEach((item) => {
          const show = filter === 'all' || item.dataset.category === filter;
          item.hidden = !show;
          if (show) visibleCount += 1;
        });
        if (timelineEmpty) timelineEmpty.hidden = visibleCount !== 0;
      });
    });
  }

  // Local observation journal. Entries never leave the user's browser.
  const form = document.querySelector('#note-form');
  if (!form) return;

  const STORAGE_KEY = 'hessdalen-field-notes-v1';
  const noteList = document.querySelector('#note-list');
  const emptyNotes = document.querySelector('#empty-notes');
  const entryCount = document.querySelector('#entry-count');
  const formStatus = document.querySelector('#form-status');
  const exportButton = document.querySelector('#export-notes');
  const clearButton = document.querySelector('#clear-notes');
  const dateInput = form.elements.namedItem('date');
  const setToday = () => {
    if (!dateInput || dateInput.value) return;
    const now = new Date();
    dateInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  setToday();

  const readEntries = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  };
  const writeEntries = (entries) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  };
  const formatDate = (value) => {
    if (!value) return 'Fecha no indicada';
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  };

  const renderEntries = () => {
    const entries = readEntries().sort((a, b) => (`${b.date || ''} ${b.time || ''}`).localeCompare(`${a.date || ''} ${a.time || ''}`));
    noteList.replaceChildren();
    emptyNotes.hidden = entries.length > 0;
    entryCount.textContent = String(entries.length);
    exportButton.disabled = entries.length === 0;
    clearButton.disabled = entries.length === 0;

    entries.forEach((entry) => {
      const article = document.createElement('article');
      article.className = 'note-entry';
      const header = document.createElement('div');
      header.className = 'note-entry-header';
      const time = document.createElement('time');
      time.className = 'note-entry-date';
      time.textContent = `${formatDate(entry.date)}${entry.time ? ` · ${entry.time}` : ''}`;
      const badge = document.createElement('span');
      badge.className = 'note-entry-badge';
      badge.textContent = 'ENTRADA';
      header.append(time, badge);

      const description = document.createElement('p');
      description.className = 'note-entry-details';
      description.textContent = entry.details || '';
      const metadata = document.createElement('div');
      metadata.className = 'note-entry-meta';
      [entry.direction && `Dirección: ${entry.direction}`, entry.color && `Color: ${entry.color}`, entry.duration && `Duración: ${entry.duration}`]
        .filter(Boolean)
        .forEach((label) => {
          const chip = document.createElement('span');
          chip.textContent = label;
          metadata.append(chip);
        });
      article.append(header, description);
      if (metadata.childElementCount) article.append(metadata);
      noteList.append(article);
    });
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const entry = {
      id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: String(data.get('date') || ''),
      time: String(data.get('time') || ''),
      direction: String(data.get('direction') || ''),
      color: String(data.get('color') || ''),
      duration: String(data.get('duration') || '').trim(),
      details: String(data.get('details') || '').trim()
    };
    try {
      const entries = readEntries();
      entries.push(entry);
      writeEntries(entries);
      renderEntries();
      form.reset();
      setToday();
      formStatus.textContent = 'La entrada se ha guardado en este navegador.';
    } catch (_error) {
      formStatus.textContent = 'No se pudo guardar. Compruebe la configuración de almacenamiento del navegador.';
    }
  });

  exportButton.addEventListener('click', () => {
    const entries = readEntries();
    if (!entries.length) return;
    const columns = ['Fecha', 'Hora', 'Dirección', 'Color', 'Duración', 'Descripción'];
    const quoteCsv = (value) => `"${String(value || '').replaceAll('"', '""')}"`;
    const rows = entries.map((entry) => [entry.date, entry.time, entry.direction, entry.color, entry.duration, entry.details].map(quoteCsv).join(','));
    const csv = `\uFEFF${columns.map(quoteCsv).join(',')}\r\n${rows.join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hessdalen-field-notes.csv';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  clearButton.addEventListener('click', () => {
    if (!readEntries().length) return;
    if (!window.confirm('¿Eliminar todas las entradas guardadas de este navegador?')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      renderEntries();
      formStatus.textContent = 'Cuaderno vaciado.';
    } catch (_error) {
      formStatus.textContent = 'No se pudo vaciar el almacenamiento del navegador.';
    }
  });

  renderEntries();
})();
