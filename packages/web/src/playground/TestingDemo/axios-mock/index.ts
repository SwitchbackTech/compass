import axios from "axios";
export type Todo = {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
};

export const getTodos = async (): Promise<Todo[]> => {
  try {
    const url = "https://jsonplaceholder.typicode.com/todos";
    const resp = await axios.get(url);
    if (resp.status !== 200) {
      throw new Error("Something went wrong");
    }
    const data: Todo[] = await resp.data;
    return data;
  } catch (err) {
    throw err;
  }
};
