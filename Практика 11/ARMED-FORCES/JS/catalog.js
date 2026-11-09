/* ══════════════════════════════════════════════
   catalog.js — каталог техники + CRUD

   Create  — форма «Добавить»                (openForm → Store.create)
   Read    — список, поиск, сортировка, окно «Подробнее»
   Update  — форма «Изменить»                (openForm(id) → Store.update)
   Delete  — удаление с подтверждением и отменой (Store.remove / Store.restore)

   Данные хранятся через JS/store.js. Кнопки управления показываются
   только там, где у сетки есть атрибут data-admin (страница каталога).
   ══════════════════════════════════════════════ */

// путь до корня сайта считаем от адреса самого скрипта (JS/catalog.js -> на уровень выше)
const BASE = new URL('../', document.currentScript.src).href;
const $ = (id) => document.getElementById(id);

const productGrid = $('product-grid');
const detailSection = $('detail-section');
const detailCard = $('detail-card');
const closeBtn = $('close-btn');
const IS_ADMIN = !!productGrid && productGrid.hasAttribute('data-admin');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let productsData = [];
const view = { query: '', sort: 'id' };

/* ───────── вспомогательные функции ───────── */

// данные теперь вводит пользователь, поэтому весь текст экранируем (защита от вставки HTML)
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// путь к картинке: загруженные (data:) и внешние (http) оставляем как есть, остальные — от корня сайта
function imgSrc(path) {
  const value = String(path ?? '');
  return /^(data:|https?:|\/)/.test(value) ? value : BASE + value;
}

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US');

function openModal(el) { el?.classList.remove('hidden'); }

// закрытие с анимацией: сначала .closing, потом .hidden
function closeModal(el) {
  if (!el || el.classList.contains('hidden') || el.classList.contains('closing')) return;
  const finish = () => { el.classList.remove('closing'); el.classList.add('hidden'); };
  if (reduceMotion) return finish();
  el.classList.add('closing');
  let done = false;
  const end = () => { if (!done) { done = true; finish(); } };
  el.addEventListener('animationend', (e) => { if (e.target === el) end(); });
  setTimeout(end, 500);   // страховка, если анимация не запустилась
}

// всплывающее уведомление (необязательная кнопка действия, например «Отменить»)
function toast(text, { type = 'ok', actionLabel, onAction } = {}) {
  let box = $('toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    document.body.appendChild(box);
  }
  const item = document.createElement('div');
  item.className = 'toast-item' + (type === 'error' ? ' error' : '');
  item.setAttribute('role', 'status');
  const span = document.createElement('span');
  span.textContent = text;
  item.appendChild(span);

  const remove = () => {
    item.classList.add('out');
    setTimeout(() => item.remove(), 300);
  };
  if (actionLabel) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => { remove(); onAction?.(); });
    item.appendChild(btn);
  }
  box.appendChild(item);
  setTimeout(remove, actionLabel ? 6000 : 3000);
}

/* ═══════════════ READ: загрузка и список ═══════════════ */

async function loadProducts() {
  if (!productGrid) return;
  try {
    if (!window.Store) throw new Error('не подключен JS/store.js');
    productsData = await Store.getAll();
    render();
  } catch (error) {
    console.error('Ошибка JSON', error);
    productGrid.innerHTML = `<p style="color:#ff5555;">Ошибка загрузки данных: ${esc(error.message)}<br>
      Проверьте, что файл <b>JSON/data.json</b> лежит рядом с папками JS и css.</p>`;
  }
}

// список с учётом поиска и сортировки
function getVisible() {
  let list = productsData.slice();
  // на главной показываем только избранные (data-featured)
  if (productGrid.dataset.featured) list = list.filter(p => p.featured);

  const q = view.query.trim().toLowerCase();
  if (q) {
    list = list.filter(p => {
      const text = `${p.name} ${p.description} ${p.specs?.['Класс'] ?? ''}`;
      return text.toLowerCase().includes(q);
    });
  }

  const sorters = {
    id: (a, b) => a.id - b.id,
    name: (a, b) => a.name.localeCompare(b.name, 'ru'),
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
  };
  if (sorters[view.sort]) list.sort(sorters[view.sort]);
  return list;
}

function render() {
  const list = getVisible();
  renderProductsList(list);
  const counter = $('result-count');
  if (counter) {
    counter.textContent = `Показано: ${list.length} из ${productsData.length}`;
  }
  const source = $('source-info');
  if (source) {
    source.textContent = Store.mode === 'api'
      ? 'Источник: json-server (db.json)'
      : 'Источник: localStorage (json-server не запущен)';
  }
}

function renderProductsList(products) {
  productGrid.innerHTML = '';

  if (!products.length) {
    const empty = document.createElement('div');
    empty.className = 'col-12';
    empty.innerHTML = `<div class="crud-empty">
        <i class="bi bi-inbox" style="font-size:2.5rem"></i>
        <p class="mt-2 mb-3">${view.query ? 'Ничего не найдено по запросу.' : 'Список пуст.'}</p>
        ${IS_ADMIN ? '<button class="btn btn-mil" data-action="add">Добавить технику</button>' : ''}
      </div>`;
    productGrid.appendChild(empty);
    return;
  }

  products.forEach(product => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-lg-4 col-xl-3';
    col.dataset.id = product.id;
    col.innerHTML = `
      <div class="mil-card">
        <div class="card-img-wrap">
          <img src="${esc(imgSrc(product.image))}" alt="${esc(product.name)}">
          ${product.top ? '<span class="tag-badge">ТОП</span>' : ''}
        </div>
        <div class="card-body">
          <h5 style="color:#fff">${esc(product.name)}</h5>
          <div class="card-price">${money(product.price)}</div>
          <div class="card-detail"><span>${esc(product.year)}</span><span>${esc(product.engine)}</span><span>${esc(product.fuel)}</span></div>
          <button class="btn btn-mil w-100" data-action="view">Подробнее</button>
          ${IS_ADMIN ? `
          <div class="card-actions">
            <button class="btn btn-mil" data-action="edit"><i class="bi bi-pencil me-1"></i>Изменить</button>
            <button class="btn btn-mil btn-mil-red" data-action="delete"><i class="bi bi-trash me-1"></i>Удалить</button>
          </div>` : ''}
        </div>
      </div>`;
    productGrid.appendChild(col);
  });
}

// один обработчик на весь список (карточки создаются динамически)
productGrid?.addEventListener('click', (e) => {
  if (e.target.closest('[data-action="add"]')) return openForm();
  const col = e.target.closest('[data-id]');
  if (!col) return;
  const id = Number(col.dataset.id);
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'edit') openForm(id);
  else if (action === 'delete') askDelete(id);
  else showProductDetail(id);
});

/* ───────── READ: окно «Подробнее» ───────── */
function showProductDetail(id) {
  const product = productsData.find(p => p.id === id);
  if (!product) return;

  const specsList = Object.entries(product.specs || {})
    .map(([key, value]) => `<li><strong>${esc(key)}:</strong> ${esc(value)}</li>`)
    .join('');

  detailCard.innerHTML = `
    <h2>${esc(product.name)}</h2>
    <img src="${esc(imgSrc(product.image))}" alt="${esc(product.name)}" class="detail-img">
    <p class="detail-desc">${esc(product.description)}</p>
    <ul class="detail-specs">${specsList}</ul>
    <p class="card-price detail-price">${money(product.price)}</p>
    <a href="${BASE}buy.html" class="btn btn-mil">Приобрести</a>
    ${product.page ? `<a href="${esc(BASE + product.page)}" class="btn btn-mil btn-mil-red">Полная страница</a>` : ''}
    ${IS_ADMIN ? `
    <div class="detail-actions">
      <button class="btn btn-mil" data-action="edit" data-id="${product.id}"><i class="bi bi-pencil me-1"></i>Изменить</button>
      <button class="btn btn-mil btn-mil-red" data-action="delete" data-id="${product.id}"><i class="bi bi-trash me-1"></i>Удалить</button>
    </div>` : ''}`;

  detailSection.classList.remove('hidden');
}

// кнопки «Изменить / Удалить» внутри окна подробностей
detailCard?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  detailSection.classList.add('hidden');
  if (btn.dataset.action === 'edit') openForm(id);
  if (btn.dataset.action === 'delete') askDelete(id);
});

closeBtn?.addEventListener('click', () => detailSection.classList.add('hidden'));
detailSection?.addEventListener('click', (e) => {
  if (e.target === detailSection) detailSection.classList.add('hidden');
});

/* ═══════════════ CREATE / UPDATE: форма ═══════════════ */

const form = $('product-form');
const formSection = $('form-section');
let editingId = null;      // null — режим «Добавить», число — режим «Изменить»
let pendingImage = null;   // загруженное фото (data URL)

// ключи характеристик, которые берутся из отдельных полей формы
const FIELD_SPEC_KEYS = ['Год выпуска', 'Класс', 'Двигатель', 'Трансмиссия', 'Топливо'];

function setPreview(src) {
  const img = $('pf-preview');
  if (!img) return;
  if (src) { img.src = src; img.classList.remove('hidden'); }
  else { img.removeAttribute('src'); img.classList.add('hidden'); }
}

function openForm(id = null) {
  if (!form) return;
  editingId = id;
  pendingImage = null;
  form.reset();
  form.classList.remove('was-validated');
  form.querySelectorAll('.shake').forEach(el => el.classList.remove('shake'));
  ['pf-specs', 'pf-image-url'].forEach(name => $(name).setCustomValidity(''));

  const p = id !== null ? productsData.find(x => x.id === id) : null;
  $('form-title').textContent = p ? 'Изменить технику' : 'Добавить технику';
  $('form-submit').textContent = p ? 'Сохранить изменения' : 'Добавить';

  if (p) {
    $('pf-name').value = p.name;
    $('pf-price').value = p.price;
    $('pf-year').value = p.year;
    $('pf-engine').value = p.engine;
    $('pf-fuel').value = p.fuel;
    $('pf-class').value = p.specs?.['Класс'] ?? '';
    $('pf-description').value = p.description;
    $('pf-top').checked = !!p.top;
    $('pf-featured').checked = !!p.featured;
    if (!String(p.image).startsWith('data:')) $('pf-image-url').value = p.image;
    // в поле «характеристики» попадают только те, что не вынесены в отдельные поля
    $('pf-specs').value = Object.entries(p.specs || {})
      .filter(([key]) => !FIELD_SPEC_KEYS.includes(key))
      .map(([key, value]) => `${key}: ${value}`).join('\n');
    setPreview(imgSrc(p.image));
  } else {
    $('pf-featured').checked = false;
    setPreview('');
  }
  openModal(formSection);
  setTimeout(() => $('pf-name').focus(), 50);
}

// «Ключ: значение» построчно -> объект
function parseSpecs(text) {
  const specs = {};
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (i === -1 || !key || !value) return { error: `Строка «${line.trim()}» должна быть вида «Ключ: значение»` };
    specs[key] = value;
  }
  return { specs };
}

// фото уменьшаем до 900px и сжимаем в JPEG — иначе оно не поместится в localStorage
function resizeImage(file, maxSide = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Это не изображение'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

$('pf-file')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    e.target.value = '';
    return toast('Выберите файл-изображение', { type: 'error' });
  }
  try {
    pendingImage = await resizeImage(file);
    setPreview(pendingImage);
    $('pf-image-url').setCustomValidity('');
  } catch (error) {
    toast(error.message, { type: 'error' });
  }
});

$('pf-image-url')?.addEventListener('input', (e) => {
  if (!pendingImage) setPreview(e.target.value.trim() ? imgSrc(e.target.value.trim()) : '');
});

// собираем объект товара из полей формы
function collectFormData(extraSpecs) {
  const val = (id) => $(id).value.trim();
  const existing = editingId !== null ? productsData.find(p => p.id === editingId) : null;

  // ключ для двигателя сохраняем таким, каким он был у товара («Трансмиссия» у одного из них)
  const engineKey = existing?.specs && 'Трансмиссия' in existing.specs ? 'Трансмиссия' : 'Двигатель';
  const specs = { 'Год выпуска': val('pf-year') };
  if (val('pf-class')) specs['Класс'] = val('pf-class');
  Object.assign(specs, extraSpecs);
  specs[engineKey] = val('pf-engine');
  specs['Топливо'] = val('pf-fuel');

  return {
    name: val('pf-name'),
    price: Number(val('pf-price')),
    year: Number(val('pf-year')),
    engine: val('pf-engine'),
    fuel: val('pf-fuel'),
    description: val('pf-description'),
    image: pendingImage || val('pf-image-url') || existing?.image,
    specs,
    top: $('pf-top').checked,
    featured: $('pf-featured').checked,
  };
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // дополнительные проверки, которых нет в HTML-атрибутах
  const parsed = parseSpecs($('pf-specs').value);
  $('pf-specs').setCustomValidity(parsed.error || '');
  const existing = editingId !== null ? productsData.find(p => p.id === editingId) : null;
  const hasImage = pendingImage || $('pf-image-url').value.trim() || existing?.image;
  $('pf-image-url').setCustomValidity(hasImage ? '' : 'Добавьте фото');
  $('pf-specs-error').textContent = parsed.error || 'Каждая строка: «Ключ: значение».';

  form.classList.add('was-validated');
  if (!form.checkValidity()) {
    const invalid = form.querySelectorAll(':invalid');
    invalid.forEach(el => {
      el.classList.remove('shake');   // тряска неверных полей
      void el.offsetWidth;            // перезапуск анимации
      el.classList.add('shake');
    });
    invalid[0].focus();
    return;
  }

  try {
    const data = collectFormData(parsed.specs);
    if (editingId === null) {
      await Store.create(data);
      toast(`«${data.name}» добавлено`);
    } else {
      await Store.update(editingId, data);
      toast(`«${data.name}» обновлено`);
    }
    productsData = await Store.getAll();
    closeModal(formSection);
    render();
  } catch (error) {
    toast(error.message, { type: 'error' });
  }
});

$('form-close')?.addEventListener('click', () => closeModal(formSection));
$('form-cancel')?.addEventListener('click', () => closeModal(formSection));

/* ═══════════════ DELETE и другие действия с подтверждением ═══════════════ */

const confirmSection = $('confirm-section');
let confirmAction = null;

function askConfirm({ title, text, yesLabel, onYes }) {
  $('confirm-title').textContent = title;
  $('confirm-text').textContent = text;
  $('confirm-yes').textContent = yesLabel;
  confirmAction = onYes;
  openModal(confirmSection);
}

$('confirm-yes')?.addEventListener('click', async () => {
  const action = confirmAction;
  confirmAction = null;
  closeModal(confirmSection);
  try { await action?.(); } catch (error) { toast(error.message, { type: 'error' }); }
});
$('confirm-no')?.addEventListener('click', () => closeModal(confirmSection));

function askDelete(id) {
  const product = productsData.find(p => p.id === id);
  if (!product) return;
  askConfirm({
    title: 'Удалить технику?',
    text: `«${product.name}» будет удалено из каталога.`,
    yesLabel: 'Удалить',
    onYes: async () => {
      const removed = await Store.remove(id);
      productsData = await Store.getAll();
      render();
      toast(`«${removed.item.name}» удалено`, {
        actionLabel: 'Отменить',
        onAction: async () => {                 // отмена удаления
          await Store.restore(removed.item, removed.index);
          productsData = await Store.getAll();
          render();
          toast('Удаление отменено');
        },
      });
    },
  });
}

/* ═══════════════ панель управления: поиск, сортировка, экспорт ═══════════════ */

let searchTimer;
$('search-input')?.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { view.query = e.target.value; render(); }, 200);
});
$('sort-select')?.addEventListener('change', (e) => { view.sort = e.target.value; render(); });
$('add-btn')?.addEventListener('click', () => openForm());
$('export-btn')?.addEventListener('click', () => Store.exportJSON());

$('import-file')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    JSON.parse(text);   // быстрая проверка до подтверждения
    askConfirm({
      title: 'Импортировать JSON?',
      text: `Текущий список будет заменён данными из файла «${file.name}».`,
      yesLabel: 'Заменить',
      onYes: async () => {
        await Store.importJSON(text);
        productsData = await Store.getAll();
        render();
        toast('Данные импортированы');
      },
    });
  } catch {
    toast('Файл не похож на JSON', { type: 'error' });
  }
});

$('reset-btn')?.addEventListener('click', () => askConfirm({
  title: 'Сбросить изменения?',
  text: 'Список вернётся к исходному файлу data.json, все ваши изменения будут потеряны.',
  yesLabel: 'Сбросить',
  onYes: async () => {
    productsData = await Store.reset();
    render();
    toast('Список сброшен к data.json');
  },
}));

// Esc закрывает форму и окно подтверждения (окно подробностей закрывает animations.js)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (confirmSection && !confirmSection.classList.contains('hidden')) closeModal(confirmSection);
  else if (formSection && !formSection.classList.contains('hidden')) closeModal(formSection);
});

loadProducts();
