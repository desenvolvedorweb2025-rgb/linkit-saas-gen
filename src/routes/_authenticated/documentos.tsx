import { createFileRoute } from "@tanstack/react-router";
import { FolderArchive } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documentos")({
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Recibos, comprovantes e contratos.</p>

      <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
          <FolderArchive className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Em breve</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Upload de comprovantes, geração de recibos em PDF e contratos simples chegam na próxima atualização.
        </p>
      </div>
    </div>
  );
}
