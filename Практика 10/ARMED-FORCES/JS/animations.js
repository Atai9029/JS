(() => {
  const root = document.documentElement;
  try {
  if (!('IntersectionObserver' in window)) return;   // старый браузер — всё остаётся видимым
  root.classList.add('anim-ready');                  // только теперь CSS прячет блоки для анимации
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* СОБЫТИЕ 1: scroll
*/
  // а) полоса прогресса
  const bar = document.createElement('div');
  bar.id = 'scrollProgress';
  document.body.appendChild(bar);

  let ticking = false;
  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = `scaleX(${ratio})`;
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {               // не чаще одного раза за кадр
      requestAnimationFrame(updateProgress);
      ticking = true;
    }
  }, { passive: true });
  updateProgress();

  // б) появление при прокрутке (IntersectionObserver сам реагирует на scroll)
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);   // анимация один раз
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  function watch(el) {
    if (reduceMotion) { el.classList.add('is-visible'); return; }
    revealObserver.observe(el);
  }
  document.querySelectorAll('.fade-up:not(.hero-overlay), .reveal').forEach(watch);

  // строки прайс-листа выезжают по очереди, слева и справа
  document.querySelectorAll('.table-mil tbody tr').forEach((tr, i) => {
    tr.classList.add('reveal', i % 2 ? 'reveal-right' : 'reveal-left');
    tr.style.transitionDelay = `${i * 0.12}s`;
    watch(tr);
  });

  // кнопка «наверх» появляется после прокрутки (событие scroll)
  const toTop = document.createElement('button');
  toTop.id = 'toTop';
  toTop.type = 'button';
  toTop.setAttribute('aria-label', 'Наверх');
  toTop.innerHTML = '<i class="bi bi-arrow-up"></i>';
  document.body.appendChild(toTop);
  window.addEventListener('scroll', () => {
    toTop.classList.toggle('show', window.scrollY > 500);
  }, { passive: true });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  // карточки каталога подгружаются из JSON позже — подхватываем их и показываем «лесенкой»
  const grid = document.getElementById('product-grid');
  if (grid) {
    new MutationObserver(mutations => {
      mutations.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        const index = [...grid.children].indexOf(node);
        node.classList.add('reveal');
        node.style.transitionDelay = `${(index % 4) * 0.15}s`;
        watch(node);
      }));
    }).observe(grid, { childList: true });
  }

  // в) счётчик числа
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }
    const duration = 1600;
    const start = performance.now();
    (function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);          // ease-out
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  }
  const counterObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (e.isIntersecting) { countUp(e.target); obs.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));


  /* 2: mousemove / mouseleave
     3D-наклон карточки техники вслед за курсором + блик.
     Делегирование:карточки создаются динамически */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mousemove', e => {
      const card = e.target.closest('.mil-card, .review-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;    // 0..1
      const y = (e.clientY - r.top) / r.height;    // 0..1
      const MAX = 16;                              // максимум градусов
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', `${(x - 0.5) * 2 * MAX}deg`);
      card.style.setProperty('--rx', `${(0.5 - y) * 2 * MAX}deg`);
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
    });

    // курсор ушёл — плавно возвращаем карточку на место
    document.addEventListener('mouseout', e => {
      const card = e.target.closest('.mil-card, .review-card');
      if (!card || card.contains(e.relatedTarget)) return;
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }


  /* 3: click — ripple на кнопках */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-mil');
    if (!btn || reduceMotion) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.width = dot.style.height = `${size}px`;
    dot.style.left = `${e.clientX - r.left - size / 2}px`;
    dot.style.top  = `${e.clientY - r.top  - size / 2}px`;
    btn.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
  });


  /*4: click — закрытие модального окна */
  const modal = document.getElementById('detail-section');
  if (modal) {
    let closing = false;
    function closeWithAnimation() {
      if (closing || modal.classList.contains('hidden')) return;
      closing = true;
      modal.classList.add('closing');
      const finish = () => {
        modal.classList.remove('closing');
        modal.classList.add('hidden');
        closing = false;
      };
      if (reduceMotion) { finish(); return; }
      modal.addEventListener('animationend', function handler(ev) {
        if (ev.target !== modal) return;
        modal.removeEventListener('animationend', handler);
        finish();
      });
    }
    // capture-фаза + stopImmediatePropagation: перехватываем закрытие раньше,
    // чем сработает мгновенное закрытие из catalog.js
    document.getElementById('close-btn')?.addEventListener('click', e => {
      e.stopImmediatePropagation();
      closeWithAnimation();
    }, true);
    modal.addEventListener('click', e => {
      if (e.target === modal) { e.stopImmediatePropagation(); closeWithAnimation(); }
    }, true);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeWithAnimation();
    });
  }


  /*5: submit — форма заявки
     Ошибка → поля трясутся, успех → сообщение «всплывает». */
  const form = document.getElementById('contactForm');
  if (form) {
    const restart = (el, cls) => {      // перезапуск CSS-анимации
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      form.classList.add('was-validated');
      const invalid = form.querySelectorAll(':invalid');
      const ok = document.getElementById('formOk');

      if (invalid.length) {
        ok?.classList.add('d-none');
        invalid.forEach(el => {
          const target = el.classList.contains('form-check-input') ? el.closest('.form-check') : el;
          restart(target, 'shake');
        });
        invalid[0].focus({ preventScroll: false });
        return;
      }
      if (ok) {
        ok.classList.remove('d-none');
        restart(ok, 'pop-in');
        ok.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
      }
    });
    form.addEventListener('reset', () => {
      form.classList.remove('was-validated');
      document.getElementById('formOk')?.classList.add('d-none');
    });
  }
  } catch (err) {
    root.classList.remove('anim-ready');             // что-то сломалось — показываем контент как есть
    console.error('animations.js:', err);
  }
})();
