import { useParams, Link } from "react-router-dom";
import { useJob } from "@/hooks/useJobs";
import { useMetrics, useLogs } from "@/hooks/useMetrics";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, StopCircle, Loader2, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

const statusSteps = ["queued", "preprocessing", "training", "validating", "complete"];
const statusLabels: Record<string, string> = {
  queued: "Queued",
  preprocessing: "Preprocessing",
  training: "Training",
  validating: "Validating",
  complete: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};

const statusBadgeClass: Record<string, string> = {
  queued: "bg-warning/10 text-warning border-warning/20",
  preprocessing: "bg-info/10 text-info border-info/20",
  training: "bg-info/10 text-info border-info/20",
  validating: "bg-info/10 text-info border-info/20",
  complete: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const JobMonitoring = () => {
  const { jobId } = useParams();
  const { job, loading: jobLoading } = useJob(jobId);
  const { metrics } = useMetrics(jobId);
  const { logs } = useLogs(jobId);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState("");

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Elapsed timer
  useEffect(() => {
    if (!job?.started_at) return;
    const interval = setInterval(() => {
      const start = new Date(job.started_at!).getTime();
      const end = job.completed_at ? new Date(job.completed_at).getTime() : Date.now();
      const diff = end - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [job?.started_at, job?.completed_at]);

  if (jobLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Job not found.</p>
          <Link to="/" className="mt-2 text-sm text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </DashboardLayout>
    );
  }

  const isActive = ["queued", "preprocessing", "training", "validating"].includes(job.status);
  const config = job.config as Record<string, any>;
  const currentStepIdx = statusSteps.indexOf(job.status);
  const latestMetric = metrics[metrics.length - 1];

  const handleCancel = async () => {
    try {
      await supabase.functions.invoke("hpc-proxy", {
        body: { action: "cancel", job_id: job.id, hpc_job_id: job.hpc_job_id },
      });
      await supabase.from("jobs").update({ status: "cancelled" }).eq("id", job.id);
      toast.success("Job cancelled");
    } catch {
      toast.error("Failed to cancel job");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/jobs" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{job.name}</h1>
              <Badge variant="outline" className={statusBadgeClass[job.status] || statusBadgeClass.queued}>
                {statusLabels[job.status] || job.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{job.base_model}</p>
          </div>
          {isActive && (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <StopCircle className="h-4 w-4 mr-1" /> Cancel Job
            </Button>
          )}
        </div>

        {/* Status Stepper */}
        {job.status !== "failed" && job.status !== "cancelled" && (
          <div className="flex items-center gap-1">
            {statusSteps.map((s, i) => {
              const isDone = i < currentStepIdx || job.status === "complete";
              const isCurrent = i === currentStepIdx && job.status !== "complete";
              return (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium shrink-0 ${
                    isDone ? "bg-primary text-primary-foreground" : isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"
                  }`}>
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${isDone || isCurrent ? "text-foreground" : "text-muted-foreground"}`}>{statusLabels[s]}</span>
                  {i < statusSteps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${isDone ? "bg-primary" : "bg-muted"}`} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-4">
          <Progress value={job.progress} className="h-2 flex-1" />
          <span className="text-sm font-mono font-medium">{job.progress}%</span>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">SLURM Job ID</p>
              <p className="font-mono text-sm font-medium">{job.slurm_job_id || "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Started</p>
              <p className="text-sm font-medium">{job.started_at ? new Date(job.started_at).toLocaleString() : "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Elapsed</p>
              <p className="font-mono text-sm font-medium">{elapsed || "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Current Loss</p>
              <p className="font-mono text-sm font-medium">{latestMetric?.train_loss?.toFixed(4) ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Metrics Charts */}
        {metrics.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Loss Curve</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="train_loss" name="Train Loss" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="val_loss" name="Eval Loss" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Perplexity</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.filter((m) => m.perplexity != null)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                      <Line type="monotone" dataKey="perplexity" name="Perplexity" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Training Config */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Training Configuration</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              {Object.entries(config).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="font-mono font-medium">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Log Viewer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              Training Logs
              {isActive && <span className="h-2 w-2 rounded-full bg-success animate-pulse" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-72">
              <div className="space-y-0.5 p-4 font-mono text-xs leading-relaxed bg-card">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground">No logs yet...</p>
                ) : (
                  logs.slice(-100).map((log) => (
                    <div key={log.id} className={
                      log.level === "error" ? "text-destructive" :
                      log.level === "warn" ? "text-warning" :
                      "text-muted-foreground"
                    }>
                      <span className="text-muted-foreground/50">[{new Date(log.created_at).toLocaleTimeString()}]</span> {log.message}
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default JobMonitoring;
