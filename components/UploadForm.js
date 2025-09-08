"use client";
import { useState } from "react";

export default function UploadForm() {
  const [step, setStep] = useState(1);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const BURNER_URL = process.env.NEXT_PUBLIC_BURNER_URL;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (loading) return;

    const file = e.target.fileInput.files[0];
    if (!file) return alert("Please select a file");

    setStep(2);
    setLoading(true);

    try {
      // 1. Transcribe
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      console.log("Transcription response:", data);

      setTranscript(data.text || "Error transcribing");

      // 2. Burn captions
      if (data.srt) {
        const burnForm = new FormData();
        burnForm.append("video", file);
        burnForm.append(
          "srt",
          new Blob([data.srt], { type: "text/plain" }),
          "subtitles.srt"
        );

        const burnRes = await fetch(`${BURNER_URL}/burn`, {
          method: "POST",
          body: burnForm,
        });
        if (!burnRes.ok) throw new Error("Burning captions failed");

        const blob = await burnRes.blob();
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setStep(3);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error: " + err.message);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const steps = [
    { id: 1, label: "Upload" },
    { id: 2, label: "Processing" },
    { id: 3, label: "Download" },
  ];

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleUpload} className="space-y-8">
            <label
              className={`flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-2xl cursor-pointer transition ${
                loading
                  ? "border-gray-700 cursor-not-allowed opacity-50"
                  : "border-gray-600 hover:border-blue-400"
              }`}
            >
              <span className="text-gray-400">
                {selectedFile
                  ? `Selected: ${selectedFile.name}`
                  : "Click or drag a video file"}
              </span>
              <input
                type="file"
                name="fileInput"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-lg shadow-lg transition"
            >
              {loading ? "Processing..." : "Upload & Burn Captions"}
            </button>
          </form>
        );

      case 2:
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
            <p className="text-blue-300 font-semibold text-lg">Processing your video...</p>
            {transcript && (
              <div className="mt-8 w-full p-6 rounded-xl bg-white/5 border border-white/10">
                <h3 className="font-semibold text-blue-300 mb-2">📝 Transcription</h3>
                <p className="text-gray-200 whitespace-pre-line">{transcript}</p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="aspect-video rounded-xl overflow-hidden bg-black/30">
              <video controls className="w-full h-full" src={videoUrl}></video>
            </div>

            <div className="flex gap-4">
              <a
                href={videoUrl}
                download="captioned-video.mp4"
                className="flex-1 py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-lg text-center shadow-lg transition"
              >
                ⬇️ Download Video
              </a>
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedFile(null);
                  setTranscript("");
                  setVideoUrl("");
                }}
                className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg text-center shadow-lg transition"
              >
                🎬 New Video
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black text-white px-4">
      <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
        🎬 SupaCaptions
      </h1>

      <div className="w-full max-w-3xl p-10 rounded-3xl bg-white/10 backdrop-blur-2xl shadow-2xl border border-white/20">
        <div className="flex justify-between mb-10 relative">
          {steps.map((s) => (
            <div key={s.id} className="flex-1 flex flex-col items-center relative">
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition ${
                  step >= s.id ? "bg-blue-500 border-blue-500" : "border-gray-600"
                }`}
              >
                {s.id}
              </div>
              <span
                className={`mt-2 text-sm ${
                  step >= s.id ? "text-blue-400 font-semibold" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-700 -z-10">
            <div
              className="h-0.5 bg-blue-500 transition-all duration-700"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {renderStepContent()}
      </div>
    </div>
  );
}
