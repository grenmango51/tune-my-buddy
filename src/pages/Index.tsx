import { Link } from "react-router-dom";
import { mockJobs } from "@/lib/mock-data";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, CheckCircle2, XCircle, Clock, Play } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  running: { label: "Running", className: "bg-info/10 text-info border-info/20", icon: <Play className="h-3 w-3" /> },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" /> },
  queued: { label: "Queued", className: "bg-warning/10 text-warning border-warning/20", icon: <Clock className="h-3 w-3" /> },
};

const Index = () => {
  const stats = {
    total: mockJobs.length,
    running: mockJobs.filter((j) => j.status === "running").length,
    completed: mockJobs.filter((j) => j.status === "completed").length,
    failed: mockJobs.filter((j) => j.status === "failed").length,
  };

  const statCards = [
    { label: "Total Jobs", value: stats.total, icon: <Activity className="h-4 w-4 text-muted-foreground" /> },
    { label: "Running", value: stats.running, icon: <Play className="h-4 w-4 text-info" /> },
    { label: "Completed", value: stats.completed, icon: <CheckCircle2 className="h-4 w-4 text-success" /> },
    { label: "Failed", value: stats.failed, icon: <XCircle className="h-4 w-4 text-destructive" /> },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor your LLM fine-tuning jobs</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                {s.icon}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Base Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Loss Curve</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockJobs.map((job) => {
                  const cfg = statusConfig[job.status];
                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Link to={`/jobs/${job.id}`} className="font-medium hover:underline">
                          {job.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{job.baseModel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.className}>
                          <span className="mr-1">{cfg.icon}</span>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.metrics.length > 0 ? (
                          <div className="h-8 w-24">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={job.metrics.slice(-30)}>
                                <Line type="monotone" dataKey="trainLoss" stroke="hsl(var(--info))" strokeWidth={1.5} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(job.startedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{job.progress}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;
