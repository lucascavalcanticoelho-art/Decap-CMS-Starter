// Simple Catalog with Decap CMS (Netlify CMS) data in /data/products.json
const state = {
  products: [],
  filtered: [],
  cart: JSON.parse(localStorage.getItem('catalog-cart') || '[]'),
};

const money = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function syncCart() {
  localStorage.setItem('catalog-cart', JSON.stringify(state.cart));
  document.getElementById('cartCount').textContent = state.cart.reduce((s,i)=>s+i.qty,0);
}

function addToCart(prod) {
  const idx = state.cart.findIndex(i => i.id === prod.id);
  if (idx >= 0) { state.cart[idx].qty += 1; }
  else { state.cart.push({ id: prod.id, name: prod.name, pix: prod.preco_pix, card: prod.preco_cartao, brand: prod.marca, qty: 1 }); }
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
  const el = document.getElementById('cartItems');
  el.innerHTML = '';
  let totalPix = 0, totalCard = 0;
  state.cart.forEach(item => {
    totalPix += item.pix * item.qty;
    totalCard += item.card * item.qty;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = \`
      <div>
        <strong>\${item.name}</strong><div class="muted">\${item.brand || ''}</div>
      </div>
      <div>\${money(item.pix)} (PIX)</div>
      <div class="qty">
        <button onclick="changeQty('\${item.id}',-1)">-</button>
        <span>\${item.qty}</span>
        <button onclick="changeQty('\${item.id}',1)">+</button>
      </div>
      <button class="icon" onclick="removeFromCart('\${item.id}')">✕</button>
    \`;
    el.appendChild(row);
  });
  document.getElementById('totalPix').textContent = money(totalPix);
  document.getElementById('totalCard').textContent = money(totalCard);

  // Share actions
  const lines = state.cart.map(i => \`• \${i.name} — PIX: \${money(i.pix)} | Cartão: \${money(i.card)} × \${i.qty}\`);
  const msg = \`Orçamento:\n\${lines.join('\n')}\n\nTotal PIX: \${money(totalPix)}\nTotal Cartão: \${money(totalCard)}\`;
  document.getElementById('waBtn').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
  document.getElementById('emailBtn').href = 'mailto:?subject=Orçamento&body=' + encodeURIComponent(msg);
  document.getElementById('copyBtn').onclick = async () => {
    await navigator.clipboard.writeText(msg);
    alert('Orçamento copiado!');
  };
  document.getElementById('pdfBtn').onclick = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Orçamento', 14, 16);
    doc.setFontSize(11);
    let y = 26;
    lines.forEach(line => { 
      doc.text(line, 14, y); 
      y += 8; 
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 8;
    doc.text('Total PIX: ' + \`\${money(totalPix)}\`, 14, y); y += 8;
    doc.text('Total Cartão: ' + \`\${money(totalCard)}\`, 14, y);
    doc.save('orcamento.pdf');
  };
}

function renderProducts() {
  const box = document.getElementById('results');
  box.innerHTML = '';
  state.filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = \`
      <div class="brand-line">\${p.marca || ''}</div>
      <h4>\${p.name}</h4>
      \${p.oferta ? '<span class="tag">Oferta</span>' : ''}
      <div class="price">
        <div class="pix"><strong>PIX</strong> — \${money(p.preco_pix)}</div>
        <div class="card"><strong>Cartão</strong> — \${money(p.preco_cartao)} \${p.parcelas ? ' ('+p.parcelas+')' : ''}</div>
      </div>
      <div class="add">
        <button class="btn">Adicionar</button>
        <button class="icon-btn" title="Favorito">♡</button>
      </div>
    \`;
    card.querySelector('.btn').addEventListener('click', () => addToCart(p));
    box.appendChild(card);
  });
}

function populateFilters() {
  const cats = Array.from(new Set(state.products.map(p => p.categoria).filter(Boolean))).sort();
  const brands = Array.from(new Set(state.products.map(p => p.marca).filter(Boolean))).sort();
  const catSel = document.getElementById('cat');
  const brandSel = document.getElementById('brand');
  cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o); });
  brands.forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; brandSel.appendChild(o); });
}

function applyFilters() {
  const q = document.getElementById('q').value.trim();
  const cat = document.getElementById('cat').value;
  const brand = document.getElementById('brand').value;
  const onlyOffers = document.getElementById('onlyOffers').checked;
  const sort = document.getElementById('sort').value;

  let list = [...state.products];
  if (cat) list = list.filter(p => p.categoria === cat);
  if (brand) list = list.filter(p => p.marca === brand);
  if (onlyOffers) list = list.filter(p => p.oferta);

  if (q) {
    const fuse = new Fuse(list, { keys: ['name','marca','categoria','descricao'], threshold: 0.3 });
    list = fuse.search(q).map(r => r.item);
  }

  list.sort((a,b)=>{
    if (sort === 'az') return a.name.localeCompare(b.name);
    if (sort === 'za') return b.name.localeCompare(a.name);
    if (sort === 'pix-asc') return a.preco_pix - b.preco_pix;
    if (sort === 'pix-desc') return b.preco_pix - a.preco_pix;
    return 0;
  });

  state.filtered = list;
  renderProducts();
}

async function load() {
  try {
    const res = await fetch('data/products.json', { cache: 'no-store' });
    const data = await res.json();
    // normalize and id
    state.products = (data.items || []).map((p, i) => ({ id: p.id || String(i+1), ...p }));
    populateFilters();
    applyFilters();
    syncCart();
  } catch (e) {
    document.getElementById('results').innerHTML = '<p>Erro ao carregar produtos. Verifique <code>data/products.json</code>.</p>';
    console.error(e);
  }
}

document.getElementById('q').addEventListener('input', applyFilters);
document.getElementById('cat').addEventListener('change', applyFilters);
document.getElementById('brand').addEventListener('change', applyFilters);
document.getElementById('sort').addEventListener('change', applyFilters);
document.getElementById('onlyOffers').addEventListener('change', applyFilters);

document.getElementById('cartBtn').addEventListener('click', ()=>{
  document.getElementById('cartModal').classList.remove('hidden');
  renderCart();
});
document.getElementById('closeCart').addEventListener('click', ()=>{
  document.getElementById('cartModal').classList.add('hidden');
});

load();
