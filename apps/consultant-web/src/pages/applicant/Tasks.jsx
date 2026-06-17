import { useCallback, useEffect, useMemo, useState } from "react";
import ApplicantLayout from "../../components/layout/ApplicantLayout";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../context/AuthContext";
import applicantTaskService from "../../services/applicantTaskService";
import { toast } from "sonner";
import { Loader2, RefreshCw, Calendar, Clock, Paperclip } from "lucide-react";

const StudentTasks = () => {
  const { user } = useAuth();
  const aiKey = user?.aiKey;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
        const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const db2 = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        if (da && db2) return da - db2;
        if (da) return -1;
        if (db2) return 1;
        return new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0);
      }),
    [tasks]
  );

  const fetchTasks = useCallback(async () => {
    if (!aiKey) return;
    try {
      setLoading(true);
      const list = await applicantTaskService.list(aiKey, { markSeen: true });
      setTasks(list);
    } catch {
      toast.error("Unable to load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [aiKey]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleToggleComplete = async (task) => {
    if (!aiKey || !task?.id) return;
    const next = task.status === "completed" ? "pending" : "completed";
    setUpdatingTaskId(task.id);
    try {
      const list = await applicantTaskService.update(aiKey, task.id, { status: next });
      setTasks(list);
    } catch {
      toast.error("Unable to update task status.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDownload = async (task) => {
    if (!aiKey || !task?.id) return;
    try {
      const url = await applicantTaskService.attachmentUrl(aiKey, task.id);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Unable to download attachment.");
    }
  };

  const handleDelete = async (task) => {
    if (!aiKey || !task?.id) return;
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;
    setDeletingTaskId(task.id);
    try {
      const list = await applicantTaskService.delete(aiKey, task.id);
      setTasks(list);
    } catch {
      toast.error("Unable to delete task.");
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <ApplicantLayout>
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review tasks assigned by your advisor and track due dates.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold">No tasks assigned</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You're all caught up! Check back later for new tasks.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold">{task.title}</h3>
                        <Badge
                          variant={task.status === "completed" ? "default" : "secondary"}
                          className={
                            task.status === "completed"
                              ? "bg-emerald-600 hover:bg-emerald-600"
                              : ""
                          }
                        >
                          {task.status === "completed" ? "Completed" : "Pending"}
                        </Badge>
                      </div>

                      {task.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {task.assignedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Assigned: {new Date(task.assignedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t pt-4 md:border-t-0 md:pt-0 md:pl-4 md:border-l md:flex-col lg:flex-row">
                      <Button
                        size="sm"
                        variant={task.status === "completed" ? "outline" : "default"}
                        onClick={() => handleToggleComplete(task)}
                        disabled={updatingTaskId === task.id}
                      >
                        {updatingTaskId === task.id && (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
                        {task.status === "completed" ? "Mark Pending" : "Mark Complete"}
                      </Button>

                      {task.attachment && (
                        <Button size="sm" variant="outline" onClick={() => handleDownload(task)}>
                          <Paperclip className="mr-2 h-3.5 w-3.5" />
                          Download
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(task)}
                        disabled={deletingTaskId === task.id}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        {deletingTaskId === task.id && (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ApplicantLayout>
  );
};

export default StudentTasks;
