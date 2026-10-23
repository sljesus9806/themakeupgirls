-- =========================================================
--  The Make Up Girls · catálogo inicial (OPCIONAL)
--
--  Carga las 3 categorías y los 7 productos que ya tenía la página,
--  con las fotos de la carpeta products/.
--  Córrelo DESPUÉS de schema.sql. Si ya hay productos, no hace nada.
-- =========================================================

do $$
declare
  c_labios uuid;
  c_mejillas uuid;
  c_rostro uuid;
begin
  if exists (select 1 from public.products) then
    raise notice 'Ya hay productos: no se cargó el catálogo inicial.';
    return;
  end if;

  select id into c_labios from public.categories where lower(name) = 'labios';
  if c_labios is null then
    insert into public.categories (name, emoji, position) values ('Labios', '💋', 1) returning id into c_labios;
  end if;

  select id into c_mejillas from public.categories where lower(name) = 'mejillas';
  if c_mejillas is null then
    insert into public.categories (name, emoji, position) values ('Mejillas', '🌸', 2) returning id into c_mejillas;
  end if;

  select id into c_rostro from public.categories where lower(name) = 'rostro';
  if c_rostro is null then
    insert into public.categories (name, emoji, position) values ('Rostro', '✨', 3) returning id into c_rostro;
  end if;

  -- created_at escalonado para que se vean en este mismo orden (más nuevo primero)
  insert into public.products (name, brand, price, category_id, badge, description, images, shades, created_at) values
  ('Peptide Lip Tint', 'rhode', 489, c_labios, 'viral',
   'El lip tint viral de Hailey Bieber. Hidratación con péptidos y un velo de color buenísimo para el día a día.',
   array['products/p1.jpeg', 'products/p1-1.jpeg', 'products/p1-2.jpeg'],
   '[{"name":"Ribbon (rosa)","color":"#c4708d","image":"products/p1.jpeg"},
     {"name":"Espresso (café)","color":"#5e3226","image":"products/p1-1.jpeg"},
     {"name":"Toffee (caramelo)","color":"#b97b56","image":"products/p1-2.jpeg"}]',
   now()),

  ('Buttermelt Blush', 'NYX', 259, c_mejillas, 'bestseller',
   'Rubor en polvo con acabado mantequilla: se difumina solito y dura todo el día. El favorito de TikTok.',
   array['products/p2.jpeg', 'products/p2-1.jpeg', 'products/p2-2.jpeg'],
   '[{"name":"Rosa nube","color":"#f27fa5","image":"products/p2.jpeg"},
     {"name":"Coral pop","color":"#f9564a","image":"products/p2-1.jpeg"},
     {"name":"Terracota","color":"#e07856","image":"products/p2-2.jpeg"}]',
   now() - interval '1 minute'),

  ('Gloss Bomb Cream', 'Fenty Beauty', 459, c_labios, 'bestseller',
   'El gloss cremoso de Rihanna: color intenso, cero pegajoso y con efecto labios XL.',
   array['products/p3.jpeg'],
   '[{"name":"Mauve Wive$","color":"#a96e5b","image":"products/p3.jpeg"}]',
   now() - interval '2 minutes'),

  ('Cream Contour Palette', 'e.l.f.', 269, c_rostro, null,
   'Paleta cremosa con 4 tonos para contornear, corregir e iluminar. Se funde con la piel sin marcar líneas.',
   array['products/p4.jpeg'],
   '[]',
   now() - interval '3 minutes'),

  ('SuperStay Matte Ink', 'Maybelline', 215, c_labios, 'bestseller',
   'Labial líquido mate que aguanta hasta 16 horas: café, besos y tacos sin retocar.',
   array['products/p5.jpeg', 'products/p6.jpeg', 'products/p7.jpeg'],
   '[{"name":"70 Amazonian","color":"#a6543c","image":"products/p5.jpeg"},
     {"name":"20 Pioneer","color":"#b5121b","image":"products/p6.jpeg"},
     {"name":"15 Lover","color":"#c56d7e","image":"products/p7.jpeg"}]',
   now() - interval '4 minutes'),

  ('Lip Oil Plumping', 'e.l.f.', 199, c_labios, 'nuevo',
   'Aceite labial con efecto plump: brillo espejo, sensación tingly y labios más jugosos al instante.',
   array['products/p8.jpeg'],
   '[{"name":"Burst Bubble","color":"#ef7fa0","image":"products/p8.jpeg"}]',
   now() - interval '5 minutes'),

  ('Glow Reviver Lip Oil', 'e.l.f.', 189, c_labios, 'nuevo',
   'El lip oil viral que reacciona con el pH de tus labios. Brillo intenso e hidratación real.',
   array['products/p9.jpeg'],
   '[{"name":"Red Delicious","color":"#e02133","image":"products/p9.jpeg"}]',
   now() - interval '6 minutes');
end;
$$;
