CREATE POLICY "Envia comprovante na propria pasta"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'comprovantes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Participantes leem comprovantes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.order_attachments a
      JOIN public.orders o ON o.id = a.order_id
      WHERE a.path = storage.objects.name
        AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
    )
  )
);

CREATE POLICY "Autor ou admin apaga comprovante do storage"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'comprovantes' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid())
  )
);