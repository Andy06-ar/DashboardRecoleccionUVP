const intl = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const intlDecimal = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * @param {number} n
 * @param {{ maxDecimals?: number }} [opts]
 */
export function formatNumber(n, opts = {}) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  if (opts.maxDecimals === 1) return intlDecimal.format(n);
  return intl.format(n);
}

/**
 * @param {number} kg
 * @param {number} metaKg
 */
export function pctTowardMeta(kg, metaKg) {
  if (metaKg <= 0) return 0;
  return Math.min(100, Math.max(0, (kg / metaKg) * 100));
}

/**
 * @param {unknown} raw
 * @returns {{
 *   titulo: string;
 *   actualizado: string;
 *   metaUniversidadKg: number;
 *   metaUniversidadEtiqueta: string;
 *   kpis: Array<Record<string, unknown>>;
 * }}
 */
export function normalizeConteo(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const kpis = Array.isArray(o.kpis) ? o.kpis : [];
  const metaU =
    typeof o.metaUniversidadKg === "number" && !Number.isNaN(o.metaUniversidadKg)
      ? o.metaUniversidadKg
      : 0;
  return {
    titulo: typeof o.titulo === "string" ? o.titulo : "Resumen",
    actualizado: typeof o.actualizado === "string" ? o.actualizado : "",
    metaUniversidadKg: metaU,
    metaUniversidadEtiqueta:
      typeof o.metaUniversidadEtiqueta === "string"
        ? o.metaUniversidadEtiqueta
        : "Meta total del campus",
    kpis,
  };
}

/**
 * @param {{ kpis: Array<Record<string, unknown>> }} conteo
 * @returns {number | null}
 */
export function getKpiKgTotal(conteo) {
  const k = conteo.kpis.find((x) => x && x.id === "kg_total");
  if (k && typeof k.valor === "number" && !Number.isNaN(k.valor)) return k.valor;
  return null;
}

/**
 * @param {unknown} raw
 * @returns {{ titulo: string; items: Array<Record<string, unknown>> }}
 */
export function normalizeDivisiones(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const items = Array.isArray(o.items) ? o.items : [];
  return {
    titulo: typeof o.titulo === "string" ? o.titulo : "Divisiones",
    items,
  };
}

/**
 * @param {Array<Record<string, unknown>>} items
 */
export function sortDivisionesByKg(items) {
  return [...items].sort((a, b) => {
    const ka = typeof a.kg === "number" ? a.kg : 0;
    const kb = typeof b.kg === "number" ? b.kg : 0;
    return kb - ka;
  });
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string} slug
 * @returns {Record<string, unknown> | undefined}
 */
export function findCareerBySlug(items, slug) {
  const s = slug.trim().toLowerCase();
  return items.find(
    (row) => typeof row.slug === "string" && row.slug.toLowerCase() === s,
  );
}

/**
 * @param {unknown} conteoRaw
 * @param {unknown} divisionesRaw
 */
export function buildViewModel(conteoRaw, divisionesRaw) {
  const conteo = normalizeConteo(conteoRaw);
  const divisiones = normalizeDivisiones(divisionesRaw);
  const items = sortDivisionesByKg(divisiones.items);
  let kgTotal = getKpiKgTotal(conteo);
  if (kgTotal === null) {
    kgTotal = items.reduce(
      (acc, row) => acc + (typeof row.kg === "number" ? row.kg : 0),
      0,
    );
  }
  const metaU = conteo.metaUniversidadKg;
  const pctCampus =
    metaU > 0 ? Math.min(100, Math.max(0, (kgTotal / metaU) * 100)) : 0;

  return {
    conteo,
    divisiones: {
      ...divisiones,
      items,
    },
    totales: {
      kgRecogidosCampus: kgTotal,
      metaUniversidadKg: metaU,
      pctCampus,
    },
  };
}
