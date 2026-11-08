import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
});
try {
  const {
    catalogPath,
    examPath,
    taskPath,
    parseCatalogPath,
    legacyDestination,
  } = await server.ssrLoadModule("/src/lib/routes.ts");
  for (const type of ["inf03", "inf04"]) {
    assert.equal(catalogPath(type), `/${type}/`);
    assert.deepEqual(parseCatalogPath(examPath(type, "exam-1")), {
      examType: type,
      examId: "exam-1",
      taskId: null,
    });
    assert.deepEqual(parseCatalogPath(taskPath(type, "task-1")), {
      examType: type,
      examId: null,
      taskId: "task-1",
    });
  }
  const legacy = (path) =>
    legacyDestination(new URL(path, "https://example.com"));
  assert.equal(legacy("/"), null);
  assert.equal(legacy("/?utm_source=school"), null);
  assert.equal(legacy("/?type=inf03"), "/inf03/");
  assert.equal(
    legacy("/?type=inf04&exam=sheet&task=part&q=C%2B%2B&year=2024#pdf"),
    "/inf04/zadania/part/?q=C%2B%2B&year=2024#pdf",
  );
  assert.equal(
    legacy("/?exam=inf03-sheet&mode=exams"),
    "/inf03/arkusze/inf03-sheet/?mode=exams",
  );
  assert.equal(legacy("/?q=sql&sort=oldest"), "/inf04/?q=sql&sort=oldest");
  assert.equal(legacy("/inf04/?q=sql"), null);
  assert.equal(parseCatalogPath("/inf04/arkusze/missing/extra/"), null);
  console.log("Canonical routes and legacy URL conversion passed.");
} finally {
  await server.close();
}
