import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { baseModels } from "@/lib/mock-data";
import { Info, ChevronRight, ChevronLeft, Rocket } from "lucide-react";
import { toast } from "sonner";

const steps = ["Base Model", "Dataset", "Hyperparameters", "Review"];

const NewJob = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    baseModel: "",
    dataset: "",
    jobName: "",
    learningRate: "2e-4",
    batchSize: "8",
    epochs: "3",
    loraRank: "16",
    loraAlpha: "32",
    warmupSteps: "100",
    weightDecay: "0.01",
    maxSeqLength: "2048",
  });

  const update = (key: string, value: string) => setConfig((prev) => ({ ...prev, [key]: value }));

  const selectedModel = baseModels.find((m) => m.id === config.baseModel);

  const handleLaunch = () => {
    toast.success("Fine-tuning job launched!", { description: config.jobName || "Untitled Job" });
    navigate("/");
  };

  const ParamField = ({ label, field, tooltip }: { label: string; field: string; tooltip: string }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm">{label}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      <Input
        value={config[field as keyof typeof config]}
        onChange={(e) => update(field, e.target.value)}
        className="font-mono text-sm"
      />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Fine-Tune Job</h1>
          <p className="text-sm text-muted-foreground">Configure and launch a new training run</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i + 1}
              </div>
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
                  <Label>Dataset File</Label>
                  <div className="flex items-center gap-3">
                    <Input placeholder="dataset.jsonl" value={config.dataset} onChange={(e) => update("dataset", e.target.value)} />
                    <Button variant="outline" size="sm" onClick={() => update("dataset", "training-data.jsonl")}>
                      Browse
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">JSONL format with "prompt" and "completion" fields</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <ParamField label="Learning Rate" field="learningRate" tooltip="Step size for gradient updates. Lower values train slower but more stable." />
                <ParamField label="Batch Size" field="batchSize" tooltip="Samples per training step. Larger = faster but more VRAM." />
                <ParamField label="Epochs" field="epochs" tooltip="Number of full passes through the dataset." />
                <ParamField label="LoRA Rank" field="loraRank" tooltip="Rank of low-rank adaptation matrices. Higher = more expressive but more params." />
                <ParamField label="LoRA Alpha" field="loraAlpha" tooltip="Scaling factor for LoRA. Usually 2x the rank." />
                <ParamField label="Warmup Steps" field="warmupSteps" tooltip="Steps to linearly increase LR from 0." />
                <ParamField label="Weight Decay" field="weightDecay" tooltip="L2 regularization coefficient." />
                <ParamField label="Max Seq Length" field="maxSeqLength" tooltip="Maximum token length for training samples." />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-medium">Review Configuration</h3>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div><dt className="text-muted-foreground">Job Name</dt><dd className="font-mono">{config.jobName || "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Base Model</dt><dd className="font-mono">{selectedModel?.name || "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Dataset</dt><dd className="font-mono">{config.dataset || "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Learning Rate</dt><dd className="font-mono">{config.learningRate}</dd></div>
                  <div><dt className="text-muted-foreground">Batch Size</dt><dd className="font-mono">{config.batchSize}</dd></div>
                  <div><dt className="text-muted-foreground">Epochs</dt><dd className="font-mono">{config.epochs}</dd></div>
                  <div><dt className="text-muted-foreground">LoRA Rank</dt><dd className="font-mono">{config.loraRank}</dd></div>
                  <div><dt className="text-muted-foreground">Max Seq Length</dt><dd className="font-mono">{config.maxSeqLength}</dd></div>
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
            <Button onClick={() => setStep(step + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleLaunch}>
              <Rocket className="h-4 w-4 mr-1" /> Launch Job
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewJob;
