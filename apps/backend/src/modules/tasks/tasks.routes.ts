import { Router, Request, Response } from 'express';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  reassignTask,
  markTasksRead,
  formatTask,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskType,
  type TaskStatus,
} from './tasks.service';

export const tasksRouter = Router();

function svcError(res: Response, err: unknown) {
  const e = err as { statusCode?: number; message?: string };
  return res.status(e.statusCode ?? 500).json({
    success: false,
    message: e.message ?? 'Internal error',
  });
}

// ---------------------------------------------------------------------------
// GET /api/tasks
// Query params: type, status, scope, limit, page
// scope=notifications: returns open + unread tasks for notification badge
// ---------------------------------------------------------------------------
tasksRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { type, status, scope, limit, page } = req.query as Record<string, string>;
    const result = await listTasks(req.db, {
      type,
      status,
      scope,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tasks
// Body: { task_type?, title, description?, student_id?, document_id?,
//         assigned_to?, due_at?, metadata? }
// ---------------------------------------------------------------------------
tasksRouter.post('/', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const userId = req.context!.userId ?? undefined;
    const body = req.body as CreateTaskInput;

    if (!body.title?.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const task = await createTask(req.db, firmId, {
      ...body,
      created_by: userId,
    });
    res.status(201).json({ success: true, task: formatTask(task) });
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tasks/notifications/read
// Body: { taskIds: string[] }
// ---------------------------------------------------------------------------
tasksRouter.post('/notifications/read', async (req: Request, res: Response) => {
  try {
    const { taskIds } = req.body as { taskIds?: string[] };
    if (!Array.isArray(taskIds)) {
      return res.status(400).json({ success: false, message: 'taskIds must be an array' });
    }
    const result = await markTasksRead(req.db, taskIds);
    res.json({ success: true, updated: result.updated });
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tasks/:taskId/complete
// Body: (optional) — uses authenticated userId as completedBy
// ---------------------------------------------------------------------------
tasksRouter.post('/:taskId/complete', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const userId = req.context!.userId ?? '';
    const task = await completeTask(req.db, taskId, userId);
    res.json({ success: true, task: formatTask(task) });
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tasks/:taskId/reassign
// Body: { userId: string }
// ---------------------------------------------------------------------------
tasksRouter.post('/:taskId/reassign', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const task = await reassignTask(req.db, taskId, userId);
    res.json({ success: true, task: formatTask(task) });
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:taskId
// Body: UpdateTaskInput
// ---------------------------------------------------------------------------
tasksRouter.patch('/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const body = req.body as UpdateTaskInput;
    const task = await updateTask(req.db, taskId, body);
    res.json({ success: true, task: formatTask(task) });
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/tasks/:taskId
// ---------------------------------------------------------------------------
tasksRouter.delete('/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    await deleteTask(req.db, taskId);
    res.json({ success: true });
  } catch (err) {
    svcError(res, err);
  }
});
