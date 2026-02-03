import React, { useEffect, useState } from 'react';
import { useParams } from 'umi';
import { request } from 'umi';
import styles from '../../themes/terminal.less';
import SidebarNav from '../../components/SidebarNav';
import { Table, Button, Space, Alert, Input } from 'antd';
import { useApp } from '../../contexts/appContext';
import EditRowModal from '../../components/EditRowModal';
import SqlSubmitModal from '../../components/SqlSubmitModal';
import { SettingOutlined, SearchOutlined } from '@ant-design/icons';

export default function SqlPage() {
  const { id } = useParams();
  const { session } = useApp();
  const [sqlConfig, setSqlConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [columnNames, setColumnNames] = useState([]);
  const [filters, setFilters] = useState({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [notice, setNotice] = useState('');
  const [detailsCollapsed, setDetailsCollapsed] = useState(true);
  const [editSqlModalOpen, setEditSqlModalOpen] = useState(false);
  const [menuName, setMenuName] = useState('');
  const [sqlContent, setSqlContent] = useState('');
  const [dbname, setDbname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleEditRow = (record) => {
    setEditingRow(record);
    setEditModalOpen(true);
  };

  const handleEditSqlConfig = () => {
    if (sqlConfig) {
      setMenuName(sqlConfig.menu_name);
      setSqlContent(sqlConfig.sql);
      setDbname(sqlConfig.dbname || '');
      setEditSqlModalOpen(true);
      setSubmitError('');
    }
  };

  const handleSaveSqlConfig = async () => {
    // Validate SQL content - prevent SELECT * statements
    const sql = sqlContent.trim().toLowerCase();
    if (sql.startsWith('select')) {
      // Extract the part between SELECT and FROM
      const selectFromMatch = sql.match(/select\s+(.+?)\s+from/);
      if (selectFromMatch) {
        const selectList = selectFromMatch[1];
        if (selectList.includes('*')) {
          setSubmitError('不允许使用 SELECT *，请明确指定列名');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await request(`/sql/config/${id}`, {
        method: 'PUT',
        data: {
          menu_name: menuName,
          sql: sqlContent,
          dbname: dbname,
        },
        headers: {
          'X-Username': session?.username || 'user'
        }
      });
      
      const data = await request(`/sql/config/${id}`);
      setSqlConfig(data?.config || null);
      
      setNotice('更新成功');
      setTimeout(() => setNotice(''), 3000);
      setEditSqlModalOpen(false);
      setMenuName('');
      setSqlContent('');
      setDbname('');
    } catch (err) {
      setSubmitError(err?.response?.data?.error || '保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSqlModal = () => {
    setEditSqlModalOpen(false);
    setSubmitError('');
    setMenuName('');
    setSqlContent('');
    setDbname('');
  };

  const handleSaveEdit = async (formData) => {
    setSaving(true);
    setEditError('');
    try {
      const dbConfigData = await request('/db/config', {
        headers: {
          'X-Username': session?.username || 'user'
        }
      });

      const dbConfigs = dbConfigData?.configs || [];
      const targetDbConfig = dbConfigs.find(config => config.database === sqlConfig.dbname);

      if (!targetDbConfig) {
        throw new Error(`Database configuration not found for database: ${sqlConfig.dbname}`);
      }

      const tableInfo = sqlConfig.sql.trim().toLowerCase();
      const tableNameMatch = tableInfo.match(/from\s+(\w+)/i);
      const tableName = tableNameMatch ? tableNameMatch[1] : null;

      if (!tableName) {
        throw new Error('Could not determine table name from SQL query');
      }

      const columns = Object.keys(formData).filter(key => {
        // Exclude time-related columns
        return !key.toLowerCase().includes('time') && 
               !key.toLowerCase().includes('create_') && 
               !key.toLowerCase().includes('update_');
      });
      const setClause = columns.map(key => `${key} = :${key}`).join(', ');
      
      const params = {};
      columns.forEach(key => {
        params[key] = formData[key];
      });

      const whereColumns = Object.keys(editingRow).filter(key => {
        // Exclude time-related columns and expression columns
        const lowerKey = key.toLowerCase();
        // return !lowerKey.includes('time') && 
        //        !lowerKey.includes('create_') && 
        //        !lowerKey.includes('update_') && 
        //        !lowerKey.includes('date') &&
        //        !key.includes('(') &&
        //        !key.includes(')');

        return key;
      });

      const whereClause = whereColumns
        .map(key => `${key} = :orig_${key}`)
        .join(' AND ');

      Object.keys(editingRow).forEach(key => {
        params[`orig_${key}`] = editingRow[key];
      });

      const updateSql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;

      await request('/api/execute-sql', {
        method: 'POST',
        headers: {
          'X-Username': session?.username || 'user'
        },
        data: {
          dbConfig: targetDbConfig,
          sql: updateSql,
          params: params
        }
      });

      const resultData = await request('/api/execute-sql', {
        method: 'POST',
        headers: {
          'X-Username': session?.username || 'user'
        },
        data: {
          dbConfig: targetDbConfig,
          sql: sqlConfig.sql
        }
      });

      const results = resultData?.results || [];
      setQueryResults(results);
      setEditModalOpen(false);
      setEditingRow(null);
      setNotice('更新成功');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Failed to update row');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingRow(null);
    setEditError('');
  };

  const handleTableChange = (pagination, filters) => {
    setFilters(filters);
  };

  useEffect(() => {
    const fetchSqlConfig = async () => {
      try {
        const data = await request(`/sql/config/${id}`);
        setSqlConfig(data?.config || null);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load SQL configuration');
      } finally {
        setLoading(false);
      }
    };
    fetchSqlConfig();
  }, [id]);

  useEffect(() => {
    const executeSqlQuery = async () => {
      if (!sqlConfig || !sqlConfig.sql) {
        return;
      }

      setQueryLoading(true);
      setQueryError('');
      try {
        // Get database configuration based on dbname
        const dbConfigData = await request('/db/config', {
          headers: {
            'X-Username': session?.username || 'user'
          }
        });

        const dbConfigs = dbConfigData?.configs || [];
        const targetDbConfig = dbConfigs.find(config => config.database === sqlConfig.dbname);

        if (!targetDbConfig) {
          throw new Error(`Database configuration not found for database: ${sqlConfig.dbname}`);
        }

        // Execute SQL query
        const resultData = await request('/api/execute-sql', {
          method: 'POST',
          headers: {
            'X-Username': session?.username || 'user'
          },
          data: {
            dbConfig: targetDbConfig,
            sql: sqlConfig.sql
          }
        });

        const results = resultData?.results || [];
        setQueryResults(results);

        // Extract column names from SQL query
        if (results.length > 0) {
          let columnNames = [];
          const sql = sqlConfig.sql.trim();
          const selectMatch = sql.match(/^\s*SELECT\s+(.+?)\s+FROM/i);
          if (selectMatch) {
            const selectPart = selectMatch[1];
            // Split by commas, ignoring commas inside quotes
            const columns = selectPart.split(/,\s*(?![^"'\(]*["'\)])/);
            columnNames = columns.map(col => {
              // Extract column name from expression
              const aliasMatch = col.match(/\s+AS\s+(\w+)/i);
              if (aliasMatch) {
                return aliasMatch[1];
              }
              // Extract last identifier as column name
              const idMatch = col.match(/([\w`]+)\s*$/);
              if (idMatch) {
                return idMatch[1].replace(/[`]/g, '');
              }
              return col.trim();
            });
          }
          
          // Fallback to first row keys if SQL parsing fails
          if (columnNames.length === 0) {
            const firstRow = results[0];
            columnNames = Object.keys(firstRow);
          }
          
          setColumnNames(columnNames);
        } else {
          setColumnNames([]);
        }
      } catch (err) {
        setQueryError(err?.response?.data?.error || 'Failed to execute SQL query');
        setColumnNames([]);
      } finally {
        setQueryLoading(false);
      }
    };

    if (sqlConfig && sqlConfig.sql) {
      executeSqlQuery();
    }
  }, [sqlConfig]);

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span>System</span>
          </div>
          <SidebarNav />
        </aside>
        <section className={styles.dashboardContent}>
          <h2 className={styles.dashboardTitle}>Loading...</h2>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span>System</span>
          </div>
          <SidebarNav />
        </aside>
        <section className={styles.dashboardContent}>
          <h2 className={styles.dashboardTitle}>Error</h2>
          <p className={styles.dashboardSubtitle}>{error}</p>
        </section>
      </div>
    );
  }

  // Generate table columns with search functionality
  const generateColumns = () => {
    // Create edit column
    const editColumn = {
      title: '操作',
      key: 'edit',
      render: (_, record, index) => (
        <Button 
          size="small" 
          className={styles.secondaryButton}
          type="button"
          onClick={() => handleEditRow(record)}
        >
          编辑
        </Button>
      ),
    };
    // Create sequence column
    const sequenceColumn = {
      title: '#',
      key: 'index',
      render: (_, __, index) => <span style={{ color: '#8dff9d' }}>{index + 1}</span>,
    };
    // Create columns from extracted column names
    const dataColumns = columnNames.map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      render: (text) => <span style={{ color: '#b7d3bd' }}>{text}</span>
    }));
    // Combine edit column, sequence column with data columns
    return [editColumn, sequenceColumn, ...dataColumns];
  };

  const columns = generateColumns();

  // Apply filters to query results
  const filteredResults = queryResults.filter(record => {
    return Object.entries(filters).every(([key, value]) => {
      return String(record[key]).toLowerCase().includes(value.toLowerCase());
    });
  });

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span>System</span>
        </div>
        <SidebarNav />
      </aside>
      <section className={styles.dashboardContent}>
        <h2 className={styles.dashboardTitle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sqlConfig?.menu_name || 'SQL Page'}
              <button
                type="button"
                className={styles.terminalIconButton}
                onClick={handleEditSqlConfig}
              >
                <SettingOutlined style={{ fontSize: '20px', color: '#696F75' }} />
              </button>
            </div>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#8dff9d',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0',
                margin: '0'
              }}
              onClick={() => setDetailsCollapsed(!detailsCollapsed)}
            >
              {detailsCollapsed ? '▼' : '▶'}
            </button>
          </div>
        </h2>
        <p className={styles.dashboardSubtitle}>
          SQL Configuration Details
        </p>
        <div className={styles.dashboardPanel}>
          {!detailsCollapsed && (
            <>
              <div style={{ marginBottom: 16 }}>
                <strong>Database:</strong> {sqlConfig?.dbname || 'N/A'}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>Created At:</strong> {sqlConfig?.created_at ? new Date(sqlConfig.created_at).toLocaleString() : 'N/A'}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>SQL Query:</strong>
                <pre style={{ 
                  background: '#0b0f0c', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  overflow: 'auto',
                  marginTop: '8px',
                  color: '#8dff9d'
                }}>
                  {sqlConfig?.sql || 'No SQL content'}
                </pre>
              </div>
            </>
          )}
          {queryError && (
            <Alert 
              message="Query Error" 
              description={queryError} 
              type="error" 
              showIcon 
              style={{ marginBottom: 16, background: '#2d1d1d', borderColor: '#4d2d2d', color: '#ff9d9d' }}
            />
          )}
          {queryLoading ? (
            <div style={{ padding: 16, background: '#0b0f0c', borderRadius: 8, border: '1px solid #2f5c39', color: '#8dff9d' }}>
              Executing query...
            </div>
          ) : queryResults.length > 0 ? (
            <div className={styles.dashboardPanel}>
              <h3 className={styles.dashboardSubtitle}>Query Results</h3>
              {/* Terminal-style search area */}
              <div style={{ marginBottom: 16, padding: 16, background: '#0b0f0c', borderRadius: 8, border: '1px solid #2f5c39' }}>
                <h4 style={{ color: '#8dff9d', margin: '0 0 12px 0', fontSize: 14 }}>Column Search</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {columnNames.map(key => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#b7d3bd', fontSize: 12 }}>{key}:</span>
                      <Input
                        placeholder="搜索"
                        prefix={<SearchOutlined style={{ color: '#8dff9d' }} />}
                        style={{
                          width: 160,
                          fontSize: 12,
                          background: '#1a241e',
                          border: '1px solid #2f5c39',
                          borderRadius: 4,
                          color: '#b7d3bd',
                          '&:hover, &:focus': {
                            borderColor: '#8dff9d',
                          }
                        }}
                        onChange={(e) => {
                          const newFilters = { ...filters };
                          if (e.target.value) {
                            newFilters[key] = e.target.value;
                          } else {
                            delete newFilters[key];
                          }
                          setFilters(newFilters);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Table 
                dataSource={filteredResults} 
                columns={columns} 
                rowKey={(record, index) => index}
                className={styles.terminalTable}
                size="middle"
                onChange={handleTableChange}
              />
            </div>
          ) : (
            <div style={{ marginBottom: 16, padding: 16, background: '#0b0f0c', borderRadius: 8, border: '1px solid #2f5c39' }}>
              <p style={{ color: '#b7d3bd', margin: 0 }}>No results returned from query.</p>
            </div>
          )}
        </div>
      </section>
      <EditRowModal
        open={editModalOpen}
        rowData={editingRow}
        columns={columns}
        error={editError}
        onCancel={handleCloseEditModal}
        onSave={handleSaveEdit}
        saving={saving}
      />
      <SqlSubmitModal
        open={editSqlModalOpen}
        menuName={menuName}
        sqlContent={sqlContent}
        dbname={dbname}
        onMenuNameChange={setMenuName}
        onSqlContentChange={setSqlContent}
        onDbnameChange={setDbname}
        onCancel={handleCloseSqlModal}
        onSave={handleSaveSqlConfig}
        saving={isSubmitting}
        error={submitError}
        isEditing={true}
      />
      {notice ? <div className={styles.terminalNotice}>{notice}</div> : null}
      <footer className={styles.footer}>
        <p>This web platform is developed by PT, for internal management use only by authorized personnel.</p>
      </footer>
    </div>
  );
}
