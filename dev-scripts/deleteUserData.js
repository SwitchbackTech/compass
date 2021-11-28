import axios from 'axios'

//TODO just import Api calls from the files instead of duplicating them here

const token = // manually update this for your user as needed
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MTJkMmUyNDczOTg4ODRlNzE3Y2ZjYjAiLCJpYXQiOjE2MzAzNTc2NzIsImV4cCI6MTYzMTY1MzY3Mn0.Ds_E6lBUVAoZCs-biObBAEoZDiny0Eu0IFaS1yvZ_ao";

// TODO move API calls to utils file, adding support for token param
const BASEURL = 'https://***REMOVED***'
// const BASEURL = "http://localhost:3000";
const headers = {
  headers: {
    Authorization: `Bearer ${token}`,
  },
};

const deleteEvts = async () => {
  const deleteResponse = await axios.delete(
    `${BASEURL}/event/deleteAll`,
    headers
  );
  return deleteResponse.data;
};

const deletePriority = async (pId) => {
  const deleteResponse = await axios.delete(
    `${BASEURL}/priority/delete?priority=${pId}`,
    headers
  );
  return deleteResponse;
};

// delete user's priorities
const deletePriorities = async () => {
  const response = await axios.get(BASEURL + "/priority/find", headers);
  const priorities = response.data;

  for (let i = 0; i < priorities.length; i++) {
    const pId = priorities[i]._id;
    deletePriority(pId);
  }
  return { deletedCount: priorities.length };
};

const deleteUser = async () => {
  const user = await axios.get(BASEURL + "/user/find", headers);

  if (Array.isArray(user) && user.length) {
    const response = axios.delete(
      `${BASEURL}/user/delete?userId=${user._id}`,
      headers
    );
    return response.data;
  } else {
    return { deletedCount: 0 };
  }
};

async function deleteAllUserData() {
  console.log("deleting user data ...");
  const priResp = await deletePriorities();
  const evtResp = await deleteEvts();
  const userResp = await deleteUser();

  const parseResponse = (resp) => {
    if (resp !== undefined && resp.deletedCount !== undefined) {
      return resp.deletedCount;
    } else return "failed";
  };

  const evtsDeleted = parseResponse(evtResp);
  const usersDeleted = parseResponse(userResp);
  const priDeleted = parseResponse(priResp);
  const summary = {
    user: usersDeleted,
    events: evtsDeleted,
    priorities: priDeleted,
  };
  console.log("Finished. Summary:\n");
  console.log(summary);
}

module.exports = { deleteAllUserData };
