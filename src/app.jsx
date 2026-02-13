import 'antd/dist/reset.css';
import './global.css';

const API_PREFIX = '/api';

const shouldPrefix = (url) =>
  url.startsWith('/') && !url.startsWith(API_PREFIX) && !url.startsWith('//');

const getCookie = (name) => {
  if (typeof document === 'undefined') {
    return '';
  }
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift() || '';
  }
  return '';
};

export const request = {
  timeout: 60000,
  requestInterceptors: [
    (url, options) => {
      const nextUrl = shouldPrefix(url) ? `${API_PREFIX}${url}` : url;
  
      return {
        url: nextUrl,
        options: {
          ...options,
          credentials: 'include',
          headers: {
            ...options?.headers,
          },
        },
      };
    },
  ],
};

