// Simple Catalog with Decap CMS (Netlify CMS) data in /data/products.json
const state = {
  products: [],
  filtered: [],
  cart: JSON.parse(localStorage.getItem('catalog-cart') || '[]'),
};

const money = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const el = (id) => document.getElementById(id);

// -------------- Cart --------------
function syncCart() {
  localStorage.setItem('catalog-cart', JSON.stringify(state.cart));
  el('cartCount').textContent = state.cart.reduce((s, i) => s + i.qty, 0);
}

function addToCart(prod) {
  const idx = state.cart.findIndex(i => i.id === prod.id);
  if (idx >= 0) {
    state.cart[idx].qty += 1;
  } else {
    state.cart.push({
      id: prod.id,
      name: prod.name,
      pix: Number(prod.preco_pix || 0),
      card: Number(prod.preco_cartao || 0),
      brand: prod.marca,
      parcelas: prod.parcelas || '',
      qty: 1
    });
  }
  syncCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  syncCart();
  renderCart();
}

function changeQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  syncCart();
  renderCart();
}

function renderCart() {
  const wrap = el('cartItems');
  wrap.innerHTML = '';
  let totalPix = 0, totalCard = 0;

  state.cart.forEach(item => {
    totalPix += Number(item.pix) * item.qty;
    totalCard += Number(item.card) * item.qty;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong><div class="muted">${item.brand || ''}</div>
      </div>
      <div>${money(item.pix)} (PIX)</div>
      <div class="qty">
        <button onclick="changeQty('${item.id}',-1)">-</button>
        <span>${item.qty}</span>
        <button onclick="changeQty('${item.id}',1)">+</button>
      </div>
      <button class="icon" onclick="removeFromCart('${item.id}')">✕</button>
    `;
    wrap.appendChild(row);
  });

  el('totalPix').textContent = money(totalPix);
  el('totalCard').textContent = money(totalCard);

  const lines = state.cart.map(i => `• ${i.name} — PIX: ${money(i.pix)} | Cartão: ${money(i.card)} ${i.parcelas ? '('+i.parcelas+') ' : ''}× ${i.qty}`);
  const msg = `Orçamento:\n${lines.join('\n')}\n\nTotal PIX: ${money(totalPix)}\nTotal Cartão: ${money(totalCard)}`;

  el('waBtn').href   = 'https://wa.me/?text=' + encodeURIComponent(msg);
  el('emailBtn').href = 'mailto:?subject=Orçamento&body=' + encodeURIComponent(msg);
  el('copyBtn').onclick = async () => { await navigator.clipboard.writeText(msg); alert('Orçamento copiado!'); };

  el('pdfBtn').onclick = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text('Orçamento', 14, 16);
    doc.setFontSize(11); let y = 26;
    lines.forEach(line => { doc.text(line, 14, y); y += 8; if (y > 270) { doc.addPage(); y = 20; } });
    y += 8; doc.text('Total PIX: ' + money(totalPix), 14, y);
    y += 8; doc.text('Total Cartão: ' + money(totalCard), 14, y);
    doc.save('orcamento.pdf');
  };
}

// -------------- Listagem --------------
function renderProducts() {
  const box = el('results');
  box.innerHTML = '';
  state.filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${p.imagem ? `<img class="thumb" src="${p.imagem}" alt="${p.name}">` : ''}
      <div class="brand-line">${p.marca || ''}</div>
      <h4>${p.name}</h4>
      ${p.oferta ? '<span class="tag">Oferta</span>' : ''}
      <div class="price">
        <div class="pix"><strong>PIX</strong> — ${money(p.preco_pix)}</div>
        <div class="card"><strong>Cartão</strong> — ${money(p.preco_cartao)} ${p.parcelas ? ' ('+p.parcelas+')' : ''}</div>
      </div>
      <div class="add">
        <button class="btn">Adicionar</button>
        <button class="icon-btn" title="Favorito">♡</button>
      </div>
    `;
    card.querySelector('.btn').addEventListener('click', () => addToCart(p));
    box.appendChild(card);
  });
}

function populateFilters() {
  const cats = Array.from(new Set(state.products.map(p => p.categoria).filter(Boolean))).sort();
  const brands = Array.from(new Set(state.products.map(p => p.marca).filter(Boolean))).sort();
  const catSel = el('cat'), brandSel = el('brand');
  cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o); });
  brands.forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; brandSel.appendChild(o); });
}

function applyFilters() {
  const q = el('q').value.trim();
  const cat = el('cat').value;
  const brand = el('brand').value;
  const onlyOffers = el('onlyOffers').checked;
  const sort = el('sort').value;

  let list = [...state.products];
  if (cat) list = list.filter(p => p.categoria === cat);
  if (brand) list = list.filter(p => p.marca === brand);
  if (onlyOffers) list = list.filter(p => !!p.oferta);

  // Busca: usa Fuse se estiver disponível; senão, fallback simples
  if (q) {
    if (window.Fuse) {
      const fuse = new Fuse(list, { keys: ['name','marca','categoria','descricao'], threshold: 0.3 });
      list = fuse.search(q).map(r => r.item);
    } else {
      const needle = q.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(needle) ||
        (p.marca || '').toLowerCase().includes(needle) ||
        (p.categoria || '').toLowerCase().includes(needle) ||
        (p.descricao || '').toLowerCase().includes(needle)
      );
    }
  }

  list.sort((a,b)=>{
    if (sort === 'az') return (a.name||'').localeCompare(b.name||'');
    if (sort === 'za') return (b.name||'').localeCompare(a.name||'');
    if (sort === 'pix-asc') return Number(a.preco_pix) - Number(b.preco_pix);
    if (sort === 'pix-desc') return Number(b.preco_pix) - Number(a.preco_pix);
    return 0;
  });

  state.filtered = list;
  renderProducts();
}

// -------------- Load --------------
async function load() {
  try {
    const res = await fetch('/data/products.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    // usa data.items e normaliza tipos
    state.products = (data.items || []).map((p, i) => ({
      id: p.id || String(i+1),
      name: p.name || '',
      categoria: p.categoria || '',
      marca: p.marca || '',
      preco_pix: Number(p.preco_pix || 0),
      preco_cartao: Number(p.preco_cartao || 0),
      parcelas: p.parcelas || '',
      oferta: !!p.oferta,
      descricao: p.descricao || '',
      imagem: p.imagem || ''
    }));

    console.log('Produtos carregados:', state.products);

    populateFilters();
    applyFilters();
    syncCart();
  } catch (e) {
    console.error('Erro ao carregar /data/products.json', e);
    el('results').innerHTML = '<p>Erro ao carregar produtos. Verifique <code>/data/products.json</code>.</p>';
  }
}

// -------------- Listeners --------------
['q','cat','brand','sort','onlyOffers'].forEach(id => {
  const n = el(id);
  if (!n) return;
  n.addEventListener(id === 'q' ? 'input' : 'change', applyFilters);
});

el('cartBtn').addEventListener('click', () => { el('cartModal').classList.remove('hidden'); renderCart(); });
el('closeCart').addEventListener('click', () => el('cartModal').classList.add('hidden'));

load();
