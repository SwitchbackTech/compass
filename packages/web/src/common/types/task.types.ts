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

export type UndoOperation = {
  type: "delete" | "migrate";
  task: Task;
  // Migration-specific metadata
  fromDate?: string;
  direction?: "forward" | "backward";
};
