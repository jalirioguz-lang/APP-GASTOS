"use client";

import { useEffect, useRef, useState } from "react";
import { captureDocument } from "./actions";

export function PhotoCapture() {
  const input = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(next: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  function clear() {
    if (input.current) input.current.value = "";
    choose(null);
  }

  return <form action={captureDocument} className="quick-action photo-channel">
    <input ref={input} id="photo-upload" className="sr-only" name="document" type="file" accept="image/jpeg,image/png" capture="environment" required onChange={(event) => choose(event.currentTarget.files?.[0] || null)} />
    {!file ? <label htmlFor="photo-upload"><span className="capture-symbol" aria-hidden="true">⌑</span><span className="quick-action-copy"><strong>Foto</strong><small>Tomar o subir comprobante</small></span></label> : <><img className="photo-preview" src={preview || ""} alt="Vista previa del comprobante" /><span className="quick-action-copy"><strong>Foto lista</strong><small>{file.name}</small></span><span className="attachment-actions"><button type="button" className="cancel-attachment" onClick={clear}>Cancelar</button><button type="submit">Enviar foto</button></span></>}
  </form>;
}
