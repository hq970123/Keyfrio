import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import dotenv from "dotenv";
import { registerRemotionRoutes } from "./server/remotionService";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Lazy initialize Gemini client to avoid crashes if key is not yet set
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiAvailable: Boolean(process.env.GEMINI_API_KEY) });
});

// Remotion template rendering (server-side): template list, render jobs
registerRemotionRoutes(app);

// AI Copilot: Conversational Video Editing Assistant with Executable Actions
app.post("/api/ai/copilot", async (req, res) => {
  try {
    const { prompt, history = [], projectContext = {} } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: "Gemini API key is not configured" });
    }

    const systemInstruction = `You are OpenCut AI Copilot, a world-class AI video editing assistant integrated directly into a professional web video editor.
You assist users by explaining editing techniques and generating structured, precise executable actions that manipulate the timeline in real time.

Current Project Context:
- Project Name: "${projectContext.name || '未命名工程'}"
- Aspect Ratio: "${projectContext.aspectRatio || '16:9'}" (${projectContext.resolution || '1920x1080'})
- Total Duration: ${projectContext.totalDuration || 0}s
- Current Playhead Time: ${projectContext.currentTime || 0}s
- Selected Clip: ${JSON.stringify(projectContext.selectedClip || null)}
- Tracks Summary: ${JSON.stringify(projectContext.tracksSummary || [])}

Available Actions you can generate in the "actions" array:
1. "ADD_CLIP": Add video/audio/text/sticker/color clip.
   Payload: { trackType: "video"|"audio"|"text"|"effect", clipData: { type, name, start, duration, text?: { text, color, fontSize, bgColor, animation }, url?, stickerEmoji?, audio?: { volume, fadeIn, fadeOut }, colorFilter?: { brightness, contrast, saturate, vignette, sepia, temperature } } }
2. "ADD_SUBTITLES": Batch add timed subtitles.
   Payload: { subtitles: [{ start: number, duration: number, text: string, stylePreset?: string }] }
3. "APPLY_FILTER": Apply color filter/grading to selected or all video clips.
   Payload: { preset: "cinematic"|"cyberpunk"|"vintage"|"warm"|"bw"|"fresh"|"vivid", values?: { brightness?: number, contrast?: number, saturate?: number, vignette?: number, temperature?: number } }
4. "SPLIT_CLIP": Split current selected clip at playhead time.
   Payload: { time?: number }
5. "SET_SPEED": Change playback speed.
   Payload: { speed: number } (e.g. 0.5, 1.25, 1.5, 2)
6. "ADJUST_AUDIO": Change audio properties (volume, fade, mute).
   Payload: { volume?: number, fadeIn?: number, fadeOut?: number, muted?: boolean, addBgm?: { name: string, type: "upbeat"|"cinematic"|"synthwave"|"lofi", duration: number } }
7. "SET_ASPECT_RATIO": Change canvas aspect ratio.
   Payload: { aspectRatio: "16:9"|"9:16"|"1:1"|"4:5"|"21:9" }
8. "SET_PROJECT_NAME": Rename project.
   Payload: { name: string }
9. "SMART_ROUGH_CUT": Automatically assemble full video with sample B-roll, BGM, title hook, and subtitles.
   Payload: { theme: string, titleText: string, bgmTone: string, targetDuration: number }

Response format:
- reply: A helpful, concise, friendly explanation in Chinese (中文) of what you did or recommend.
- actions: An array of executable actions (can be empty if purely answering questions).
- quickFollowUps: 3-4 suggested follow-up prompt pills.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [
        { role: "user", parts: [{ text: `User request: "${prompt}"\nRecent Chat: ${JSON.stringify(history.slice(-4))}` }] },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "Detailed response and explanation to the user in Chinese" },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "Action type: e.g. ADD_CLIP, ADD_SUBTITLES, APPLY_FILTER, SPLIT_CLIP, SET_SPEED, ADJUST_AUDIO, SET_ASPECT_RATIO, SET_PROJECT_NAME, SMART_ROUGH_CUT" },
                  description: { type: Type.STRING, description: "Short human-readable summary of the action" },
                  payload: { type: Type.STRING, description: "JSON stringified parameters for this action" },
                },
                required: ["type", "description", "payload"],
              },
            },
            quickFollowUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Suggested follow-up action prompts",
            },
          },
          required: ["reply", "actions", "quickFollowUps"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    // Ensure payload objects are properly parsed if stringified
    if (Array.isArray(parsed.actions)) {
      parsed.actions = parsed.actions.map((act: any) => {
        if (typeof act.payload === "string") {
          try {
            act.payload = JSON.parse(act.payload);
          } catch {
            // keep as is
          }
        }
        return act;
      });
    }

    res.json(parsed);
  } catch (error: any) {
    console.error("AI Copilot error:", error);
    res.status(500).json({ error: error.message || "AI 剪辑助理处理失败" });
  }
});

// AI Text to Speech (TTS) Generator
app.post("/api/ai/tts", async (req, res) => {
  try {
    const { text, voice = "Kore", speed = 1.0 } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: "Gemini API key is not configured" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Call Gemini TTS model
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text.trim() }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice, // 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
            },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      return res.status(500).json({ error: "No audio generated" });
    }

    // Estimate duration from character count or audio byte length (24kHz 16-bit mono PCM is ~48000 bytes/sec)
    const estimatedDuration = Math.max(1, text.length * 0.35);

    res.json({
      audioBase64,
      mimeType: "audio/pcm;rate=24000",
      estimatedDuration,
      text,
      voice,
    });
  } catch (error: any) {
    console.error("AI TTS error:", error);
    res.status(500).json({ error: error.message || "Failed to generate speech" });
  }
});

// AI B-Roll Image Generator
app.post("/api/ai/image-gen", async (req, res) => {
  try {
    const { prompt, aspectRatio = "16:9" } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: "Gemini API key is not configured" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            text: `High quality cinematic B-roll photography suitable for video production: ${prompt}. Photorealistic, vibrant color grading, high detail, studio lighting.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
        },
      },
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "No image generated" });
    }

    res.json({ imageUrl, prompt });
  } catch (error: any) {
    console.error("AI Image Gen error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});

// AI Auto Captions Generator
app.post("/api/ai/auto-captions", async (req, res) => {
  try {
    const { text, duration = 30, style = "standard", language = "zh-CN" } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: "Gemini API key is not configured" });
    }

    const prompt = `You are a professional video editor and subtitler.
Generate accurately timed subtitle segments for a video of total duration ${duration} seconds.
Source text or topic: "${text || 'Short video vlog introduction'}".
Target language: ${language}.
Subtitle style: ${style} (e.g. standard, punchy, vlog, lyric).

Rules:
1. Divide the content into natural, easy-to-read subtitle chunks (3-7 words per line).
2. Assign each chunk a start time (seconds) and duration (seconds).
3. Ensure timestamps strictly fit within 0 to ${duration} seconds and do not overlap.
4. Provide engaging, punchy text formatted for video overlays.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtitles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  start: { type: Type.NUMBER, description: "Start time in seconds" },
                  duration: { type: Type.NUMBER, description: "Duration in seconds" },
                  text: { type: Type.STRING, description: "Subtitle content" },
                  stylePreset: { type: Type.STRING, description: "Style preset recommendation (e.g. bold, neon, minimal)" },
                },
                required: ["start", "duration", "text"],
              },
            },
            themeSummary: { type: Type.STRING, description: "Brief summary of the video theme" },
          },
          required: ["subtitles"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Auto captions error:", error);
    res.status(500).json({ error: error.message || "Failed to generate captions" });
  }
});

// AI Video Script & Storyboard Generator
app.post("/api/ai/video-script", async (req, res) => {
  try {
    const { topic, platform = "douyin/tiktok", targetDuration = 30 } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: "Gemini API key is not configured" });
    }

    const prompt = `Generate a high-converting, viral short-form video script and editing timeline layout for:
Topic: "${topic}"
Target Platform: ${platform}
Estimated Duration: ${targetDuration} seconds.

Produce a structured timeline plan with hooks, body scenes, call-to-actions, recommended text overlays, B-roll suggestions, and visual transitions.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            hook: { type: Type.STRING, description: "3-second opening hook" },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  start: { type: Type.NUMBER },
                  duration: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  spokenText: { type: Type.STRING },
                  overlayText: { type: Type.STRING },
                  visualNote: { type: Type.STRING },
                  transition: { type: Type.STRING },
                  musicCue: { type: Type.STRING },
                },
                required: ["start", "duration", "spokenText", "overlayText"],
              },
            },
            bgmRecommendation: { type: Type.STRING },
            colorPalette: { type: Type.STRING },
          },
          required: ["title", "hook", "scenes"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Video script error:", error);
    res.status(500).json({ error: error.message || "Failed to generate script" });
  }
});

// AI Smart Title & Hook Enhancer
app.post("/api/ai/enhance-title", async (req, res) => {
  try {
    const { title, style = "click-worthy" } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: "Gemini API key is not configured" });
    }

    const prompt = `Given the video title/phrase "${title}", suggest 5 eye-catching, high-impact video title overlay styles with typography styling ideas (color, stroke, font style, animation effect).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  textColor: { type: Type.STRING },
                  strokeColor: { type: Type.STRING },
                  bgColor: { type: Type.STRING },
                  animation: { type: Type.STRING },
                  fontFamily: { type: Type.STRING },
                  fontSize: { type: Type.NUMBER },
                },
                required: ["headline", "textColor", "animation"],
              },
            },
          },
          required: ["suggestions"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Enhance title error:", error);
    res.status(500).json({ error: error.message || "Failed to enhance title" });
  }
});

// AI Pacing & Cut Suggester
app.post("/api/ai/suggest-cuts", async (req, res) => {
  try {
    const { clipsSummary, videoGoal = "Keep audience retention high" } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: "Gemini API key is not configured" });
    }

    const prompt = `You are a professional video editor reviewing a timeline composition.
Clips currently on timeline: ${JSON.stringify(clipsSummary)}.
Goal: "${videoGoal}".
Suggest editing enhancements: cut points, speed ramps, sound effect placements, and color grading adjustments.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallRating: { type: Type.NUMBER, description: "Pacing score 1-10" },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "Pacing, Visuals, Audio, or Text" },
                  timestamp: { type: Type.NUMBER, description: "Suggested time in seconds" },
                  recommendation: { type: Type.STRING },
                  actionableTip: { type: Type.STRING },
                },
                required: ["category", "recommendation"],
              },
            },
            recommendedSpeedRamps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  start: { type: Type.NUMBER },
                  duration: { type: Type.NUMBER },
                  speedFactor: { type: Type.NUMBER },
                  reason: { type: Type.STRING },
                },
              },
            },
          },
          required: ["overallRating", "suggestions"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Suggest cuts error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze timeline" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OpenCut Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

