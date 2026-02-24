import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useCorpora } from "@/hooks/useCorpora";
import { supabase } from "@/integrations/supabase/client";
import { baseModels, type BaseModel } from "@/lib/mock-data";
import { Info, ChevronRight, ChevronLeft, Rocket, Zap, FlaskConical, CheckCircle2, Cpu, Clock, HardDrive } from "lucide-react";
import { toast } from "sonner";

const steps = ["Model", "Corpus", "Parameters", "Review"];

const presets = {
  fast: { learningRate: "2e-4", batchSize: "4", epochs: 1, loraRank: "8", loraAlpha: "16", chunkSize: "512", chunkOverlap: "64", gpuCount: "1" },
  full: { learningRate: "2e-4", batchSize: "4", epochs: 3, loraRank: "32", loraAlpha: "64", chunkSize: "1024", chunkOverlap: "128", gpuCount: "4" },
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const NewJob = () => {
  const navigate = useNavigate();
  const { corpora } = useCorpora();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    baseModel: "",
    corpusId: "",
    jobName: "",
    learningRate: "2e-4",
    batchSize: "4",
    epochs: 3,
    loraRank: "16",
    loraAlpha: "32",
    chunkSize: "512",
    chunkOverlap: "64",
    gpuCount: "4",
  });

  const update = (key: string, value: string | number) => setConfig((prev) => ({ ...prev, [key]: value }));
  const applyPreset = (p: "fast" | "full") => setConfig((prev) => ({ ...prev, ...presets[p] }));

  const selectedModel = baseModels.find((m) => m.id === config.baseModel);
  const selectedCorpus = corpora.find((c) => c.id === config.corpusId);

  const handleLaunch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); return; }

    const jobConfig = {
      learning_rate: parseFloat(config.learningRate),
      batch_size: parseInt(config.batchSize),
      epochs: config.epochs,
      lora_rank: parseInt(config.loraRank),
      lora_alpha: parseInt(config.loraAlpha),
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

    if (error) { toast.error(error.message); return; }

    try {
      await supabase.functions.invoke("hpc-proxy", {
        body: { action: "submit", job_id: data.id, model: selectedModel?.name, corpus_id: config.corpusId, config: jobConfig },
      });
    } catch { /* HPC may not be configured yet */ }

    toast.success("Job submitted!", { description: config.jobName });
    navigate(`/jobs/${data.id}`);
  };

  const canProceed = () => {
    if (step === 0) return config.baseModel && config.jobName;
    if (step === 1) return true; // corpus optional
    return true;
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Fine-Tune Job</h1>
          <p className="text-sm text-muted-foreground">Configure and launch a training run on the HPC cluster</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-sm ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 0: Model Selection (card-based) */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Job Name</Label>
              <Input placeholder="my-fine-tune-run" value={config.jobName} onChange={(e) => update("jobName", e.target.value)} />
            </div>
            <Label>Select Base Model</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {baseModels.map((model) => (
                <Card
                  key={model.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    config.baseModel === model.id ? "border-primary ring-2 ring-primary/20 bg-accent" : ""
                  }`}
                  onClick={() => update("baseModel", model.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{model.name}</span>
                      {model.recommended && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20" variant="outline">Recommended</Badge>}
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Cpu className="h-3 w-3" />{model.params} params</div>
                      <div className="flex items-center gap-1.5"><HardDrive className="h-3 w-3" />{model.vram}</div>
                      <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{model.trainTimeEstimate}</div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{model.provider}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Corpus Selection */}
        {step === 1 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Select Corpus</Label>
                <Select value={config.corpusId} onValueChange={(v) => update("corpusId", v)}>
                  <SelectTrigger><SelectValue placeholder="Choose a document set (optional)" /></SelectTrigger>
                  <SelectContent>
                    {corpora.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-medium">{c.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{c.file_count} files · {formatBytes(c.total_size_bytes)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {corpora.length === 0 && (
                  <p className="text-xs text-muted-foreground">No corpora available. <Link to="/corpus" className="text-primary underline">Upload new corpus →</Link></p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Training Parameters with selects/sliders */}
        {step === 2 && (
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => applyPreset("fast")}>
                  <Zap className="h-3.5 w-3.5 mr-1" /> 🚀 Quick Smoke Test
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset("full")}>
                  <FlaskConical className="h-3.5 w-3.5 mr-1" /> 🔬 Full Training
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* LoRA Rank - Select */}
                <div className="space-y-1.5">
                  <ParamLabel label="LoRA Rank" tooltip="Rank of low-rank adaptation matrices." />
                  <Select value={config.loraRank} onValueChange={(v) => update("loraRank", v)}>
                    <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["8", "16", "32", "64"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* LoRA Alpha - Number */}
                <div className="space-y-1.5">
                  <ParamLabel label="LoRA Alpha" tooltip="Scaling factor for LoRA. Range: 1-128." />
                  <Input type="number" min={1} max={128} value={config.loraAlpha} onChange={(e) => update("loraAlpha", e.target.value)} className="font-mono" />
                </div>

                {/* Learning Rate */}
                <div className="space-y-1.5">
                  <ParamLabel label="Learning Rate" tooltip="Step size for gradient updates. Scientific notation." />
                  <Input value={config.learningRate} onChange={(e) => update("learningRate", e.target.value)} className="font-mono" placeholder="2e-4" />
                </div>

                {/* Batch Size - Select */}
                <div className="space-y-1.5">
                  <ParamLabel label="Batch Size" tooltip="Samples per training step." />
                  <Select value={config.batchSize} onValueChange={(v) => update("batchSize", v)}>
                    <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["1", "2", "4", "8"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Chunk Size - Select */}
                <div className="space-y-1.5">
                  <ParamLabel label="Chunk Size" tooltip="Size of document chunks for preprocessing." />
                  <Select value={config.chunkSize} onValueChange={(v) => update("chunkSize", v)}>
                    <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["256", "512", "1024"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Chunk Overlap */}
                <div className="space-y-1.5">
                  <ParamLabel label="Chunk Overlap" tooltip={`Overlap between chunks. Max: ${parseInt(config.chunkSize) / 2}`} />
                  <Input type="number" min={0} max={parseInt(config.chunkSize) / 2} value={config.chunkOverlap} onChange={(e) => update("chunkOverlap", e.target.value)} className="font-mono" />
                </div>

                {/* GPUs - Select */}
                <div className="space-y-1.5">
                  <ParamLabel label="GPUs" tooltip="Number of GPUs for distributed training." />
                  <Select value={config.gpuCount} onValueChange={(v) => update("gpuCount", v)}>
                    <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["1", "2", "4"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Epochs - Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <ParamLabel label="Epochs" tooltip="Number of full passes through the dataset." />
                  <span className="text-sm font-mono font-medium">{config.epochs}</span>
                </div>
                <Slider min={1} max={10} step={1} value={[config.epochs]} onValueChange={([v]) => update("epochs", v)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-medium">Review Configuration</h3>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <ReviewItem label="Job Name" value={config.jobName || "—"} />
                <ReviewItem label="Base Model" value={selectedModel?.name || "—"} />
                <ReviewItem label="Corpus" value={selectedCorpus?.name || "None"} />
                <ReviewItem label="Learning Rate" value={config.learningRate} />
                <ReviewItem label="Batch Size" value={config.batchSize} />
                <ReviewItem label="Epochs" value={String(config.epochs)} />
                <ReviewItem label="LoRA Rank / Alpha" value={`${config.loraRank} / ${config.loraAlpha}`} />
                <ReviewItem label="Chunk Size / Overlap" value={`${config.chunkSize} / ${config.chunkOverlap}`} />
                <ReviewItem label="GPU Count" value={config.gpuCount} />
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button onClick={handleLaunch} size="lg" className="gap-2"><Rocket className="h-4 w-4" /> Launch Job</Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

function ParamLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm">{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium">{value}</dd>
    </div>
  );
}

export default NewJob;
