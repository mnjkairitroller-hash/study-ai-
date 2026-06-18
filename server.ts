import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint to generate 10-question quizzes for video content
  app.post("/api/gemini/quiz", async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Video title is required to generate a quiz" });
      }

      if (!apiKey) {
        return res.status(503).json({ error: "Gemini API key is missing. Please check your Settings > Secrets panel." });
      }

      const prompt = `You are a professional educational developer. Generate a list of exactly 10 high-quality, comprehensive multiple-choice questions (MCQs) for students to test their understanding after watching a video about:
Title: "${title}"
Details/Description: "${description || 'A comprehensive lesson on this subject.'}"

Rules:
1. Every question must be relevant to the core concept of the topic.
2. Provide exactly 4 options per question.
3. Keep questions clear and concise.
4. Mark the correct option's 0-based index (0, 1, 2, or 3).
5. Provide a constructive, educational 'explanation' for why the correct option is the right answer.
6. Return exactly 10 questions.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert curriculum designer and educator. Return raw JSON that matches the requested schema precisely without extra commentary.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "An array of exactly 10 quiz questions.",
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "Text of the multiple-choice question." },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Exactly 4 options."
                },
                correct: { type: Type.INTEGER, description: "The 0-based index of the correct answer (0, 1, 2, or 3)." },
                explanation: { type: Type.STRING, description: "Clear and helpful explanation of why this choice is correct." }
              },
              required: ["question", "options", "correct", "explanation"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty or invalid output from Gemini AI");
      }

      const quizData = JSON.parse(text);
      res.json({ success: true, questions: quizData });
    } catch (error: any) {
      console.error("Quiz generation error on server:", error);
      res.status(500).json({ error: error.message || "Failed to generate video concept quiz" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
