import { loadDashboardData } from "./services/dataService.js";
import { buildViewModel } from "./utils/calcs.js";
import {
  parseRoute,
  renderDashboard,
  renderCareerDetail,
  renderError,
  renderLoading,
  mountProgressAnimations,
} from "./ui/render.js";

/** @type {ReturnType<typeof buildViewModel> | null} */
let viewModel = null;

/**
 * @param {HTMLElement} app
 */
function paint(app) {
  if (!viewModel) return;
  const route = parseRoute();
  if (route.type === "career") {
    renderCareerDetail(app, viewModel, route.slug);
  } else {
    renderDashboard(app, viewModel);
  }
  mountProgressAnimations(app);
}

/**
 * @param {HTMLElement} app
 */
function bindNav(app) {
  app.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const a = t.closest("a[href^='#']");
    if (!a || !(a instanceof HTMLAnchorElement)) return;
    if (a.getAttribute("href")?.startsWith("#/")) return;
    if (a.getAttribute("href") === "#") {
      e.preventDefault();
      if (window.location.hash) {
        history.pushState(null, "", window.location.pathname + window.location.search);
      }
      paint(app);
    }
  });
}

async function main() {
  const app = document.getElementById("app");
  if (!app) return;

  app.setAttribute("aria-busy", "true");
  renderLoading(app);

  try {
    const data = await loadDashboardData();
    viewModel = buildViewModel(data.conteo, data.divisiones);
    paint(app);
    bindNav(app);
    window.addEventListener("hashchange", () => paint(app));
    window.addEventListener("popstate", () => paint(app));
  } catch (err) {
    renderError(app, err);
  }
}

main();
