const CONTEO_URL = "data/conteo.json";
const DIVISIONES_URL = "data/divisiones.json";

/**
 * @returns {Promise<{ conteo: unknown; divisiones: unknown }>}
 */
export async function loadDashboardData() {
  const [conteoRes, divisionesRes] = await Promise.all([
    fetch(CONTEO_URL, { cache: "no-store" }),
    fetch(DIVISIONES_URL, { cache: "no-store" }),
  ]);

  if (!conteoRes.ok) {
    throw new Error(`No se pudo cargar conteo (${conteoRes.status})`);
  }
  if (!divisionesRes.ok) {
    throw new Error(`No se pudo cargar divisiones (${divisionesRes.status})`);
  }

  const [conteo, divisiones] = await Promise.all([
    conteoRes.json(),
    divisionesRes.json(),
  ]);

  return { conteo, divisiones };
}
