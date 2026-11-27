const toggle = document.querySelector(".theme-toggle");
function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  toggle.setAttribute("aria-pressed", String(dark));
  toggle.setAttribute(
    "aria-label",
    `Switch to ${dark ? "light" : "dark"} theme`,
  );
}
syncThemeButton();
toggle.addEventListener("click", () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("portfolio-theme", theme);
  } catch {}
  syncThemeButton();
});
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const emerging = new Set();
const revealProgress = new WeakMap();
let frame = 0;
let lastFrameTime = 0;
function finishReveal(el) {
  revealProgress.set(el, 1);
  el.classList.remove("is-emerging");
  el.style.removeProperty("--reveal-opacity");
  el.style.removeProperty("--reveal-offset");
  el.style.removeProperty("--reveal-scale");
  el.style.removeProperty("--reveal-tilt");
  el.style.removeProperty("--reveal-progress");
}
function layoutTop(el) {
  let top = 0;
  for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
  return top - window.scrollY;
}
function updateReveals(now = performance.now()) {
  frame = 0;
  const elapsed = lastFrameTime ? Math.min(now - lastFrameTime, 48) : 16;
  lastFrameTime = now;
  if (motion.matches) {
    emerging.forEach(finishReveal);
    return;
  }
  const height = window.innerHeight;
  // Follow the scroll target over time, so a quick scroll still has a visible
  // settling animation (roughly 1.5 seconds for a full reveal).
  const blend = 1 - Math.exp(-elapsed / 280);
  let settling = false;
  // Measure layout rather than the transformed box, so the animation cannot
  // feed back into its own scroll position as cards tilt and scale.
  const positions = [...emerging].map((el) => ({
    el,
    top: layoutTop(el),
  }));
  for (const { el, top } of positions) {
    const siblings = el.parentElement.matches(".cards, .essays");
    const stagger =
      siblings && window.innerWidth > 680
        ? Array.from(el.parentElement.children).indexOf(el) * 0.035
        : 0;
    const target = Math.max(
      0,
      Math.min(1, (height * (0.96 - stagger) - top) / (height * 0.3)),
    );
    if (el.contains(document.activeElement)) {
      finishReveal(el);
      continue;
    }
    const previous = revealProgress.get(el) ?? target;
    let progress = previous + (target - previous) * blend;
    if (Math.abs(target - progress) < 0.004) progress = target;
    else settling = true;
    revealProgress.set(el, progress);
    if (progress === 1) {
      finishReveal(el);
      continue;
    }
    el.classList.add("is-emerging");
    const eased = 1 - Math.pow(1 - progress, 2);
    el.style.setProperty("--reveal-opacity", String(progress));
    el.style.setProperty("--reveal-offset", `${(1 - eased) * 72}px`);
    el.style.setProperty("--reveal-scale", String(0.94 + eased * 0.06));
    el.style.setProperty("--reveal-tilt", `${(1 - eased) * 7}deg`);
    el.style.setProperty("--reveal-progress", String(progress));
  }
  if (settling) scheduleReveal();
}
function scheduleReveal() {
  if (!frame && emerging.size) frame = requestAnimationFrame(updateReveals);
}
// About Me stays fully readable, including with its history collapsed.
// Keep tracking work cards after entry so scrolling upward reverses the effect.
document.querySelectorAll(".work .reveal").forEach((el) => {
  el.querySelectorAll(".bars i, .letters i, .squares i").forEach(
    (piece, index) => {
      piece.style.setProperty("--piece-index", String(index % 7));
    },
  );
  emerging.add(el);
});
updateReveals();
window.addEventListener("scroll", scheduleReveal, { passive: true });
window.addEventListener("resize", scheduleReveal);
document.addEventListener("focusin", (event) => {
  const el = event.target.closest(".is-emerging");
  if (el) finishReveal(el);
});
document.addEventListener("focusout", scheduleReveal);
motion.addEventListener("change", () => {
  scheduleReveal();
});
