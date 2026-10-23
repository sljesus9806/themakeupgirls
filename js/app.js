/* ============================================
   The Make Up Girls — tienda
   Catálogo (desde Supabase), carrito y compra por WhatsApp / correo
   ============================================ */

import { CONFIG } from "./config.js";
import { fetchCatalog, placeOrder } from "./api.js";
import {
  $, $$, esc, safeColor, fmtMXN, BADGES, pastelFor, PLACEHOLDER_IMG,
  newOrderCode, buildOrderText, whatsappUrl, mailtoUrl, showToast,
} from "./shared.js";

const CART_KEY = "tmg-cart-v2";

/* ---------- Estado ---------- */
let categories = [];
let products = [];
let cart = []; // [{ productId, shade, qty }]  shade = nombre del tono o ""
let activeFilter = "todo";
let query = "";
const selectedShade = {}; // productId -> índice de tono elegido en la card
let modalState = null; // { product, shadeIdx, image }
let lastOrder = null; // { text, wa, mail }

/* ---------- Elementos ---------- */
const grid = $("#productGrid");
const cartDrawer = $("#cartDrawer");
const overlay = $("#overlay");
const productModal = $("#productModal");
const checkoutModal = $("#checkoutModal");

/* ---------- Helpers de catálogo ---------- */
const findProduct = (id) => products.find((p) => p.id === id);
const findCategory = (id) => categories.find((c) => c.id === id);
const isSoldOut = (p) => p.status === "agotado";

function categoryTint(categoryId) {
  const idx = categories.findIndex((c) => c.id === categoryId);
  return idx === -1 ? "pink" : pastelFor(idx + 1);
}

function productImage(p, shadeIdx = 0) {
  return p.shades[shadeIdx]?.image || p.images[0] || PLACEHOLDER_IMG;
}

function productGallery(p) {
  return [...new Set([...p.images, ...p.shades.map((s) => s.image)].filter(Boolean))];
}

function normalize(text) {
  return String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/* ---------- Carga inicial ---------- */
async function loadCatalog() {
  grid.innerHTML = `<div class="spinner" aria-label="Cargando productos"></div>`;
  try {
    const data = await fetchCatalog();
    categories = data.categories;
    products = data.products.map((p) => ({
      ...p,
      images: p.images ?? [],
      shades: Array.isArray(p.shades) ? p.shades : [],
    }));
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="empty">
        <span class="big">😢</span>
        No pudimos cargar el catálogo. Revisa tu conexión.<br /><br />
        <button class="btn btn--ghost btn--sm" id="retryCatalog">Reintentar</button>
      </div>`;
    $("#retryCatalog").addEventListener("click", loadCatalog);
    return;
  }
  if (!categories.some((c) => c.id === activeFilter)) activeFilter = "todo";
  cart = loadCart();
  renderFilters();
  renderGrid();
  renderBrands();
  renderHero();
  renderCart();
}

/* ---------- Hero y marcas (se llenan con los productos reales) ---------- */
function renderHero() {
  const withPhotos = products.filter((p) => p.images.length || p.shades.some((s) => s.image));
  if (withPhotos.length < 3) return;
  const order = [1, 2, 0]; // main, left, right → el más nuevo al centro
  $$("#heroVisual .polaroid img").forEach((img, i) => {
    const p = withPhotos[order[i]];
    img.src = productImage(p);
    img.alt = `${p.brand} ${p.name}`.trim();
  });
}

function renderBrands() {
  const counts = {};
  products.forEach((p) => {
    const b = p.brand.trim();
    if (b) counts[b] = (counts[b] || 0) + 1;
  });
  const brands = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 10);
  if (!brands.length) return;
  $("#brandsList").innerHTML = brands
    .map((b, i) => `<span class="brands__pill tint-${pastelFor(i)}">${esc(b)}</span>`)
    .join("");
}

/* ---------- Filtros ---------- */
function renderFilters() {
  const counts = {};
  products.forEach((p) => (counts[p.category_id] = (counts[p.category_id] || 0) + 1));
  const chips = categories
    .filter((c) => counts[c.id])
    .map(
      (c) => `
      <button class="chip tint-${categoryTint(c.id)} ${activeFilter === c.id ? "chip--active" : ""}"
        data-filter="${esc(c.id)}" role="tab" aria-selected="${activeFilter === c.id}">
        ${esc(c.emoji)} ${esc(c.name)} <span class="chip__count">${counts[c.id]}</span>
      </button>`
    );
  $("#filters").innerHTML = `
    <button class="chip tint-pink ${activeFilter === "todo" ? "chip--active" : ""}" data-filter="todo"
      role="tab" aria-selected="${activeFilter === "todo"}">Todo ✿ <span class="chip__count">${products.length}</span></button>
    ${chips.join("")}`;
}

$("#filters").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-filter]");
  if (!chip) return;
  activeFilter = chip.dataset.filter;
  renderFilters();
  renderGrid();
});

$("#searchInput").addEventListener("input", (e) => {
  query = normalize(e.target.value.trim());
  renderGrid();
});

/* ---------- Catálogo ---------- */
function visibleProducts() {
  return products.filter((p) => {
    if (activeFilter !== "todo" && p.category_id !== activeFilter) return false;
    if (!query) return true;
    const cat = findCategory(p.category_id);
    return normalize(`${p.name} ${p.brand} ${p.description} ${cat?.name ?? ""}`).includes(query);
  });
}

function cardHTML(p, i, animate = true) {
  const sIdx = selectedShade[p.id] ?? 0;
  const shade = p.shades[sIdx];
  const badge = p.badge ? BADGES[p.badge] : null;
  const cat = findCategory(p.category_id);
  const soldOut = isSoldOut(p);
  const title = `${p.brand} ${p.name}`.trim();
  return `
    <article class="card tint-${categoryTint(p.category_id)}" data-card="${esc(p.id)}"
      style="${animate ? `animation-delay:${Math.min(i, 12) * 0.04}s` : "animation:none"}">
      <button class="card__media" data-open-product="${esc(p.id)}" aria-label="Ver ${esc(title)}">
        ${badge ? `<span class="badge card__badge ${badge.cls}">${badge.label}</span>` : ""}
        <img src="${esc(productImage(p, sIdx))}" alt="${esc(title)}" loading="lazy" />
        ${soldOut ? `<span class="card__soldout"><span>Agotado</span></span>` : ""}
      </button>
      <div class="card__body">
        <div class="card__top">
          <span class="card__brand">${esc(p.brand)}</span>
          ${cat ? `<span class="card__cat">${esc(cat.emoji)} ${esc(cat.name)}</span>` : ""}
        </div>
        <h3 class="card__name">${esc(p.name)}</h3>
        ${
          p.shades.length > 1
            ? `<div class="card__shades">
                ${p.shades
                  .map(
                    (s, idx) => `
                  <button class="shade-dot ${idx === sIdx ? "shade-dot--active" : ""}"
                    style="background:${safeColor(s.color)}" data-shade="${idx}" data-pid="${esc(p.id)}"
                    title="${esc(s.name)}" aria-label="Tono ${esc(s.name)}"></button>`
                  )
                  .join("")}
              </div>`
            : ""
        }
        ${shade ? `<span class="card__shadename">Tono: ${esc(shade.name)}</span>` : ""}
        <div class="card__foot">
          <span class="card__price">${fmtMXN(p.price)}</span>
          <button class="card__add" data-add="${esc(p.id)}" ${soldOut ? "disabled" : ""}>
            ${soldOut ? "Agotado" : "+ Agregar"}
          </button>
        </div>
      </div>
    </article>`;
}

function renderGrid() {
  const items = visibleProducts();
  if (!items.length) {
    grid.innerHTML = `
      <div class="empty">
        <span class="big">🥺</span>
        ${products.length ? "No encontramos productos con esa búsqueda." : "Muy pronto habrá productos aquí ✨"}
      </div>`;
    return;
  }
  grid.innerHTML = items.map((p, i) => cardHTML(p, i)).join("");
}

function rerenderCard(pid) {
  const el = grid.querySelector(`[data-card="${CSS.escape(pid)}"]`);
  const p = findProduct(pid);
  if (el && p) el.outerHTML = cardHTML(p, 0, false);
}

grid.addEventListener("click", (e) => {
  const shadeBtn = e.target.closest("[data-shade]");
  if (shadeBtn) {
    selectedShade[shadeBtn.dataset.pid] = Number(shadeBtn.dataset.shade);
    rerenderCard(shadeBtn.dataset.pid);
    return;
  }
  const addBtn = e.target.closest("[data-add]");
  if (addBtn) {
    const p = findProduct(addBtn.dataset.add);
    if (p) addToCart(p, p.shades[selectedShade[p.id] ?? 0]?.name ?? "");
    return;
  }
  const media = e.target.closest("[data-open-product]");
  if (media) openProductModal(media.dataset.openProduct);
});

/* ---------- Modal de producto ---------- */
function openProductModal(pid) {
  const product = findProduct(pid);
  if (!product) return;
  const shadeIdx = selectedShade[pid] ?? 0;
  modalState = { product, shadeIdx, image: productImage(product, shadeIdx) };
  renderProductModal();
  showModal(productModal);
}

function renderProductModal() {
  const { product: p, shadeIdx, image } = modalState;
  const title = `${p.brand} ${p.name}`.trim();
  const card = $(".modal__card--product");
  card.className = `modal__card modal__card--product tint-${categoryTint(p.category_id)}`;
  $("#pmodalImg").src = image;
  $("#pmodalImg").alt = title;
  const gallery = productGallery(p);
  $("#pmodalThumbs").innerHTML =
    gallery.length > 1
      ? gallery
          .map(
            (src) => `
        <button class="pmodal__thumb ${src === image ? "pmodal__thumb--active" : ""}" data-thumb="${esc(src)}" aria-label="Ver foto">
          <img src="${esc(src)}" alt="" loading="lazy" />
        </button>`
          )
          .join("")
      : "";
  $("#pmodalBrand").textContent = p.brand;
  $("#pmodalName").textContent = p.name;
  $("#pmodalPrice").textContent = fmtMXN(p.price);
  $("#pmodalDesc").textContent = p.description;
  $("#pmodalShades").innerHTML = p.shades
    .map(
      (s, idx) => `
      <button class="shade-pill ${idx === shadeIdx ? "shade-pill--active" : ""}" data-mshade="${idx}">
        <i style="background:${safeColor(s.color)}"></i>${esc(s.name)}
      </button>`
    )
    .join("");
  const soldOut = isSoldOut(p);
  $("#pmodalAdd").disabled = soldOut;
  $("#pmodalAdd").textContent = soldOut ? "Agotado por ahora 😢" : "Agregar al carrito 🛍️";
}

$("#pmodalShades").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mshade]");
  if (!btn) return;
  const idx = Number(btn.dataset.mshade);
  modalState.shadeIdx = idx;
  modalState.image = productImage(modalState.product, idx);
  selectedShade[modalState.product.id] = idx;
  renderProductModal();
  rerenderCard(modalState.product.id);
});

$("#pmodalThumbs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-thumb]");
  if (!btn) return;
  modalState.image = btn.dataset.thumb;
  // si la foto es de un tono, también se selecciona ese tono
  const shadeIdx = modalState.product.shades.findIndex((s) => s.image === modalState.image);
  if (shadeIdx !== -1) {
    modalState.shadeIdx = shadeIdx;
    selectedShade[modalState.product.id] = shadeIdx;
    rerenderCard(modalState.product.id);
  }
  renderProductModal();
});

$("#pmodalAdd").addEventListener("click", () => {
  const { product, shadeIdx } = modalState;
  addToCart(product, product.shades[shadeIdx]?.name ?? "");
  hideModal(productModal);
});

/* ---------- Carrito ---------- */
function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    const valid = raw.filter((it) => {
      const p = findProduct(it.productId);
      if (!p || isSoldOut(p) || !(it.qty > 0)) return false;
      return p.shades.length ? p.shades.some((s) => s.name === it.shade) : !it.shade;
    });
    if (valid.length < raw.length) {
      setTimeout(() => showToast("Algunos productos de tu carrito ya no están disponibles"), 600);
    }
    return valid;
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* modo privado: el carrito vive solo en esta visita */
  }
}

/* Líneas del carrito con los datos del producto */
function cartLines() {
  return cart
    .map((it) => {
      const p = findProduct(it.productId);
      if (!p) return null;
      const shadeIdx = Math.max(0, p.shades.findIndex((s) => s.name === it.shade));
      return {
        product: p,
        shade: it.shade,
        qty: it.qty,
        name: p.name,
        brand: p.brand,
        price: Number(p.price),
        image: productImage(p, shadeIdx),
      };
    })
    .filter(Boolean);
}

const cartCount = () => cart.reduce((s, it) => s + it.qty, 0);
const cartTotal = () => cartLines().reduce((s, l) => s + l.price * l.qty, 0);

function addToCart(product, shade) {
  if (isSoldOut(product)) return;
  const existing = cart.find((it) => it.productId === product.id && it.shade === shade);
  if (existing) existing.qty = Math.min(99, existing.qty + 1);
  else cart.push({ productId: product.id, shade, qty: 1 });
  saveCart();
  renderCart();
  showToast(`💖 ${product.name} agregado al carrito`);
  const badge = $("#cartBadge");
  badge.classList.remove("pop");
  void badge.offsetWidth; // reinicia la animación
  badge.classList.add("pop");
}

function changeQty(index, delta) {
  const it = cart[index];
  if (!it) return;
  it.qty = Math.min(99, it.qty + delta);
  if (it.qty <= 0) cart.splice(index, 1);
  saveCart();
  renderCart();
}

function renderCart() {
  const count = cartCount();
  const badge = $("#cartBadge");
  badge.hidden = count === 0;
  badge.textContent = count;
  $("#cartCountLabel").textContent = count ? `(${count} ${count === 1 ? "producto" : "productos"})` : "";

  const itemsEl = $("#cartItems");
  if (!cart.length) {
    itemsEl.innerHTML = `
      <div class="empty">
        <span class="big">🛍️</span>
        Tu carrito está vacío…<br />¡Ve a consentirte con algo bonito!
      </div>`;
    $("#cartFoot").hidden = true;
    return;
  }
  $("#cartFoot").hidden = false;
  itemsEl.innerHTML = cartLines()
    .map(
      (l, i) => `
      <div class="cart-item">
        <img class="cart-item__img" src="${esc(l.image)}" alt="" />
        <div class="cart-item__info">
          <span class="cart-item__name">${esc(`${l.brand} · ${l.name}`)}</span>
          ${l.shade ? `<span class="cart-item__shade">Tono: ${esc(l.shade)}</span>` : ""}
          <span class="cart-item__price">${fmtMXN(l.price * l.qty)}</span>
        </div>
        <div class="cart-item__side">
          <button class="cart-item__remove" data-remove="${i}" aria-label="Quitar ${esc(l.name)}">✕</button>
          <div class="qty">
            <button data-qty="${i}:-1" aria-label="Menos">−</button>
            <span>${l.qty}</span>
            <button data-qty="${i}:1" aria-label="Más">+</button>
          </div>
        </div>
      </div>`
    )
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
  if (rmBtn) {
    cart.splice(Number(rmBtn.dataset.remove), 1);
    saveCart();
    renderCart();
  }
});

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

/* ---------- Compra ---------- */
$("#checkoutBtn").addEventListener("click", () => {
  if (!cart.length) return;
  closeCart();
  goToStep(1);
  renderCheckoutSummary();
  showModal(checkoutModal);
});

function renderCheckoutSummary() {
  $("#checkoutSummary").innerHTML = cartLines()
    .map(
      (l) => `
      <div class="summary-row">
        <div>
          ${l.qty}× ${esc(`${l.brand} ${l.name}`)}
          ${l.shade ? `<small>Tono: ${esc(l.shade)}</small>` : ""}
        </div>
        <strong>${fmtMXN(l.price * l.qty)}</strong>
      </div>`
    )
    .join("");
  $("#checkoutTotal").textContent = fmtMXN(cartTotal());
}

function goToStep(n) {
  $$(".checkout-step").forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
  $$("[data-step-dot]").forEach((d) => {
    const dn = Number(d.dataset.stepDot);
    d.classList.toggle("steps__dot--active", dn === n);
    d.classList.toggle("steps__dot--done", dn < n);
  });
}

$("#toStep2").addEventListener("click", () => {
  goToStep(2);
  $("#checkoutForm [name=name]").focus();
});
$("#backStep1").addEventListener("click", () => goToStep(1));

$("#checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const via = e.submitter?.value === "correo" ? "correo" : "whatsapp";
  const fd = new FormData(form);
  const customer = {
    name: String(fd.get("name")).trim(),
    phone: String(fd.get("phone")).trim(),
    instagram: String(fd.get("instagram")).trim(),
    delivery: String(fd.get("delivery")),
    notes: String(fd.get("notes")).trim(),
  };
  if (customer.instagram && !customer.instagram.startsWith("@")) customer.instagram = "@" + customer.instagram;

  const phoneDigits = customer.phone.replace(/\D/g, "").length;
  const errors = {
    name: !customer.name,
    phone: phoneDigits < 10 || phoneDigits > 13,
  };
  form.querySelector("[name=name]").classList.toggle("invalid", errors.name);
  form.querySelector("[name=phone]").classList.toggle("invalid", errors.phone);
  const errorEl = $("#checkoutError");
  if (errors.name || errors.phone) {
    errorEl.textContent = errors.name ? "Escribe tu nombre, porfa ♡" : "Escribe tu WhatsApp a 10 dígitos ♡";
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;

  const lines = cartLines();
  if (!lines.length) return;
  const code = newOrderCode();
  const total = cartTotal();
  const text = buildOrderText({ code, items: lines, total, customer });
  lastOrder = {
    text,
    wa: whatsappUrl(text),
    mail: mailtoUrl(`Pedido ${code} · The Make Up Girls`, text),
  };

  // Se abre en el mismo clic para que el navegador no lo bloquee
  if (via === "whatsapp") window.open(lastOrder.wa, "_blank", "noopener");
  else window.location.href = lastOrder.mail;

  $("#orderName").textContent = customer.name.split(" ")[0];
  $("#orderId").textContent = code;
  $("#orderDoneText").innerHTML =
    via === "whatsapp"
      ? "Se abrió <strong>WhatsApp</strong> con tu pedido escrito. Solo dale <strong>enviar</strong> 💌 y te confirmamos disponibilidad y entrega."
      : "Se abrió tu <strong>correo</strong> con el pedido escrito. Solo dale <strong>enviar</strong> 💌 y te confirmamos disponibilidad y entrega.";
  $("#resendWhatsapp").href = lastOrder.wa;
  $("#resendWhatsapp").textContent = via === "whatsapp" ? "¿No se abrió? Abrir WhatsApp" : "Mejor por WhatsApp";
  $("#resendEmail").href = lastOrder.mail;
  $("#resendEmail").textContent = via === "correo" ? "💌 ¿No se abrió? Abrir correo" : `💌 Enviar por correo`;
  $("#orderWarn").hidden = true;
  goToStep(3);

  const items = lines.map((l) => ({ product_id: l.product.id, shade: l.shade, qty: l.qty }));
  cart = [];
  saveCart();
  renderCart();
  form.reset();

  try {
    await placeOrder({ code, customer, items, channel: via });
  } catch (err) {
    console.error(err);
    const warn = $("#orderWarn");
    warn.textContent = `Ojo: no pudimos registrar tu pedido en la tienda (${err.message || "sin conexión"}). No pasa nada: envía el mensaje y te atendemos igual 💕`;
    warn.hidden = false;
  }
});

$("#copyOrder").addEventListener("click", async () => {
  if (!lastOrder) return;
  try {
    await navigator.clipboard.writeText(lastOrder.text);
    showToast("📋 Pedido copiado. Pégalo en WhatsApp o en un correo");
  } catch {
    showToast(`Escríbenos al ${CONFIG.OWNER_EMAIL}`, { error: true });
  }
});

$("#doneBtn").addEventListener("click", () => {
  hideModal(checkoutModal);
  $("#catalogo").scrollIntoView({ behavior: "smooth" });
});

/* ---------- Modales / overlay ---------- */
function showModal(m) {
  m.hidden = false;
  showOverlay();
  document.body.style.overflow = "hidden";
  m.querySelector(".modal__close")?.focus({ preventScroll: true });
}
function hideModal(m) {
  if (m.hidden) return;
  m.hidden = true;
  maybeHideOverlay();
}
function showOverlay() {
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("show"));
}
function maybeHideOverlay() {
  const anyOpen = cartDrawer.classList.contains("open") || !productModal.hidden || !checkoutModal.hidden;
  if (anyOpen) return;
  overlay.classList.remove("show");
  document.body.style.overflow = "";
  setTimeout(() => {
    if (!overlay.classList.contains("show")) overlay.hidden = true;
  }, 250);
}
function closeAll() {
  closeCart();
  hideModal(productModal);
  hideModal(checkoutModal);
}

overlay.addEventListener("click", closeAll);
$$("[data-close-modal]").forEach((btn) =>
  btn.addEventListener("click", () => hideModal(btn.closest(".modal")))
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAll();
});

/* ---------- Menú móvil ---------- */
const nav = $("#nav");
$("#menuBtn").addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  $("#menuBtn").setAttribute("aria-expanded", open);
});
nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    nav.classList.remove("open");
    $("#menuBtn").setAttribute("aria-expanded", "false");
  }
});

/* ---------- Contacto ---------- */
const helloWa = whatsappUrl("¡Hola! ♡ Tengo una pregunta sobre un producto de The Make Up Girls");
$("#waFloat").href = helloWa;
$("#footerWhatsapp").href = helloWa;
const localPhone = CONFIG.WHATSAPP_NUMBER.slice(-10);
$("#footerWhatsapp").textContent = `💬 WhatsApp ${localPhone.slice(0, 3)} ${localPhone.slice(3, 6)} ${localPhone.slice(6)}`;
$("#footerEmail").href = `mailto:${CONFIG.OWNER_EMAIL}`;
$("#footerInstagram").href = `https://www.instagram.com/${CONFIG.INSTAGRAM}`;
$("#instagramBtn").href = `https://www.instagram.com/${CONFIG.INSTAGRAM}`;

/* ---------- Init ---------- */
renderCart();
loadCatalog();
