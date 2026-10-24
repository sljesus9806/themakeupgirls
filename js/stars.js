/* ============================================
   Estrellitas de fondo ✦
   Brillan y flotan despacito detrás del contenido
   y de vez en cuando cruza una estrella fugaz.
   Si la persona pidió "reducir movimiento", se quedan quietas.
   ============================================ */

const COLORS = ["#ff8fc4", "#b994ff", "#ffc94d", "#6fd8ad", "#8cc6ff"];
const SPARKLE =
  '<svg viewBox="0 0 24 24"><path d="M12 0c.9 7.3 4.7 11.1 12 12-7.3.9-11.1 4.7-12 12-.9-7.3-4.7-11.1-12-12C7.3 11.1 11.1 7.3 12 0Z"/></svg>';

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function createSky() {
  const sky = document.createElement("div");
  sky.className = "sky";
  sky.setAttribute("aria-hidden", "true");

  // En celular el texto ocupa casi todo el ancho: los destellos se quedan en las orillas
  const narrow = innerWidth < 640;
  const count = narrow ? 16 : 30;
  for (let i = 0; i < count; i++) {
    const star = document.createElement("span");
    const isDot = Math.random() < 0.4; // algunas son puntitos de luz, otras destellos ✦
    star.className = isDot ? "star star--dot" : "star";
    if (!isDot) star.innerHTML = SPARKLE;
    const props = {
      "--size": `${isDot ? rand(3, 7) : narrow ? rand(8, 14) : rand(10, 20)}px`,
      "--color": pick(COLORS),
      "--dx": `${narrow ? rand(-12, 12) : rand(-40, 40)}px`,
      "--dy": `${rand(-70, -20)}px`,
      "--drift": `${rand(18, 40)}s`,
      "--twinkle": `${rand(2.8, 6.5)}s`,
      "--delay": `-${rand(0, 40)}s`, // negativo: cada una arranca en un punto distinto
      "--peak": rand(0.6, 0.95).toFixed(2),
    };
    const x = narrow && !isDot ? (Math.random() < 0.5 ? rand(0, 10) : rand(90, 100)) : rand(0, 100);
    star.style.left = `${x}%`;
    star.style.top = `${rand(0, 100)}%`;
    Object.entries(props).forEach(([k, v]) => star.style.setProperty(k, v));
    sky.append(star);
  }

  document.body.prepend(sky);
  return sky;
}

function shootingStar(sky) {
  const s = document.createElement("span");
  s.className = "shooting-star";
  s.style.left = `${rand(35, 95)}%`;
  s.style.top = `${rand(4, 40)}%`;
  s.style.setProperty("--color", pick(COLORS));
  s.addEventListener("animationend", () => s.remove());
  sky.append(s);
}

function scheduleShootingStars(sky) {
  setTimeout(() => {
    if (!document.hidden) shootingStar(sky);
    scheduleShootingStars(sky);
  }, rand(9000, 20000));
}

const sky = createSky();
if (!reduceMotion) scheduleShootingStars(sky);
