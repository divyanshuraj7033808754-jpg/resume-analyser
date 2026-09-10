const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { analyzeResume } = require("./analyzer");
const { saveAnalysis, listAnalyses, getAnalysis, deleteAnalysis } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

// Extract plain text from an uploaded file buffer
async function extractText(file) {
  if (!file) return "";
  const name = (file.originalname || "").toLowerCase();
  if (name.endsWith(".pdf") || file.mimetype === "application/pdf") {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(file.buffer);
    return data.text || "";
  }
  // treat everything else as plain text
  return file.buffer.toString("utf-8");
}

// POST /api/analyze
// Accepts either:
//   application/json  { text, role }
//   multipart/form-data  file=<resume>, role=<string>
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";
    let filename = null;
    const role = (req.body && req.body.role) || "";

    if (req.file) {
      filename = req.file.originalname;
      text = await extractText(req.file);
    } else if (req.is("application/json") && req.body && req.body.text) {
      text = req.body.text;
    }

    text = (text || "").trim();
    if (text.length < 40) {
      return res.status(400).json({ error: "Please provide at least a few lines of resume text." });
    }

    const result = analyzeResume(text, role || null);
    const id = saveAnalysis({
      filename,
      role: role || null,
      overall: result.overall,
      wordCount: result.wordCount,
      payload: result
    });

    res.json({ id, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while analyzing that file. If it was a PDF, try pasting the text instead." });
  }
});

// GET /api/history — list recent analyses (summary only)
app.get("/api/history", (req, res) => {
  try {
    const rows = listAnalyses(50);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load history." });
  }
});

// GET /api/history/:id — full stored result
app.get("/api/history/:id", (req, res) => {
  try {
    const row = getAnalysis(Number(req.params.id));
    if (!row) return res.status(404).json({ error: "Not found." });
    res.json({ id: row.id, created_at: row.created_at, filename: row.filename, ...row.payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load that analysis." });
  }
});

// DELETE /api/history/:id
app.delete("/api/history/:id", (req, res) => {
  try {
    deleteAnalysis(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete that analysis." });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Signal backend running at http://localhost:${PORT}`);
});
