import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: express.Application) {
  // Ajuste o caminho conforme sua estrutura de pastas
  const publicPath = path.join(__dirname, "../dist/public");

  app.use(express.static(publicPath));

  // Se quiser servir index.html como fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

