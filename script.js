let allVideos = [];

let currentPage = 1;
const Page_Size = 24;
let selectedTheme = '';

async function init() {
  const res = await fetch('data.json');
  allVideos = await res.json();

  const subtitle = document.getElementById('subtitle');
  const years = [...new Set(allVideos.map(v => v.date.slice(0,4)))].sort();

const themes = [...new Set(allVideos.map(v => v.theme))].filter(Boolean).sort();
buildThemeChips(themes);

document.getElementById('theme-picker-toggle').addEventListener('click', () => {
  openThemeModal();
});

document.getElementById('theme-modal-close').addEventListener('click', () => {
  closeThemeModal();
});

document.getElementById('theme-modal-backdrop').addEventListener('click', (e) => {
  if (e.target.id === 'theme-modal-backdrop') {
    closeThemeModal();
  }
});
document.getElementById('theme-picker-search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.theme-chip').forEach(chip => {
    chip.style.display = chip.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

  document.getElementById('search').addEventListener('input', () => { currentPage = 1; render(); });
  document.getElementById('sort-order').addEventListener('change', () => { currentPage = 1; render(); });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('recipe-toggle').addEventListener('click', toggleRecipe);
  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });

  render();

document.getElementById('filter-toggle').addEventListener('click', () => {
const filterPanel = document.getElementById('filter-panel');
  const filterText = document.getElementById('filter-toggle-text');

  if (!filterPanel) return;

  // 2. Växla klassen 'open' på panelen
  filterPanel.classList.toggle('open');

  // 3. Kontrollera om den är öppen och uppdatera texten
  const isOpen = filterPanel.classList.contains('open');

  if (filterText) {
    filterText.textContent = isOpen ? 'Dölj filter' : 'Visa filter';
  }
});
  document.getElementById('date-from').addEventListener('change', () => { currentPage = 1; render(); });
  document.getElementById('date-to').addEventListener('change', () => { currentPage = 1; render(); });
  document.getElementById('filter-clear').addEventListener('click', () => {
    selectTheme('');
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    currentPage = 1;
    render();
  });

  document.getElementById('home-link').addEventListener('click', () => {
    selectTheme('');
    document.getElementById('search').value = '';
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    document.getElementById('sort-order').value = 'desc';
    document.getElementById('filter-panel').classList.remove('open');
    document.getElementById('filter-toggle').classList.remove('active');
    currentPage = 1;
    render();
    window.scrollTo({top: 0, behavior: 'smooth'});
  });
}

function buildThemeChips(themes) {
  const list = document.getElementById('theme-chip-list');
  list.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.type = 'button';
  allChip.className = 'theme-chip';
  allChip.textContent = 'Alla teman';
  allChip.addEventListener('click', () => selectTheme(''));
  list.appendChild(allChip);

  themes.forEach(t => {
    const hue = hashHue(t);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'theme-chip';
    chip.textContent = t;
    chip.style.background = `hsl(${hue},45%,88%)`;
    chip.style.color = `hsl(${hue},45%,30%)`;
    chip.addEventListener('click', () => selectTheme(t));
    list.appendChild(chip);
  });
}

function selectTheme(theme) {
  selectedTheme = theme;

  document.getElementById('theme-picker-label').textContent =
    theme || 'Alla teman';

  closeThemeModal();

  currentPage = 1;
  render();
}

function openThemeModal() {
  const modal = document.getElementById('theme-modal-backdrop');

  modal.classList.add('open');

  const search = document.getElementById('theme-picker-search');
  search.value = '';

  document.querySelectorAll('.theme-chip').forEach(chip => {
    chip.style.display = '';
  });

  setTimeout(() => {
    search.focus();
  }, 50);
}


function closeThemeModal() {
  document
    .getElementById('theme-modal-backdrop')
    .classList.remove('open');
}

function render() {
  const q = document.getElementById('search').value.toLowerCase();
  const theme = selectedTheme;
  const dateFrom = document.getElementById('date-from').value;
  const dateTo = document.getElementById('date-to').value;

  const filtered = allVideos.filter(v =>
    (!theme || v.theme === theme) &&
    (!dateFrom || v.date >= dateFrom) &&
    (!dateTo || v.date <= dateTo) &&
    (!q || `${v.drink} ${v.note} ${v.theme} ${v.date}`.toLowerCase().includes(q))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / Page_Size));
  currentPage = Math.max(1, Math.min(currentPage, totalPages));
  const start = (currentPage -1 ) * Page_Size;
  const end = start + Page_Size;
  const sortOrder = document.getElementById('sort-order').value;
  filtered.sort((a, b) => sortOrder === 'asc'
    ? a.date.localeCompare(b.date)
    : b.date.localeCompare(a.date)
  );

  const pageItems = filtered.slice(start, end);  


  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  pageItems.forEach(v => grid.appendChild(makeCard(v)));

  document.getElementById('count').textContent =
    `${filtered.length} av ${allVideos.length} videos`;
  document.getElementById('empty').style.display = filtered.length ? 'none' : 'block';

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const el = document.getElementById('pagination');
  el.innerHTML = '';
  if (totalPages <= 1) return;

  const goTo = (page) => {
    currentPage = page;
    render();
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const first = document.createElement('button');
  first.textContent = '«';
  first.setAttribute('aria-label', 'Första sidan');
  first.disabled = currentPage === 1;
  first.addEventListener('click', () => goTo(1));

  const prev = document.createElement('button');
  prev.textContent = '‹';
  prev.setAttribute('aria-label', 'Föregående sida');
  prev.disabled = currentPage === 1;
  prev.addEventListener('click', () => goTo(currentPage - 1));

  const label = document.createElement('span');
  label.textContent = `Sida ${currentPage} av ${totalPages}`;

  const next = document.createElement('button');
  next.textContent = '›';
  next.setAttribute('aria-label', 'Nästa sida');
  next.disabled = currentPage === totalPages;
  next.addEventListener('click', () => goTo(currentPage + 1));

  const last = document.createElement('button');
  last.textContent = '»';
  last.setAttribute('aria-label', 'Sista sidan');
  last.disabled = currentPage === totalPages;
  last.addEventListener('click', () => goTo(totalPages));

  el.appendChild(first);
  el.appendChild(prev);
  el.appendChild(label);
  el.appendChild(next);
  el.appendChild(last);
}

function makeCard(v) {
  const card = document.createElement('div');
  card.className = 'card';
  const hue = hashHue(v.theme || '');
  card.innerHTML = `
    <video src="${v.url}" ${v.photo ? `poster="${v.photo}"` : ''} preload="metadata" muted></video>
    <div class="card-body">
      <p class="card-drink">${escapeHtml(v.drink)}</p>
      <div class="tag-row">
        <span class="theme-tag" style="background:hsl(${hue},45%,88%); color:hsl(${hue},45%,30%);">${escapeHtml(v.theme)}</span>
        <span class="date">${v.date}</span>
      </div>
      <p class="note">${escapeHtml(v.note)}</p>
    </div>
  `;
  card.addEventListener('click', () => openModal(v));
  card.querySelector('.theme-tag').addEventListener('click', (e) => {
    e.stopPropagation();
    filterByTheme(v.theme);
  });
  return card;
}

const TASTE_LABELS = ['Sötma', 'Syra', 'Beska', 'Styrka', 'Sälta']

function renderTasteProfile(tasteStr){
  const container = document.getElementById('taste-profile');
  const rows = document.getElementById('taste-rows');

  rows.innerHTML = '';

  if (!tasteStr){
    container.style.display = 'none';
    return;
  }

  const values = tasteStr.split(',').map(s => parseInt(s.trim().split('/')[0], 10));

  TASTE_LABELS.forEach((label, i) => {
    const value = values[i] || 0;
    let dots = '';
    for (let d = 1; d<=5; d++){
      dots += `<span class="taste-dot ${d <= value ? 'filled' : ''}"></span>`;
    }
    const row = document.createElement('div');
    row.className = 'taste-row';
    row.innerHTML = `<span class="taste-label">${label}</span><span class="taste-dots">${dots}</span>`;
    rows.appendChild(row);
  });
  container.style.display = 'block';

}
function openModal(v) {
  document.getElementById('modal-video').src = v.url;
  document.getElementById('modal-drink').textContent = v.drink;
  const modalTheme = document.getElementById('modal-theme');
  const hue = hashHue(v.theme || '');
  modalTheme.textContent = v.theme;
  modalTheme.style.background = `hsl(${hue},45%,88%)`;
  modalTheme.style.color = `hsl(${hue},45%,30%)`;
  document.getElementById('modal-date').textContent = v.date;
  document.getElementById('modal-note').textContent = v.note;

  const hasRecipe = !!((v.ingredients && v.ingredients.trim()) || (v.steps && v.steps.trim()));
  const toggle = document.getElementById('recipe-toggle');
  const block = document.getElementById('recipe-block');
  toggle.style.display = hasRecipe ? 'inline-block' : 'none';
  toggle.textContent = 'Visa recept';
  block.style.display = 'none';

  const ingredientsEl = document.getElementById('modal-ingredients');
  ingredientsEl.innerHTML = '';
  (v.ingredients || '').split(',').map(s => s.trim()).filter(Boolean).forEach(ing => {
    const li = document.createElement('li');
    li.textContent = ing;
    ingredientsEl.appendChild(li);
  });

  const stepsEl = document.getElementById('modal-steps');
  stepsEl.innerHTML = '';
  (v.steps || '').split(',').map(s => s.trim()).filter(Boolean).forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    stepsEl.appendChild(li);
  });
  renderTasteProfile(v.taste);
  document.getElementById('modal-backdrop').classList.add('open');
}

function toggleRecipe() {
  const block = document.getElementById('recipe-block');
  const toggle = document.getElementById('recipe-toggle');
  const showing = block.style.display !== 'none';
  block.style.display = showing ? 'none' : 'block';
  toggle.textContent = showing ? 'Visa recept' : 'Dölj recept';
}

function closeModal() {
  const video = document.getElementById('modal-video');
  video.pause();
  video.src = '';
  document.getElementById('modal-backdrop').classList.remove('open');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

function hashHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function filterByTheme(theme) {
  selectTheme(theme);
  document.getElementById('filter-panel').classList.add('open');
  document.getElementById('filter-toggle').classList.add('active');
  currentPage = 1;
  render();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

init();