// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Simple request log — helpful while developing/demoing
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/api/health", (req, res) => res.json({ ok: true, service: "resqdb-backend" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/areas", require("./routes/areas"));
app.use("/api/shelters", require("./routes/shelters"));
app.use("/api/victims", require("./routes/victims"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api/teams", require("./routes/teams"));
app.use("/api/inventory", require("./routes/inventory"));
app.use("/api/distributions", require("./routes/distributions"));
app.use("/api/organizations", require("./routes/organizations"));
app.use("/api/items", require("./routes/items"));
app.use("/api/views", require("./routes/views"));
app.use("/api/reference", require("./routes/reference"));
app.use("/api/geography", require("./routes/geography"));

// 404 fallback for unknown API routes
app.use("/api", (req, res) => res.status(404).json({ error: "NOT_FOUND", message: "No such endpoint." }));

// Last-resort error handler (routes normally handle their own errors via
// lib/errors.js, but this catches anything that slips through)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "SERVER_ERROR", message: "Unexpected server error." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ResQDB backend listening on http://localhost:${PORT}`);
});
