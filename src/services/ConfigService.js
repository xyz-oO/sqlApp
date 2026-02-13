import { request } from 'umi';

/**
 * 配置服务 - 用于获取和管理数据库配置与SQL配置
 */
export const ConfigService = {
  /**
   * 获取所有数据库配置
   * @returns {Promise<Array>} 数据库配置列表
   */
  getDbConfigs: async () => {
    try {
      const data = await request('/db/config');
      return data?.configs || [];
    } catch (error) {
      console.error('Error fetching database configs:', error);
      return [];
    }
  },

  /**
   * 获取所有SQL配置
   * @returns {Promise<Array>} SQL配置列表
   */
  getSqlConfigs: async () => {
    try {
      const data = await request('/sql/config');
      return data?.configs || [];
    } catch (error) {
      console.error('Error fetching SQL configs:', error);
      return [];
    }
  },

  /**
   * 根据ID获取SQL配置
   * @param {string} configId - 配置ID
   * @returns {Promise<Object|null>} SQL配置对象
   */
  getSqlConfigById: async (configId) => {
    try {
      const data = await request(`/sql/config/${configId}`);
      return data?.config || null;
    } catch (error) {
      console.error(`Error fetching SQL config ${configId}:`, error);
      return null;
    }
  },

  /**
   * 更新数据库配置
   * @param {Object} config - 数据库配置对象
   * @returns {Promise<Object>} 更新结果
   */
  updateDbConfig: async (config) => {
    try {
      return await request('/db/config', {
        method: 'POST',
        data: config,
      });
    } catch (error) {
      console.error('Error updating database config:', error);
      throw error;
    }
  },

  /**
   * 创建新的SQL配置
   * @param {Object} config - SQL配置对象
   * @returns {Promise<Object>} 创建结果
   */
  createSqlConfig: async (config) => {
    try {
      return await request('/sql/config', {
        method: 'POST',
        data: config,
      });
    } catch (error) {
      console.error('Error creating SQL config:', error);
      throw error;
    }
  },

  /**
   * 更新SQL配置
   * @param {string} configId - 配置ID
   * @param {Object} config - SQL配置对象
   * @returns {Promise<Object>} 更新结果
   */
  updateSqlConfig: async (configId, config) => {
    try {
      return await request(`/sql/config/${configId}`, {
        method: 'PUT',
        data: config,
      });
    } catch (error) {
      console.error(`Error updating SQL config ${configId}:`, error);
      throw error;
    }
  },

  /**
   * 删除SQL配置
   * @param {string} configId - 配置ID
   * @returns {Promise<Object>} 删除结果
   */
  deleteSqlConfig: async (configId) => {
    try {
      return await request(`/sql/config/${configId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`Error deleting SQL config ${configId}:`, error);
      throw error;
    }
  },
};

export default ConfigService;