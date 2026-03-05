import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: express.Application) {
  // Caminho para os arquivos públicos gerados pelo build
  const publicPath = path.join(__dirname, "../dist/public");

  // Middleware para servir arquivos estáticos
  app.use(express.static(publicPath));

  // Fallback: serve index.html para qualquer rota não encontrada
  app.get("/*", (_req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}
