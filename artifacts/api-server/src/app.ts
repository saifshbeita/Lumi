import express, { type Express, type ErrorRequestHandler } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { adultSession, studentSession } from "./lib/session";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    const host = req.get("x-forwarded-host") ?? req.get("host");
    if (req.get("sec-fetch-site") === "cross-site" || (origin && new URL(origin).host !== host)) {
      res.status(403).json({ error: "This request must come from Lumi." }); return;
    }
  }
  next();
});
app.use("/api/adult", adultSession);
app.use("/api/students", adultSession);
app.use("/api/student", (req, res, next) => {
  // The demo reuses only the transcription route with the existing adult cookie.
  // Every other student request continues to use the unchanged student session.
  const demoTranscription = req.method === "POST" && req.path === "/voice/transcribe" && req.get("X-Lumi-Demo") === "1";
  return (demoTranscription ? adultSession : studentSession)(req, res, next);
});

app.use("/api", router);
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  req.log.error({ err }, "Request failed");
  res.status(500).json({ error: "Something went wrong. Please try again." });
};
app.use(errorHandler);

export default app;
