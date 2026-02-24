import { mockModels } from "@/lib/mock-data";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Eye, Rocket } from "lucide-react";
import { toast } from "sonner";

const modelStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  ready: { label: "Ready", className: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  training: { label: "Training", className: "bg-info/10 text-info border-info/20", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" /> },
};

const Models = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
          <p className="text-sm text-muted-foreground">Fine-tuned models and their performance</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Base Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Eval Loss</TableHead>
                  <TableHead>Perplexity</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockModels.map((model) => {
                  const cfg = modelStatusConfig[model.status];
                  return (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium font-mono text-sm">{model.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{model.baseModel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.className}>
                          <span className="mr-1">{cfg.icon}</span>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{model.evalLoss || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{model.perplexity || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{model.size}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(model.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/jobs/${model.jobId}`}><Eye className="h-3.5 w-3.5" /></Link>
                          </Button>
                          {model.status === "ready" && (
                            <Button variant="ghost" size="sm" onClick={() => toast.info("Deploy is a mock action")}>
                              <Rocket className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
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

export default Models;
