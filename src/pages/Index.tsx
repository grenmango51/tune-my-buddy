import { Link } from "react-router-dom";
import { useJobs } from "@/hooks/useJobs";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, CheckCircle2, XCircle, Clock, Play, Plus, Loader2, Rocket } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  queued: { label: "Queued", className: "bg-warning/10 text-warning border-warning/20", icon: <Clock className="h-3 w-3" /> },
  preprocessing: { label: "Preprocessing", className: "bg-info/10 text-info border-info/20", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  training: { label: "Training", className: "bg-info/10 text-info border-info/20", icon: <Play className="h-3 w-3" /> },
  validating: { label: "Validating", className: "bg-info/10 text-info border-info/20", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  complete: { label: "Complete", className: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border", icon: <XCircle className="h-3 w-3" /> },
};

const Index = () => {
  const { jobs, loading } = useJobs();

  const stats = {
    total: jobs.length,
    running: jobs.filter((j) => ["training", "preprocessing", "queued", "validating"].includes(j.status)).length,
    completed: jobs.filter((j) => j.status === "complete").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  const statCards = [
    { label: "Total Jobs", value: stats.total, icon: <Activity className="h-5 w-5 text-muted-foreground" /> },
    { label: "Active", value: stats.running, icon: <Play className="h-5 w-5 text-info" /> },
    { label: "Completed", value: stats.completed, icon: <CheckCircle2 className="h-5 w-5 text-success" /> },
    { label: "Failed", value: stats.failed, icon: <XCircle className="h-5 w-5 text-destructive" /> },
  ];

  // Recent activity = last 10 job status events sorted by updated_at
  const recentActivity = [...jobs]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">HPC fine-tuning at a glance</p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link to="/jobs/new"><Rocket className="h-4 w-4" /> Launch New Job</Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                {s.icon}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "—" : s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Jobs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Jobs</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/jobs" className="text-xs text-muted-foreground">View All →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground text-sm">No jobs yet. Launch your first fine-tuning job to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.slice(0, 10).map((job) => {
                    const cfg = statusConfig[job.status] || statusConfig.queued;
                    return (
                      <TableRow key={job.id} className="cursor-pointer">
                        <TableCell>
                          <Link to={`/jobs/${job.id}`} className="font-medium hover:underline">{job.name}</Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{job.base_model}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cfg.className}>
                            <span className="mr-1">{cfg.icon}</span>{cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {job.started_at ? new Date(job.started_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{job.progress}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        {recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((job) => {
                  const cfg = statusConfig[job.status] || statusConfig.queued;
                  return (
                    <div key={job.id} className="flex items-center gap-3 text-sm">
                      <div className="flex h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span className="text-muted-foreground">
                        {new Date(job.updated_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <Link to={`/jobs/${job.id}`} className="font-medium hover:underline truncate">{job.name}</Link>
                      <Badge variant="outline" className={`${cfg.className} ml-auto shrink-0`}>
                        {cfg.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
