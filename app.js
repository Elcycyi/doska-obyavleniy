/*
 * Доска объявлений — работа с REST API.
 *
 * Два запроса из задания:
 *   GET  https://inai-col1.fishrungames.com/ads  — получить список
 *   POST https://inai-col1.fishrungames.com/ads  — отправить новое объявление
 */

const API = 'https://inai-col1.fishrungames.com';

// Элементы страницы находим один раз, чтобы не искать их при каждой перерисовке
const grid        = document.getElementById('adsGrid');
const loader      = document.getElementById('listLoader');
const errorBox    = document.getElementById('listError');
const emptyBox    = document.getElementById('listEmpty');
const listStatus  = document.getElementById('listStatus');
const totalBadge  = document.getElementById('totalBadge');
const searchInput = document.getElementById('searchInput');

const form        = document.getElementById('adForm');
const formAlert   = document.getElementById('formAlert');
const submitBtn   = document.getElementById('submitBtn');
const submitSpin  = document.getElementById('submitSpinner');
const submitLabel = document.getElementById('submitLabel');

let allAds = [];   // последний полученный список — держим в памяти для поиска

document.getElementById('apiHost').textContent = API.replace('https://', '');

/* ============================================================
 *  ЧАСТЬ 1. ПОЛУЧЕНИЕ СПИСКА — GET /ads
 * ============================================================ */

async function loadAds() {
  showLoader(true);
  errorBox.classList.add('d-none');
  emptyBox.classList.add('d-none');

  try {
    // fetch отправляет GET-запрос по умолчанию
    const response = await fetch(API + '/ads');

    // fetch не считает ошибкой код 404 или 500 — проверяем сами
    if (!response.ok) {
      throw new Error('Сервер ответил кодом ' + response.status);
    }

    const data = await response.json();   // тело ответа разбираем как JSON
    allAds = Array.isArray(data.items) ? data.items : [];

    totalBadge.textContent = data.total ?? allAds.length;
    listStatus.textContent = 'Обновлено в ' + new Date().toLocaleTimeString('ru-RU');

    render(allAds);

  } catch (err) {
    errorBox.textContent = 'Не удалось загрузить объявления: ' + err.message;
    errorBox.classList.remove('d-none');
    grid.innerHTML = '';
    totalBadge.textContent = '—';
  } finally {
    showLoader(false);
  }
}

function showLoader(on) {
  loader.classList.toggle('d-none', !on);
}

/* Рисуем карточки. Массив → HTML. */
function render(ads) {
  grid.innerHTML = '';

  if (ads.length === 0) {
    emptyBox.classList.remove('d-none');
    return;
  }
  emptyBox.classList.add('d-none');

  ads.forEach(ad => grid.appendChild(buildCard(ad)));
}

function buildCard(ad) {
  const col = document.createElement('div');
  col.className = 'col';

  const card = document.createElement('div');
  card.className = 'card ad-card h-100';

  // --- картинка ---
  const thumb = document.createElement('div');
  thumb.className = 'ad-thumb';
  if (ad.image_url) {
    const img = document.createElement('img');
    img.src = API + ad.image_url;        // сервер отдаёт путь без домена
    img.alt = ad.title || 'Фото объявления';
    img.loading = 'lazy';
    // если файл битый — показываем заглушку вместо сломанной картинки
    img.onerror = () => { thumb.innerHTML = '<span class="ad-thumb-empty">Фото не открылось</span>'; };
    thumb.appendChild(img);
  } else {
    thumb.innerHTML = '<span class="ad-thumb-empty">Без фото</span>';
  }

  // --- текст ---
  const body = document.createElement('div');
  body.className = 'card-body d-flex flex-column';

  const title = document.createElement('h3');
  title.className = 'h6 mb-1';
  title.textContent = ad.title || 'Без названия';     // textContent, а не innerHTML — защита от чужого HTML

  const desc = document.createElement('p');
  desc.className = 'card-text text-secondary small flex-grow-1';
  desc.textContent = ad.description || '';

  const priceRow = document.createElement('div');
  priceRow.className = 'd-flex align-items-center justify-content-between mt-2';

  const price = document.createElement('span');
  price.className = 'badge fs-6 ' + (Number(ad.price) === 0 ? 'text-bg-success' : 'text-bg-primary');
  price.textContent = formatPrice(ad.price);

  const idTag = document.createElement('span');
  idTag.className = 'text-secondary small';
  idTag.textContent = '№' + ad.id;

  priceRow.append(price, idTag);
  body.append(title, desc, priceRow);
  card.append(thumb, body);

  card.addEventListener('click', () => openAd(ad));
  col.appendChild(card);
  return col;
}

/* 0 → «Бесплатно», 45000 → «45 000 сом» */
function formatPrice(value) {
  const n = Number(value);
  if (!isFinite(n)) return '—';
  if (n === 0) return 'Бесплатно';
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' сом';
}

/* Объявление крупно, в модальном окне Bootstrap */
function openAd(ad) {
  document.getElementById('adModalTitle').textContent = ad.title || 'Объявление';

  const body = document.getElementById('adModalBody');
  body.innerHTML = '';

  if (ad.image_url) {
    const img = document.createElement('img');
    img.src = API + ad.image_url;
    img.alt = ad.title || '';
    img.className = 'img-fluid rounded mb-3 w-100';
    body.appendChild(img);
  }

  const desc = document.createElement('p');
  desc.textContent = ad.description || '';
  body.appendChild(desc);

  const price = document.createElement('p');
  price.className = 'h4 mb-0';
  price.textContent = formatPrice(ad.price);
  body.appendChild(price);

  bootstrap.Modal.getOrCreateInstance(document.getElementById('adModal')).show();
}

/* Поиск — фильтруем уже полученный массив, сервер не трогаем */
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return render(allAds);

  render(allAds.filter(ad =>
    (ad.title || '').toLowerCase().includes(q) ||
    (ad.description || '').toLowerCase().includes(q)
  ));
});

document.getElementById('reloadBtn').addEventListener('click', loadAds);

/* ============================================================
 *  ЧАСТЬ 2. ОТПРАВКА ОБЪЯВЛЕНИЯ — POST /ads
 * ============================================================ */

form.addEventListener('submit', async (event) => {
  event.preventDefault();           // иначе браузер перезагрузит страницу
  formAlert.classList.add('d-none');

  // Своя проверка: у Bootstrap класс was-validated показывает подсказки под полями
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }
  form.classList.remove('was-validated');

  // Файл нельзя положить в JSON, поэтому собираем multipart/form-data.
  // Заголовок Content-Type НЕ ставим вручную — браузер сам допишет boundary.
  const data = new FormData();
  data.append('title',       document.getElementById('title').value.trim());
  data.append('description', document.getElementById('description').value.trim());
  data.append('price',       document.getElementById('price').value);

  const file = document.getElementById('image').files[0];
  if (file) data.append('image', file);

  setSending(true);

  try {
    const response = await fetch(API + '/ads', {
      method: 'POST',
      body: data
    });

    if (!response.ok) {
      throw new Error('сервер ответил кодом ' + response.status);
    }

    const created = await response.json();

    showFormAlert('success',
      'Объявление опубликовано. Ему присвоен номер ' + created.id + '.');

    form.reset();
    resetPreview();
    await loadAds();                                   // список сразу обновляем

    // и перекидываем на вкладку со списком, чтобы результат было видно
    bootstrap.Tab.getOrCreateInstance(document.getElementById('listTab')).show();

  } catch (err) {
    showFormAlert('danger', 'Не удалось отправить объявление: ' + err.message);
  } finally {
    setSending(false);
  }
});

function setSending(on) {
  submitBtn.disabled = on;
  submitSpin.classList.toggle('d-none', !on);
  submitLabel.textContent = on ? 'Отправляем…' : 'Опубликовать';
}

function showFormAlert(kind, text) {
  formAlert.className = 'alert mt-4 alert-' + kind;
  formAlert.textContent = text;
}

document.getElementById('resetBtn').addEventListener('click', () => {
  form.reset();
  form.classList.remove('was-validated');
  formAlert.classList.add('d-none');
  resetPreview();
});

/* ============================================================
 *  ЧАСТЬ 3. ЖИВОЙ ПРЕДПРОСМОТР КАРТОЧКИ
 * ============================================================ */

const previewThumb = document.getElementById('previewThumb');
const previewTitle = document.getElementById('previewTitle');
const previewDesc  = document.getElementById('previewDesc');
const previewPrice = document.getElementById('previewPrice');

document.getElementById('title').addEventListener('input', e => {
  previewTitle.textContent = e.target.value.trim() || 'Название объявления';
});

document.getElementById('description').addEventListener('input', e => {
  previewDesc.textContent = e.target.value.trim() || 'Здесь появится описание.';
});

document.getElementById('price').addEventListener('input', e => {
  previewPrice.textContent = e.target.value === '' ? '0 сом' : formatPrice(e.target.value);
});

document.getElementById('image').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return resetPreviewThumb();

  // URL.createObjectURL показывает файл с диска без загрузки на сервер
  previewThumb.innerHTML = '';
  const img = document.createElement('img');
  img.src = URL.createObjectURL(file);
  img.alt = 'Предпросмотр';
  img.onload = () => URL.revokeObjectURL(img.src);   // освобождаем память
  previewThumb.appendChild(img);
});

function resetPreviewThumb() {
  previewThumb.innerHTML = '<span class="ad-thumb-empty">Фото не выбрано</span>';
}

function resetPreview() {
  previewTitle.textContent = 'Название объявления';
  previewDesc.textContent  = 'Здесь появится описание.';
  previewPrice.textContent = '0 сом';
  resetPreviewThumb();
}

/* Ссылка вида index.html#new сразу открывает форму */
if (location.hash === '#new') {
  bootstrap.Tab.getOrCreateInstance(document.getElementById('formTab')).show();
}

/* Загружаем список сразу при открытии страницы */
loadAds();
