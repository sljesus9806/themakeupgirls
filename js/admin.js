/* ============================================
   The Make Up Girls — panel admin
   Pedidos, productos (con fotos y tonos) y categorías
   ============================================ */

import * as api from "./api.js";
import {
  $, $$, esc, safeColor, fmtMXN, BADGES, pastelFor, PLACEHOLDER_IMG,
  customerWhatsapp, whatsappUrl, showToast,
} from "./shared.js";

const ORDER_STATUS = {
  pendiente: { label: "⏳ Pendiente", tint: "pink", badge: "badge--pink" },
  confirmado: { label: "💬 Confirmado", tint: "lilac", badge: "badge--lilac" },
  entregado: { label: "🎁 Entregado", tint: "mint", badge: "badge--mint" },
  cancelado: { label: "✕ Cancelado", tint: "peach", badge: "badge--gray" },
};
/* Botones que se muestran según el estado del pedido */
const ORDER_ACTIONS = {
  pendiente: [["confirmado", "💬 Confirmar"], ["entregado", "🎁 Entregado"], ["cancelado", "✕ Cancelar"]],
  confirmado: [["entregado", "🎁 Entregado"], ["pendiente", "↩ Pendiente"], ["cancelado", "✕ Cancelar"]],
  entregado: [["pendiente", "↩ Regresar a pendiente"]],
  cancelado: [["pendiente", "↩ Reactivar"]],
};
const PRODUCT_STATUS = { disponible: "✅ Disponible", agotado: "😢 Agotado", oculto: "🙈 Oculto" };
const EMOJI_PICKS = ["💋", "🌸", "✨", "👁️", "💅", "🧴", "🎀", "💖", "🌷", "🧼", "🪞", "💄", "🍓", "🫧", "☁️", "🌈"];
const MAX_PHOTOS = 12;
const DEFAULT_SHADE_COLOR = "#f4a7c4";

/* ---------- Estado ---------- */
let categories = [];
let products = [];
let orders = [];
let orderFilter = "pendiente";
let productQuery = "";
let productCatFilter = "todas";
let editingCategoryId = null;
let editor = null; // { id, photos: [{key, url?, blob?, preview?}], removed: [urls], shades: [{key, name, color, photoKey}], dirty }
let recovering = location.hash.includes("type=recovery");
let pollTimer = null;

const uid = () => crypto.randomUUID();

/* ---------- Pantallas ---------- */
function showScreen(name) {
  $("#bootScreen").hidden = true;
  $("#setupScreen").hidden = name !== "setup";
  $("#loginScreen").hidden = name !== "login";
  $("#panel").hidden = name !== "panel";
}

function showAuthForm(id) {
  ["loginForm", "resetForm", "newPasswordForm"].forEach((f) => ($("#" + f).hidden = f !== id));
  $$(".auth-card .field-error").forEach((el) => (el.hidden = true));
}

function showError(sel, msg) {
  const el = $(sel);
  el.textContent = msg;
  el.hidden = false;
}

function setBusy(btn, busy, text) {
  if (busy) {
    btn.dataset.label = btn.innerHTML;
    btn.textContent = text;
    btn.disabled = true;
  } else if (btn.dataset.label !== undefined) {
    btn.innerHTML = btn.dataset.label;
    btn.disabled = false;
  }
}

function friendlyError(err) {
  const msg = String(err?.message || err || "");
  if (/invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos 🙈";
  if (/email not confirmed/i.test(msg)) return "Falta confirmar el correo de esta cuenta (revisa tu bandeja).";
  if (/failed to fetch|network/i.test(msg)) return "Sin conexión. Revisa tu internet e intenta de nuevo.";
  if (/rate limit|too many/i.test(msg)) return "Demasiados intentos. Espera un ratito y vuelve a intentar.";
  return msg || "Algo salió mal. Intenta de nuevo.";
}

/* ---------- Arranque y sesión ---------- */
async function boot() {
  if (!api.isConfigured) {
    showScreen("setup");
    return;
  }
  try {
    await api.onAuthChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recovering = true;
        showScreen("login");
        showAuthForm("newPasswordForm");
      } else if (event === "SIGNED_OUT" && !$("#panel").hidden) {
        stopPolling();
        showScreen("login");
        showAuthForm("loginForm");
      }
    });
    const session = await api.getSession();
    if (session && recovering) {
      showScreen("login");
      showAuthForm("newPasswordForm");
    } else if (session) {
      await enterPanel();
    } else {
      showScreen("login");
      showAuthForm("loginForm");
    }
  } catch (err) {
    console.error(err);
    showScreen("login");
    showAuthForm("loginForm");
    showError("#loginError", friendlyError(err));
  }
}

async function enterPanel() {
  const isAdmin = await api.checkIsAdmin();
  if (!isAdmin) {
    await api.signOut();
    showScreen("login");
    showAuthForm("loginForm");
    showError("#loginError", "Esta cuenta no tiene permiso para entrar al panel.");
    return;
  }
  showScreen("panel");
  $("#ordersList").innerHTML = `<div class="spinner"></div>`;
  $("#productsList").innerHTML = `<div class="spinner"></div>`;
  await Promise.all([loadCatalog(), loadOrders()]);
  startPolling();
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = String(fd.get("email")).trim();
  const password = String(fd.get("password"));
  if (!email || !password) return showError("#loginError", "Escribe tu correo y tu contraseña ♡");
  const btn = e.target.querySelector("[type=submit]");
  setBusy(btn, true, "Entrando…");
  try {
    await api.signIn(email, password);
    $("#loginError").hidden = true;
    await enterPanel();
  } catch (err) {
    showError("#loginError", friendlyError(err));
  } finally {
    setBusy(btn, false);
  }
});

$("#forgotBtn").addEventListener("click", () => {
  showAuthForm("resetForm");
  $("#resetForm [name=email]").value = $("#loginForm [name=email]").value;
});
$("#backToLogin").addEventListener("click", () => showAuthForm("loginForm"));

$("#resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = String(new FormData(e.target).get("email")).trim();
  if (!email) return showError("#resetError", "Escribe tu correo ♡");
  const btn = e.target.querySelector("[type=submit]");
  setBusy(btn, true, "Enviando…");
  try {
    await api.sendPasswordReset(email, location.origin + location.pathname);
    showToast("💌 Listo, revisa tu correo para crear tu nueva contraseña");
    showAuthForm("loginForm");
  } catch (err) {
    showError("#resetError", friendlyError(err));
  } finally {
    setBusy(btn, false);
  }
});

$("#newPasswordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const password = String(fd.get("password"));
  if (password.length < 8) return showError("#newPasswordError", "Usa mínimo 8 caracteres.");
  if (password !== fd.get("password2")) return showError("#newPasswordError", "Las contraseñas no coinciden.");
  const btn = e.target.querySelector("[type=submit]");
  setBusy(btn, true, "Guardando…");
  try {
    await api.setNewPassword(password);
    recovering = false;
    history.replaceState(null, "", location.pathname);
    showToast("Contraseña guardada 💖");
    await enterPanel();
  } catch (err) {
    showError("#newPasswordError", friendlyError(err));
  } finally {
    setBusy(btn, false);
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  stopPolling();
  await api.signOut();
  showScreen("login");
  showAuthForm("loginForm");
});

/* ---------- Tabs ---------- */
$(".tabs").addEventListener("click", (e) => {
  const tab = e.target.closest("[data-tab]");
  if (!tab) return;
  $$(".tab").forEach((t) => t.classList.toggle("tab--active", t === tab));
  $$(".tab-panel").forEach((p) => (p.hidden = p.id !== "tab-" + tab.dataset.tab));
});

/* ---------- Datos ---------- */
async function loadCatalog() {
  try {
    const [cats, prods] = await Promise.all([api.listCategories(), api.listAllProducts()]);
    categories = cats;
    products = prods.map((p) => ({
      ...p,
      images: p.images ?? [],
      shades: Array.isArray(p.shades) ? p.shades : [],
    }));
  } catch (err) {
    console.error(err);
    showToast("No se pudo cargar el catálogo: " + friendlyError(err), { error: true });
    return;
  }
  renderCategoryOptions();
  renderProducts();
  renderCategories();
}

async function loadOrders({ quiet = false } = {}) {
  try {
    orders = await api.listOrders();
    renderOrders();
  } catch (err) {
    console.error(err);
    if (!quiet) showToast("No se pudieron cargar los pedidos: " + friendlyError(err), { error: true });
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    if (document.visibilityState === "visible") loadOrders({ quiet: true });
  }, 60_000);
}
function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && pollTimer) loadOrders({ quiet: true });
});

const findProduct = (id) => products.find((p) => p.id === id);
const categoryTint = (id) => {
  const idx = categories.findIndex((c) => c.id === id);
  return idx === -1 ? "pink" : pastelFor(idx + 1);
};

/* ---------- Pedidos ---------- */
function timeAgo(iso) {
  const min = (Date.now() - new Date(iso).getTime()) / 60000;
  if (min < 1) return "justo ahora";
  if (min < 60) return `hace ${Math.round(min)} min`;
  const hours = min / 60;
  if (hours < 24) return `hace ${Math.round(hours)} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}
const fmtDate = (iso) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function renderOrders() {
  const count = (s) => orders.filter((o) => o.status === s).length;
  const pending = count("pendiente");
  $("#pendingBadge").hidden = pending === 0;
  $("#pendingBadge").textContent = pending;
  document.title = (pending ? `(${pending}) ` : "") + "Panel · The Make Up Girls";

  const now = new Date();
  const monthDelivered = orders.filter((o) => {
    const d = new Date(o.created_at);
    return o.status === "entregado" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = monthDelivered.reduce((s, o) => s + Number(o.total), 0);
  $("#orderStats").innerHTML = `
    <div class="stat tint-pink"><span class="stat__icon">⏳</span>
      <div><div class="stat__value">${pending}</div><div class="stat__label">Pendientes</div></div></div>
    <div class="stat tint-lilac"><span class="stat__icon">💬</span>
      <div><div class="stat__value">${count("confirmado")}</div><div class="stat__label">Confirmados por entregar</div></div></div>
    <div class="stat tint-mint"><span class="stat__icon">💰</span>
      <div><div class="stat__value">${fmtMXN(monthTotal)}</div><div class="stat__label">Vendido este mes (${monthDelivered.length} entregados)</div></div></div>`;

  $$("#orderFilters [data-status]").forEach((c) => c.classList.toggle("chip--active", c.dataset.status === orderFilter));

  const list = orders.filter((o) => orderFilter === "todos" || o.status === orderFilter);
  if (!list.length) {
    const empty = {
      pendiente: "No hay pedidos pendientes. ¡Todo al día! 🎉",
      confirmado: "No hay pedidos confirmados por entregar.",
      entregado: "Todavía no hay pedidos entregados.",
      cancelado: "No hay pedidos cancelados.",
      todos: "Todavía no llegan pedidos. ¡Ya vendrán! 💖",
    }[orderFilter];
    $("#ordersList").innerHTML = `<div class="empty"><span class="big">🛍️</span>${empty}</div>`;
    return;
  }
  $("#ordersList").innerHTML = list.map(orderHTML).join("");
}

function orderHTML(o) {
  const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.pendiente;
  const firstName = o.customer_name.split(" ")[0];
  const waCustomer = whatsappUrl(
    `¡Hola ${firstName}! ♡ Te escribo de The Make Up Girls por tu pedido ${o.code}.`,
    customerWhatsapp(o.customer_phone)
  );
  const ig = o.customer_instagram.replace(/^@/, "");
  const items = (Array.isArray(o.items) ? o.items : [])
    .map((it) => {
      const p = findProduct(it.product_id);
      const img = p ? p.shades.find((s) => s.name === it.shade)?.image || p.images[0] || PLACEHOLDER_IMG : PLACEHOLDER_IMG;
      return `
        <li class="order__item">
          <img src="${esc(img)}" alt="" loading="lazy" />
          <span>${it.qty}× ${esc(`${it.brand} ${it.name}`.trim())} ${it.shade ? `<small>· ${esc(it.shade)}</small>` : ""}</span>
          <strong>${fmtMXN(it.price * it.qty)}</strong>
        </li>`;
    })
    .join("");
  const actions = (ORDER_ACTIONS[o.status] ?? [])
    .map(([status, label]) => `<button class="btn btn--ghost btn--sm" data-order-status="${status}" data-id="${esc(o.id)}">${label}</button>`)
    .join("");
  const canDelete = o.status === "cancelado" || o.status === "entregado";
  return `
    <article class="order tint-${st.tint}">
      <div class="order__head">
        <span class="order__code">${esc(o.code)}</span>
        <span class="badge ${st.badge}">${st.label}</span>
        <span class="badge badge--gray">${o.channel === "correo" ? "💌 por correo" : "💬 por WhatsApp"}</span>
        <span class="order__date">${timeAgo(o.created_at)} · ${fmtDate(o.created_at)}</span>
      </div>
      <div class="order__customer">
        <span>👤 ${esc(o.customer_name)}</span>
        <a href="${esc(waCustomer)}" target="_blank" rel="noopener">📱 ${esc(o.customer_phone)}</a>
        ${ig ? `<a href="https://www.instagram.com/${esc(encodeURIComponent(ig))}" target="_blank" rel="noopener">📸 @${esc(ig)}</a>` : ""}
        <span>${o.delivery.includes("UAS") ? "🎓" : "🏠"} ${esc(o.delivery)}</span>
      </div>
      ${o.notes ? `<div class="order__notes">📝 ${esc(o.notes)}</div>` : ""}
      <ul class="order__items">${items}</ul>
      <div class="order__foot">
        <span class="order__total">${fmtMXN(o.total)} <small>MXN · pago contra entrega</small></span>
        <a class="btn btn--whatsapp btn--sm" href="${esc(waCustomer)}" target="_blank" rel="noopener">💬 Escribirle</a>
        ${actions}
        ${canDelete ? `<button class="btn btn--danger btn--sm" data-order-delete="${esc(o.id)}" aria-label="Eliminar pedido">🗑</button>` : ""}
      </div>
    </article>`;
}

$("#orderFilters").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-status]");
  if (!chip) return;
  orderFilter = chip.dataset.status;
  renderOrders();
});

$("#refreshOrders").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  setBusy(btn, true, "Actualizando…");
  await Promise.all([loadOrders(), loadCatalog()]);
  setBusy(btn, false);
});

$("#ordersList").addEventListener("click", async (e) => {
  const statusBtn = e.target.closest("[data-order-status]");
  if (statusBtn) {
    const { id, orderStatus } = statusBtn.dataset;
    statusBtn.disabled = true;
    try {
      await api.setOrderStatus(id, orderStatus);
      const o = orders.find((x) => x.id === id);
      if (o) o.status = orderStatus;
      renderOrders();
      showToast(`Pedido marcado como ${ORDER_STATUS[orderStatus].label}`);
    } catch (err) {
      statusBtn.disabled = false;
      showToast(friendlyError(err), { error: true });
    }
    return;
  }
  const delBtn = e.target.closest("[data-order-delete]");
  if (delBtn) {
    const o = orders.find((x) => x.id === delBtn.dataset.orderDelete);
    if (!o || !confirm(`¿Eliminar el pedido ${o.code} de ${o.customer_name}? No se puede deshacer.`)) return;
    try {
      await api.deleteOrder(o.id);
      orders = orders.filter((x) => x.id !== o.id);
      renderOrders();
      showToast("Pedido eliminado");
    } catch (err) {
      showToast(friendlyError(err), { error: true });
    }
  }
});

/* ---------- Productos ---------- */
function renderCategoryOptions() {
  const opts = categories.map((c) => `<option value="${esc(c.id)}">${esc(`${c.emoji} ${c.name}`.trim())}</option>`).join("");
  $("#productCategoryFilter").innerHTML = `
    <option value="todas">Todas las categorías</option>
    ${opts}
    <option value="ninguna">Sin categoría</option>`;
  if (![...$("#productCategoryFilter").options].some((o) => o.value === productCatFilter)) productCatFilter = "todas";
  $("#productCategoryFilter").value = productCatFilter;

  const editorSelect = $("#editorCategory");
  const current = editorSelect.value;
  editorSelect.innerHTML = `<option value="">Sin categoría</option>${opts}`;
  editorSelect.value = current;

  const brands = [...new Set(products.map((p) => p.brand.trim()).filter(Boolean))].sort();
  $("#brandOptions").innerHTML = brands.map((b) => `<option value="${esc(b)}"></option>`).join("");
}

function renderProducts() {
  const q = productQuery.toLowerCase();
  const list = products.filter((p) => {
    if (productCatFilter === "ninguna" && p.category_id) return false;
    if (!["todas", "ninguna"].includes(productCatFilter) && p.category_id !== productCatFilter) return false;
    return !q || `${p.name} ${p.brand}`.toLowerCase().includes(q);
  });
  if (!list.length) {
    $("#productsList").innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <span class="big">💄</span>
        ${products.length ? "No hay productos con ese filtro." : "Aún no tienes productos. ¡Agrega el primero!"}
      </div>`;
    return;
  }
  $("#productsList").innerHTML = list
    .map((p) => {
      const cat = categories.find((c) => c.id === p.category_id);
      const badge = p.badge ? BADGES[p.badge] : null;
      const photoCount = new Set([...p.images, ...p.shades.map((s) => s.image)].filter(Boolean)).size;
      return `
      <article class="aproduct tint-${categoryTint(p.category_id)} ${p.status === "oculto" ? "aproduct--hidden" : ""}">
        <div class="aproduct__media">
          <img src="${esc(p.images[0] || p.shades[0]?.image || PLACEHOLDER_IMG)}" alt="" loading="lazy" />
          ${badge ? `<span class="badge ${badge.cls}">${badge.label}</span>` : ""}
          <span class="aproduct__photos">📷 ${photoCount}</span>
        </div>
        <div class="aproduct__body">
          <span class="aproduct__brand">${esc(p.brand)}</span>
          <h3 class="aproduct__name">${esc(p.name)}</h3>
          <div class="aproduct__meta">
            <span class="aproduct__price">${fmtMXN(p.price)}</span>
            <span class="badge badge--gray">${cat ? esc(`${cat.emoji} ${cat.name}`) : "Sin categoría"}</span>
            ${p.shades.length ? `<span class="badge badge--gray">🎨 ${p.shades.length} ${p.shades.length === 1 ? "tono" : "tonos"}</span>` : ""}
          </div>
          <div class="aproduct__actions">
            <select data-product-status="${esc(p.id)}" aria-label="Estado de ${esc(p.name)}">
              ${Object.entries(PRODUCT_STATUS)
                .map(([v, label]) => `<option value="${v}" ${p.status === v ? "selected" : ""}>${label}</option>`)
                .join("")}
            </select>
            <button class="btn btn--ghost btn--sm" data-edit="${esc(p.id)}">✏️ Editar</button>
            <button class="btn btn--danger btn--sm" data-delete="${esc(p.id)}" aria-label="Eliminar ${esc(p.name)}">🗑</button>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

$("#productSearch").addEventListener("input", (e) => {
  productQuery = e.target.value.trim();
  renderProducts();
});
$("#productCategoryFilter").addEventListener("change", (e) => {
  productCatFilter = e.target.value;
  renderProducts();
});
$("#newProductBtn").addEventListener("click", () => openEditor());

$("#productsList").addEventListener("click", async (e) => {
  const editBtn = e.target.closest("[data-edit]");
  if (editBtn) return openEditor(findProduct(editBtn.dataset.edit));
  const delBtn = e.target.closest("[data-delete]");
  if (delBtn) {
    const p = findProduct(delBtn.dataset.delete);
    if (!p || !confirm(`¿Borrar "${p.name}"? También se borran sus fotos. No se puede deshacer.`)) return;
    try {
      await api.deleteProduct(p);
      products = products.filter((x) => x.id !== p.id);
      renderProducts();
      renderCategories();
      showToast("Producto eliminado");
    } catch (err) {
      showToast(friendlyError(err), { error: true });
    }
  }
});

$("#productsList").addEventListener("change", async (e) => {
  const select = e.target.closest("[data-product-status]");
  if (!select) return;
  const p = findProduct(select.dataset.productStatus);
  try {
    await api.saveProduct({ id: p.id, status: select.value });
    p.status = select.value;
    renderProducts();
    showToast(`${p.name}: ${PRODUCT_STATUS[p.status]}`);
  } catch (err) {
    select.value = p.status;
    showToast(friendlyError(err), { error: true });
  }
});

/* ---------- Editor de producto ---------- */
const productForm = $("#productForm");

function openEditor(product = null) {
  const gallery = product
    ? [...new Set([...product.images, ...product.shades.map((s) => s.image)].filter(Boolean))]
    : [];
  const photos = gallery.map((url) => ({ key: uid(), url }));
  editor = {
    id: product?.id ?? null,
    photos,
    removed: [],
    shades: (product?.shades ?? []).map((s) => ({
      key: uid(),
      name: s.name,
      color: safeColor(s.color, DEFAULT_SHADE_COLOR),
      photoKey: photos.find((ph) => ph.url === s.image)?.key ?? null,
    })),
    dirty: false,
  };

  productForm.reset();
  $("#editorTitle").textContent = product ? "Editar producto ✏️" : "Nuevo producto ✨";
  $("#editorError").hidden = true;
  renderCategoryOptions();
  if (product) {
    productForm.elements.name.value = product.name;
    productForm.elements.brand.value = product.brand;
    productForm.elements.price.value = Number(product.price);
    productForm.elements.category_id.value = product.category_id ?? "";
    productForm.elements.description.value = product.description;
    productForm.querySelector(`[name=badge][value="${product.badge ?? ""}"]`).checked = true;
    productForm.querySelector(`[name=status][value="${product.status}"]`).checked = true;
  } else if (productCatFilter !== "todas" && productCatFilter !== "ninguna") {
    productForm.elements.category_id.value = productCatFilter;
  }
  renderPhotos();
  renderShades();
  showEditor();
}

function showEditor() {
  $("#productEditor").hidden = false;
  $("#overlay").hidden = false;
  requestAnimationFrame(() => $("#overlay").classList.add("show"));
  document.body.style.overflow = "hidden";
  $("#productEditor .modal__card").scrollTop = 0;
}

function closeEditor({ force = false } = {}) {
  if (!editor) return;
  if (!force && editor.dirty && !confirm("¿Salir sin guardar los cambios?")) return;
  editor.photos.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
  editor = null;
  $("#productEditor").hidden = true;
  $("#overlay").classList.remove("show");
  document.body.style.overflow = "";
  setTimeout(() => ($("#overlay").hidden = true), 250);
}

$$("[data-close-editor]").forEach((b) => b.addEventListener("click", () => closeEditor()));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && editor && !$("#saveProductBtn").disabled) closeEditor();
});
productForm.addEventListener("input", () => {
  if (!editor) return;
  editor.dirty = true;
  $("#editorError").hidden = true;
});

/* Fotos */
function renderPhotos() {
  const tiles = editor.photos
    .map(
      (p, i) => `
      <div class="photo ${i === 0 ? "photo--main" : ""}">
        <img src="${esc(p.preview || p.url)}" alt="Foto ${i + 1}" />
        <span class="photo__num">${i === 0 ? "★ Principal" : `Foto ${i + 1}`}</span>
        <div class="photo__tools">
          ${i > 0 ? `<button type="button" data-photo-main="${p.key}" title="Hacer principal" aria-label="Hacer principal">★</button>` : ""}
          <button type="button" data-photo-remove="${p.key}" title="Quitar foto" aria-label="Quitar foto">✕</button>
        </div>
      </div>`
    )
    .join("");
  const addTile =
    editor.photos.length < MAX_PHOTOS
      ? `<button type="button" class="photo-add" id="photoAddBtn"><span>📷</span>Agregar fotos</button>`
      : "";
  $("#photoGrid").innerHTML = tiles + addTile;
}

$("#photoGrid").addEventListener("click", (e) => {
  if (e.target.closest("#photoAddBtn")) return $("#photoInput").click();
  const mainBtn = e.target.closest("[data-photo-main]");
  if (mainBtn) {
    const idx = editor.photos.findIndex((p) => p.key === mainBtn.dataset.photoMain);
    editor.photos.unshift(...editor.photos.splice(idx, 1));
  }
  const rmBtn = e.target.closest("[data-photo-remove]");
  if (rmBtn) {
    const idx = editor.photos.findIndex((p) => p.key === rmBtn.dataset.photoRemove);
    const [photo] = editor.photos.splice(idx, 1);
    if (photo.preview) URL.revokeObjectURL(photo.preview);
    if (photo.url && !photo.blob) editor.removed.push(photo.url);
    editor.shades.forEach((s) => s.photoKey === photo.key && (s.photoKey = null));
  }
  if (mainBtn || rmBtn) {
    editor.dirty = true;
    renderPhotos();
    renderShades();
  }
});

$("#photoInput").addEventListener("change", async (e) => {
  await addPhotos([...e.target.files]);
  e.target.value = "";
});

/* Arrastrar fotos desde la compu */
$("#photoGrid").addEventListener("dragover", (e) => {
  e.preventDefault();
  $("#photoAddBtn")?.classList.add("dragover");
});
$("#photoGrid").addEventListener("dragleave", () => $("#photoAddBtn")?.classList.remove("dragover"));
$("#photoGrid").addEventListener("drop", (e) => {
  e.preventDefault();
  $("#photoAddBtn")?.classList.remove("dragover");
  addPhotos([...e.dataTransfer.files].filter((f) => f.type.startsWith("image/")));
});

async function addPhotos(files) {
  if (!files.length || !editor) return;
  const room = MAX_PHOTOS - editor.photos.length;
  if (files.length > room) showToast(`Máximo ${MAX_PHOTOS} fotos por producto`, { error: true });
  const addBtn = $("#photoAddBtn");
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.innerHTML = `<span>⏳</span>Procesando…`;
  }
  const target = editor;
  for (const file of files.slice(0, room)) {
    try {
      const blob = await compressImage(file);
      if (editor !== target) return; // se cerró el editor mientras procesaba
      editor.photos.push({ key: uid(), blob, preview: URL.createObjectURL(blob) });
      editor.dirty = true;
    } catch (err) {
      showToast(err.message, { error: true });
    }
  }
  if (editor !== target) return;
  renderPhotos();
  renderShades();
}

/* Reduce la foto (máx. 1400px, JPG) para que la tienda cargue rápido
   y no se llene el espacio gratis de Supabase */
async function compressImage(file, maxSide = 1400, quality = 0.85) {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`No se pudo leer "${file.name}". Prueba con una foto JPG o PNG.`));
      el.src = src;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // fondo blanco para PNG transparentes
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error(`No se pudo procesar "${file.name}".`);
    return blob;
  } finally {
    URL.revokeObjectURL(src);
  }
}

/* Tonos */
function renderShades() {
  if (!editor.shades.length) {
    $("#shadesEditor").innerHTML = "";
    return;
  }
  const photoOptions = editor.photos
    .map((p, i) => `<option value="${p.key}">${i === 0 ? "Foto principal" : `Foto ${i + 1}`}</option>`)
    .join("");
  $("#shadesEditor").innerHTML = editor.shades
    .map((s) => {
      const photo = editor.photos.find((p) => p.key === s.photoKey);
      return `
      <div class="shade-row" data-shade-key="${s.key}">
        <input type="color" value="${safeColor(s.color, DEFAULT_SHADE_COLOR)}" data-shade-field="color" aria-label="Color del tono" />
        <input class="input" type="text" value="${esc(s.name)}" maxlength="60" placeholder="Nombre del tono" data-shade-field="name" aria-label="Nombre del tono" />
        <div class="shade-row__photo">
          ${photo ? `<img src="${esc(photo.preview || photo.url)}" alt="" />` : ""}
          <select data-shade-field="photoKey" aria-label="Foto del tono">
            <option value="">Sin foto</option>
            ${photoOptions}
          </select>
        </div>
        <button type="button" class="icon-btn" data-shade-remove aria-label="Quitar tono">✕</button>
      </div>`;
    })
    .join("");
  $$("#shadesEditor .shade-row").forEach((row) => {
    const shade = editor.shades.find((s) => s.key === row.dataset.shadeKey);
    row.querySelector("select").value = shade.photoKey ?? "";
  });
}

$("#addShadeBtn").addEventListener("click", () => {
  const used = new Set(editor.shades.map((s) => s.photoKey));
  const freePhoto = editor.photos.find((p) => !used.has(p.key));
  editor.shades.push({ key: uid(), name: "", color: DEFAULT_SHADE_COLOR, photoKey: freePhoto?.key ?? null });
  editor.dirty = true;
  renderShades();
  $("#shadesEditor .shade-row:last-child [data-shade-field=name]").focus();
});

$("#shadesEditor").addEventListener("input", (e) => {
  const field = e.target.dataset.shadeField;
  if (!field) return;
  const shade = editor.shades.find((s) => s.key === e.target.closest(".shade-row").dataset.shadeKey);
  shade[field] = e.target.value || (field === "photoKey" ? null : "");
  if (field === "photoKey") renderShades();
});

$("#shadesEditor").addEventListener("click", (e) => {
  if (!e.target.closest("[data-shade-remove]")) return;
  const key = e.target.closest(".shade-row").dataset.shadeKey;
  editor.shades = editor.shades.filter((s) => s.key !== key);
  editor.dirty = true;
  renderShades();
});

/* Categoría rápida desde el editor */
$("#quickCategoryBtn").addEventListener("click", async () => {
  const name = prompt("Nombre de la nueva categoría (ej. Ojos, Uñas, Skincare):")?.trim();
  if (!name) return;
  try {
    const cat = await api.saveCategory({ name: name.slice(0, 40), emoji: "✨", position: nextCategoryPosition() });
    categories.push(cat);
    renderCategoryOptions();
    renderCategories();
    $("#editorCategory").value = cat.id;
    editor.dirty = true;
    showToast(`Categoría "${cat.name}" creada 🌸`);
  } catch (err) {
    showToast(friendlyError(err), { error: true });
  }
});

/* Guardar */
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = productForm.elements;
  const name = f.name.value.trim();
  const priceRaw = f.price.value.trim();
  const price = Number(priceRaw);
  const errorEl = $("#editorError");
  let error = null;
  if (!name) error = "Ponle nombre al producto ♡";
  else if (priceRaw === "" || !Number.isFinite(price) || price < 0) error = "Escribe el precio (solo números) ♡";
  else if (editor.shades.some((s) => !s.name.trim())) error = "Ponle nombre a cada tono (o quita los que no uses).";
  f.name.classList.toggle("invalid", !name);
  f.price.classList.toggle("invalid", error?.includes("precio") ?? false);
  if (error) {
    errorEl.textContent = error;
    errorEl.hidden = false;
    errorEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return;
  }
  errorEl.hidden = true;

  const btn = $("#saveProductBtn");
  setBusy(btn, true, editor.photos.some((p) => !p.url) ? "Subiendo fotos…" : "Guardando…");
  const isNew = !editor.id;
  const uploaded = [];
  try {
    for (const photo of editor.photos) {
      if (photo.url) continue;
      photo.url = await api.uploadImage(photo.blob);
      uploaded.push(photo.url);
    }
    const urlOf = (key) => editor.photos.find((p) => p.key === key)?.url ?? null;
    const images = editor.photos.map((p) => p.url);
    await api.saveProduct({
      id: editor.id,
      name,
      brand: f.brand.value.trim(),
      price: Math.round(price * 100) / 100,
      category_id: f.category_id.value || null,
      description: f.description.value.trim(),
      badge: productForm.querySelector("[name=badge]:checked").value || null,
      status: productForm.querySelector("[name=status]:checked").value,
      images,
      shades: editor.shades.map((s) => ({ name: s.name.trim(), color: s.color, image: urlOf(s.photoKey) })),
    });
    await api.removeImages(editor.removed.filter((u) => !images.includes(u)));
    closeEditor({ force: true });
    await loadCatalog();
    showToast(isNew ? "¡Producto agregado a la tienda! 💖" : "Producto actualizado 💖");
  } catch (err) {
    console.error(err);
    // Si falló, se borran las fotos que sí alcanzaron a subir para no dejar basura
    await api.removeImages(uploaded).catch(() => {});
    editor?.photos.forEach((p) => uploaded.includes(p.url) && (p.url = undefined));
    errorEl.textContent = "No se pudo guardar: " + friendlyError(err);
    errorEl.hidden = false;
  } finally {
    setBusy(btn, false);
  }
});

/* ---------- Categorías ---------- */
const nextCategoryPosition = () => Math.max(0, ...categories.map((c) => c.position)) + 1;

$("#emojiPicks").innerHTML = EMOJI_PICKS.map((em) => `<button type="button" data-emoji="${em}">${em}</button>`).join("");
$("#emojiPicks").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-emoji]");
  if (btn) $("#categoryForm [name=emoji]").value = btn.dataset.emoji;
});

$("#categoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const name = form.elements.name.value.trim();
  form.elements.name.classList.toggle("invalid", !name);
  if (!name) return;
  const btn = form.querySelector("[type=submit]");
  setBusy(btn, true, "Agregando…");
  try {
    const cat = await api.saveCategory({
      name,
      emoji: form.elements.emoji.value.trim(),
      position: nextCategoryPosition(),
    });
    categories.push(cat);
    form.reset();
    renderCategories();
    renderCategoryOptions();
    showToast(`Categoría "${cat.name}" creada 🌸`);
  } catch (err) {
    showToast(friendlyError(err), { error: true });
  } finally {
    setBusy(btn, false);
  }
});

function renderCategories() {
  if (!categories.length) {
    $("#categoriesList").innerHTML = `<div class="empty"><span class="big">🌸</span>Aún no hay categorías. Crea la primera arriba.</div>`;
    return;
  }
  $("#categoriesList").innerHTML = categories
    .map((c, i) => {
      const count = products.filter((p) => p.category_id === c.id).length;
      if (c.id === editingCategoryId) {
        return `
        <div class="cat-row tint-${pastelFor(i + 1)}" data-cat="${esc(c.id)}">
          <input class="input cat-row__edit-emoji" value="${esc(c.emoji)}" maxlength="8" data-cat-field="emoji" aria-label="Emoji" />
          <input class="input cat-row__edit-name" value="${esc(c.name)}" maxlength="40" data-cat-field="name" aria-label="Nombre" />
          <div class="cat-row__actions">
            <button class="btn btn--primary btn--sm" data-cat-save>Guardar</button>
            <button class="btn btn--ghost btn--sm" data-cat-cancel>Cancelar</button>
          </div>
        </div>`;
      }
      return `
      <div class="cat-row tint-${pastelFor(i + 1)}" data-cat="${esc(c.id)}">
        <span class="cat-row__emoji">${esc(c.emoji) || "✿"}</span>
        <div class="cat-row__info">
          <span class="cat-row__name">${esc(c.name)}</span>
          <span class="cat-row__count">${count} ${count === 1 ? "producto" : "productos"}</span>
        </div>
        <div class="cat-row__actions">
          <button class="icon-btn" data-cat-move="-1" ${i === 0 ? "disabled" : ""} aria-label="Subir" title="Subir">↑</button>
          <button class="icon-btn" data-cat-move="1" ${i === categories.length - 1 ? "disabled" : ""} aria-label="Bajar" title="Bajar">↓</button>
          <button class="btn btn--ghost btn--sm" data-cat-edit>✏️ Editar</button>
          <button class="btn btn--danger btn--sm" data-cat-delete aria-label="Eliminar ${esc(c.name)}">🗑</button>
        </div>
      </div>`;
    })
    .join("");
}

$("#categoriesList").addEventListener("click", async (e) => {
  const row = e.target.closest("[data-cat]");
  if (!row) return;
  const cat = categories.find((c) => c.id === row.dataset.cat);
  const idx = categories.indexOf(cat);

  if (e.target.closest("[data-cat-edit]")) {
    editingCategoryId = cat.id;
    renderCategories();
    $(`[data-cat="${CSS.escape(cat.id)}"] [data-cat-field=name]`).focus();
  } else if (e.target.closest("[data-cat-cancel]")) {
    editingCategoryId = null;
    renderCategories();
  } else if (e.target.closest("[data-cat-save]")) {
    const name = row.querySelector("[data-cat-field=name]").value.trim();
    const emoji = row.querySelector("[data-cat-field=emoji]").value.trim();
    if (!name) return row.querySelector("[data-cat-field=name]").classList.add("invalid");
    try {
      Object.assign(cat, await api.saveCategory({ id: cat.id, name, emoji }));
      editingCategoryId = null;
      renderCategories();
      renderCategoryOptions();
      renderProducts();
      showToast("Categoría actualizada 🌸");
    } catch (err) {
      showToast(friendlyError(err), { error: true });
    }
  } else if (e.target.closest("[data-cat-move]")) {
    const to = idx + Number(e.target.closest("[data-cat-move]").dataset.catMove);
    if (to < 0 || to >= categories.length) return;
    categories.splice(to, 0, ...categories.splice(idx, 1));
    renderCategories();
    try {
      await Promise.all(
        categories.map((c, i) =>
          c.position === i + 1 ? null : api.saveCategory({ id: c.id, position: i + 1 }).then(() => (c.position = i + 1))
        )
      );
      renderCategoryOptions();
      renderProducts();
    } catch (err) {
      showToast(friendlyError(err), { error: true });
      loadCatalog();
    }
  } else if (e.target.closest("[data-cat-delete]")) {
    const count = products.filter((p) => p.category_id === cat.id).length;
    const extra = count
      ? `\n\n${count} ${count === 1 ? "producto quedará" : "productos quedarán"} sin categoría (siguen en la tienda dentro de "Todo").`
      : "";
    if (!confirm(`¿Borrar la categoría "${cat.name}"?${extra}`)) return;
    try {
      await api.deleteCategory(cat.id);
      await loadCatalog();
      showToast("Categoría eliminada");
    } catch (err) {
      showToast(friendlyError(err), { error: true });
    }
  }
});

$("#categoriesList").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches("[data-cat-field]")) {
    e.preventDefault();
    e.target.closest("[data-cat]").querySelector("[data-cat-save]").click();
  }
});

boot();
