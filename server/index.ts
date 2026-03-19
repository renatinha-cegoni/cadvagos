import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { setupVite } from "./vite";

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

app.get("/api", (_req: Request, res: Response) => {
  res.json({ message: "Hello from API!" });
});

(async () => {
  try {
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || 500;
      const message = err.message || "Internal Server Error";
      if (res.headersSent) return next(err);
      res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      await setupVite(httpServer, app);
    }

    const port = Number(process.env.PORT) || 5000;

    httpServer.listen(port, "0.0.0.0", () => {
      console.log("Server running on port " + port);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
})();
