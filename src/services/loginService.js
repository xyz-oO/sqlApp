import { request } from 'umi';

export const LoginService = async ({ username, password }) => {
  try {
    return await request('/login', {
      method: 'POST',
      data: { username, password },
    });
  } catch (error) {
    if (error?.response?.status === 401) {
      throw new Error('Wrong username or password.');
    }
    throw error;
  }
};