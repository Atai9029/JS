(() => {
  // путь до корня сайта считаем от адреса самого скрипта (JS/store.js -> на уровень выше)
  const BASE = new URL('../', document.currentScript.src).href;
  const KEY = 'armed_products_v1';
  const API_URL = 'http://localhost:3000/products';   // json-server

  let cache = null;    // текущий список в памяти (как localPosts на уроке)
  let mode = 'local';  // 'api' — работает json-server, 'local' — localStorage

  /* ───────── запросы к API (json-server) ───────── */
  async function api(path = '', options = {}) {
    let response;
    try {
      response = await fetch(API_URL + path, {
        ...options,
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      });
    } catch {
      throw new Error('Нет связи с json-server. Он запущен?');
    }
    if (!response.ok) throw new Error(`Ошибка сервера: HTTP ${response.status}`);
    return response.json();
  }

  // json-server запущен? (ждём ответ не дольше 1.5 секунды)
  async function serverAvailable() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch(API_URL, { signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /* ───────── чтение исходного JSON ───────── */
  function loadFromScript() {
    return new Promise((resolve, reject) => {
      if (window.PRODUCTS) return resolve(window.PRODUCTS);
      const tag = document.createElement('script');
      tag.src = BASE + 'JSON/data.js';
      tag.onload = () => window.PRODUCTS ? resolve(window.PRODUCTS) : reject(new Error('data.js пустой'));
      tag.onerror = () => reject(new Error('не найден файл ' + tag.src));
      document.head.appendChild(tag);
    });
  }

  async function readJSON() {
    try {
      const response = await fetch(BASE + 'JSON/data.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status} для ${response.url}`);
      return await response.json();
    } catch (error) {
      console.warn('fetch(data.json) не сработал, пробую data.js:', error.message);
      return await loadFromScript();
    }
  }

  /* ───────── localStorage ───────── */
  function readLocal() {
    try {
      const raw = localStorage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : null;
      return Array.isArray(list) ? list : null;
    } catch {
      return null;
    }
  }

  // сохраняет список; если места не хватает (большое фото) — бросает понятную ошибку
  function persist(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (error) {
      if (error && (error.name === 'QuotaExceededError' || error.code === 22)) {
        throw new Error('Не хватает места в браузере. Выберите фото поменьше.');
      }
      console.warn('localStorage недоступен, данные живут до перезагрузки:', error);
    }
  }

  /* приводим любой объект к единому виду (нужно для импорта) */
  function normalize(item, fallbackId) {
    const specs = item.specs && typeof item.specs === 'object' ? item.specs : {};
    return {
      id: Number.isFinite(Number(item.id)) ? Number(item.id) : fallbackId,
      name: String(item.name ?? '').trim(),
      price: Number(item.price) || 0,
      image: String(item.image ?? ''),
      year: Number(item.year) || 0,
      engine: String(item.engine ?? ''),
      fuel: String(item.fuel ?? ''),
      description: String(item.description ?? ''),
      specs,
      top: Boolean(item.top),
      featured: Boolean(item.featured),
      ...(item.page ? { page: String(item.page) } : {}),
    };
  }

  const nextId = (list) => list.reduce((max, p) => Math.max(max, p.id), 0) + 1;

  // полностью заменяет список на сервере (для «Сбросить» и «Импорт»)
  async function replaceOnServer(list) {
    const current = await api();
    for (const p of current) await api(`/${p.id}`, { method: 'DELETE' });
    for (const item of list) {                       // по очереди, чтобы сохранился порядок
      await api('', { method: 'POST', body: JSON.stringify(item) });
    }
    return api();
  }

  const Store = {
    BASE,
    get mode() { return mode; },

    /* ── READ: весь список ── */
async getAll() {
    if (cache) return cache;

    mode = 'local';
    cache = await readJSON();

    return cache;
},

    /* ── READ: один элемент ── */
    async getById(id) {
      const list = await this.getAll();
      return list.find(p => p.id === Number(id)) ?? null;
    },

    /* ── CREATE ── */
    async create(data) {
      const list = await this.getAll();
      let item;
      if (mode === 'api') {
        const { id, ...body } = normalize(data, 0);  // id выдаст сервер
        const saved = await api('', { method: 'POST', body: JSON.stringify(body) });
        item = normalize(saved);
      } else {
        const id = nextId(list);
        item = normalize({ ...data, id }, id);
      }
      const next = [...list, item];
      cache = next;
      return item;
    },

    /* ── UPDATE ── */
    async update(id, patch) {
      const list = await this.getAll();
      const index = list.findIndex(p => p.id === Number(id));
      if (index === -1) throw new Error('Элемент не найден');
      const old = list[index];
      let item = normalize({ ...old, ...patch, id: old.id }, old.id);
      if (mode === 'api') {
        const body = JSON.stringify(item);
        item = normalize(await api(`/${old.id}`, { method: 'PUT', body }));
      }
      const next = list.map((p, i) => (i === index ? item : p));
      cache = next;
      return item;
    },

    /* ── DELETE (возвращает удалённый элемент и его позицию — для отмены) ── */
    async remove(id) {
      const list = await this.getAll();
      const index = list.findIndex(p => p.id === Number(id));
      if (index === -1) throw new Error('Элемент не найден');
      const item = list[index];
      if (mode === 'api') await api(`/${item.id}`, { method: 'DELETE' });
      const next = list.filter((_, i) => i !== index);
      cache = next;
      return { item, index };
    },

    /* ── отмена удаления ── */
    async restore(item, index) {
      const list = await this.getAll();
      if (mode === 'api') {
        await api('', { method: 'POST', body: JSON.stringify(item) });
      }
      const next = [...list];
      next.splice(Math.min(index, next.length), 0, item);
      cache = next;
    },

    /* ── сброс к исходному data.json ── */
    async reset() {
      const seed = (await readJSON()).map((raw, i) => normalize(raw, i + 1));
      if (mode === 'api') {
        cache = await replaceOnServer(seed);
      } else {
        try { localStorage.removeItem(KEY); } catch { /* ничего */ }
        cache = null;
        await this.getAll();
      }
      return cache;
    },

    /* ── экспорт: скачивает актуальный список как data.json ── */
    async exportJSON() {
      const list = await this.getAll();
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'data.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    },

    /* ── импорт: заменяет список данными из выбранного JSON-файла ── */
    async importJSON(text) {
      let parsed;
      try { parsed = JSON.parse(text); } catch { throw new Error('Файл не похож на JSON'); }
      if (!Array.isArray(parsed)) throw new Error('В файле должен быть массив товаров []');

      const used = new Set();
      const list = parsed.map((raw, i) => {
        if (!raw || typeof raw !== 'object') throw new Error(`Элемент №${i + 1} не является объектом`);
        const item = normalize(raw, i + 1);
        if (!item.name) throw new Error(`У элемента №${i + 1} нет названия (name)`);
        while (used.has(item.id)) item.id += 1000;   // защита от одинаковых id
        used.add(item.id);
        return item;
      });
      await this.getAll();
      if (mode === 'api') {
        cache = await replaceOnServer(list);
      } else {
        cache = list;
      }
      return cache;
    },
  };

  window.Store = Store;
})();
