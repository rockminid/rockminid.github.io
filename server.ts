import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

import http from "http";

// Model id is configurable so a deprecated or renamed model can be swapped
// without a code change.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// The frontend may be served from a different origin (e.g. GitHub Pages)
// than this API. ALLOWED_ORIGINS is a comma-separated allowlist; when unset,
// only same-origin requests work.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "10mb" }));

// Lazy Gemini client helper
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "mineral-rock-geochem-identifier",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// AI Petrological & Geochemical Interpretation endpoint
app.post("/api/georoc/interpret", async (req, res) => {
  try {
    const { sampleName, composition, inputType, identifiedRock, identifiedMineral, tasCategory, cipwNorm } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      // Return structured fallback interpretation if no API key is available
      return res.json({
        success: true,
        source: "geochemical-rule-engine",
        interpretation: `Geochemical Petrology Assessment for ${sampleName || "Sample"}:
1. Geochemical Affinity: Sample displays ${identifiedRock ? identifiedRock.name : "unclassified"} characteristics with ${tasCategory || "consistent"} affinities.
2. Silica & Alkalis: ${composition?.SiO2 ? `SiO2: ${composition.SiO2} wt%` : "Silica level undetermined"}, with total alkalis (Na2O+K2O) of ${((Number(composition?.Na2O) || 0) + (Number(composition?.K2O) || 0)).toFixed(2)} wt%.
3. Mineralogical Implication: Potential key phases include ${identifiedMineral ? identifiedMineral.name : "primary rock-forming silicates"}.
(Attach a Gemini API Key in Settings > Secrets for comprehensive deep AI petrogenesis, tectonic discrimination, and mantle/crustal source modeling.)`,
      });
    }

    const prompt = `You are a world-class igneous, metamorphic, and sedimentary petrologist and geochemist specialized in EPMA microprobe and XRF/ICP-MS whole-rock geochemical data analysis (similar to GEOROC, EarthChem, and USGS databases).

Analyze this geochemical sample:
Sample Name/ID: ${sampleName || "Unknown Sample"}
Input Mode: ${inputType || "oxide wt%"}
Composition:
${JSON.stringify(composition, null, 2)}

Algorithm Identification:
- Primary Rock Match: ${identifiedRock?.name || "None"} (Confidence: ${identifiedRock?.confidence || "N/A"}%)
- Primary Mineral Match: ${identifiedMineral?.name || "None"} (Confidence: ${identifiedMineral?.confidence || "N/A"}%)
- TAS (Total Alkali-Silica) Field: ${tasCategory || "N/A"}
${cipwNorm ? `- CIPW Normative Phases: ${JSON.stringify(cipwNorm)}` : ""}

Please provide a concise, high-density petrological report formatted with clean Markdown headers:
### 1. Geochemical & Petrological Summary
- State if the sample is more consistent with a rock (whole-rock XRF/ICP-MS) or a single mineral grain (EPMA/microprobe), and why.
- Discuss silica saturation (oversaturated / saturated / undersaturated) and alkali-subalkali classification.

### 2. Mineral Paragenesis & Major Phase Relations
- Comment on crystallization sequence, expected phenocryst vs groundmass phases, or solid solution endmember (e.g., Fo-Fa, An-Ab, En-Fs-Wo).

### 3. Tectonic Setting & Petrogenetic Implications
- Probable tectonic provenance (e.g., MORB, OIB, Arc volcanic, Continental Flood Basalt, S-type/I-type Pluton, or Mantle Peridotite).

### 4. Data Quality & Geochemical Anomalies
- Comment on volatile content (LOI/H2O), total sum quality, and any notable oxide anomalies (e.g., high TiO2, anomalous K/Na ratio, Cr/Ni mantle signatures).`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    return res.json({
      success: true,
      source: GEMINI_MODEL,
      interpretation: response.text || "No commentary generated.",
    });
  } catch (error: any) {
    console.error("Gemini interpretation error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to generate geochemical interpretation",
    });
  }
});

async function startServer() {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (typeof __filename !== "undefined" && __filename.includes("dist"));

  const server = http.createServer(app);

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Geochemical Identifier Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
