-- Las notas de voz se guardan en el mismo bucket privado, sin abrirlo al público.
update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'audio/mpeg', 'audio/mp4', 'audio/webm']
where id = 'expense-receipts';
