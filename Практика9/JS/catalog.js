// путь до корня сайта 
const BASE = document.currentScript.dataset.base;
const productGrid = document.getElementById('product-grid');
const detailSection = document.getElementById('detail-section');
const detailCard = document.getElementById('detail-card');
const closeBtn = document.getElementById('close-btn');

let productsData = [];

async function loadProducts() {
  try {
    const response = await fetch(BASE + '../JSON/data.json');
    if (!response.ok) throw new Error(`Ошибка: ${response.status}`);

    productsData = await response.json();
    // на главной показываем только избранные (data-featured)
    const list = productGrid.dataset.featured
      ? productsData.filter(p => p.featured)
      : productsData;
    renderProductsList(list);
  } catch (error) {
    console.error('Ошибка JSON', error);
    productGrid.innerHTML = '<p style="color: red;">Ошибка загрузки данных</p>';
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

closeBtn.addEventListener('click', () => detailSection.classList.add('hidden'));
detailSection.addEventListener('click', (e) => {
  if (e.target === detailSection) detailSection.classList.add('hidden');
});

loadProducts();
