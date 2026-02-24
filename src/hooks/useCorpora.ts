import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Corpus {
  id: string;
  user_id: string;
  name: string;
  description: string;
  file_count: number;
  total_size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  corpus_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

export function useCorpora() {
  const [corpora, setCorpora] = useState<Corpus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCorpora = async () => {
    const { data } = await supabase.from("corpora").select("*").order("created_at", { ascending: false });
    if (data) setCorpora(data as Corpus[]);
    setLoading(false);
  };

  useEffect(() => { fetchCorpora(); }, []);

  const createCorpus = async (name: string, description: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from("corpora").insert({ name, description, user_id: user.id }).select().single();
    if (!error && data) {
      setCorpora((prev) => [data as Corpus, ...prev]);
      return data as Corpus;
    }
    return null;
  };

  const deleteCorpus = async (id: string) => {
    await supabase.from("corpora").delete().eq("id", id);
    setCorpora((prev) => prev.filter((c) => c.id !== id));
  };

  return { corpora, loading, createCorpus, deleteCorpus, refetch: fetchCorpora };
}

export function useDocuments(corpusId: string | undefined) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    if (!corpusId) return;
    const { data } = await supabase.from("documents").select("*").eq("corpus_id", corpusId).order("created_at", { ascending: false });
    if (data) setDocuments(data as Document[]);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [corpusId]);

  const uploadDocument = async (file: File) => {
    if (!corpusId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const filePath = `${user.id}/${corpusId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("corpus-documents").upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data, error } = await supabase.from("documents").insert({
      corpus_id: corpusId,
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
    }).select().single();

    if (!error && data) {
      setDocuments((prev) => [data as Document, ...prev]);
    }
  };

  const deleteDocument = async (doc: Document) => {
    await supabase.storage.from("corpus-documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  return { documents, loading, uploadDocument, deleteDocument, refetch: fetchDocs };
}
