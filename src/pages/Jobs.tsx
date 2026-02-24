import { mockJobs } from "@/lib/mock-data";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Play, CheckCircle2, XCircle, Clock } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  running: { label: "Running", className: "bg-info/10 text-info border-info/20", icon: <Play className="h-3 w-3" /> },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" /> },
  queued: { label: "Queued", className: "bg-warning/10 text-warning border-warning/20", icon: <Clock className="h-3 w-3" /> },
};

const Jobs = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">All fine-tuning jobs</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Base Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dataset</TableHead>
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
                        <Link to={`/jobs/${job.id}`} className="font-medium hover:underline">{job.name}</Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{job.baseModel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.className}>
                          <span className="mr-1">{cfg.icon}</span>{cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{job.dataset}</TableCell>
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

export default Jobs;
