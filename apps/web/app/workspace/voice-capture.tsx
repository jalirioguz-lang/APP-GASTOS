"use client";

import { useRef, useState } from "react";
import { captureVoice } from "./actions";

type RecordingState = "idle" | "recording" | "ready" | "error";

export function VoiceCapture() {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const input = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<RecordingState>("idle");
  const [message, setMessage] = useState("Grabar nota");

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setState("error");
      setMessage("Tu navegador no permite grabar");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined);
      chunks.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
        const extension = blob.type === "audio/mp4" ? "m4a" : "webm";
        const voiceFile = new File([blob], `nota-de-voz-${new Date().toISOString()}.${extension}`, { type: blob.type });
        const files = new DataTransfer();
        files.items.add(voiceFile);
        if (input.current) input.current.files = files.files;
        setState("ready");
        setMessage("Lista para guardar");
      };
      recorder.current = mediaRecorder;
      mediaRecorder.start();
      setState("recording");
      setMessage("Detener grabación");
    } catch {
      setState("error");
      setMessage("No pudimos usar el micrófono");
    }
  }

  function toggleRecording() {
    if (state === "recording") recorder.current?.stop();
    else void startRecording();
  }

  return <form action={captureVoice} className="quick-action voice-channel">
    <input ref={input} id="audio-upload" className="sr-only" name="audio" type="file" accept="audio/mpeg,audio/mp4,audio/webm" required onChange={(event) => { if (event.currentTarget.files?.length) { setState("ready"); setMessage("Lista para enviar"); } }} />
    <span className="voice-icon" aria-hidden="true">⌁</span>
    <span className="quick-action-copy"><strong>Nota de voz</strong><small>{state === "recording" ? "Grabando… toca para detener" : state === "ready" ? "Lista para enviar" : "Graba como en WhatsApp o adjunta audio"}</small></span>
    <span className="voice-buttons">{state === "ready" ? <button type="submit">Enviar audio</button> : <button type="button" onClick={toggleRecording} aria-pressed={state === "recording"}>{message}</button>}{state !== "recording" && state !== "ready" && <label htmlFor="audio-upload">Adjuntar</label>}</span>
  </form>;
}
