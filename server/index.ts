import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { configureEmailService } from "./email";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use the port specified in the environment or default to 5000
  // this serves both the API and the client.
  const port = process.env.PORT || 5000;
  
  // Configurar el servicio de correo electrónico
  try {
    // Primero intentamos cargar la configuración desde la base de datos
    const { loadEmailConfigFromDatabase } = await import('./email');
    const configLoadedFromDb = await loadEmailConfigFromDatabase();
    
    if (!configLoadedFromDb) {
      // Si no se pudo cargar desde la base de datos, usamos las variables de entorno
      const emailHost = process.env.EMAIL_HOST || "smtp.hostinger.com";
      const emailPort = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 465;
      const emailUser = process.env.EMAIL_USER || "no-reply@sistemasrst.com";
      const emailPass = process.env.EMAIL_PASSWORD || "";
      const emailSecure = true; // siempre true para puerto 465
      const emailFromName = "Sistemas RST";
      const emailFrom = process.env.EMAIL_FROM || emailUser;
      
      configureEmailService(
        emailHost,
        emailPort,
        emailUser,
        emailPass,
        emailSecure,
        emailFromName,
        emailFrom
      );
    }
    
    log('Servicio de correo electrónico configurado correctamente');
  } catch (error) {
    console.error('Error al configurar el servicio de correo electrónico:', error);
  }
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
