import { request } from 'umi';

/**
 * SQL 服务 - 用于执行 SQL 查询和更新操作
 */
export const SqlService = {
  /**
   * 执行 SQL 查询
   * @param {Object} dbConfig - 数据库配置
   * @param {string} sql - SQL 查询语句
   * @returns {Promise<Object>} 查询结果
   */
  executeSql: async (dbConfig, sql) => {
    try {
      const response = await request('/api/execute-sql', {
        method: 'POST',
        data: {
          dbConfig,
          sql
        }
      });
      return response;
    } catch (error) {
      console.error('Error executing SQL:', error);
      throw error;
    }
  },

  /**
   * 执行 SQL 更新操作
   * @param {Object} dbConfig - 数据库配置
   * @param {string} sql - SQL 更新语句
   * @returns {Promise<Object>} 更新结果
   */
  updateSql: async (dbConfig, sql) => {
    try {
      const response = await request('/api/execute-sql', {
        method: 'POST',
        data: {
          dbConfig,
          sql
        }
      });
      console.log("response:",response)
      return response;
    } catch (error) {
      console.error('Error executing SQL update:', error);
      throw error;
    }
  }
};

export default SqlService;