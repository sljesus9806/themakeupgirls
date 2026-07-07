/* ============================================
   The Make Up Girls — catálogo + carrito (demo)
   ============================================ */

const PRODUCTS = [
  {
    id: "rhode-lip-tint",
    brand: "rhode",
    name: "Peptide Lip Tint",
    price: 489,
    category: "labios",
    badge: "viral",
    desc: "El lip tint viral de Hailey Bieber. Hidratación con péptidos y un velo de color buenísimo para el día a día.",
    shades: [
      { name: "Ribbon (rosa)", color: "#c4708d", img: "products/p1.jpeg" },
      { name: "Espresso (café)", color: "#5e3226", img: "products/p1-1.jpeg" },
      { name: "Toffee (caramelo)", color: "#b97b56", img: "products/p1-2.jpeg" },
    ],
  },
  {
    id: "nyx-buttermelt-blush",
    brand: "NYX",
    name: "Buttermelt Blush",
    price: 259,
    category: "mejillas",
    badge: "bestseller",
    desc: "Rubor en polvo con acabado mantequilla: se difumina solito y dura todo el día. El favorito de TikTok.",
    shades: [
      { name: "Rosa nube", color: "#f27fa5", img: "products/p2.jpeg" },
      { name: "Coral pop", color: "#f9564a", img: "products/p2-1.jpeg" },
      { name: "Terracota", color: "#e07856", img: "products/p2-2.jpeg" },
    ],
  },
  {
    id: "fenty-gloss-bomb",
    brand: "Fenty Beauty",
    name: "Gloss Bomb Cream",
    price: 459,
    category: "labios",
    badge: "bestseller",
    desc: "El gloss cremoso de Rihanna: color intenso, cero pegajoso y con efecto labios XL.",
    shades: [
      { name: "Mauve Wive$", color: "#a96e5b", img: "products/p3.jpeg" },
    ],
  },
  {
    id: "elf-cream-contour",
    brand: "e.l.f.",
    name: "Cream Contour Palette",
    price: 269,
    category: "rostro",
    badge: null,
    desc: "Paleta cremosa con 4 tonos para contornear, corregir e iluminar. Se funde con la piel sin marcar líneas.",
    shades: [
      { name: "Universal", color: "#9a5b3c", img: "products/p4.jpeg" },
    ],
  },
  {
    id: "maybelline-matte-ink",
    brand: "Maybelline",
    name: "SuperStay Matte Ink",
    price: 215,
    category: "labios",
    badge: "bestseller",
    desc: "Labial líquido mate que aguanta hasta 16 horas: café, besos y tacos sin retocar.",
    shades: [
      { name: "70 Amazonian", color: "#a6543c", img: "products/p5.jpeg" },
      { name: "20 Pioneer", color: "#b5121b", img: "products/p6.jpeg" },
      { name: "15 Lover", color: "#c56d7e", img: "products/p7.jpeg" },
    ],
  },
  {
    id: "elf-lip-oil-plumping",
    brand: "e.l.f.",
    name: "Lip Oil Plumping",
    price: 199,
    category: "labios",
    badge: "nuevo",
    desc: "Aceite labial con efecto plump: brillo espejo, sensación tingly y labios más jugosos al instante.",
    shades: [
      { name: "Burst Bubble", color: "#ef7fa0", img: "products/p8.jpeg" },
    ],
  },
  {
    id: "elf-lip-oil",
    brand: "e.l.f.",
    name: "Glow Reviver Lip Oil",
    price: 189,
    category: "labios",
    badge: "nuevo",
    desc: "El lip oil viral que reacciona con el pH de tus labios. Brillo intenso e hidratación real.",
    shades: [
      { name: "Red Delicious", color: "#e02133", img: "products/p9.jpeg" },
    ],
  },
];

const BADGES = {
  bestseller: { label: "Best seller", cls: "" },
  viral: { label: "Viral 💖", cls: "card__badge--viral" },
  nuevo: { label: "Nuevo", cls: "card__badge--nuevo" },
};

const CART_KEY = "tmg-cart";
const fmtMXN = (n) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }) + " MXN";

/* ---------- Estado ---------- */
let cart = loadCart(); // [{productId, shadeIdx, qty}]
let activeFilter = "todo";
const selectedShade = {}; // productId -> shadeIdx (selección en las cards)
let modalProduct = null;
let modalShadeIdx = 0;

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    return raw.filter((it) => {
      const p = PRODUCTS.find((p) => p.id === it.productId);
      return Boolean(p?.shades[it.shadeIdx]) && it.qty > 0;
    });
  } catch {
    return [];
  }
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function cartCount() {
  return cart.reduce((s, it) => s + it.qty, 0);
}
function cartTotal() {
  return cart.reduce((s, it) => {
    const p = PRODUCTS.find((p) => p.id === it.productId);
    return s + (p ? p.price * it.qty : 0);
  }, 0);
}

/* ---------- Elementos ---------- */
const $ = (sel) => document.querySelector(sel);
const grid = $("#productGrid");
const cartDrawer = $("#cartDrawer");
const overlay = $("#overlay");
const productModal = $("#productModal");
const checkoutModal = $("#checkoutModal");
const toast = $("#toast");

/* ---------- Catálogo ---------- */
function renderGrid() {
  const items = PRODUCTS.filter(
    (p) => activeFilter === "todo" || p.category === activeFilter
  );
  grid.innerHTML = items
    .map((p, i) => {
      const sIdx = selectedShade[p.id] ?? 0;
      const shade = p.shades[sIdx];
      const badge = p.badge ? BADGES[p.badge] : null;
      return `
      <article class="card" style="animation-delay:${i * 0.05}s">
        <div class="card__media" data-open-product="${p.id}" title="Ver detalle">
          ${badge ? `<span class="card__badge ${badge.cls}">${badge.label}</span>` : ""}
          <img src="${shade.img}" alt="${p.brand} ${p.name}" loading="lazy" />
        </div>
        <div class="card__body">
          <span class="card__brand">${p.brand}</span>
          <h3 class="card__name">${p.name}</h3>
          ${
            p.shades.length > 1
              ? `<div class="card__shades">
                  ${p.shades
                    .map(
                      (s, idx) => `
                    <button class="shade-dot ${idx === sIdx ? "shade-dot--active" : ""}"
                      style="background:${s.color}"
                      data-shade="${p.id}:${idx}"
                      title="${s.name}"
                      aria-label="Tono ${s.name}"></button>`
                    )
                    .join("")}
                </div>`
              : ""
          }
          <span class="card__shadename">Tono: ${shade.name}</span>
          <div class="card__foot">
            <span class="card__price">${fmtMXN(p.price)}</span>
            <button class="card__add" data-add="${p.id}">+ Agregar</button>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

grid.addEventListener("click", (e) => {
  const shadeBtn = e.target.closest("[data-shade]");
  if (shadeBtn) {
    const [pid, idx] = shadeBtn.dataset.shade.split(":");
    selectedShade[pid] = Number(idx);
    renderGrid();
    return;
  }
  const addBtn = e.target.closest("[data-add]");
  if (addBtn) {
    addToCart(addBtn.dataset.add, selectedShade[addBtn.dataset.add] ?? 0);
    return;
  }
  const media = e.target.closest("[data-open-product]");
  if (media) openProductModal(media.dataset.openProduct);
});

/* Filtros */
$("#filters").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  activeFilter = chip.dataset.filter;
  document.querySelectorAll("#filters .chip").forEach((c) =>
    c.classList.toggle("chip--active", c === chip)
  );
  renderGrid();
});

/* ---------- Modal de producto ---------- */
function openProductModal(pid) {
  modalProduct = PRODUCTS.find((p) => p.id === pid);
  if (!modalProduct) return;
  modalShadeIdx = selectedShade[pid] ?? 0;
  renderProductModal();
  showModal(productModal);
}

function renderProductModal() {
  const p = modalProduct;
  const shade = p.shades[modalShadeIdx];
  $("#pmodalImg").src = shade.img;
  $("#pmodalImg").alt = `${p.brand} ${p.name} — ${shade.name}`;
  $("#pmodalBrand").textContent = p.brand;
  $("#pmodalName").textContent = p.name;
  $("#pmodalPrice").textContent = fmtMXN(p.price);
  $("#pmodalDesc").textContent = p.desc;
  $("#pmodalShades").innerHTML = p.shades
    .map(
      (s, idx) => `
    <button class="shade-pill ${idx === modalShadeIdx ? "shade-pill--active" : ""}" data-mshade="${idx}">
      <i style="background:${s.color}"></i>${s.name}
    </button>`
    )
    .join("");
}

$("#pmodalShades").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mshade]");
  if (!btn) return;
  modalShadeIdx = Number(btn.dataset.mshade);
  selectedShade[modalProduct.id] = modalShadeIdx;
  renderProductModal();
  renderGrid();
});

$("#pmodalAdd").addEventListener("click", () => {
  addToCart(modalProduct.id, modalShadeIdx);
  hideModal(productModal);
});

/* ---------- Carrito ---------- */
function addToCart(pid, shadeIdx) {
  const existing = cart.find((it) => it.productId === pid && it.shadeIdx === shadeIdx);
  if (existing) existing.qty += 1;
  else cart.push({ productId: pid, shadeIdx, qty: 1 });
  saveCart();
  renderCart();
  const p = PRODUCTS.find((p) => p.id === pid);
  showToast(`💖 ${p.name} agregado al carrito`);
  const badge = $("#cartBadge");
  badge.classList.remove("pop");
  void badge.offsetWidth; // reinicia la animación
  badge.classList.add("pop");
}

function changeQty(index, delta) {
  const it = cart[index];
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) cart.splice(index, 1);
  saveCart();
  renderCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function renderCart() {
  const count = cartCount();
  const badge = $("#cartBadge");
  badge.hidden = count === 0;
  badge.textContent = count;
  const unidad = count === 1 ? "producto" : "productos";
  $("#cartCountLabel").textContent = count ? `(${count} ${unidad})` : "";

  const itemsEl = $("#cartItems");
  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart__empty">
        <span class="big">🛍️</span>
        Tu carrito está vacío...<br />¡Ve a consentirte con algo bonito!
      </div>`;
    $("#cartFoot").style.display = "none";
    return;
  }
  $("#cartFoot").style.display = "";
  itemsEl.innerHTML = cart
    .map((it, i) => {
      const p = PRODUCTS.find((p) => p.id === it.productId);
      const shade = p.shades[it.shadeIdx];
      return `
      <div class="cart-item">
        <img class="cart-item__img" src="${shade.img}" alt="${p.name}" />
        <div class="cart-item__info">
          <span class="cart-item__name">${p.brand} · ${p.name}</span>
          <span class="cart-item__shade">Tono: ${shade.name}</span>
          <span class="cart-item__price">${fmtMXN(p.price * it.qty)}</span>
        </div>
        <div class="cart-item__side">
          <button class="cart-item__remove" data-remove="${i}" aria-label="Quitar">✕</button>
          <div class="qty">
            <button data-qty="${i}:-1" aria-label="Menos">−</button>
            <span>${it.qty}</span>
            <button data-qty="${i}:1" aria-label="Más">+</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
  $("#cartTotal").textContent = fmtMXN(cartTotal());
}

$("#cartItems").addEventListener("click", (e) => {
  const qtyBtn = e.target.closest("[data-qty]");
  if (qtyBtn) {
    const [i, d] = qtyBtn.dataset.qty.split(":").map(Number);
    changeQty(i, d);
    return;
  }
  const rmBtn = e.target.closest("[data-remove]");
  if (rmBtn) removeItem(Number(rmBtn.dataset.remove));
});

/* Drawer */
function openCart() {
  cartDrawer.classList.add("open");
  showOverlay();
}
function closeCart() {
  cartDrawer.classList.remove("open");
  maybeHideOverlay();
}
$("#cartOpenBtn").addEventListener("click", openCart);
$("#cartCloseBtn").addEventListener("click", closeCart);

/* ---------- Checkout ---------- */
let checkoutStep = 1;

$("#checkoutBtn").addEventListener("click", () => {
  if (cart.length === 0) return;
  closeCart();
  goToStep(1);
  renderCheckoutSummary();
  showModal(checkoutModal);
});

function renderCheckoutSummary() {
  $("#checkoutSummary").innerHTML = cart
    .map((it) => {
      const p = PRODUCTS.find((p) => p.id === it.productId);
      const shade = p.shades[it.shadeIdx];
      return `
      <div class="summary-row">
        <div>
          ${it.qty}× ${p.brand} ${p.name}
          <small>Tono: ${shade.name}</small>
        </div>
        <strong>${fmtMXN(p.price * it.qty)}</strong>
      </div>`;
    })
    .join("");
  $("#checkoutTotal").textContent = fmtMXN(cartTotal());
}

function goToStep(n) {
  checkoutStep = n;
  document.querySelectorAll(".checkout-step").forEach((s) => {
    s.hidden = Number(s.dataset.step) !== n;
  });
  document.querySelectorAll("[data-step-dot]").forEach((d) => {
    const dn = Number(d.dataset.stepDot);
    d.classList.toggle("steps__dot--active", dn === n);
    d.classList.toggle("steps__dot--done", dn < n);
  });
}

$("#toStep2").addEventListener("click", () => goToStep(2));
$("#backStep1").addEventListener("click", () => goToStep(1));

$("#checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  const nombre = form.nombre.value.trim();
  const instagram = form.instagram.value.trim();
  form.nombre.classList.toggle("invalid", !nombre);
  form.instagram.classList.toggle("invalid", !instagram);
  if (!nombre || !instagram) return;

  const orderId = "TMG-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  $("#orderId").textContent = orderId;
  $("#orderName").textContent = nombre;
  $("#orderIg").textContent = instagram.startsWith("@") ? instagram : "@" + instagram;

  // Demo: aquí terminaría el flujo; se limpia el carrito simulando pedido enviado
  cart = [];
  saveCart();
  renderCart();
  form.reset();
  goToStep(3);
});

$("#doneBtn").addEventListener("click", () => {
  hideModal(checkoutModal);
  document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth" });
});

/* ---------- Modales / overlay ---------- */
function showModal(m) {
  m.hidden = false;
  showOverlay();
  document.body.style.overflow = "hidden";
}
function hideModal(m) {
  m.hidden = true;
  maybeHideOverlay();
  document.body.style.overflow = "";
}
function showOverlay() {
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("show"));
}
function maybeHideOverlay() {
  const anyOpen =
    cartDrawer.classList.contains("open") || !productModal.hidden || !checkoutModal.hidden;
  if (anyOpen) return;
  overlay.classList.remove("show");
  document.body.style.overflow = "";
  setTimeout(() => {
    overlay.hidden = true;
  }, 250);
}

overlay.addEventListener("click", () => {
  closeCart();
  hideModal(productModal);
  hideModal(checkoutModal);
});

document.querySelectorAll("[data-close-modal]").forEach((btn) =>
  btn.addEventListener("click", () => hideModal(btn.closest(".modal")))
);

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeCart();
  hideModal(productModal);
  hideModal(checkoutModal);
});

/* ---------- Toast ---------- */
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ---------- Menú móvil ---------- */
const nav = $("#nav");
$("#menuBtn").addEventListener("click", () => nav.classList.toggle("open"));
nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") nav.classList.remove("open");
});

/* ---------- Init ---------- */
renderGrid();
renderCart();
