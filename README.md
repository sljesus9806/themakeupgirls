# The Make Up Girls 💄

Tienda en línea de **The Make Up Girls**: maquillaje original en Mazatlán, Sinaloa, con entregas a domicilio y en la universidad UAS.

Es un sitio estático (HTML + CSS + JS, sin build). Usa **Supabase** (plan gratis) como base de datos en línea, para las fotos y para el inicio de sesión del panel.

## Qué hace

**Tienda** (`index.html`)
- Diseño pastel, girly & happy: polaroids, stickers, lunares y botones tipo caramelo
- Catálogo que se llena solo desde la base de datos, con búsqueda y filtros por categoría
- Tonos por producto, galería de fotos, etiquetas (Nuevo, Viral, Best seller, Oferta) y productos agotados
- Carrito que se guarda en el navegador
- **Comprar**: la clienta llena nombre, WhatsApp y forma de entrega. Se abre **WhatsApp al 669 153 9982** (o el **correo maytelizarraosuna@gmail.com**, si lo prefiere) con el pedido ya escrito. El pedido también queda guardado como *pendiente* en el panel.
- Botón flotante de WhatsApp para dudas

**Panel admin** (`admin.html`)
- Entrada con correo y contraseña (y "¿olvidaste tu contraseña?")
- **Pedidos**: pendientes, confirmados, entregados y cancelados, con botón para escribirle a la clienta por WhatsApp y el total vendido del mes
- **Productos**: crear, editar y borrar, con varias fotos (se reducen solas para que carguen rápido), descripción, precio, marca, categoría, tonos, etiqueta y estado (disponible / agotado / oculto)
- **Categorías**: crearlas con emoji, renombrarlas, ordenarlas y borrarlas

## Cómo funciona

```
 Clienta ──► Tienda (GitHub Pages, gratis) ──► WhatsApp / correo de la dueña
                     │
                     ▼
              Supabase (gratis)
              · productos y categorías
              · pedidos pendientes
              · fotos
                     ▲
                     │
 Dueña  ──► Panel admin (admin.html)
```

Los precios y el total de cada pedido los calcula la base de datos, así que nadie puede mandar un pedido con precios inventados. Solo los correos de la tabla `admins` pueden entrar al panel.

---

## Puesta en marcha (una sola vez, ~15 minutos)

### 1. Crear la base de datos en Supabase
1. Entra a [supabase.com](https://supabase.com), crea una cuenta gratis y luego un **New project**.
   - Nombre: `themakeupgirls`. Región: la más cercana (por ejemplo *West US*). Guarda la contraseña de la base de datos.
2. Ve a **SQL Editor → New query**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y dale **Run**.
3. (Opcional) En otra query pega [`supabase/seed.sql`](supabase/seed.sql) y dale **Run**. Así se cargan las 3 categorías y los 7 productos que ya tenía la página.

### 2. Crear la cuenta de la dueña
1. **Authentication → Users → Add user → Create new user**.
2. Correo: `maytelizarraosuna@gmail.com`, una contraseña, y marca **Auto Confirm User**.
3. En **Authentication → Sign In / Providers**, apaga **Allow new users to sign up**. Nadie más necesita registrarse.

> ¿Otra persona también va a administrar? Créale su usuario y en el SQL Editor corre:
> `insert into public.admins (email) values ('su-correo@gmail.com');`

### 3. Conectar la página
1. En Supabase copia la **Project URL** (botón **Connect** o **Project Settings → Data API**) y la **publishable key** (**Project Settings → API Keys**, empieza con `sb_publishable_`). En proyectos viejos se llama *anon public key*.
2. Pégalas en [`js/config.js`](js/config.js):
   ```js
   SUPABASE_URL: "https://xxxxxxxx.supabase.co",
   SUPABASE_KEY: "sb_publishable_xxxxxxxx",
   ```
   Esta llave es pública a propósito: lo que protege los datos son las reglas de `schema.sql`.
3. Guarda, haz commit y push.

### 4. Publicar la tienda (GitHub Pages, gratis)
1. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
2. En un minuto la tienda queda en `https://sljesus9806.github.io/themakeupgirls/` y el panel en `https://sljesus9806.github.io/themakeupgirls/admin.html`.
3. Para que funcione "¿olvidaste tu contraseña?", ve en Supabase a **Authentication → URL Configuration**:
   - **Site URL**: `https://sljesus9806.github.io/themakeupgirls/`
   - **Redirect URLs**: agrega `https://sljesus9806.github.io/themakeupgirls/admin.html`

¡Listo! 🎀

---

## Uso diario (para la dueña)

- **Ver pedidos**: entra a `admin.html`. En la pestaña *Pedidos* salen los pendientes con el número de la clienta. Toca **💬 Escribirle** para mandarle WhatsApp, y luego **Confirmar** y **Entregado**.
- **Agregar un producto**: *Productos → + Nuevo producto*. Sube fotos (la primera es la principal; con ★ cambias cuál), escribe nombre, precio, marca, descripción, elige categoría y guarda. Si viene en varios colores, agrega **tonos** y a cada uno ponle su foto.
- **Se acabó un producto**: en la lista de productos cambia su estado a **😢 Agotado** (se ve pero no se puede comprar) o **🙈 Oculto** (no aparece).
- **Categorías nuevas**: pestaña *Categorías*, elige un emoji y escribe el nombre. Las flechas cambian el orden en que salen en la tienda.

## Límites del plan gratis

- Supabase gratis incluye 500 MB de base de datos y 1 GB para fotos. Las fotos se reducen a ~100–300 KB antes de subirse, así que caben miles.
- Supabase **pausa los proyectos gratis que pasan 7 días sin uso**. Para evitarlo, el workflow [`.github/workflows/supabase-keepalive.yml`](.github/workflows/supabase-keepalive.yml) hace una consulta cada 3 días (lee la URL y la llave de `js/config.js`).
  - Si algún día la tienda deja de cargar productos, entra a Supabase y dale **Restore project**. Es gratis y no se pierde nada.
  - GitHub apaga los workflows programados de repos sin actividad en 60 días. Si pasa, te llega un correo: entra a **Actions** y dale **Enable workflow**.

## Probar en tu computadora

```bash
python3 -m http.server 8000
```

Abre <http://localhost:8000> (tienda) y <http://localhost:8000/admin.html> (panel).
Mientras `js/config.js` no tenga los datos de Supabase, la tienda funciona en **modo demo** con el catálogo de ejemplo, y el panel muestra los pasos para conectarla.

> **Al cambiar CSS o JS:** sube el número `?v=...` de los `<link>` y `<script>` en `index.html` y `admin.html` (por ejemplo, la fecha del día). GitHub Pages deja que los navegadores guarden esos archivos 10 minutos; sin el número nuevo, alguien podría ver el HTML nuevo con el CSS viejo.

## Estructura

```
index.html                 Tienda
admin.html                 Panel admin
css/base.css               Paleta pastel, botones, formularios y modales (compartido)
css/styles.css             Estilos de la tienda
css/admin.css              Estilos del panel
js/config.js               ⚙️ Datos de Supabase, WhatsApp y correo de la dueña
js/api.js                  Todo lo que lee/guarda en Supabase
js/shared.js               Utilidades (formato de precios, mensaje del pedido, WhatsApp, correo)
js/app.js                  Lógica de la tienda (catálogo, carrito, compra)
js/admin.js                Lógica del panel (pedidos, productos, fotos, categorías)
js/demo-data.js            Catálogo de ejemplo para el modo demo
supabase/schema.sql        Tablas, permisos y función para crear pedidos
supabase/seed.sql          Catálogo inicial (opcional)
products/                  Logo y fotos de los productos iniciales
```
