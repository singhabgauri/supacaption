// route.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Convert seconds → SRT timestamp
function toSrtTime(sec) {
  const ms = Math.floor((sec % 1) * 1000);
  const s = Math.floor(sec) % 60;
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3,"0")}`;
}

// Break text into ~45 char chunks (so it's not 1 big line)
function chunkText(text, maxLen = 45) {
  const words = text.trim().split(/\s+/);
  let line = "";
  const chunks = [];

  for (const w of words) {
    if ((line + " " + w).trim().length > maxLen) {
      chunks.push(line.trim());
      line = w;
    } else {
      line += " " + w;
    }
  }
  if (line) chunks.push(line.trim());
  return chunks;
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file uploaded" }),
        { status: 400 }
      );
    }

    // Use verbose_json so we can build custom SRT
    const jsonResp = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
      temperature: 0,
    });

    let srtBlocks = [];
    let counter = 1;

    for (const seg of jsonResp.segments) {
      const chunks = chunkText(seg.text, 45);
      const totalDuration = seg.end - seg.start;
      const chunkDuration = totalDuration / chunks.length;

      chunks.forEach((chunk, idx) => {
        const start = toSrtTime(seg.start + idx * chunkDuration);
        const end = toSrtTime(seg.start + (idx + 1) * chunkDuration);
        srtBlocks.push(`${counter++}\n${start} --> ${end}\n${chunk}\n`);
      });
    }

    // Join with Windows-style newlines (FFmpeg prefers CRLF)
    let srt = srtBlocks.join("\n").replace(/\r?\n/g, "\r\n");

    // Debug preview
    console.log("Generated SRT Preview:\n", srt.split("\r\n").slice(0, 20).join("\r\n"));

    // Transcript for preview in UI
    const transcript = jsonResp.text || "";

    return new Response(
      JSON.stringify({ text: transcript, srt }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Transcription error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
