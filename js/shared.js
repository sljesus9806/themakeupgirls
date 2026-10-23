/* ============================================
   Utilidades compartidas: tienda + panel admin
   ============================================ */

import { CONFIG } from "./config.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* Escapa texto antes de meterlo en HTML (los pedidos los escriben clientas) */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

export function safeColor(color, fallback = "#ffc9df") {
  return /^#[0-9a-f]{3,8}$/i.test(color ?? "") ? color : fallback;
}

export const fmtMXN = (n) =>
  "$" + Number(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 });

export const BADGES = {
  nuevo: { label: "Nuevo ✨", cls: "badge--mint" },
  viral: { label: "Viral 💖", cls: "badge--pink" },
  bestseller: { label: "Best seller", cls: "badge--lilac" },
  oferta: { label: "Oferta 🎉", cls: "badge--butter" },
};

/* Colores pastel que se asignan solitos a cada categoría */
export const PASTELS = ["pink", "lilac", "mint", "butter", "peach", "sky"];
export const pastelFor = (index) => PASTELS[((index % PASTELS.length) + PASTELS.length) % PASTELS.length];

export const PLACEHOLDER_IMG = "products/logo.jpeg";

/* ---------- Pedidos ---------- */
export function newOrderCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I para que no se confundan
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return "TMG-" + [...bytes].map((b) => abc[b % abc.length]).join("");
}

/* Texto del pedido para WhatsApp / correo. Sin emojis "nuevos" porque a veces
   WhatsApp Web los muestra como �. */
export function buildOrderText({ code, items, total, customer }) {
  const lines = items.map((it) => {
    const shade = it.shade ? ` (${it.shade})` : "";
    return `• ${it.qty}x ${it.brand ? it.brand + " " : ""}${it.name}${shade} — ${fmtMXN(it.price * it.qty)}`;
  });
  return [
    "¡Hola! ♡ Quiero hacer este pedido en The Make Up Girls:",
    "",
    `Pedido: ${code}`,
    ...lines,
    "",
    `Total: ${fmtMXN(total)} MXN`,
    "",
    `Nombre: ${customer.name}`,
    `WhatsApp: ${customer.phone}`,
    customer.instagram ? `Instagram: ${customer.instagram}` : null,
    `Entrega: ${customer.delivery}`,
    customer.notes ? `Notas: ${customer.notes}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function whatsappUrl(text, number = CONFIG.WHATSAPP_NUMBER) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(subject, body, to = CONFIG.OWNER_EMAIL) {
  const crlf = body.replace(/\r?\n/g, "\r\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlf)}`;
}

/* Número a 10 dígitos para abrir WhatsApp de una clienta (México) */
export function customerWhatsapp(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return "52" + digits;
  return digits;
}

/* ---------- Toast ---------- */
let toastTimer;
export function showToast(msg, { error = false } = {}) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.toggle("toast--error", error);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), error ? 4200 : 2400);
}
