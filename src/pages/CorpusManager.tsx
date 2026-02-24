import { useState, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCorpora, useDocuments } from "@/hooks/useCorpora";
import { Plus, Trash2, Upload, FileText, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const CorpusManager = () => {
  const { corpora, loading, createCorpus, deleteCorpus } = useCorpora();
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCorpus, setSelectedCorpus] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await createCorpus(newName, newDesc);
    if (result) {
      toast.success("Corpus created");
      setNewName("");
      setNewDesc("");
      setDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCorpus(id);
    toast.success("Corpus deleted");
    if (selectedCorpus === id) setSelectedCorpus(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Corpus Manager</h1>
            <p className="text-sm text-muted-foreground">Upload PDFs and manage document sets for training</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New Corpus</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Corpus</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input placeholder="e.g. Research Papers 2024" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input placeholder="Optional description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                </div>
                <Button onClick={handleCreate} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Corpus list as cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Document Sets</h2>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : corpora.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No corpora yet. Create one to get started.
                </CardContent>
              </Card>
            ) : (
              corpora.map((c) => (
                <Card
                  key={c.id}
                  className={`cursor-pointer transition-all hover:border-primary/30 ${selectedCorpus === c.id ? "border-primary ring-1 ring-primary/20" : ""}`}
                  onClick={() => setSelectedCorpus(c.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.file_count} files · {formatBytes(c.total_size_bytes)} · {new Date(c.created_at).toLocaleDateString()}
                      </p>
                      {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Document panel with drag-drop */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {selectedCorpus ? "Documents" : "Select a corpus"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCorpus ? (
                <DocumentPanel corpusId={selectedCorpus} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mb-2" />
                  <p className="text-sm">Select a corpus to view and upload documents</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

function DocumentPanel({ corpusId }: { corpusId: string }) {
  const { documents, loading, uploadDocument, deleteDocument } = useDocuments(corpusId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(file);
      }
      toast.success(`${files.length} file(s) uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFiles(files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  return (
    <div className="space-y-4">
      {/* Drag-drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <Upload className={`h-8 w-8 mb-2 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</div>
        ) : (
          <>
            <p className="text-sm font-medium">{dragOver ? "Drop files here" : "Drop PDFs here or click to upload"}</p>
            <p className="text-xs text-muted-foreground mt-1">Supports batch upload</p>
          </>
        )}
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No documents yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(doc.file_size)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteDocument(doc)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CorpusManager;
