/* ============================================
   Capa de datos: Supabase (o modo demo)
   Todo lo que lee o guarda la tienda y el panel pasa por aquí.
   ============================================ */

import { CONFIG } from "./config.js";
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from "./demo-data.js";

export const isConfigured = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY);

const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";
const BUCKET = "productos";

let clientPromise = null;
function client() {
  if (!isConfigured) throw new Error("Supabase no está configurado (js/config.js)");
  clientPromise ??= import(SUPABASE_JS).then(({ createClient }) =>
    createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY)
  );
  return clientPromise;
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/* ---------- Tienda ---------- */
export async function fetchCatalog() {
  if (!isConfigured) return { categories: DEMO_CATEGORIES, products: DEMO_PRODUCTS };
  const sb = await client();
  const [categories, products] = await Promise.all([
    sb.from("categories").select("*").order("position").order("created_at"),
    // .neq por si la admin tiene sesión abierta: en la tienda nunca se ven los ocultos
    sb.from("products").select("*").neq("status", "oculto").order("created_at", { ascending: false }),
  ]);
  return { categories: unwrap(categories), products: unwrap(products) };
}

/* items: [{ product_id, shade, qty }] — precios y total los calcula la base de datos */
export async function placeOrder({ code, customer, items, channel }) {
  if (!isConfigured) return { code, demo: true };
  const sb = await client();
  return unwrap(
    await sb.rpc("place_order", { p_code: code, p_customer: customer, p_items: items, p_channel: channel })
  );
}

/* ---------- Sesión (panel admin) ---------- */
export async function getSession() {
  const sb = await client();
  return unwrap(await sb.auth.getSession()).session;
}

export async function signIn(email, password) {
  const sb = await client();
  return unwrap(await sb.auth.signInWithPassword({ email, password })).session;
}

export async function signOut() {
  const sb = await client();
  await sb.auth.signOut();
}

export async function onAuthChange(callback) {
  const sb = await client();
  sb.auth.onAuthStateChange((event, session) => callback(event, session));
}

export async function sendPasswordReset(email, redirectTo) {
  const sb = await client();
  unwrap(await sb.auth.resetPasswordForEmail(email, { redirectTo }));
}

export async function setNewPassword(password) {
  const sb = await client();
  unwrap(await sb.auth.updateUser({ password }));
}

export async function checkIsAdmin() {
  const sb = await client();
  return Boolean(unwrap(await sb.rpc("is_admin")));
}

/* ---------- Categorías ---------- */
export async function listCategories() {
  const sb = await client();
  return unwrap(await sb.from("categories").select("*").order("position").order("created_at"));
}

export async function saveCategory({ id, ...fields }) {
  const sb = await client();
  const query = id
    ? sb.from("categories").update(fields).eq("id", id)
    : sb.from("categories").insert(fields);
  return unwrap(await query.select().single());
}

export async function deleteCategory(id) {
  const sb = await client();
  unwrap(await sb.from("categories").delete().eq("id", id));
}

/* ---------- Productos ---------- */
export async function listAllProducts() {
  const sb = await client();
  return unwrap(await sb.from("products").select("*").order("created_at", { ascending: false }));
}

export async function saveProduct({ id, ...fields }) {
  const sb = await client();
  const query = id
    ? sb.from("products").update(fields).eq("id", id)
    : sb.from("products").insert(fields);
  return unwrap(await query.select().single());
}

export async function deleteProduct(product) {
  const sb = await client();
  unwrap(await sb.from("products").delete().eq("id", product.id));
  await removeImages([...product.images, ...product.shades.map((s) => s.image)]);
}

/* ---------- Fotos ---------- */
export async function uploadImage(blob) {
  const sb = await client();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  unwrap(
    await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: "31536000" })
  );
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/* Borra del Storage solo las fotos que viven ahí (las de products/ del repo se quedan) */
export async function removeImages(urls) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const paths = [...new Set(urls)]
    .filter((u) => typeof u === "string" && u.includes(marker))
    .map((u) => decodeURIComponent(u.split(marker)[1].split("?")[0]));
  if (!paths.length) return;
  const sb = await client();
  const { error } = await sb.storage.from(BUCKET).remove(paths);
  if (error) console.warn("No se pudieron borrar algunas fotos", error);
}

/* ---------- Pedidos ---------- */
export async function listOrders() {
  const sb = await client();
  return unwrap(await sb.from("orders").select("*").order("created_at", { ascending: false }).limit(500));
}

export async function setOrderStatus(id, status) {
  const sb = await client();
  unwrap(await sb.from("orders").update({ status }).eq("id", id));
}

export async function deleteOrder(id) {
  const sb = await client();
  unwrap(await sb.from("orders").delete().eq("id", id));
}
