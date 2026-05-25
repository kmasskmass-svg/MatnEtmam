import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

router.post("/tts", async (req, res) => {
  try {
    const { text, voice = "onyx", speed = 1.0 } = req.body as {
      text: string;
      voice?: string;
      speed?: number;
    };

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text is required" });
      return;
    }

    if (text.length > 4096) {
      res.status(400).json({ error: "text too long (max 4096 chars)" });
      return;
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
      speed: Math.max(0.25, Math.min(4.0, speed)),
      response_format: "mp3",
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buffer);
  } catch (err: any) {
    req.log.error({ err }, "TTS error");
    res.status(500).json({ error: "فشل توليد الصوت" });
  }
});

export default router;
