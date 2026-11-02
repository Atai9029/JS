// путь до корня сайта считаем от адреса самого скрипта (JS/catalog.js -> на уровень выше).
// Так всё работает при любом корне Live Server и на любой странице сайта.
const BASE = new URL('../', document.currentScript.src).href;
const productGrid = document.getElementById('product-grid');
const detailSection = document.getElementById('detail-section');
const detailCard = document.getElementById('detail-card');
const closeBtn = document.getElementById('close-btn');

let productsData = [];

/* Загрузка данных: сначала JSON/data.json, если не вышло (например file://) — JSON/data.js */
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

async function fetchProducts() {
  try {
    const response = await fetch(BASE + 'JSON/data.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status} для ${response.url}`);
    return await response.json();
  } catch (error) {
    console.warn('fetch(data.json) не сработал, пробую data.js:', error.message);
    return await loadFromScript();
  }
}

async function loadProducts() {
  if (!productGrid) return;
  try {
    productsData = await fetchProducts();
    // на главной показываем только избранные (data-featured)
    const list = productGrid.dataset.featured
      ? productsData.filter(p => p.featured)
      : productsData;
    renderProductsList(list);
  } catch (error) {
    console.error('Ошибка JSON', error);
    productGrid.innerHTML = `<p style="color:#ff5555;">Ошибка загрузки данных: ${error.message}<br>
      Проверьте, что файл <b>JSON/data.json</b> лежит рядом с папками JS и css.</p>`;
  }
}

/* List */
function renderProductsList(products) {
  productGrid.innerHTML = '';

  products.forEach(product => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-lg-4 col-xl-3';
    col.innerHTML = `
      <div class="mil-card">
        <div class="card-img-wrap">
          <img src="${BASE + product.image}" alt="${product.name}">
          ${product.top ? '<span class="tag-badge">ТОП</span>' : ''}
        </div>
        <div class="card-body">
          <h5 style="color:#fff">${product.name}</h5>
          <div class="card-price">$${product.price.toLocaleString('en-US')}</div>
          <div class="card-detail"><span>${product.year}</span><span>${product.engine}</span><span>${product.fuel}</span></div>
          <button class="btn btn-mil w-100">Подробнее</button>
        </div>
      </div>`;
    col.addEventListener('click', () => showProductDetail(product.id));
    productGrid.appendChild(col);
  });
}

/* Detail (модалка) */
function showProductDetail(id) {
  const product = productsData.find(p => p.id === id);
  if (!product) return;

  const specsList = Object.entries(product.specs)
    .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
    .join('');

  detailCard.innerHTML = `
    <h2>${product.name}</h2>
    <img src="${BASE + product.image}" alt="${product.name}" class="detail-img">
    <p class="detail-desc">${product.description}</p>
    <ul class="detail-specs">${specsList}</ul>
    <p class="card-price detail-price">$${product.price.toLocaleString('en-US')}</p>
    <a href="${BASE}buy.html" class="btn btn-mil">Приобрести</a>
    ${product.page ? `<a href="${BASE + product.page}" class="btn btn-mil btn-mil-red">Полная страница</a>` : ''}`;

  detailSection.classList.remove('hidden');
}

closeBtn?.addEventListener('click', () => detailSection.classList.add('hidden'));
detailSection?.addEventListener('click', (e) => {
  if (e.target === detailSection) detailSection.classList.add('hidden');
});

loadProducts();
