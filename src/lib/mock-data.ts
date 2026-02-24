export type JobStatus = "running" | "completed" | "failed" | "queued";
export type ModelStatus = "ready" | "training" | "failed";

export interface FineTuneJob {
  id: string;
  name: string;
  baseModel: string;
  status: JobStatus;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  dataset: string;
  datasetSize: number;
  hyperparams: {
    learningRate: number;
    batchSize: number;
    epochs: number;
    loraRank: number;
    loraAlpha: number;
    warmupSteps: number;
    weightDecay: number;
    maxSeqLength: number;
  };
  metrics: { step: number; trainLoss: number; valLoss: number; lr: number }[];
  logs: string[];
}

export interface FineTunedModel {
  id: string;
  name: string;
  baseModel: string;
  status: ModelStatus;
  createdAt: string;
  jobId: string;
  evalLoss: number;
  perplexity: number;
  size: string;
}

// --- Base Models for card-based picker ---
export interface BaseModel {
  id: string;
  name: string;
  params: string;
  provider: string;
  vram: string;
  trainTimeEstimate: string;
  recommended?: boolean;
}

export const baseModels: BaseModel[] = [
  { id: "mistral-7b", name: "Mistral 7B", params: "7B", provider: "Mistral AI", vram: "~16 GB (4-bit)", trainTimeEstimate: "~2-4 hrs", recommended: true },
  { id: "llama3-8b", name: "LLaMA 3 8B", params: "8B", provider: "Meta", vram: "~18 GB (4-bit)", trainTimeEstimate: "~3-5 hrs" },
  { id: "phi3-mini", name: "Phi-3 Mini", params: "3.8B", provider: "Microsoft", vram: "~8 GB (4-bit)", trainTimeEstimate: "~1-2 hrs" },
];

// --- Mock data kept for reference ---
function generateMetrics(steps: number, startLoss: number, endLoss: number, failed = false) {
  const metrics = [];
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const noise = (Math.random() - 0.5) * 0.05;
    const decay = Math.exp(-3 * progress);
    const trainLoss = endLoss + (startLoss - endLoss) * decay + noise;
    const valLoss = trainLoss + 0.05 + Math.random() * 0.03;
    const lr = progress < 0.1 ? (progress / 0.1) * 2e-4 : 2e-4 * (1 - (progress - 0.1) / 0.9);
    if (failed && i > steps * 0.6) break;
    metrics.push({ step: i * 10, trainLoss: +trainLoss.toFixed(4), valLoss: +valLoss.toFixed(4), lr: +lr.toFixed(6) });
  }
  return metrics;
}

const logLines = (status: JobStatus) => {
  const base = [
    "[2024-01-15 09:00:01] Loading base model...",
    "[2024-01-15 09:00:15] Model loaded. Parameters: 7B",
    "[2024-01-15 09:00:16] Loading dataset...",
    "[2024-01-15 09:00:20] Dataset loaded. 12,450 samples.",
    "[2024-01-15 09:00:21] Initializing LoRA adapters...",
    "[2024-01-15 09:00:22] Starting training...",
  ];
  if (status === "failed") {
    return [...base, "[2024-01-15 09:06:00] ERROR: CUDA out of memory."];
  }
  if (status === "completed") {
    return [...base, "[2024-01-15 10:30:00] Training complete. Final loss: 0.4521"];
  }
  return base;
};

export const mockJobs: FineTuneJob[] = [];
export const mockModels: FineTunedModel[] = [];
