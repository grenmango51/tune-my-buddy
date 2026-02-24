import { useParams, Link } from "react-router-dom";
import { mockJobs } from "@/lib/mock-data";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const statusConfig: Record<string, { label: string; className: string }> = {
  running: { label: "Running", className: "bg-info/10 text-info border-info/20" },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20" },
  queued: { label: "Queued", className: "bg-warning/10 text-warning border-warning/20" },
};

const JobDetail = () => {
  const { jobId } = useParams();
  const job = mockJobs.find((j) => j.id === jobId);

  if (!job) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Job not found.</p>
          <Link to="/" className="mt-2 text-sm text-info hover:underline">Back to Dashboard</Link>
        </div>
      </DashboardLayout>
    );
  }

  const cfg = statusConfig[job.status];
  const hp = job.hyperparams;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{job.name}</h1>
              <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{job.baseModel} · {job.dataset}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Progress value={job.progress} className="h-2 flex-1" />
          <span className="text-sm font-mono font-medium">{job.progress}%</span>
        </div>

        {/* Charts */}
        {job.metrics.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Training & Validation Loss</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={job.metrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="trainLoss" name="Train Loss" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="valLoss" name="Val Loss" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Learning Rate</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={job.metrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                      <Line type="monotone" dataKey="lr" name="Learning Rate" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Config + Dataset */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Hyperparameters</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["Learning Rate", hp.learningRate],
                  ["Batch Size", hp.batchSize],
                  ["Epochs", hp.epochs],
                  ["LoRA Rank", hp.loraRank],
                  ["LoRA Alpha", hp.loraAlpha],
                  ["Warmup Steps", hp.warmupSteps],
                  ["Weight Decay", hp.weightDecay],
                  ["Max Seq Length", hp.maxSeqLength],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt className="text-muted-foreground">{String(k)}</dt>
                    <dd className="font-mono font-medium">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Dataset</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">File: </span>
                <span className="font-mono">{job.dataset}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Samples: </span>
                <span className="font-mono">{job.datasetSize.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Training Logs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-60">
              <div className="space-y-0.5 p-4 font-mono text-xs leading-relaxed">
                {job.logs.map((line, i) => (
                  <div key={i} className={line.includes("ERROR") ? "text-destructive" : "text-muted-foreground"}>
                    {line}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default JobDetail;
