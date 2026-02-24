import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Metric {
  id: string;
  job_id: string;
  step: number;
  train_loss: number | null;
  val_loss: number | null;
  learning_rate: number | null;
  perplexity: number | null;
  created_at: string;
}

export interface LogEntry {
  id: string;
  job_id: string;
  message: string;
  level: string;
  created_at: string;
}

export function useMetrics(jobId: string | undefined) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    const fetch = async () => {
      const { data } = await supabase.from("training_metrics").select("*").eq("job_id", jobId).order("step", { ascending: true });
      if (data) setMetrics(data as Metric[]);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel(`metrics-${jobId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "training_metrics", filter: `job_id=eq.${jobId}` }, (payload) => {
        setMetrics((prev) => [...prev, payload.new as Metric]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  return { metrics, loading };
}

export function useLogs(jobId: string | undefined) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    const fetch = async () => {
      const { data } = await supabase.from("training_logs").select("*").eq("job_id", jobId).order("created_at", { ascending: true });
      if (data) setLogs(data as LogEntry[]);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel(`logs-${jobId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "training_logs", filter: `job_id=eq.${jobId}` }, (payload) => {
        setLogs((prev) => [...prev, payload.new as LogEntry]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  return { logs, loading };
}
