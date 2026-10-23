/* ============================================
   Catálogo de ejemplo (modo demo)
   Se usa solo mientras no esté configurado Supabase en js/config.js.
   Es el mismo catálogo que carga supabase/seed.sql.
   ============================================ */

export const DEMO_CATEGORIES = [
  { id: "labios", name: "Labios", emoji: "💋", position: 1 },
  { id: "mejillas", name: "Mejillas", emoji: "🌸", position: 2 },
  { id: "rostro", name: "Rostro", emoji: "✨", position: 3 },
];

const shadesOf = (list) => list.map(([name, color, image]) => ({ name, color, image }));

export const DEMO_PRODUCTS = [
  {
    id: "demo-rhode-lip-tint",
    brand: "rhode",
    name: "Peptide Lip Tint",
    price: 489,
    category_id: "labios",
    badge: "viral",
    status: "disponible",
    description: "El lip tint viral de Hailey Bieber. Hidratación con péptidos y un velo de color buenísimo para el día a día.",
    images: ["products/p1.jpeg", "products/p1-1.jpeg", "products/p1-2.jpeg"],
    shades: shadesOf([
      ["Ribbon (rosa)", "#c4708d", "products/p1.jpeg"],
      ["Espresso (café)", "#5e3226", "products/p1-1.jpeg"],
      ["Toffee (caramelo)", "#b97b56", "products/p1-2.jpeg"],
    ]),
  },
  {
    id: "demo-nyx-buttermelt-blush",
    brand: "NYX",
    name: "Buttermelt Blush",
    price: 259,
    category_id: "mejillas",
    badge: "bestseller",
    status: "disponible",
    description: "Rubor en polvo con acabado mantequilla: se difumina solito y dura todo el día. El favorito de TikTok.",
    images: ["products/p2.jpeg", "products/p2-1.jpeg", "products/p2-2.jpeg"],
    shades: shadesOf([
      ["Rosa nube", "#f27fa5", "products/p2.jpeg"],
      ["Coral pop", "#f9564a", "products/p2-1.jpeg"],
      ["Terracota", "#e07856", "products/p2-2.jpeg"],
    ]),
  },
  {
    id: "demo-fenty-gloss-bomb",
    brand: "Fenty Beauty",
    name: "Gloss Bomb Cream",
    price: 459,
    category_id: "labios",
    badge: "bestseller",
    status: "disponible",
    description: "El gloss cremoso de Rihanna: color intenso, cero pegajoso y con efecto labios XL.",
    images: ["products/p3.jpeg"],
    shades: shadesOf([["Mauve Wive$", "#a96e5b", "products/p3.jpeg"]]),
  },
  {
    id: "demo-elf-cream-contour",
    brand: "e.l.f.",
    name: "Cream Contour Palette",
    price: 269,
    category_id: "rostro",
    badge: null,
    status: "disponible",
    description: "Paleta cremosa con 4 tonos para contornear, corregir e iluminar. Se funde con la piel sin marcar líneas.",
    images: ["products/p4.jpeg"],
    shades: [],
  },
  {
    id: "demo-maybelline-matte-ink",
    brand: "Maybelline",
    name: "SuperStay Matte Ink",
    price: 215,
    category_id: "labios",
    badge: "bestseller",
    status: "disponible",
    description: "Labial líquido mate que aguanta hasta 16 horas: café, besos y tacos sin retocar.",
    images: ["products/p5.jpeg", "products/p6.jpeg", "products/p7.jpeg"],
    shades: shadesOf([
      ["70 Amazonian", "#a6543c", "products/p5.jpeg"],
      ["20 Pioneer", "#b5121b", "products/p6.jpeg"],
      ["15 Lover", "#c56d7e", "products/p7.jpeg"],
    ]),
  },
  {
    id: "demo-elf-lip-oil-plumping",
    brand: "e.l.f.",
    name: "Lip Oil Plumping",
    price: 199,
    category_id: "labios",
    badge: "nuevo",
    status: "disponible",
    description: "Aceite labial con efecto plump: brillo espejo, sensación tingly y labios más jugosos al instante.",
    images: ["products/p8.jpeg"],
    shades: shadesOf([["Burst Bubble", "#ef7fa0", "products/p8.jpeg"]]),
  },
  {
    id: "demo-elf-lip-oil",
    brand: "e.l.f.",
    name: "Glow Reviver Lip Oil",
    price: 189,
    category_id: "labios",
    badge: "nuevo",
    status: "disponible",
    description: "El lip oil viral que reacciona con el pH de tus labios. Brillo intenso e hidratación real.",
    images: ["products/p9.jpeg"],
    shades: shadesOf([["Red Delicious", "#e02133", "products/p9.jpeg"]]),
  },
];
