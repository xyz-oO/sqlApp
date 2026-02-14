import React, { useEffect, useState } from 'react';
import { useParams } from 'umi';
import { request } from 'umi';
import styles from '../../themes/terminal.less';
import SidebarNav from '../../components/SidebarNav';
import { Table, Button } from 'antd';
import { useApp } from '../../contexts/appContext';
import EditRowModal from '../../components/EditRowModal';
import SqlSubmitModal from '../../components/SqlSubmitModal';
import TerminalAlert from '../../components/TerminalAlert';
import { SettingOutlined } from '@ant-design/icons';
import TerminalTextInput from '../../components/TerminalTextInput';
import { SqlService } from '../../services/sqlService';

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
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);

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
      const res = await request(`/sql/config/${id}`, {
        method: 'PUT',
        data: {
          menu_name: menuName,
          sql: sqlContent,
          dbname: dbname,
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
      // Check if any fields were changed
      if (Object.keys(formData).length === 0) {
        setEditError('没有字段被修改');
        setSaving(false);
        return;
      }

      const dbConfigData = await request('/db/config');

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
      if (columns.length === 0) {
        throw new Error('No valid columns to update');
      }

      const setClause = columns.map(key => {
        const value = formData[key];
        if (typeof value === 'string') {
          return `${key} = '${value.replace(/'/g, "''")}'`;
        } else if (value === null || value === undefined) {
          return `${key} = NULL`;
        } else {
          return `${key} = ${value}`;
        }
      }).join(', ');
      
      const whereColumns = Object.keys(editingRow).filter(key => {
        // Exclude time-related columns and columns being updated
        const lowerKey = key.toLowerCase();
        return !lowerKey.includes('time') && 
               !lowerKey.includes('create_') && 
               !lowerKey.includes('update_') && 
               !lowerKey.includes('date') &&
               !Object.keys(formData).includes(key) && // Exclude columns being updated
               editingRow[key] != null; // Ensure value is not null
      });
      
      if (whereColumns.length === 0) {
        throw new Error('No valid columns for WHERE clause');
      }

      const whereClause = whereColumns.map(key => {
        const value = editingRow[key];
        if (typeof value === 'string') {
          return `${key} = '${value.replace(/'/g, "''")}'`;
        } else {
          return `${key} = ${value}`;
        }
      }).join(' AND ');

      const updateSql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
      
      console.log('Frontend SQL:', updateSql);

      // Execute UPDATE query
      await SqlService.updateSql(targetDbConfig, updateSql);

      // Only update the specific row in the table data instead of refreshing the entire table
      setQueryResults(prevResults => {
        return prevResults.map(row => {
          // Find the row that was edited
          const isEditingRow = Object.keys(editingRow).every(key => {
            return row[key] === editingRow[key];
          });
          
          if (isEditingRow) {
            // Update only the changed fields
            return {
              ...row,
              ...formData
            };
          }
          return row;
        });
      });
      setEditModalOpen(false);
      // Don't set editingRow to null to preserve row background color
      setNotice('更新成功');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      console.log('Error  row:', err);
      setEditError(err?.response?.data?.error || 'Failed to update row');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    // Don't set editingRow to null to preserve row background color
    setEditError('');
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setFilters(filters);
    
    // Handle sorting
    if (sorter && sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
    } else {
      setSortField(null);
      setSortOrder(null);
    }
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
        const dbConfigData = await request('/db/config');

        const dbConfigs = dbConfigData?.configs || [];
        const targetDbConfig = dbConfigs.find(config => config.database === sqlConfig.dbname);

        if (!targetDbConfig) {
          throw new Error(`Database configuration not found for database: ${sqlConfig.dbname}`);
        }

        // Execute SQL query
        const resultData = await SqlService.executeSql(targetDbConfig, sqlConfig.sql);

        const results = resultData?.results || [];
        setQueryResults(results);

        // Extract column names from SQL query
        if (results.length > 0) {
          let columnNames = [];
          const sql = sqlConfig.sql.trim();
          
          // Normalize SQL: remove newlines and extra spaces
          const normalizedSql = sql.replace(/\s+/g, ' ');
          const selectMatch = normalizedSql.match(/^\s*SELECT\s+(.+?)\s+FROM/i);
          
          if (selectMatch) {
            const selectPart = selectMatch[1];
            // Split by commas, ignoring commas inside quotes
            const columns = selectPart.split(/,\s*(?![^"'\(]*["'\)])/);
            columnNames = columns.map(col => {
              col = col.trim(); // Trim spaces around each column
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
              return col;
            });
          }
          
          // Fallback to first row keys if SQL parsing fails
          if (columnNames.length === 0) {
            const firstRow = results[0];
            // Use the order of columns from the SQL result to maintain consistency
            columnNames = Object.keys(firstRow);
          }
          
          setColumnNames(columnNames);
        } else {
          setColumnNames([]);
        }
      } catch (err) {
        setQueryError(err?.response?.data?.error || '执行 SQL 查询失败');
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
        <SidebarNav userLabel="用户管理" sqlLabel="SQL管理" />
        <section className={styles.dashboardContent}>
          <h2 className={styles.dashboardTitle}>加载中...</h2>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <SidebarNav userLabel="用户管理" sqlLabel="SQL管理" />
        <section className={styles.dashboardContent}>
          <h2 className={styles.dashboardTitle}>错误</h2>
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
      render: (_, __, index) => <span className={styles.terminalTableHeader}>{index + 1}</span>,
    };
    // Create columns from extracted column names
    const dataColumns = columnNames.map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      sorter: (a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return -1;
        if (bVal == null) return 1;
        
        // Handle numeric values
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal;
        }
        
        // Handle string values
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return aStr.localeCompare(bStr);
      },
      sortOrder: sortField === key ? sortOrder : null,
      render: (text) => <span className={styles.terminalText}>{text}</span>
    }));
    // Combine edit column, sequence column with data columns
    return [editColumn, sequenceColumn, ...dataColumns];
  };

  const columns = generateColumns();

  // Apply filters and sorting to query results
  const filteredResults = queryResults.filter(record => {
    return Object.entries(filters).every(([key, value]) => {
      return String(record[key]).toLowerCase().includes(value.toLowerCase());
    });
  }).sort((a, b) => {
    if (!sortField || !sortOrder) return 0;
    
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return -1;
    if (bVal == null) return 1;
    
    // Handle numeric values
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'ascend' ? aVal - bVal : bVal - aVal;
    }
    
    // Handle string values
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    const comparison = aStr.localeCompare(bStr);
    return sortOrder === 'ascend' ? comparison : -comparison;
  });

  return (
    <div className={styles.dashboard}>
      <SidebarNav userLabel="用户管理" sqlLabel="SQL管理" />
      <section className={styles.dashboardContent}>
          {notice && (
            <div style={{ marginBottom: 16 }}>
              <TerminalAlert message={notice} type="success" showIcon={true} />
            </div>
          )}
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
                color: styles.terminalText2,
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
                  color: styles.terminalText2
                }}>
                  {sqlConfig?.sql || 'No SQL content'}
                </pre>
              </div>
            </>
          )}
          {queryError && (
            <TerminalAlert 
              message="Query Error" 
              description={queryError} 
              type="error" 
              showIcon 
            />
          )}
          {queryLoading ? (
            <div style={{ padding: 16, background: styles.sessionBackground, borderRadius: 8, border: styles.sessionBorder, color: styles.sessionHighlightText }}>
              Executing query...
            </div>
          ) : queryResults.length > 0 ? (
            <div className={styles.dashboardPanel}>
              <h3 className={styles.dashboardSubtitle}>Query Results</h3>
              {/* Terminal-style search area */}
              <div style={{ marginBottom: 16, padding: 16, background: styles.sessionBackground, borderRadius: 8, border: styles.sessionBorder }}>
                <h4 style={{ color: styles.sessionHighlightText, margin: '0 0 12px 0', fontSize: 14 }}>Column Search</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {columnNames.map(key => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: styles.sessionText, fontSize: 12 }}>{key}:</span>
                      <TerminalTextInput
                        placeholder="搜索"
                        style={{minWidth:"50px"}}
                        onChange={(value) => {
                          const newFilters = { ...filters };
                          if (value) {
                            newFilters[key] = value;
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
                rowKey={(record) => {
                  // Use a combination of record values to generate a unique key
                  // This ensures we don't rely on the deprecated index parameter
                  return Object.values(record).join('-');
                }}
                className={styles.terminalTable}
                size="middle"
                onChange={handleTableChange}
                locale={{
                  triggerDesc: '点击降序',
                  triggerAsc: '点击升序',
                  cancelSort: '取消排序',
                  emptyText: (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <img 
                        src="./../logo.png" 
                        alt="empty" 
                        style={{ width: '80px', height: '80px' }} 
                      />
                      <p style={{ marginTop: '16px', color: '#666' }}>暂无数据</p>
                    </div>
                  ),
                }}
              />
            </div>
          ) : (
            <div style={{ marginBottom: 16, padding: 16, background: styles.sessionBackground, borderRadius: 8, border: styles.sessionBorder }}>
              <p style={{ color: styles.sessionText, margin: 0 }}>No results returned from query.</p>
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
      <footer className={styles.footer}>
        <p>This web platform is developed by PT, for internal management use only by authorized personnel.</p>
      </footer>
    </div>
  );
}
