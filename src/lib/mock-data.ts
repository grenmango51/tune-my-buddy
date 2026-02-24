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
    "[2024-01-15 09:01:00] Step 10 | Loss: 2.3421 | LR: 2.00e-05",
    "[2024-01-15 09:02:00] Step 20 | Loss: 2.1087 | LR: 4.00e-05",
    "[2024-01-15 09:03:00] Step 30 | Loss: 1.8934 | LR: 6.00e-05",
    "[2024-01-15 09:04:00] Step 40 | Loss: 1.7201 | LR: 8.00e-05",
    "[2024-01-15 09:05:00] Step 50 | Loss: 1.5892 | LR: 1.00e-04",
  ];
  if (status === "failed") {
    return [...base, "[2024-01-15 09:06:00] ERROR: CUDA out of memory. Tried to allocate 2.00 GiB.", "[2024-01-15 09:06:01] Training aborted."];
  }
  if (status === "completed") {
    return [...base, "[2024-01-15 10:30:00] Training complete. Final loss: 0.4521", "[2024-01-15 10:30:01] Saving model checkpoint...", "[2024-01-15 10:30:15] Model saved successfully."];
  }
  return base;
};

export const mockJobs: FineTuneJob[] = [
  {
    id: "job-001",
    name: "llama3-customer-support",
    baseModel: "Llama 3 8B",
    status: "running",
    progress: 64,
    startedAt: "2024-01-15T09:00:00Z",
    completedAt: null,
    dataset: "customer-support-v2.jsonl",
    datasetSize: 12450,
    hyperparams: { learningRate: 2e-4, batchSize: 8, epochs: 3, loraRank: 16, loraAlpha: 32, warmupSteps: 100, weightDecay: 0.01, maxSeqLength: 2048 },
    metrics: generateMetrics(60, 2.5, 0.45),
    logs: logLines("running"),
  },
  {
    id: "job-002",
    name: "mistral-code-review",
    baseModel: "Mistral 7B v0.2",
    status: "completed",
    progress: 100,
    startedAt: "2024-01-14T14:00:00Z",
    completedAt: "2024-01-14T18:30:00Z",
    dataset: "code-review-pairs.jsonl",
    datasetSize: 8320,
    hyperparams: { learningRate: 1e-4, batchSize: 4, epochs: 5, loraRank: 32, loraAlpha: 64, warmupSteps: 50, weightDecay: 0.005, maxSeqLength: 4096 },
    metrics: generateMetrics(100, 2.8, 0.38),
    logs: logLines("completed"),
  },
  {
    id: "job-003",
    name: "llama3-summarization",
    baseModel: "Llama 3 70B",
    status: "failed",
    progress: 62,
    startedAt: "2024-01-14T10:00:00Z",
    completedAt: "2024-01-14T12:15:00Z",
    dataset: "arxiv-summaries.jsonl",
    datasetSize: 25000,
    hyperparams: { learningRate: 5e-5, batchSize: 2, epochs: 2, loraRank: 64, loraAlpha: 128, warmupSteps: 200, weightDecay: 0.01, maxSeqLength: 8192 },
    metrics: generateMetrics(60, 3.1, 0.5, true),
    logs: logLines("failed"),
  },
  {
    id: "job-004",
    name: "mistral-chat-assistant",
    baseModel: "Mistral 7B v0.2",
    status: "completed",
    progress: 100,
    startedAt: "2024-01-13T08:00:00Z",
    completedAt: "2024-01-13T14:00:00Z",
    dataset: "chat-multiturn.jsonl",
    datasetSize: 15600,
    hyperparams: { learningRate: 2e-4, batchSize: 8, epochs: 3, loraRank: 16, loraAlpha: 32, warmupSteps: 100, weightDecay: 0.01, maxSeqLength: 2048 },
    metrics: generateMetrics(100, 2.6, 0.42),
    logs: logLines("completed"),
  },
  {
    id: "job-005",
    name: "phi3-sql-gen",
    baseModel: "Phi-3 Mini",
    status: "queued",
    progress: 0,
    startedAt: "2024-01-15T10:00:00Z",
    completedAt: null,
    dataset: "text-to-sql.jsonl",
    datasetSize: 5400,
    hyperparams: { learningRate: 3e-4, batchSize: 16, epochs: 4, loraRank: 8, loraAlpha: 16, warmupSteps: 50, weightDecay: 0.01, maxSeqLength: 1024 },
    metrics: [],
    logs: ["[2024-01-15 10:00:00] Job queued. Waiting for GPU resources..."],
  },
];

export const mockModels: FineTunedModel[] = [
  { id: "model-001", name: "mistral-code-review-v1", baseModel: "Mistral 7B v0.2", status: "ready", createdAt: "2024-01-14T18:30:00Z", jobId: "job-002", evalLoss: 0.38, perplexity: 1.46, size: "4.2 GB" },
  { id: "model-002", name: "mistral-chat-v1", baseModel: "Mistral 7B v0.2", status: "ready", createdAt: "2024-01-13T14:00:00Z", jobId: "job-004", evalLoss: 0.42, perplexity: 1.52, size: "4.1 GB" },
  { id: "model-003", name: "llama3-cs-v2", baseModel: "Llama 3 8B", status: "training", createdAt: "2024-01-15T09:00:00Z", jobId: "job-001", evalLoss: 0, perplexity: 0, size: "—" },
  { id: "model-004", name: "llama3-summarizer", baseModel: "Llama 3 70B", status: "failed", createdAt: "2024-01-14T12:15:00Z", jobId: "job-003", evalLoss: 0, perplexity: 0, size: "—" },
];

export const baseModels = [
  { id: "llama3-8b", name: "Llama 3 8B", params: "8B", provider: "Meta" },
  { id: "llama3-70b", name: "Llama 3 70B", params: "70B", provider: "Meta" },
  { id: "mistral-7b", name: "Mistral 7B v0.2", params: "7B", provider: "Mistral AI" },
  { id: "phi3-mini", name: "Phi-3 Mini", params: "3.8B", provider: "Microsoft" },
  { id: "gemma-7b", name: "Gemma 7B", params: "7B", provider: "Google" },
];
