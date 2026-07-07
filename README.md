# The Make Up Girls 💄

Sitio web de catálogo para **The Make Up Girls** — tienda de maquillaje original en Mazatlán, Sinaloa, con entregas a domicilio y en la universidad UAS.

Página estática (HTML + CSS + JS puro, sin dependencias ni build). Incluye:

- **Hero** con la identidad de la marca (paleta tomada del logo: rojo `#ED1B2A`, rosa `#E36FC4`, lila `#DD90F0`)
- **Catálogo** con filtros por categoría (labios, mejillas, rostro) y **selección de tonos** por producto
- **Modal de detalle** de producto con cambio de tono e imagen
- **Carrito de compras** (drawer lateral) con cantidades, subtotal y persistencia en `localStorage`
- **Checkout simulado** en 3 pasos (resumen → datos de entrega → confirmación) — *sin función de compra real todavía*
- Secciones: cómo comprar, nosotras y footer con contacto

## Cómo levantarla en localhost

Desde la raíz del proyecto:

```bash
python3 -m http.server 8000
```

Y abre <http://localhost:8000> en tu navegador.

Cualquier servidor estático funciona igual, por ejemplo:

```bash
npx serve .
```

## Estructura

```
index.html        # Página principal (todas las secciones + modales)
css/styles.css    # Estilos y paleta de la marca
js/app.js         # Datos de productos, catálogo, carrito y checkout demo
products/         # Imágenes de productos y logo
```

## Nota

Los precios son de ejemplo y el flujo de compra es una demostración: el pedido no se envía a ningún lado, solo muestra la confirmación. La compra real se coordina por Instagram ([@themakeup_girls_](https://www.instagram.com/themakeup_girls_)).
