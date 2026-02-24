import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useJobs } from "@/hooks/useJobs";
import { useMetrics } from "@/hooks/useMetrics";
import { Download, Eye, GitCompare } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

const colors = [
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
];

const Results = () => {
  const { jobs, loading } = useJobs();
  const completedJobs = jobs.filter((j) => j.status === "complete");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Results & Export</h1>
          <p className="text-sm text-muted-foreground">View completed runs, compare performance, and download models</p>
        </div>

        {completedJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No completed jobs yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Completed Runs</CardTitle>
                  {compareIds.length >= 2 && (
                    <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                      <GitCompare className="h-3 w-3 mr-1" /> Comparing {compareIds.length} runs
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Compare</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedJobs.map((job) => {
                      const duration = job.started_at && job.completed_at
                        ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 60000)} min`
                        : "—";
                      return (
                        <TableRow key={job.id}>
                          <TableCell>
                            <Checkbox
                              checked={compareIds.includes(job.id)}
                              onCheckedChange={() => toggleCompare(job.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{job.name}</TableCell>
                          <TableCell className="text-muted-foreground">{job.base_model}</TableCell>
                          <TableCell className="font-mono text-sm">{duration}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {job.completed_at ? new Date(job.completed_at).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/jobs/${job.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => toast.info("Download available when HPC server is connected")}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Comparison overlay chart */}
            {compareIds.length >= 2 && <CompareOverlay jobIds={compareIds} />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

function CompareOverlay({ jobIds }: { jobIds: string[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Run Comparison — Loss Curves</CardTitle></CardHeader>
      <CardContent>
        <div className="h-72">
          <MultiJobChart jobIds={jobIds} />
        </div>
        <div className="mt-4">
          <CompareMetricsTable jobIds={jobIds} />
        </div>
      </CardContent>
    </Card>
  );
}

function MultiJobChart({ jobIds }: { jobIds: string[] }) {
  // Fetch metrics for all jobs
  const allMetrics: Record<string, any[]> = {};
  jobIds.forEach((id) => {
    const { metrics } = useMetrics(id);
    allMetrics[id] = metrics;
  });

  // Merge into single dataset by step
  const stepMap = new Map<number, any>();
  jobIds.forEach((id, idx) => {
    allMetrics[id].forEach((m) => {
      const existing = stepMap.get(m.step) || { step: m.step };
      existing[`loss_${idx}`] = m.train_loss;
      stepMap.set(m.step, existing);
    });
  });
  const data = Array.from(stepMap.values()).sort((a, b) => a.step - b.step);

  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No metrics available for selected runs.</p>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {jobIds.map((id, idx) => (
          <Line key={id} type="monotone" dataKey={`loss_${idx}`} name={id.slice(0, 8)} stroke={colors[idx % colors.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function CompareMetricsTable({ jobIds }: { jobIds: string[] }) {
  const rows = jobIds.map((id, idx) => {
    const { metrics } = useMetrics(id);
    const last = metrics[metrics.length - 1];
    return { id, color: colors[idx % colors.length], finalLoss: last?.train_loss, perplexity: last?.perplexity, steps: metrics.length };
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead>Final Loss</TableHead>
          <TableHead>Perplexity</TableHead>
          <TableHead>Steps</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-sm">{r.id.slice(0, 8)}...</TableCell>
            <TableCell className="font-mono text-sm">{r.finalLoss?.toFixed(4) ?? "—"}</TableCell>
            <TableCell className="font-mono text-sm">{r.perplexity?.toFixed(2) ?? "—"}</TableCell>
            <TableCell className="font-mono text-sm">{r.steps}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default Results;
