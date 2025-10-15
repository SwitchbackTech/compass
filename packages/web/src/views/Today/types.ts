import { z } from "zod";

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "completed"]),
  createdAt: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

export const isTask = (data: unknown): data is Task =>
  TaskSchema.safeParse(data).success;

export interface TaskContextValue {
  tasks: Task[];
  addTask: (title: string) => Task;
  updateTaskTitle: (taskId: string, title: string) => void;
  toggleTaskStatus: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
}
