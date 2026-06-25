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

  // API endpoint to generate personalized 10-question CBSE Class 8 quiz for a list of active/completed chapters
  app.post("/api/gemini/quiz/chapters", async (req, res) => {
    try {
      const { chaptersList } = req.body;
      if (!chaptersList || !Array.isArray(chaptersList) || chaptersList.length === 0) {
        return res.status(400).json({ error: "At least one completed or in-progress chapter is required to generate a personalized quiz." });
      }

      if (!apiKey) {
        return res.status(503).json({ error: "Gemini API key is missing. Please check your Settings > Secrets panel" });
      }

      const formattedChapters = chaptersList.map((ch: any, idx: number) => 
        `${idx + 1}. Chapter Title: "${ch.title}" (Subject: ${ch.subject || "General"})`
      ).join("\n");

      const prompt = `You are an expert CBSE/ICSE curriculum developer for secondary schools. Generate exactly 10 high-quality Multiple Choice Questions (MCQs) for Class 8 student level.
The student has completed or is currently studying the following chapters:
${formattedChapters}

Each question must be directly related or mapped to one of the chapters listed above, focusing on core concepts covered in standard Class 8 curriculum.

IMPORTANT RULES FOR UNIQUENESS:
- Generate a completely unique, randomized set of 10 questions.
- DO NOT repeat standard or generic questions.
- Select different, nuanced concepts from within these chapters to test.
- Use a unique angle or scenario for the questions if possible.
- Current Request Seed for Randomization: ${Math.random().toString(36).substring(2, 10)} ${new Date().toISOString()}

Rules:
1. Provide exactly 4 clear options for each question.
2. Distribute the 10 questions across the provided chapters.
3. Mark the correct answer's index (0-based index: 0, 1, 2, or 3).
4. Provide a supportive, highly educational and clear 'explanation' for why the answer is correct so the student can study and learn.
5. Emphasize standard Class 8 concepts accurately.
6. Return raw JSON that meets the schema exactly.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional secondary school educator and CBSE Class 8 exam paper compiler. Return RAW JSON matching the requested schema. No conversational fillers.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "An array of exactly 10 multiple-choice questions.",
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
        throw new Error("Empty response from Gemini AI model");
      }

      const quizData = JSON.parse(text);
      res.json({ success: true, questions: quizData });
    } catch (error: any) {
      console.error("Personalized chapter quiz error on server:", error);
      res.status(500).json({ error: error.message || "Failed to generate personalized quiz" });
    }
  });

  // API endpoint to resolve a YouTube video duration without an API key
  app.post("/api/youtube/duration", async (req, res) => {
    try {
      const { videoUrl } = req.body;
      if (!videoUrl) {
        return res.status(400).json({ error: "videoUrl parameter is required" });
      }

      // Extract video ID
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = videoUrl.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;

      if (!videoId) {
        return res.status(400).json({ error: "Invalid YouTube URL format" });
      }

      const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(ytUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (!response.ok) {
        // Fallback to static 1200 seconds (20 mins - which is < 30 mins)
        return res.json({ success: true, duration: 1200 });
      }

      const html = await response.text();

      // Find meta itemprop="duration"
      const metaMatch = html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/i) || 
                        html.match(/<meta\s+content="([A-Z0-9]+)"\s+itemprop="duration"/i);
      
      let durationInSeconds = 1200; // default template: 20 minutes

      if (metaMatch) {
         const isoDuration = metaMatch[1]; // e.g. "PT12M32S", "PT1H2M30S"
         let totalSecs = 0;
         const hoursMatch = isoDuration.match(/(\d+)H/);
         const minsMatch = isoDuration.match(/(\d+)M/);
         const secsMatch = isoDuration.match(/(\d+)S/);

         if (hoursMatch) totalSecs += parseInt(hoursMatch[1]) * 3600;
         if (minsMatch) totalSecs += parseInt(minsMatch[1]) * 60;
         if (secsMatch) totalSecs += parseInt(secsMatch[1]);
         
         if (totalSecs > 0) {
           durationInSeconds = totalSecs;
         }
      } else {
         // Second fallback inside ytInitialPlayerResponse.videoDetails.lengthSeconds
         const lengthSecondsMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
         if (lengthSecondsMatch) {
           durationInSeconds = parseInt(lengthSecondsMatch[1]);
         } else {
           // Third fallback via approxDurationMs
           const approxMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
           if (approxMatch) {
             durationInSeconds = Math.floor(parseInt(approxMatch[1]) / 1005);
           }
         }
      }

      res.json({ success: true, duration: durationInSeconds });
    } catch (err: any) {
      console.error("YT duration extraction error:", err);
      res.json({ success: true, duration: 1200 }); // Graceful fallback
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
