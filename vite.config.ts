import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import type { Catalog, Exam } from "./src/types/catalog";
import { resourceFileName, resourceUrl } from "./src/utils/catalog";

const catalogNames = ["inf03", "inf04"] as const;

function loadCatalogs() {
  return catalogNames.map((catalogName) => {
    const catalogPath = resolve(
      process.cwd(),
      "public",
      "data",
      catalogName,
      "catalog.json",
    );
    return JSON.parse(readFileSync(catalogPath, "utf8")) as Catalog;
  });
}

function findExam(catalogs: Catalog[], examId: string) {
  for (const catalog of catalogs) {
    const exam = catalog.exams.find((candidate) => candidate.id === examId);
    if (exam) {
      return { catalog, exam };
    }
  }

  return null;
}

function sourceResourceUrl(catalog: Catalog, exam: Exam, assetFile: string) {
  return resourceUrl(
    catalog.sourceRepository,
    exam,
    assetFile,
    catalog.sourceBranch,
  );
}

function developmentResourceDownloads(): Plugin {
  return {
    name: "development-resource-downloads",
    apply: "serve",
    configureServer(server) {
      const catalogs = loadCatalogs();

      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url ?? "/", "http://localhost");
        if (requestUrl.pathname !== "/__resource-download") {
          next();
          return;
        }

        if (request.method !== "GET" && request.method !== "HEAD") {
          response.statusCode = 405;
          response.setHeader("Allow", "GET, HEAD");
          response.end("Method not allowed");
          return;
        }

        const examId = requestUrl.searchParams.get("exam") ?? "";
        const resourceParameter = requestUrl.searchParams.get("resource");
        const resourceIndex = Number(resourceParameter);
        const match = findExam(catalogs, examId);
        const assetFile = match?.exam.assetFiles[resourceIndex];

        if (
          !match ||
          resourceParameter === null ||
          !Number.isInteger(resourceIndex) ||
          resourceIndex < 0 ||
          !assetFile
        ) {
          response.statusCode = 404;
          response.end("Resource not found");
          return;
        }

        try {
          const upstream = await fetch(
            sourceResourceUrl(match.catalog, match.exam, assetFile),
            {
              method: request.method === "HEAD" ? "HEAD" : "GET",
              signal: AbortSignal.timeout(120_000),
            },
          );
          if (!upstream.ok) {
            throw new Error(`Upstream returned HTTP ${upstream.status}`);
          }

          const downloadName = resourceFileName(
            match.exam,
            assetFile,
            resourceIndex,
          );
          response.statusCode = 200;
          response.setHeader(
            "Content-Type",
            upstream.headers.get("content-type") ?? "application/octet-stream",
          );
          response.setHeader(
            "Content-Disposition",
            `attachment; filename="${downloadName}"`,
          );
          response.setHeader("Cache-Control", "no-store");

          if (request.method === "HEAD") {
            const contentLength = upstream.headers.get("content-length");
            if (contentLength) {
              response.setHeader("Content-Length", contentLength);
            }
            response.end();
            return;
          }

          const body = Buffer.from(await upstream.arrayBuffer());
          response.setHeader("Content-Length", body.length);
          response.end(body);
        } catch (error) {
          server.config.logger.error(
            `Resource download failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (!response.headersSent) {
            response.statusCode = 502;
            response.end("Resource download failed");
          } else {
            response.destroy();
          }
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), developmentResourceDownloads()],
});
