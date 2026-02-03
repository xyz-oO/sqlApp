import { Link } from 'umi';
import { SettingOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import styles from '../themes/terminal.less';
import DbConfigModal from '../components/DbConfigModal';
import SqlSubmitModal from '../components/SqlSubmitModal';
import { request } from 'umi';
import SidebarNav from '../components/SidebarNav';
import { useSqlConfig } from '../contexts/SqlConfigContext';
import { useApp } from '../contexts/appContext';

const { Text } = Typography;

export default function SqlManagerPage() {
  const { sqlConfigs, loading, refreshSqlConfigs } = useSqlConfig();
  const { session } = useApp();
  const [deletingId, setDeletingId] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [host, setHost] = useState('');
  const [database, setDatabase] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [menuName, setMenuName] = useState('');
  const [sqlContent, setSqlContent] = useState('');
  const [dbname, setDbname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [editingSqlConfig, setEditingSqlConfig] = useState(null);
  const [dbConfigs, setDbConfigs] = useState([]);
  const [dbConfigLoading, setDbConfigLoading] = useState(false);
  const [deletingDbConfig, setDeletingDbConfig] = useState(null);
  const [editingDbConfig, setEditingDbConfig] = useState(null);

  const openConfig = () => {
    setConfigOpen(true);
    setConfigLoaded(false);
  };

  const openNewConfig = () => {
    setHost('');
    setDatabase('');
    setPort('');
    setUsername('');
    setPassword('');
    setEditingDbConfig(null); // Clear editing state
    setConfigOpen(true);
    setConfigLoaded(true);
    console.log("openNewConfig")
  };
  const openConfigInEditMode = async (record = null) => {
    if (record) {
      // Set form fields with existing config data
      setHost(record.host || '');
      setDatabase(record.database || '');
      setPort(record.port || '');
      setUsername(record.user || '');
      setPassword(record.password || '');
      setEditingDbConfig(record); // Track the original config being edited
      setConfigOpen(true);
      setConfigLoaded(true);
    } else {
      setConfigOpen(true);
      setConfigLoaded(false);
    }
  };
  
  const handleDeleteDbConfig = async (databaseName) => {
    setDeletingDbConfig(databaseName);
    try {
      await request('/db/config', {
        method: 'DELETE',
        data: {
          database: databaseName,
        },
      });
      
      await loadDbConfig(); // Refresh the dbConfigs state
      
      setNotice('删除成功');
      setTimeout(() => setNotice(''), 3000);
    } catch (error) {
      const errorMessage = error?.response?.data?.error || '删除失败，请重试';
      setNotice(errorMessage);
      setTimeout(() => setNotice(''), 3000);
    } finally {
      setDeletingDbConfig(null);
    }
  };
  
  const closeConfig = () => {
    setConfigOpen(false);
    setTestResult(null);
    setEditingDbConfig(null); // Clear editing state
    // Clear form fields
    setHost('');
    setDatabase('');
    setPort('');
    setUsername('');
    setPassword('');
  };

  const openSubmitModal = () => {
    setSubmitModalOpen(true);
    setSubmitError('');
    setEditingSqlConfig(null);
  };
  
  const openEditSqlModal = (config) => {
    setMenuName(config.menu_name);
    setSqlContent(config.sql);
    setDbname(config.dbname || '');
    setEditingSqlConfig(config);
    setSubmitModalOpen(true);
    setSubmitError('');
  };
  
  const closeSubmitModal = () => {
    setSubmitModalOpen(false);
    setSubmitError('');
    setDbname('');
    setMenuName('');
    setSqlContent('');
    setEditingSqlConfig(null);
  };

  const handleSave = () => {
    setConfigOpen(false);
  };

  const loadDbConfig = async () => {
    setDbConfigLoading(true);
    try {
      const data = await request('/db/config', {
        headers: {
          'X-Username': session?.username || 'user'
        }
      });
      setDbConfigs(data?.configs || []);
    } catch (error) {
      console.error('Error loading db configs:', error);
      setDbConfigs([]);
    } finally {
      setDbConfigLoading(false);
    }
  };

  useEffect(() => {
    loadDbConfig();
  }, []);

  useEffect(() => {
    if (!configOpen || configLoaded) {
      return;
    }
    const loadConfig = async () => {
      try {
        const data = await request('/db/config');
        // This is the issue! The API returns data.configs (array), not data.config (object)
        // const config = data?.config || {};
        // For the modal, we don't need to load all configs, just keep the form fields as they are
      } finally {
        setConfigLoaded(true);
      }
    };
    loadConfig();
  }, [configLoaded, configOpen]);

  const handleTest = async () => {
    setTestResult(null);
    try {
      const data = await request('/db/health', {
        method: 'POST',
        data: {
          host,
          database,
          port,
          user: username,
          password,
        },
      });
      setTestResult({ ok: true, message: data?.message || 'connection ok' });
    } catch (error) {
      const message = error?.response?.data?.error || 'connection failed';
      setTestResult({ ok: false, message });
    }
  };

  const handleUpdateConfig = async () => {
    try {
      // If editing an existing config and database name changed, delete the old one first
      if (editingDbConfig && editingDbConfig.database !== database) {
        await request('/db/config', {
          method: 'DELETE',
          data: {
            database: editingDbConfig.database,
          },
        });
      }

      await request('/db/config', {
        method: 'POST',
        data: {
          host,
          database,
          port,
          user: username,
          password,
        },
      });
      setNotice('更新成功');
      setTimeout(() => setNotice(''), 2000);
      await loadDbConfig(); // Refresh the dbConfigs state
      setEditingDbConfig(null); // Clear the editing state
      return true;
    } catch (error) {
      const errorMessage = error?.response?.data?.error || '保存失败，请重试';
      setNotice(errorMessage);
      setTimeout(() => setNotice(''), 3000);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!menuName.trim() || !sqlContent.trim()) {
      setSubmitError('请输入目录名和SQL内容');
      return;
    }

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
      if (editingSqlConfig) {
        await request(`/sql/config/${editingSqlConfig.id}`, {
          method: 'PUT',
          data: {
            menu_name: menuName,
            sql: sqlContent,
            dbname: dbname,
          },
        });
      } else {
        await request('/sql/config', {
          method: 'POST',
          data: {
            menu_name: menuName,
            sql: sqlContent,
            dbname: dbname,
          },
        });
      }
      
      await refreshSqlConfigs();
      
      setNotice(editingSqlConfig ? '更新成功' : '保存成功');
      setTimeout(() => setNotice(''), 3000);
      setMenuName('');
      setSqlContent('');
      setDbname('');
      setEditingSqlConfig(null);
      setSubmitModalOpen(false);
    } catch (error) {
      const errorMessage = error?.response?.data?.error || '保存失败，请重试';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await request(`/sql/config/${id}`, {
        method: 'DELETE',
      });
      
      await refreshSqlConfigs();
      
      setNotice('删除成功');
      setTimeout(() => setNotice(''), 3000);
    } catch (error) {
      const errorMessage = error?.response?.data?.error || '删除失败，请重试';
      setNotice(errorMessage);
      setTimeout(() => setNotice(''), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span>System</span>
        </div>
        <SidebarNav />
      </aside>
      <section className={styles.dashboardContent}>
        <h2 className={styles.dashboardTitle}>SQL 管理器</h2>
        <p className={styles.dashboardSubtitle}>
          Configure your SQL connections and queries here.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* <span className={styles.terminalContent}>数据库连接配置</span>
            <button
              type="button"
              className={styles.terminalIconButton}
              onClick={openConfig}
            >
              <SettingOutlined style={{ fontSize: '24px', color: '#696F75' }} />
            </button> */}
          </div>
        </div>
        <div className={styles.dashboardPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className={styles.dashboardSubtitle}>数据库连接配置</h3>
            <Button className={styles.primaryButton} type="button" onClick={openNewConfig}>
              <span style={{ marginRight: 6 }}>+</span>
              新建配置
            </Button>
          </div>
          {/* <div style={{ color: '#8dff9d', marginBottom: '10px' }}>加载的配置数量: {dbConfigs.length}</div> */}
          {/* Debug list to show all configs */}
          {/* <div style={{ marginBottom: '10px', color: '#b7d3bd' }}>
            <h4>Debug: All Configs</h4>
            <ul>
              {dbConfigs.map((config, index) => (
                <li key={config.database}>
                  {index + 1}: {config.database} ({config.host}:{config.port}) - {config.user}
                </li>
              ))}
            </ul>
          </div> */}
          {dbConfigLoading ? (
            <div className={styles.terminalContent}>加载中...</div>
          ) : dbConfigs.length === 0 ? (
            <div className={styles.terminalContent}>暂无数据库连接配置，请点击上方设置图标进行配置。</div>
          ) : (
            <Table
              rowKey="database"
              dataSource={dbConfigs}
              columns={[
                {
                  title: '#',
                  key: 'index',
                  render: (_, __, index) => index + 1,
                },
                {
                  title: '主机',
                  dataIndex: 'host',
                  key: 'host',
                  render: (text) => <Text style={{ color: '#8dff9d' }}>{text}</Text>,
                },
                {
                  title: '端口',
                  dataIndex: 'port',
                  key: 'port',
                  render: (text) => <Text style={{ color: '#b7d3bd' }}>{text}</Text>,
                },
                {
                  title: '数据库',
                  dataIndex: 'database',
                  key: 'database',
                  render: (text) => <Text style={{ color: '#b7d3bd' }}>{text}</Text>,
                },
                {
                  title: '用户名',
                  dataIndex: 'user',
                  key: 'user',
                  render: (text) => <Text style={{ color: '#b7d3bd' }}>{text}</Text>,
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={() => openConfigInEditMode(record)}
                      >
                        编辑
                      </Button>
                      <Button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={() => handleDeleteDbConfig(record.database)}
                        loading={deletingDbConfig === record.database}
                      >
                        删除
                      </Button>
                    </div>
                  ),
                },
              ]}
              className={styles.terminalTable}
              size="middle"
            />
          )}
        </div>
        <div className={styles.dashboardPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className={styles.dashboardSubtitle}>SQL 查询配置列表</h3>
            <Button className={styles.primaryButton} type="button" onClick={openSubmitModal}>
              <span style={{ marginRight: 6 }}>+</span>
              新建列表
            </Button>
          </div>
          {loading ? (
            <div className={styles.terminalContent}>加载中...</div>
          ) : sqlConfigs.length === 0 ? (
            <div className={styles.terminalContent}>暂无配置数据，请点击上方 "新建列表" 按钮创建新的SQL查询配置。</div>
          ) : (
            <Table
              rowKey="id"
              dataSource={sqlConfigs}
              columns={[
                {
                  title: '#',
                  key: 'index',
                  render: (_, __, index) => index + 1,
                },
                {
                  title: '目录名',
                  dataIndex: 'menu_name',
                  key: 'menu_name',
                  render: (text) => <Text style={{ color: '#8dff9d' }}>{text}</Text>,
                },
                {
                  title: '数据库名',
                  dataIndex: 'dbname',
                  key: 'dbname',
                  render: (text) => <Text style={{ color: '#b7d3bd' }}>{text || '-'}</Text>,
                },
                {
                  title: '创建时间',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (text) => {
                    if (!text) return '-';
                    const date = new Date(text);
                    return date.toLocaleString();
                  },
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={() => openEditSqlModal(record)}
                      >
                        编辑
                      </Button>
                      <Button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={() => handleDelete(record.id)}
                        loading={deletingId === record.id}
                      >
                        删除
                      </Button>
                    </div>
                  ),
                },
              ]}
              className={styles.terminalTable}
              size="middle"
            />
          )}
        </div>
      </section>
      {notice ? <div className={styles.terminalNotice}>{notice}</div> : null}
      <DbConfigModal
        open={configOpen}
        host={host}
        database={database}
        port={port}
        username={username}
        password={password}
        onHostChange={setHost}
        onDatabaseChange={setDatabase}
        onPortChange={setPort}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onCancel={closeConfig}
        onSave={async () => {
          const success = await handleUpdateConfig();
          if (success) {
            handleSave();
          }
        }}
        onTest={handleTest}
        testResult={testResult}
      />
      <SqlSubmitModal
        open={submitModalOpen}
        menuName={menuName}
        sqlContent={sqlContent}
        dbname={dbname}
        onMenuNameChange={setMenuName}
        onSqlContentChange={setSqlContent}
        onDbnameChange={setDbname}
        onCancel={closeSubmitModal}
        onSave={handleSubmit}
        saving={isSubmitting}
        error={submitError}
        isEditing={!!editingSqlConfig}
      />
      <footer className={styles.footer}>
        <p>This web platform is developed by PT, for internal management use only by authorized personnel.</p>
      </footer>
    </div>
  );
}
