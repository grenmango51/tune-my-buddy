
-- Corpora table
CREATE TABLE public.corpora (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_count INTEGER NOT NULL DEFAULT 0,
  total_size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.corpora ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corpora" ON public.corpora FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own corpora" ON public.corpora FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own corpora" ON public.corpora FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own corpora" ON public.corpora FOR DELETE USING (auth.uid() = user_id);

-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corpus_id UUID NOT NULL REFERENCES public.corpora(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  base_model TEXT NOT NULL,
  corpus_id UUID REFERENCES public.corpora(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'preprocessing', 'training', 'complete', 'failed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0,
  hpc_job_id TEXT,
  slurm_job_id TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = user_id);

-- Training metrics table
CREATE TABLE public.training_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  train_loss DOUBLE PRECISION,
  val_loss DOUBLE PRECISION,
  learning_rate DOUBLE PRECISION,
  perplexity DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for own jobs" ON public.training_metrics 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = training_metrics.job_id AND jobs.user_id = auth.uid()));
CREATE POLICY "Metrics can be inserted for own jobs" ON public.training_metrics 
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = training_metrics.job_id AND jobs.user_id = auth.uid()));

-- Training logs table
CREATE TABLE public.training_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs for own jobs" ON public.training_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = training_logs.job_id AND jobs.user_id = auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_corpora_updated_at BEFORE UPDATE ON public.corpora FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update corpus stats
CREATE OR REPLACE FUNCTION public.update_corpus_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.corpora SET 
      file_count = file_count + 1,
      total_size_bytes = total_size_bytes + NEW.file_size
    WHERE id = NEW.corpus_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.corpora SET 
      file_count = file_count - 1,
      total_size_bytes = total_size_bytes - OLD.file_size
    WHERE id = OLD.corpus_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_corpus_stats_on_doc AFTER INSERT OR DELETE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_corpus_stats();

-- Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('corpus-documents', 'corpus-documents', false);

CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'corpus-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (bucket_id = 'corpus-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE USING (bucket_id = 'corpus-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for jobs and training_metrics
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_logs;
