import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCorpora } from "@/hooks/useCorpora";
import { supabase } from "@/integrations/supabase/client";
import { baseModels } from "@/lib/mock-data";
import { Info, ChevronRight, ChevronLeft, Rocket, Zap, FlaskConical } from "lucide-react";
import { toast } from "sonner";

const steps = ["Base Model", "Corpus", "Parameters", "Review"];

const presets = {
  fast: { learningRate: "5e-4", batchSize: "16", epochs: "1", loraRank: "8", loraAlpha: "16", warmupSteps: "10", weightDecay: "0.01", maxSeqLength: "1024", chunkSize: "512", chunkOverlap: "64", gpuCount: "1" },
  full: { learningRate: "2e-4", batchSize: "8", epochs: "3", loraRank: "32", loraAlpha: "64", warmupSteps: "100", weightDecay: "0.01", maxSeqLength: "4096", chunkSize: "1024", chunkOverlap: "128", gpuCount: "4" },
};

const NewJob = () => {
  const navigate = useNavigate();
  const { corpora } = useCorpora();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    baseModel: "",
    corpusId: "",
    jobName: "",
    ...presets.full,
  });

  const update = (key: string, value: string) => setConfig((prev) => ({ ...prev, [key]: value }));
  const applyPreset = (p: "fast" | "full") => setConfig((prev) => ({ ...prev, ...presets[p] }));

  const selectedModel = baseModels.find((m) => m.id === config.baseModel);
  const selectedCorpus = corpora.find((c) => c.id === config.corpusId);

  const handleLaunch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); return; }

    const jobConfig = {
      learning_rate: parseFloat(config.learningRate),
      batch_size: parseInt(config.batchSize),
      epochs: parseInt(config.epochs),
      lora_rank: parseInt(config.loraRank),
      lora_alpha: parseInt(config.loraAlpha),
      warmup_steps: parseInt(config.warmupSteps),
      weight_decay: parseFloat(config.weightDecay),
      max_seq_length: parseInt(config.maxSeqLength),
      chunk_size: parseInt(config.chunkSize),
      chunk_overlap: parseInt(config.chunkOverlap),
      gpu_count: parseInt(config.gpuCount),
    };

    const { data, error } = await supabase.from("jobs").insert({
      user_id: user.id,
      name: config.jobName || "Untitled Job",
      base_model: selectedModel?.name || config.baseModel,
      corpus_id: config.corpusId || null,
      config: jobConfig,
    }).select().single();

    if (error) {
      toast.error(error.message);
      return;
    }

    // Call edge function to forward to HPC
    try {
      await supabase.functions.invoke("hpc-proxy", {
        body: { action: "submit", job_id: data.id, model: selectedModel?.name, corpus_id: config.corpusId, config: jobConfig },
      });
    } catch {
      // HPC may not be configured yet, job still created in DB
    }

    toast.success("Job submitted!", { description: config.jobName });
    navigate(`/jobs/${data.id}`);
  };

  const ParamField = ({ label, field, tooltip }: { label: string; field: string; tooltip: string }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm">{label}</Label>
        <Tooltip>
          <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      <Input value={config[field as keyof typeof config]} onChange={(e) => update(field, e.target.value)} className="font-mono text-sm" />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Fine-Tune Job</h1>
          <p className="text-sm text-muted-foreground">Configure and launch a new training run</p>
        </div>

        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
              <span className={`text-sm ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Job Name</Label>
                  <Input placeholder="my-fine-tune-job" value={config.jobName} onChange={(e) => update("jobName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Base Model</Label>
                  <Select value={config.baseModel} onValueChange={(v) => update("baseModel", v)}>
                    <SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger>
                    <SelectContent>
                      {baseModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="font-medium">{m.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{m.params} · {m.provider}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Select Corpus</Label>
                  <Select value={config.corpusId} onValueChange={(v) => update("corpusId", v)}>
                    <SelectTrigger><SelectValue placeholder="Choose a document set" /></SelectTrigger>
                    <SelectContent>
                      {corpora.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="font-medium">{c.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{c.file_count} files</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {corpora.length === 0 && (
                    <p className="text-xs text-muted-foreground">No corpora available. Create one in the Corpus Manager first.</p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => applyPreset("fast")}>
                    <Zap className="h-3.5 w-3.5 mr-1" /> Fast Test
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyPreset("full")}>
                    <FlaskConical className="h-3.5 w-3.5 mr-1" /> Full Training
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ParamField label="Learning Rate" field="learningRate" tooltip="Step size for gradient updates." />
                  <ParamField label="Batch Size" field="batchSize" tooltip="Samples per training step." />
                  <ParamField label="Epochs" field="epochs" tooltip="Full passes through the dataset." />
                  <ParamField label="LoRA Rank" field="loraRank" tooltip="Rank of low-rank adaptation matrices." />
                  <ParamField label="LoRA Alpha" field="loraAlpha" tooltip="Scaling factor for LoRA." />
                  <ParamField label="Warmup Steps" field="warmupSteps" tooltip="Steps to linearly increase LR." />
                  <ParamField label="Weight Decay" field="weightDecay" tooltip="L2 regularization coefficient." />
                  <ParamField label="Max Seq Length" field="maxSeqLength" tooltip="Maximum token length." />
                  <ParamField label="Chunk Size" field="chunkSize" tooltip="Size of document chunks for RAG preprocessing." />
                  <ParamField label="Chunk Overlap" field="chunkOverlap" tooltip="Overlap between consecutive chunks." />
                  <ParamField label="GPU Count" field="gpuCount" tooltip="Number of GPUs for distributed training." />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-medium">Review Configuration</h3>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div><dt className="text-muted-foreground">Job Name</dt><dd className="font-mono">{config.jobName || "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Base Model</dt><dd className="font-mono">{selectedModel?.name || "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Corpus</dt><dd className="font-mono">{selectedCorpus?.name || "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Learning Rate</dt><dd className="font-mono">{config.learningRate}</dd></div>
                  <div><dt className="text-muted-foreground">Batch Size</dt><dd className="font-mono">{config.batchSize}</dd></div>
                  <div><dt className="text-muted-foreground">Epochs</dt><dd className="font-mono">{config.epochs}</dd></div>
                  <div><dt className="text-muted-foreground">LoRA Rank / Alpha</dt><dd className="font-mono">{config.loraRank} / {config.loraAlpha}</dd></div>
                  <div><dt className="text-muted-foreground">Max Seq Length</dt><dd className="font-mono">{config.maxSeqLength}</dd></div>
                  <div><dt className="text-muted-foreground">Chunk Size / Overlap</dt><dd className="font-mono">{config.chunkSize} / {config.chunkOverlap}</dd></div>
                  <div><dt className="text-muted-foreground">GPU Count</dt><dd className="font-mono">{config.gpuCount}</dd></div>
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button onClick={handleLaunch}><Rocket className="h-4 w-4 mr-1" /> Launch Job</Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewJob;
