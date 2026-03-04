import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Basic setup ----------
app.use(cors());
app.use(express.json());

// Multer setup for image uploads (max 5MB)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

// ---------- API key check ----------
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ No Gemini API key found");
  process.exit(1);
}
console.log("✅ Gemini API Key loaded");

// ---------- Initialize Gemini ----------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---------- Helper: Generate content ----------
async function generateContent(prompt, isImageAnalysis = false, imageBase64 = null) {
  try {
    const modelName = isImageAnalysis ? "gemini-1.5-flash-latest" : "gemini-flash-latest";
    const model = genAI.getGenerativeModel({ model: modelName });

    const input = imageBase64 
      ? { text: prompt, image: imageBase64 }
      : prompt;

    const result = await model.generateContent(input);
    return (await result.response).text();
  } catch (error) {
    console.error("❌ API error:", error.message);
    throw error;
  }
}

// ========== ROUTES ==========

// ---------- Home page ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- Chat endpoint ----------
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "Please enter a question." });

    const prompt = `You are HealthBot, an AI health awareness assistant.

User question: "${message}"

Provide a helpful response with this EXACT FORMAT:

MAIN HEADING (use <strong> tags in HTML)
Start with a clear heading about the topic.

BODY CONTENT
Write in clear paragraphs. Use <br> for line breaks between paragraphs.

KEY POINTS SECTION (if applicable)
Use this format for important points:
• Point one with details
• Point two with details  
• Point three with details

WHEN TO SEE A DOCTOR
Clearly state when medical attention is needed.

IMPORTANT NOTES:
1. Use • for bullet points (not *, -, or numbers)
2. Use <strong> for important terms
3. Use <br><br> between sections
4. NEVER use markdown symbols (#, **, *, |)
5. Keep paragraphs short (2-3 sentences)
6. This is NOT medical advice - always say this

Make the response informative and easy to read.`;

    const reply = await generateContent(prompt);
    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ reply: "Service unavailable. Please try again." });
  }
});

// ---------- First Aid endpoint ----------
app.post("/api/firstaid", async (req, res) => {
  try {
    const { disease } = req.body;
    if (!disease) return res.status(400).json({ reply: "Please provide a condition." });

    const prompt = `Provide first aid guidance for: ${disease}

Use this EXACT FORMAT:

<strong>First Aid for ${disease.charAt(0).toUpperCase() + disease.slice(1)}</strong><br><br>

<strong>Immediate Actions:</strong><br>
• Action one<br>
• Action two<br>
• Action three<br><br>

<strong>What NOT to Do:</strong><br>
• Avoid this<br>
• Don't do that<br><br>

<strong>When to Seek Emergency Help:</strong><br>
• Symptom one<br>
• Symptom two<br>
• Symptom three<br><br>

<strong>Prevention Tips:</strong><br>
• Tip one<br>
• Tip two<br>
• Tip three<br><br>

<strong>Important:</strong> This is general information only. Always call emergency services for serious conditions and consult a healthcare professional.`;

    const reply = await generateContent(prompt);
    res.json({ reply });
  } catch (error) {
    console.error("First Aid error:", error.message);
    res.status(500).json({ 
      reply: `<strong>Information about ${req.body.disease || "this condition"}</strong><br><br>
Please describe specific symptoms in the chat for more detailed guidance.<br><br>
For serious conditions, always call emergency services immediately.<br><br>
This information is general and not medical advice.`
    });
  }
});

// ---------- Image Analysis endpoint ----------
app.post("/api/image", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ reply: "Please upload an image." });
    
    console.log(`📸 Image uploaded: ${req.file.originalname} (${req.file.size} bytes)`);

    // Convert image buffer to base64
    const base64Image = req.file.buffer.toString("base64");

    const prompt = `Analyze this medical/health-related image.

Describe what you see in this format:

<strong>Image Analysis Report</strong><br><br>

<strong>What I See:</strong><br>
• Description point one<br>
• Description point two<br>
• Description point three<br><br>

<strong>Possible Medical Significance:</strong><br>
• Possible condition one<br>
• Possible condition two<br><br>

<strong>Recommendations:</strong><br>
• Recommendation one<br>
• Recommendation two<br>
• Recommendation three<br><br>

<strong>When to See a Doctor:</strong><br>
• Symptom one that needs attention<br>
• Symptom two that needs attention<br><br>

<strong>Important Note:</strong> This analysis is based on visual information only. It is NOT a medical diagnosis. Always consult a healthcare professional for medical advice.`;

    const analysis = await generateContent(prompt, true, base64Image);

    res.json({
      reply: analysis,
      filename: req.file.originalname
    });

  } catch (error) {
    console.error("Image analysis error:", error.message);
    res.status(500).json({ 
      reply: `<strong>Image Analysis Unavailable</strong><br><br>
Unable to analyze the image at this time.<br>
Please try again or describe what you see in the text chat.<br><br>
For medical concerns, consult a healthcare professional.`
    });
  }
});

// ---------- Health Check ----------
app.get("/health", (req, res) => {
  res.json({ 
    status: "running",
    message: "HealthBot server",
    port: PORT,
    time: new Date().toISOString()
  });
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  // console.log(`💬 Chat: POST /api/chat`);
  // console.log(`🆘 First aid: POST /api/firstaid`);
  // console.log(`📸 Image: POST /api/image`);
  // console.log(`✅ HTML formatting enabled`);
});
