CREATE POLICY "Autenticados podem ler PDFs de PO"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'po-pdfs');