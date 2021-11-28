import axios, { AxiosResponse } from "axios";
import { getTodos, Todo } from ".";

//jest.mock(...) is used to automatically mock the axios module.jest.mock('axios');
// Create an object of type of mocked Axios.
const mockedAxios = axios as jest.Mocked<typeof axios>;
//initialize value of axios.get
mockedAxios.get = jest.fn();

describe("getTodos()", () => {
  test("should return todo list", async () => {
    //Our desired output
    const todos: Todo[] = [
      {
        userId: 1,
        id: 1,
        title: "todo-test-1",
        completed: false,
      },
      {
        userId: 2,
        id: 2,
        title: "todo-test-2",
        completed: true,
      },
    ];

    //Prepare the response we want to get from axios
    const mockedResponse: AxiosResponse = {
      data: todos,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    };

    // Make the mock return the custom axios response
    mockedAxios.get.mockResolvedValueOnce(mockedResponse);
    expect(axios.get).not.toHaveBeenCalled();
    const data = await getTodos();
    expect(axios.get).toHaveBeenCalled();
    expect(data).toEqual(todos);
  });
});
