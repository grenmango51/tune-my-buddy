import { Link } from "react-router-dom";
import { useJobs } from "@/hooks/useJobs";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Clock, Loader2, Play, CheckCircle2, XCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  queued: { label: "Queued", className: "bg-warning/10 text-warning border-warning/20", icon: <Clock className="h-3 w-3" /> },
  preprocessing: { label: "Preprocessing", className: "bg-info/10 text-info border-info/20", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  training: { label: "Training", className: "bg-info/10 text-info border-info/20", icon: <Play className="h-3 w-3" /> },
  validating: { label: "Validating", className: "bg-info/10 text-info border-info/20", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  complete: { label: "Complete", className: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border", icon: <XCircle className="h-3 w-3" /> },
};

const JobList = () => {
  const { jobs, loading } = useJobs();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">All Jobs</h1>
            <p className="text-sm text-muted-foreground">View and manage all fine-tuning runs</p>
          </div>
          <Button asChild>
            <Link to="/jobs/new"><Plus className="h-4 w-4 mr-1" /> New Job</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground text-sm">No jobs yet.</p>
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
                  {jobs.map((job) => {
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
      </div>
    </DashboardLayout>
  );
};

export default JobList;
