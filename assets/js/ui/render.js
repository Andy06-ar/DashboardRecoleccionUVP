import {
  formatNumber,
  findCareerBySlug,
  pctTowardMeta,
} from "../utils/calcs.js";

const CAREER_THEMES = ["violet", "coral", "ocean", "sun", "mint", "rose"];

/**
 * @param {unknown} t
 */
function careerThemeClass(t) {
  const s = typeof t === "string" ? t.toLowerCase().trim() : "";
  return CAREER_THEMES.includes(s) ? s : "violet";
}

/**
 * @param {string} text
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * @param {HTMLElement | null} el
 * @param {string} isoDate
 */
function setHeaderUpdated(el, isoDate) {
  if (!el) return;
  if (!isoDate) {
    el.textContent = "";
    el.removeAttribute("datetime");
    return;
  }
  el.setAttribute("datetime", isoDate);
  try {
    const d = new Date(isoDate + (isoDate.length === 10 ? "T12:00:00" : ""));
    const fmt = new Intl.DateTimeFormat("es-MX", {
      dateStyle: "long",
    });
    el.textContent = `Actualizado: ${fmt.format(d)}`;
  } catch {
    el.textContent = `Actualizado: ${isoDate}`;
  }
}

/**
 * @returns {{ type: 'home' } | { type: 'career'; slug: string }}
 */
export function parseRoute() {
  const raw = (window.location.hash || "").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "carrera" && parts[1]) {
    return { type: "career", slug: decodeURIComponent(parts[1]).toLowerCase() };
  }
  return { type: "home" };
}

/**
 * @param {string} slug
 */
export function careerHash(slug) {
  return `#/carrera/${encodeURIComponent(slug)}`;
}

/**
 * @param {number} pct
 */
function pct1(pct) {
  return formatNumber(Math.round(pct * 10) / 10, { maxDecimals: 1 });
}

/**
 * @param {string} gradId
 * @param {number} pctDisplay
 * @param {string} extraClass
 */
function renderProgressRing(gradId, pctDisplay, extraClass = "") {
  const r = 86;
  const c = 2 * Math.PI * r;
  return `
    <div class="progress-ring ${extraClass}" role="img" aria-hidden="true">
      <svg class="progress-ring__svg" viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7b2cbf" />
            <stop offset="50%" stop-color="#ef476f" />
            <stop offset="100%" stop-color="#ff8c00" />
          </linearGradient>
        </defs>
        <circle class="progress-ring__track" cx="100" cy="100" r="${r}" />
        <circle
          class="progress-ring__fg"
          data-ring-animate="1"
          data-target-pct="${pctDisplay}"
          transform="rotate(-90 100 100)"
          cx="100"
          cy="100"
          r="${r}"
          stroke="url(#${gradId})"
          stroke-dasharray="${c}"
          stroke-dashoffset="${c}"
        />
      </svg>
      <div class="progress-ring__shine" aria-hidden="true"></div>
    </div>
  `;
}

/**
 * @param {Record<string, unknown>} row
 * @returns {number | null}
 */
function careerPctValue(row) {
  const kg = typeof row.kg === "number" ? row.kg : null;
  const metaKg = typeof row.metaKg === "number" ? row.metaKg : null;
  const pctKnown =
    typeof row.cumplimientoPct === "number" ? row.cumplimientoPct : null;
  if (kg !== null && metaKg !== null && metaKg > 0) {
    return pctTowardMeta(kg, metaKg);
  }
  if (typeof pctKnown === "number") {
    return Math.min(100, Math.max(0, pctKnown));
  }
  return null;
}

/**
 * @param {{
 *   kg: number;
 *   meta: number;
 *   pct: number;
 *   etiquetaMeta: string;
 *   gradId: string;
 * }} opts
 */
function renderCampusProgressCard(opts) {
  const faltan = Math.max(0, opts.meta - opts.kg);
  const pct = Math.min(100, Math.max(0, opts.pct));
  const gradId = opts.gradId;
  return `
    <section id="progreso" class="dashboard-section campus-progress" aria-labelledby="${gradId}-title">
      <article class="panel-card campus-progress__card">
        <header class="campus-progress__head">
          <h2 id="${gradId}-title" class="campus-progress__title">Progreso de la universidad</h2>
          <p class="campus-progress__subtitle">(suma de todas las carreras)</p>
        </header>
        <p class="campus-progress__motivation">Todos los kilos sumados frente a la meta total del campus. ¡Sigue subiendo la barra!</p>
        <div class="campus-progress__body">
          <div class="campus-progress__chart">
            ${renderProgressRing(gradId, pct, "progress-ring--campus")}
            <div class="campus-progress__ring-center" aria-hidden="true">
              <span class="campus-progress__ring-kg" data-count-up="${opts.kg}">${formatNumber(opts.kg)} kg</span>
            </div>
          </div>
          <div class="campus-progress__aside">
            <div class="campus-progress__stat-box">
              <span class="campus-progress__stat-label">${escapeHtml(opts.etiquetaMeta)}</span>
              <span class="campus-progress__stat-value">${formatNumber(opts.meta)} kg</span>
            </div>
            <div class="campus-progress__stat-box campus-progress__stat-box--warn">
              <span class="campus-progress__stat-label">Faltan</span>
              <span class="campus-progress__stat-value">${formatNumber(faltan)} kg</span>
            </div>
            <div class="campus-progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Progreso ${pct1(pct)} por ciento">
              <div class="campus-progress__bar-fill" data-bar-fill style="--target-width: ${pct}%"></div>
            </div>
            <p class="campus-progress__pct" aria-label="Porcentaje de avance">${pct1(pct)}%</p>
          </div>
        </div>
      </article>
    </section>
  `;
}

/**
 * @param {Record<string, unknown>} row
 */
function renderFeaturedCareer(row) {
  const nombre = typeof row.nombre === "string" ? row.nombre : "—";
  const slug = typeof row.slug === "string" ? row.slug : "";
  const emoji = typeof row.emoji === "string" ? row.emoji : "🎓";
  const pct = careerPctValue(row);
  const pctClamped = pct !== null ? Math.min(100, Math.max(0, pct)) : 0;
  const href = slug ? careerHash(slug) : "#";
  const pctLabel = pct !== null ? `${pct1(pct)}%` : "—";

  return `
    <li class="featured-career">
      <div class="featured-career__head">
        <span class="featured-career__emoji" aria-hidden="true">${escapeHtml(emoji)}</span>
        <span class="featured-career__name">${escapeHtml(nombre)}</span>
        <span class="featured-career__pct">${pctLabel}</span>
      </div>
      <div class="featured-career__meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pctClamped)}" aria-label="Avance ${pctLabel}">
        <div class="featured-career__meter-fill" data-bar-fill style="--target-width: ${pctClamped}%"></div>
      </div>
      ${slug ? `<a class="btn-ghost btn-ghost--sm" href="${href}">Ver detalle</a>` : ""}
    </li>
  `;
}

/**
 * @param {number | null} brigadas
 * @param {number} carrerasCount
 */
function renderCommunityBlock(brigadas, carrerasCount) {
  const brigadasTxt =
    brigadas !== null ? formatNumber(brigadas) : "—";
  return `
    <section id="comunidad" class="dashboard-section community-block" aria-labelledby="community-heading">
      <div class="section-intro section-intro--inline">
        <h2 id="community-heading" class="section-heading">Brigadas y comunidad</h2>
        <p class="section-intro__sub section-intro__sub--inline">Salidas solidarias que conectan al campus con quien más lo necesita.</p>
      </div>
      <article class="panel-card community-block__card">
        <div class="community-block__layout">
          <div class="community-block__metric">
            <span class="community-block__icon" aria-hidden="true">🚚</span>
            <p class="community-block__label">Brigadas y salidas solidarias</p>
            <p class="community-block__value community-block__value--pulse" data-count-up="${brigadas ?? 0}" data-count-suffix="">${brigadasTxt}</p>
          </div>
          <div class="community-block__metric">
            <span class="community-block__icon" aria-hidden="true">🎓</span>
            <p class="community-block__label">Carreras en movimiento</p>
            <p class="community-block__value">${formatNumber(carrerasCount)}</p>
          </div>
        </div>
      </article>
    </section>
  `;
}

/**
 * @param {{
 *   kg: number;
 *   meta: number;
 *   pct: number;
 *   etiquetaMeta: string;
 *   gradId: string;
 *   headline: string;
 *   subline?: string;
 * }} opts
 */
function renderProgressHero(opts) {
  const faltan = Math.max(0, opts.meta - opts.kg);
  const gradId = opts.gradId;
  const pct = Math.min(100, Math.max(0, opts.pct));
  return `
    <div class="progress-hero progress-hero--animated" aria-labelledby="${gradId}-title">
      <div class="progress-hero__glow" aria-hidden="true"></div>
      <div class="progress-hero__layout">
        <div class="progress-hero__chart">
          ${renderProgressRing(gradId, pct, "progress-ring--xl")}
          <div class="progress-hero__badge" aria-hidden="true">
            <span class="progress-hero__pulse"></span>
          </div>
        </div>
        <div class="progress-hero__copy">
          <p id="${gradId}-title" class="progress-hero__title">${escapeHtml(opts.headline)}</p>
          ${opts.subline ? `<p class="progress-hero__sub">${escapeHtml(opts.subline)}</p>` : ""}
          <div class="progress-hero__stats">
            <div class="progress-hero__stat">
              <span class="progress-hero__stat-label">Recolectado</span>
              <span class="progress-hero__stat-value" data-count-up="${opts.kg}">${formatNumber(opts.kg)} kg</span>
            </div>
            <div class="progress-hero__stat">
              <span class="progress-hero__stat-label">${escapeHtml(opts.etiquetaMeta)}</span>
              <span class="progress-hero__stat-value">${formatNumber(opts.meta)} kg</span>
            </div>
            <div class="progress-hero__stat progress-hero__stat--accent">
              <span class="progress-hero__stat-label">Porcentaje</span>
              <span class="progress-hero__stat-value progress-hero__pct">${pct1(pct)}%</span>
            </div>
            <div class="progress-hero__stat">
              <span class="progress-hero__stat-label">Faltan</span>
              <span class="progress-hero__stat-value">${formatNumber(faltan)} kg</span>
            </div>
          </div>
          <div class="progress-hero__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Progreso ${pct1(pct)} por ciento">
            <div class="progress-hero__bar-fill" data-bar-fill style="--target-width: ${pct}%"></div>
            <div class="progress-hero__bar-spark" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * @param {HTMLElement} root
 */
export function renderLoading(root) {
  root.innerHTML = `
    <div class="state-panel state-panel--fun" role="status" aria-label="Cargando datos">
      <p class="state-panel__title state-panel__title--pulse">Preparando el campus…</p>
      <p class="state-panel__tag">✨ Kilos, carreras y buena energía en camino</p>
      <div class="skeleton-grid skeleton-grid--fun" style="margin-top: var(--space-8); max-width: 100%;">
        <div class="skeleton-card skeleton-card--a"></div>
        <div class="skeleton-card skeleton-card--b"></div>
        <div class="skeleton-card skeleton-card--c"></div>
        <div class="skeleton-card skeleton-card--d"></div>
      </div>
    </div>
  `;
}

/**
 * @param {HTMLElement} root
 * @param {unknown} err
 */
export function renderError(root, err) {
  root.setAttribute("aria-busy", "false");
  const message = err instanceof Error ? err.message : String(err);
  root.innerHTML = `
    <div class="state-panel state-panel--error" role="alert">
      <p class="state-panel__title">No se pudieron cargar los datos</p>
      <p class="state-panel__text">${escapeHtml(message)}</p>
      <p class="state-panel__text" style="margin-top: var(--space-4);">
        Si abres el archivo directamente desde el disco, el navegador puede bloquear las peticiones.
        Usa un servidor estático local (por ejemplo <code>python -m http.server</code>) desde la carpeta del proyecto.
      </p>
    </div>
  `;
}

/**
 * @param {Record<string, unknown>} kpi
 */
function renderKpiCard(kpi) {
  const etiqueta = typeof kpi.etiqueta === "string" ? kpi.etiqueta : "—";
  const valor = typeof kpi.valor === "number" ? kpi.valor : null;
  const sufijo = typeof kpi.sufijo === "string" ? kpi.sufijo : "";
  const esVariacion = kpi.esVariacion === true;
  const direccion =
    typeof kpi.direccion === "string" ? kpi.direccion : "flat";

  let valueHtml;
  if (valor === null) {
    valueHtml = `<div class="kpi-card__value">—</div>`;
  } else if (esVariacion) {
    const cls =
      direccion === "up"
        ? "kpi-card__trend kpi-card__trend--up"
        : direccion === "down"
          ? "kpi-card__trend kpi-card__trend--down"
          : "kpi-card__trend kpi-card__trend--flat";
    const arrow =
      direccion === "up" ? "▲" : direccion === "down" ? "▼" : "—";
    valueHtml = `
      <div class="kpi-card__value-row">
        <span class="${cls}" aria-label="Variación">${arrow} ${formatNumber(valor, { maxDecimals: 1 })}${escapeHtml(sufijo)}</span>
      </div>`;
  } else {
    valueHtml = `
      <div class="kpi-card__value-row">
        <div class="kpi-card__value">${formatNumber(valor)}</div>
        ${sufijo ? `<span class="kpi-card__suffix">${escapeHtml(sufijo.trim())}</span>` : ""}
      </div>`;
  }

  return `
    <article class="kpi-card kpi-card--pop">
      <p class="kpi-card__label">${escapeHtml(etiqueta)}</p>
      ${valueHtml}
    </article>
  `;
}

/**
 * @param {Record<string, unknown>} row
 */
function renderCareerCard(row) {
  const nombre = typeof row.nombre === "string" ? row.nombre : "—";
  const slug = typeof row.slug === "string" ? row.slug : "";
  const emoji = typeof row.emoji === "string" ? row.emoji : "🎓";
  const lema = typeof row.lema === "string" ? row.lema : "";
  const tema = careerThemeClass(row.tema);
  const kg = typeof row.kg === "number" ? row.kg : null;
  const metaKg = typeof row.metaKg === "number" ? row.metaKg : null;
  const viajes = typeof row.viajes === "number" ? row.viajes : null;
  const pctKnown =
    typeof row.cumplimientoPct === "number" ? row.cumplimientoPct : null;
  const pct =
    kg !== null && metaKg !== null && metaKg > 0
      ? pctTowardMeta(kg, metaKg)
      : pctKnown !== null
        ? Math.min(100, Math.max(0, pctKnown))
        : null;
  const pctClamped = pct !== null ? Math.min(100, Math.max(0, pct)) : 0;
  const href = slug ? careerHash(slug) : "#";

  const inner = `
    <article class="career-card career-card--${tema}">
      <div class="career-card__visual" aria-hidden="true">
        <span class="career-card__blob"></span>
        <span class="career-card__emoji">${escapeHtml(emoji)}</span>
      </div>
      <div class="career-card__body">
        <h3 class="career-card__title">${escapeHtml(nombre)}</h3>
        ${lema ? `<p class="career-card__lema">${escapeHtml(lema)}</p>` : ""}
        <div class="career-card__stats">
          <div class="career-card__stat">
            <span class="career-card__stat-label">Kilos</span>
            <span class="career-card__stat-value">${kg !== null ? formatNumber(kg) : "—"}</span>
          </div>
          <div class="career-card__stat">
            <span class="career-card__stat-label">Meta</span>
            <span class="career-card__stat-value">${metaKg !== null ? formatNumber(metaKg) : "—"}</span>
          </div>
          <div class="career-card__stat">
            <span class="career-card__stat-label">Brigadas</span>
            <span class="career-card__stat-value">${viajes !== null ? formatNumber(viajes) : "—"}</span>
          </div>
          <div class="career-card__stat career-card__stat--wide">
            <span class="career-card__stat-label">Avance</span>
            <span class="career-card__stat-value">${pct !== null ? `${pct1(pct)}%` : "—"}</span>
          </div>
        </div>
        ${
          pct !== null
            ? `<div class="career-card__meter">
          <div class="career-card__meter-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pctClamped)}" aria-label="Progreso ${Math.round(pctClamped)} por ciento">
            <div class="career-card__meter-fill" data-bar-fill style="--target-width: ${pctClamped}%"></div>
          </div>
        </div>`
            : ""
        }
        <span class="career-card__cta">Ver detalle →</span>
      </div>
    </article>
  `;

  return slug
    ? `<a class="career-card-link" href="${href}">${inner}</a>`
    : `<div class="career-card-link career-card-link--static">${inner}</div>`;
}

/**
 * @param {Record<string, unknown>} row
 */
function renderCareerRow(row) {
  const nombre = typeof row.nombre === "string" ? row.nombre : "—";
  const slug = typeof row.slug === "string" ? row.slug : "";
  const emoji = typeof row.emoji === "string" ? row.emoji : "🎓";
  const kg = typeof row.kg === "number" ? row.kg : null;
  const metaKg = typeof row.metaKg === "number" ? row.metaKg : null;
  const viajes = typeof row.viajes === "number" ? row.viajes : null;
  const pctKnown =
    typeof row.cumplimientoPct === "number" ? row.cumplimientoPct : null;
  const pct =
    kg !== null && metaKg !== null && metaKg > 0
      ? pctTowardMeta(kg, metaKg)
      : pctKnown;
  const tema = careerThemeClass(row.tema);
  const href = slug ? careerHash(slug) : "#";
  const pctStr = typeof pct === "number" ? `${pct1(pct)}%` : "—";

  return `<tr class="career-table__row career-table__row--${tema}">
    <td class="career-table__cell career-table__cell--name">
      <span class="career-table__emoji" aria-hidden="true">${escapeHtml(emoji)}</span>
      <a class="career-table__link" href="${href}"><strong>${escapeHtml(nombre)}</strong></a>
    </td>
    <td>${kg !== null ? formatNumber(kg) : "—"}</td>
    <td>${metaKg !== null ? formatNumber(metaKg) : "—"}</td>
    <td>${viajes !== null ? formatNumber(viajes) : "—"}</td>
    <td>${pctStr}</td>
    <td class="career-table__cell--action"><a class="btn-ghost" href="${href}">Detalle</a></td>
  </tr>`;
}

/**
 * @param {HTMLElement} root
 * @param {*} vm
 */
export function renderDashboard(root, vm) {
  const headerEl = document.getElementById("header-updated");
  setHeaderUpdated(headerEl, vm.conteo.actualizado);

  const quickKpis = vm.conteo.kpis.filter((k) => k && k.id !== "kg_total");
  const kpisHtml = quickKpis.map(renderKpiCard).join("");
  const cardsHtml = vm.divisiones.items.map(renderCareerCard).join("");
  const rowsHtml = vm.divisiones.items.map(renderCareerRow).join("");

  const viajesKpi = vm.conteo.kpis.find((k) => k && k.id === "viajes");
  const brigadas =
    viajesKpi && typeof viajesKpi.valor === "number" ? viajesKpi.valor : null;

  const topCareers = [...vm.divisiones.items]
    .sort((a, b) => (careerPctValue(b) ?? 0) - (careerPctValue(a) ?? 0))
    .slice(0, 4);
  const featuredHtml = topCareers.map(renderFeaturedCareer).join("");

  const kg = vm.totales.kgRecogidosCampus;
  const meta = vm.totales.metaUniversidadKg;
  const pctCampus = vm.totales.pctCampus;
  const metaLabel = vm.conteo.metaUniversidadEtiqueta;

  const progressHtml =
    meta > 0
      ? renderCampusProgressCard({
          kg,
          meta,
          pct: pctCampus,
          etiquetaMeta: metaLabel,
          gradId: "gradCampus",
        })
      : "";

  root.innerHTML = `
    <div class="dashboard-top">
    ${progressHtml}
      <section id="destacadas" class="dashboard-section featured-panel" aria-labelledby="featured-heading">
        <article class="panel-card featured-panel__card">
          <header class="featured-panel__head">
            <div>
              <h2 id="featured-heading" class="featured-panel__title">Destacadas — avance de carrera</h2>
              <p class="featured-panel__sub">Las carreras que más impulso llevan este periodo.</p>
            </div>
            <span class="featured-panel__badge">Top ${topCareers.length}</span>
          </header>
          <ol class="featured-list">${featuredHtml}</ol>
          <a class="btn-ghost btn-ghost--wide" href="#carreras">Ver detalle de todas las carreras</a>
        </article>
      </section>
    </div>
    <section id="indicadores" class="dashboard-section dashboard-section--indicators" aria-labelledby="indicators-heading">
      <h2 id="indicators-heading" class="section-heading section-heading--sm">Indicadores rápidos</h2>
      <div class="kpi-grid kpi-grid--quick">${kpisHtml}</div>
    </section>
    ${renderCommunityBlock(brigadas, vm.divisiones.items.length)}
    <section id="carreras" class="dashboard-section dashboard-section--careers" aria-labelledby="div-heading">
      <div class="section-intro section-intro--inline">
        <h2 id="div-heading" class="section-heading section-heading--gradient section-heading--lg">${escapeHtml(vm.divisiones.titulo)}</h2>
        <p class="section-intro__sub section-intro__sub--inline">Cada carrera es un equipo con su propia personalidad.</p>
      </div>
      <div class="career-table-wrap career-table-only-desktop" role="region" aria-label="Tabla por carrera">
        <table class="career-table">
          <thead>
            <tr>
              <th scope="col">Carrera</th>
              <th scope="col">Kg recogidos</th>
              <th scope="col">Meta kg</th>
              <th scope="col">Brigadas</th>
              <th scope="col">Avance</th>
              <th scope="col"><span class="visually-hidden">Acción</span></th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      <div class="career-grid career-cards-only-mobile">
        ${cardsHtml}
      </div>
    </section>
  `;

  root.setAttribute("aria-busy", "false");
}

/**
 * @param {*} vm
 * @param {number} kgCarrera
 */
function campusShareHtml(vm, kgCarrera) {
  const total = vm?.totales?.kgRecogidosCampus;
  const metaG = vm?.totales?.metaUniversidadKg;
  if (typeof total !== "number" || total <= 0) {
    return "Aún no hay un total de campus calculado para comparar.";
  }
  const share = (kgCarrera / total) * 100;
  const metaTxt =
    typeof metaG === "number" && metaG > 0
      ? ` La meta global del campus es <strong>${formatNumber(metaG)} kg</strong>.`
      : "";
  return `Esta carrera aporta el <strong>${pct1(share)}%</strong> del total recolectado en la universidad (<strong>${formatNumber(total)} kg</strong> sumando todas las carreras).${metaTxt}`;
}

/**
 * @param {HTMLElement} root
 * @param {*} vm
 * @param {string} slug
 */
export function renderCareerDetail(root, vm, slug) {
  const headerEl = document.getElementById("header-updated");
  setHeaderUpdated(headerEl, vm.conteo.actualizado);

  const row = findCareerBySlug(vm.divisiones.items, slug);
  if (!row) {
    root.innerHTML = `
      <nav class="app-nav" aria-label="Migas de pan">
        <a class="app-nav__link" href="#">← Inicio</a>
      </nav>
      <div class="state-panel state-panel--fun" role="alert">
        <p class="state-panel__title">Carrera no encontrada</p>
        <p class="state-panel__text">No hay datos para “${escapeHtml(slug)}”.</p>
        <p class="state-panel__text" style="margin-top: var(--space-4);"><a class="btn-ghost btn-ghost--inline" href="#">Volver al inicio</a></p>
      </div>
    `;
    root.setAttribute("aria-busy", "false");
    return;
  }

  const nombre = typeof row.nombre === "string" ? row.nombre : "—";
  const emoji = typeof row.emoji === "string" ? row.emoji : "🎓";
  const lema = typeof row.lema === "string" ? row.lema : "";
  const tema = careerThemeClass(row.tema);
  const kg = typeof row.kg === "number" ? row.kg : 0;
  const metaKg = typeof row.metaKg === "number" ? row.metaKg : 0;
  const viajes = typeof row.viajes === "number" ? row.viajes : 0;
  const pct = metaKg > 0 ? pctTowardMeta(kg, metaKg) : 0;
  const gradId = `gradCareer-${tema}`;

  const progressHtml = renderProgressHero({
    kg,
    meta: metaKg > 0 ? metaKg : kg,
    pct: metaKg > 0 ? pct : 100,
    etiquetaMeta: "Meta de la carrera",
    gradId,
    headline: nombre,
    subline: lema || "Detalle de recolección y meta de esta carrera.",
  });

  root.innerHTML = `
    <nav class="app-nav" aria-label="Migas de pan">
      <a class="app-nav__link" href="#">← Inicio</a>
      <span class="app-nav__sep" aria-hidden="true">/</span>
      <span class="app-nav__current">${escapeHtml(nombre)}</span>
    </nav>
    <header class="career-detail-head career-detail-head--${tema}">
      <span class="career-detail-head__emoji" aria-hidden="true">${escapeHtml(emoji)}</span>
      <div>
        <p class="career-detail-head__eyebrow">Vista detallada</p>
        <h1 class="career-detail-head__title">${escapeHtml(nombre)}</h1>
      </div>
    </header>
    ${progressHtml}
    <section class="career-detail-grid" aria-labelledby="career-stats-title">
      <h2 id="career-stats-title" class="visually-hidden">Resumen numérico</h2>
      <article class="detail-tile detail-tile--pop">
        <h3 class="detail-tile__label">Kilos recolectados</h3>
        <p class="detail-tile__value">${formatNumber(kg)} <span class="detail-tile__unit">kg</span></p>
      </article>
      <article class="detail-tile detail-tile--pop">
        <h3 class="detail-tile__label">Meta de la carrera</h3>
        <p class="detail-tile__value">${formatNumber(metaKg)} <span class="detail-tile__unit">kg</span></p>
      </article>
      <article class="detail-tile detail-tile--pop">
        <h3 class="detail-tile__label">Brigadas registradas</h3>
        <p class="detail-tile__value">${formatNumber(viajes)}</p>
      </article>
      <article class="detail-tile detail-tile--pop detail-tile--wide">
        <h3 class="detail-tile__label">Comparado con el campus</h3>
        <p class="detail-tile__text">${campusShareHtml(vm, kg)}</p>
      </article>
    </section>
  `;

  root.setAttribute("aria-busy", "false");
}

/**
 * @param {HTMLElement} root
 */
export function mountProgressAnimations(root) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.querySelectorAll("[data-ring-animate]").forEach((el) => {
    if (!(el instanceof SVGElement)) return;
    const pct = Math.min(
      100,
      Math.max(0, parseFloat(el.getAttribute("data-target-pct") || "0")),
    );
    const r = parseFloat(el.getAttribute("r") || "86");
    const c = 2 * Math.PI * r;
    el.style.strokeDasharray = String(c);
    el.style.strokeDashoffset = String(c);
    if (reduce) {
      el.style.strokeDashoffset = String(c * (1 - pct / 100));
      return;
    }
    requestAnimationFrame(() => {
      el.style.transition =
        "stroke-dashoffset 2s cubic-bezier(0.22, 1, 0.36, 1)";
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = String(c * (1 - pct / 100));
      });
    });
  });

  root.querySelectorAll("[data-bar-fill]").forEach((bar) => {
    if (!(bar instanceof HTMLElement)) return;
    const w = bar.style.getPropertyValue("--target-width") || "0%";
    bar.style.width = "0%";
    if (reduce) {
      bar.style.width = w;
      return;
    }
    requestAnimationFrame(() => {
      bar.style.transition = "width 2s cubic-bezier(0.22, 1, 0.36, 1)";
      requestAnimationFrame(() => {
        bar.style.width = w;
      });
    });
  });

  root.querySelectorAll("[data-count-up]").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const target = parseInt(el.getAttribute("data-count-up") || "0", 10);
    if (reduce || Number.isNaN(target)) return;
    const suffix = el.getAttribute("data-count-suffix");
    const unit = suffix === null ? " kg" : suffix;
    const duration = 1400;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - p) ** 3;
      const val = Math.round(target * eased);
      el.textContent = `${formatNumber(val)}${unit}`;
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = `${formatNumber(0)}${unit}`;
    requestAnimationFrame(step);
  });
}
