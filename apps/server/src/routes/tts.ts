import { FastifyInstance } from "fastify";
import { synthesizeSpeech } from "../services/tts.js";

export async function ttsRoutes(app: FastifyInstance) {
  app.post<{
    Body: { text: string };
  }>("/api/tts", async (request, reply) => {
    const { text } = request.body;

    if (!text || typeof text !== "string") {
      reply.code(400).send({ error: "text is required" });
      return;
    }

    if (text.length > 4096) {
      reply.code(400).send({ error: "Text too long (max 4096 characters)" });
      return;
    }

    try {
      const audioBuffer = await synthesizeSpeech(text);

      reply
        .code(200)
        .header("Content-Type", "audio/mpeg")
        .header("Content-Length", audioBuffer.length)
        .send(audioBuffer);
    } catch (err: any) {
      request.log.error(err, "TTS synthesis failed");
      reply.code(500).send({ error: "TTS synthesis failed" });
    }
  });
}
