"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LiveRun({ status }: { status: "queued" | "running" }) {
  const router = useRouter();
  const [lane, setLane] = useState(1);
  const [score, setScore] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const refresh = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(refresh);
  }, [router]);
  useEffect(() => {
    if (!playing) return;
    const move = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a") setLane((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight" || event.key === "d") setLane((current) => Math.min(2, current + 1));
      if (["ArrowLeft", "ArrowRight", "a", "d"].includes(event.key)) setScore((current) => current + 1);
    };
    window.addEventListener("keydown", move);
    return () => window.removeEventListener("keydown", move);
  }, [playing]);
  return <div className="run-state">
    <div className={`city-run ${playing ? "playing" : ""}`} aria-hidden="true"><b style={{ transform: `translateX(${lane * 20}px)` }} /><i /><i /><i /><em /></div>
    <div><strong>{status === "queued" ? "Tu solicitud está en fila" : "El agente está trabajando"}</strong><p>La conversación se actualizará automáticamente cuando termine.</p>
      <button className="game-toggle" type="button" aria-pressed={playing} onClick={() => setPlaying((current) => !current)}>{playing ? `Conduciendo · ${score} maniobras` : "Jugar mientras esperas"}</button>
      {playing && <p className="game-help">Usa ← → o A / D para cambiar de carril. El puntaje no se guarda.</p>}
    </div>
    <span className="sr-only" aria-live="polite">{status === "queued" ? "Solicitud en fila" : "El agente está trabajando"}</span>
  </div>;
}
