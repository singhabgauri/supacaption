import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
      });
    }

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
    });

    let srt = "";
    if (transcription.segments?.length > 0) {
      transcription.segments.forEach((seg, i) => {
        const start = formatTime(seg.start);
        const end = formatTime(seg.end);
        srt += `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n\n`;
      });
    } else {
      srt = `1\n00:00:00,000 --> 00:10:00,000\n${transcription.text}\n\n`;
    }

    return new Response(
      JSON.stringify({ text: transcription.text, srt }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Transcription error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

function formatTime(seconds) {
  const ms = Math.floor((seconds % 1) * 1000);
  const totalSeconds = Math.floor(seconds);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}
