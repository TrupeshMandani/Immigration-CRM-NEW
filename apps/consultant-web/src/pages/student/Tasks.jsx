import { useCallback, useEffect, useMemo, useState } from "react";
import StudentLayout from "../../components/layout/StudentLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import { useAuth } from "../../context/AuthContext";
import studentTaskService from "../../services/studentTaskService";

const StudentTasks = () => {
  const { user } = useAuth();
  const aiKey = user?.aiKey;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Pending tasks first
      if (a.status !== b.status) {
        return a.status === "pending" ? -1 : 1;
      }

      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      if (dateA && dateB) return dateA - dateB;
      if (dateA) return -1;
      if (dateB) return 1;
      return new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0);
    });
  }, [tasks]);

  const fetchTasks = useCallback(async () => {
    if (!aiKey) return;
    try {
      setLoading(true);
      const list = await studentTaskService.list(aiKey, { markSeen: true });
      setTasks(list);
      setError("");
    } catch (err) {
      console.error("Failed to load student tasks:", err);
      setError("Unable to load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [aiKey]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleComplete = async (task) => {
    if (!aiKey || !task?.id) return;
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    setUpdatingTaskId(task.id);
    try {
      const list = await studentTaskService.update(aiKey, task.id, {
        status: nextStatus,
      });
      setTasks(list);
    } catch (err) {
      console.error("Failed to update task status:", err);
      setError("Unable to update task status. Try again.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDownloadAttachment = async (task) => {
    if (!aiKey || !task?.id) return;
    try {
      const url = await studentTaskService.attachmentUrl(aiKey, task.id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Failed to download attachment:", err);
      setError("Unable to download attachment.");
    }
  };

  const handleDeleteTask = async (task) => {
    if (!aiKey || !task?.id) return;
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;
    setDeletingTaskId(task.id);
    try {
      const list = await studentTaskService.delete(aiKey, task.id);
      setTasks(list);
    } catch (err) {
      console.error("Failed to delete task:", err);
      setError("Unable to delete task.");
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <StudentLayout>
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-900">Tasks</h1>
            <p className="text-sm text-primary-600 mt-1">
              Review the tasks assigned by your advisor and keep track of due
              dates.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTasks}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        ) : error ? (
          <Card>
            <Card.Body>
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            </Card.Body>
          </Card>
        ) : sortedTasks.length === 0 ? (
          <Card>
            <Card.Body className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-primary-50 p-3">
                <svg
                  className="h-8 w-8 text-primary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-primary-900">
                No tasks assigned
              </h3>
              <p className="mt-1 text-sm text-primary-600">
                You're all caught up! Check back later for new tasks.
              </p>
            </Card.Body>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-primary-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between md:justify-start md:gap-4">
                      <h3 className="text-lg font-semibold text-primary-900">
                        {task.title}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          task.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {task.status === "completed" ? "Completed" : "Pending"}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-primary-600 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-primary-500 pt-2">
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {task.assignedAt && (
                        <div className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Assigned: {new Date(task.assignedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center md:items-end lg:items-center pt-4 md:pt-0 border-t md:border-t-0 border-primary-100 md:pl-4 md:border-l">
                    <Button
                      size="sm"
                      variant={task.status === "completed" ? "outline" : "primary"}
                      onClick={() => handleToggleComplete(task)}
                      loading={updatingTaskId === task.id}
                      className="w-full sm:w-auto"
                    >
                      {task.status === "completed" ? "Mark Pending" : "Mark Complete"}
                    </Button>
                    
                    {task.attachment && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadAttachment(task)}
                        className="w-full sm:w-auto"
                      >
                        Download
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTask(task)}
                      loading={deletingTaskId === task.id}
                      className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentTasks;
