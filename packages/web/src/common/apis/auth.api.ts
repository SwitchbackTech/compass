import axios from 'axios';

import { BASEURL } from '@common/constants/api';
import { GOOGLE } from '@common/constants/common';

const headers = {
  // TODO dry
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
};

const AuthApi = {
  async checkOauthStatus(integration: string) {
    if (integration === GOOGLE) {
      const authState = localStorage.getItem('authState');
      const url = `${BASEURL}/auth/oauth-status?integration=${GOOGLE}&state=${authState}`;
      const response = await axios.get(url);
      return response.data;
    }
    console.log('sth is up');
  },

  async getOauthData(integration: string) {
    if (integration === GOOGLE) {
      const response = await axios.get(
        `${BASEURL}/auth/oauth-url?integration=${GOOGLE}`
      );
      return response.data;
    }
    return { e: `${integration}not supported` };
  },

  async refresh() {
    try {
      const response = await axios.post(
        `${BASEURL}/auth/refresh-token`,
        {},
        headers
      );
      return response.data;
    } catch (err) {
      console.log('err while refreshing token:', err);
      return false;
    }
  },
};

export { AuthApi };
