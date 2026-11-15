import type { Catalog, ExamType } from "../types/catalog";
const catalogs = new Map<ExamType, Promise<Catalog>>();
export function seedCatalog(type: ExamType, catalog: Catalog) {
  catalogs.set(type, Promise.resolve(catalog));
}
export function loadCatalog(type: ExamType): Promise<Catalog> {
  const cached = catalogs.get(type);
  if (cached) return cached;
  const request = fetch(`/data/${type}/catalog.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      return response.json() as Promise<Catalog>;
    })
    .catch((error) => {
      catalogs.delete(type);
      throw error;
    });
  catalogs.set(type, request);
  return request;
}
