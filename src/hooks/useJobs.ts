import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Job {
  id: string;
  user_id: string;
  name: string;
  base_model: string;
  corpus_id: string | null;
  status: string;
  progress: number;
  hpc_job_id: string | null;
  slurm_job_id: string | null;
  config: Record<string, any>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setJobs(data as Job[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();

    const channel = supabase
      .channel("jobs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setJobs((prev) => [payload.new as Job, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setJobs((prev) => prev.map((j) => (j.id === (payload.new as Job).id ? (payload.new as Job) : j)));
        } else if (payload.eventType === "DELETE") {
          setJobs((prev) => prev.filter((j) => j.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { jobs, loading, refetch: fetchJobs };
}

export function useJob(jobId: string | undefined) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    
    const fetch = async () => {
      const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      if (data) setJob(data as Job);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel(`job-${jobId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` }, (payload) => {
        setJob(payload.new as Job);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  return { job, loading };
}
