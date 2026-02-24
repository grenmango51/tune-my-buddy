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
                  <CardTitle className="text-sm">Completed Runs</CardTitle>
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
                      <TableHead>Base Model</TableHead>
                      <TableHead>Final Loss</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedJobs.map((job) => {
                      const config = job.config as Record<string, any>;
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
                          <TableCell className="font-mono text-sm">—</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {job.completed_at ? new Date(job.completed_at).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/jobs/${job.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => toast.info("Download will be available when HPC server is connected")}>
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

            {compareIds.length >= 2 && <ComparePanel jobIds={compareIds} />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

function ComparePanel({ jobIds }: { jobIds: string[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Run Comparison</CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          {jobIds.map((id) => (
            <CompareChart key={id} jobId={id} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CompareChart({ jobId }: { jobId: string }) {
  const { metrics } = useMetrics(jobId);

  if (metrics.length === 0) {
    return <p className="text-sm text-muted-foreground">No metrics for job {jobId.slice(0, 8)}...</p>;
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2 font-mono">{jobId.slice(0, 8)}...</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="step" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }} />
            <Line type="monotone" dataKey="train_loss" name="Loss" stroke="hsl(var(--info))" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Results;
