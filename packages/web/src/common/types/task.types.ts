import { z } from "zod";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";

const TaskSchema = z.object({
  _id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "completed"]),
  order: z.number().default(0),
  createdAt: z.string().datetime(),
  description: z.string().max(255).optional(),
  user: z.string().default(UNAUTHENTICATED_USER),
});

export type Task = z.input<typeof TaskSchema>;

export const isTask = (data: unknown): data is Task =>
  TaskSchema.safeParse(data).success;

export const normalizeTask = (task: Task): Task => TaskSchema.parse(task);

export const normalizeTasks = (tasks: Task[]): Task[] =>
  tasks.map(normalizeTask);

export type UndoOperation = {
  type: "delete" | "migrate";
  task: Task;
  // Migration-specific metadata
  fromDate?: string;
  direction?: "forward" | "backward";
};
