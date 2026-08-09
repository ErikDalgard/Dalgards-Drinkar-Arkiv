let allVideos = [];

let currentPage = 1;
const Page_Size = 24;

async function init() {
  const res = await fetch('data.json');
  allVideos = await res.json();

  const subtitle = document.getElementById('subtitle');
  const years = [...new Set(allVideos.map(v => v.date.slice(0,4)))].sort();
  subtitle.textContent = allVideos.length
    ? `${allVideos.length} videos, ${years[0]}–${years[years.length-1]}`
    : 'Inga videos ännu';

  const themes = [...new Set(allVideos.map(v => v.theme))].sort();
  const sel = document.getElementById('theme-filter');
  themes.forEach(t => {
    const o = document.createElement('option');
    o.value = t; o.textContent = t;
    sel.appendChild(o);
  });

  document.getElementById('search').addEventListener('input', render);
  sel.addEventListener('change', render);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('recipe-toggle').addEventListener('click', toggleRecipe);
  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });

  render();
}

function render() {
  const q = document.getElementById('search').value.toLowerCase();
  const theme = document.getElementById('theme-filter').value;

  const filtered = allVideos.filter(v =>
    (!theme || v.theme === theme) &&
    (!q || `${v.drink} ${v.note} ${v.theme} ${v.date}`.toLowerCase().includes(q))
  );

  const totalPages = Math.ceil(filtered.length / Page_Size);
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage -1 ) * Page_Size;
  const end = start + Page_Size;
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

  const prev = document.createElement('button');
  prev.textContent = '← Föregående';
  prev.disabled = currentPage === 1;
  prev.addEventListener('click', () => { currentPage--; render(); window.scrollTo({top: 0, behavior: 'smooth'}); });

  const label = document.createElement('span');
  label.textContent = `Sida ${currentPage} av ${totalPages}`;

  const next = document.createElement('button');
  next.textContent = 'Nästa →';
  next.disabled = currentPage === totalPages;
  next.addEventListener('click', () => { currentPage++; render(); window.scrollTo({top: 0, behavior: 'smooth'}); });

  el.appendChild(prev);
  el.appendChild(label);
  el.appendChild(next);
  
}
function makeCard(v) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <video src="${v.url}" preload="metadata" muted></video>
    <div class="card-body">
      <p class="card-drink">${escapeHtml(v.drink)}</p>
      <div class="tag-row">
        <span class="theme-tag">${escapeHtml(v.theme)}</span>
        <span class="date">${v.date}</span>
      </div>
      <p class="note">${escapeHtml(v.note)}</p>
    </div>
  `;
  card.addEventListener('click', () => openModal(v));
  return card;
}

function openModal(v) {
  document.getElementById('modal-video').src = v.url;
  document.getElementById('modal-drink').textContent = v.drink;
  document.getElementById('modal-theme').textContent = v.theme;
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
  document.getElementById('modal-steps').textContent = v.steps || '';
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

init();