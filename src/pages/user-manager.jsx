import { useEffect, useMemo, useState } from 'react';
import { Link, request, history } from 'umi';
import { Button, Card, Switch, Table } from 'antd';
import TerminalTextInput from '../components/TerminalTextInput';
import TerminalAlert from '../components/TerminalAlert';
import TerminalSelect from '../components/TerminalSelect';
import styles from '../themes/terminal.less';
import ChangePasswordModal from '../components/ChangePasswordModal';
import NewUserModal from '../components/NewUserModal';
import SidebarNav from '../components/SidebarNav';
import { useApp } from '../contexts/appContext';

export default function UserManagerPage() {
  const { session, sessionChecked } = useApp();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('USER');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState('USER');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  useEffect(() => {
    // Check if user is not SUPER role
    if (sessionChecked && session?.role !== 'SUPER') {
      // Redirect to home page or show error
      history.push('/');
    }
  }, [session, sessionChecked, history]);

  useEffect(() => {
    // Only load users if user is SUPER role
    if (session?.role === 'SUPER') {
      const loadUsers = async () => {
        setLoading(true);
        try {
          const data = await request('/users');
          setUsers(data?.users || []);
        } finally {
          setLoading(false);
        }
      };
      loadUsers();
    }
  }, [session]);

  const filteredUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return users;
    }
    return users.filter((user) => user.username?.toLowerCase().includes(value));
  }, [query, users]);

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setSaveError('');
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setSelectedUser(null);
    setNewPassword('');
    setSaveError('');
  };

  const handlePasswordSave = async () => {
    if (!newPassword.trim()) {
      setSaveError('请输入新密码。');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await request(`/users/${selectedUser.username}/password`, {
        method: 'POST',
        data: { password: newPassword },
      });
      setPasswordModalOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      // Set success notice
      setSuccessNotice('修改密码成功！');
      // Clear success notice after 3 seconds
      setTimeout(() => {
        setSuccessNotice('');
      }, 3000);
    } catch (error) {
      setSaveError('更新密码失败。');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setCreateUsername('');
    setCreatePassword('');
    setCreateRole('USER');
    setCreateError('');
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateUsername('');
    setCreatePassword('');
    setCreateRole('USER');
    setCreateError('');
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditRole(user.role || 'USER');
    setEditError('');
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingUser(null);
    setEditRole('USER');
    setEditError('');
  };

  const handleEditRole = async () => {
    if (!editingUser) {
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      // Update user role in backend
      await request(`/users/${editingUser.username}/role`, {
        method: 'POST',
        data: { role: editRole },
      });
      // Reload users
      const updatedUsers = await request('/users');
      setUsers(updatedUsers?.users || []);
      setEditModalOpen(false);
      setEditingUser(null);
      setEditRole('USER');
      // Set success notice
      setSuccessNotice('角色更新成功！');
      // Clear success notice after 3 seconds
      setTimeout(() => {
        setSuccessNotice('');
      }, 3000);
    } catch (error) {
      setEditError('更新角色失败。');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createUsername.trim() || !createPassword.trim()) {
      setCreateError('请输入用户名和密码。');
      return;
    }
    setCreateSaving(true);
    setCreateError('');
    try {
      await request('/users', {
        method: 'POST',
        data: { username: createUsername.trim(), password: createPassword, role: createRole },
      });
      const data = await request('/users');
      setUsers(data?.users || []);
      setCreateModalOpen(false);
      setCreateUsername('');
      setCreatePassword('');
      // Set success notice
      setSuccessNotice('新增用户成功！');
      // Clear success notice after 3 seconds
      setTimeout(() => {
        setSuccessNotice('');
      }, 3000);
    } catch (error) {
      if (error?.response?.status === 409) {
        setCreateError('用户已存在。');
      } else {
        setCreateError('创建用户失败。');
      }
    } finally {
      setCreateSaving(false);
    }
  };

  const handleStatusToggle = async (username, checked) => {
    const nextStatus = checked ? 0 : 1;
    const previousUsers = users;
    setUsers((prev) =>
      prev.map((user) => (user.username === username ? { ...user, status: nextStatus } : user)),
    );
    try {
      await request(`/users/${username}/status`, {
        method: 'POST',
        data: { status: nextStatus },
      });
      // Set success notice
      setSuccessNotice(`用户 ${username} 状态更新成功！`);
      // Clear success notice after 3 seconds
      setTimeout(() => {
        setSuccessNotice('');
      }, 3000);
    } catch (error) {
      setUsers(previousUsers);
      // Set error notice
      setErrorNotice(`用户 ${username} 状态更新失败！`);
      // Clear error notice after 3 seconds
      setTimeout(() => {
        setErrorNotice('');
      }, 3000);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: '#',
        key: 'seq',
        width: 60,
        render: (_, __, index) => index + 1,
      },
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
      },
      {
        title: '角色',
        dataIndex: 'role',
        key: 'role',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value, record) => (
          <Switch
            checked={value === 0}
            className={styles.statusSwitch}
            onChange={(checked) => handleStatusToggle(record.username, checked)}
          />
        ),
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              className={styles.secondaryButton}
              type="button"
              onClick={() => openEditModal(record)}
            >
              编辑
            </Button>
            <Button
              className={styles.secondaryButton}
              type="button"
              onClick={() => openPasswordModal(record)}
            >
              修改密码
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  // Check if session is being checked or user is not SUPER
  if (!sessionChecked) {
    return (
      <div className={styles.page}>
        <div className={styles.terminalCard}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (session?.role !== 'SUPER') {
    return (
      <div className={styles.page}>
        <div className={styles.terminalCard}>
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <p>Only SUPER role users can manage users.</p>
          <Link to="/" className={styles.primaryButton} style={{ marginTop: '16px', display: 'inline-block' }}>
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.dashboard}>
        <SidebarNav userLabel="用户管理" sqlLabel="SQL管理" />
        <section className={styles.dashboardContent}>
          {successNotice && (
            <div style={{ marginBottom: 16 }}>
              <TerminalAlert message={successNotice} type="success" showIcon={true} />
            </div>
          )}
          {errorNotice && (
            <div style={{ marginBottom: 16 }}>
              <TerminalAlert message={errorNotice} type="error" showIcon={true} />
            </div>
          )}
          <div className={styles.dashboardHeader}>
            <div className={styles.dashboardHeaderRow}>
              <div>
                <h2 className={styles.dashboardTitle}>用户管理</h2>
                <p className={styles.dashboardSubtitle}>
                  Users loaded from config file user.config.json.
                </p>
              </div>
              <Button className={styles.primaryButton} type="button" onClick={openCreateModal}>
                <span style={{ marginRight: 6 }}>+</span>
                新增用户
              </Button>
            </div>
          </div>
          <div className={styles.dashboardSearch}>
            <div className={styles.searchLabel}>搜索</div>
            <TerminalTextInput
              value={query}
              onChange={setQuery}
              placeholder="搜索用户"
            />
          </div>
          <Card style={{ marginTop: 32 }} className={styles.terminalCard}>
            <Table
              rowKey="username"
              columns={columns}
              dataSource={filteredUsers}
              loading={loading}
              pagination={false}
              size="middle"
              className={styles.terminalTable}
              onRow={(record)=>({
                  style:{
                    cursor:'pointer'
                  }
                })}
                locale={{
                  emptyText: (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <img 
                        src="./logo.png" 
                        alt="empty" 
                        style={{ width: '80px', height: '80px' }} 
                      />
                      <p style={{ marginTop: '16px', color: '#666' }}>暂无数据</p>
                    </div>
                  ),
                }}
            />
          </Card>
          <ChangePasswordModal
            open={passwordModalOpen}
            user={selectedUser}
            value={newPassword}
            onChange={setNewPassword}
            onCancel={closePasswordModal}
            onSave={handlePasswordSave}
            saving={saving}
            error={saveError}
          />
          <NewUserModal
            open={createModalOpen}
            username={createUsername}
            password={createPassword}
            role={createRole}
            onUsernameChange={setCreateUsername}
            onPasswordChange={setCreatePassword}
            onRoleChange={setCreateRole}
            onCancel={closeCreateModal}
            onSave={handleCreateUser}
            saving={createSaving}
            error={createError}
          />
          {editModalOpen && (
            <div className={styles.terminalModalOverlay} onClick={closeEditModal}>
              <div
                className={styles.terminalModalCard}
                style={{ width: '600px' }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.terminalModalHeader}>
                  <span>编辑用户角色</span>
                  <button className={styles.terminalModalClose} type="button" onClick={closeEditModal}>
                    ×
                  </button>
                </div>
                <div className={styles.terminalModalBody}>
                  <div style={{ margin: '16px 0' }}>
                    <div style={{ marginBottom: 8, fontSize: 14, color: '#f0f6fc' }}>
                      用户名:
                    </div>
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#0d1117', 
                      border: '1px solid #30363d', 
                      borderRadius: '8px',
                      color: '#f0f6fc',
                      fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
                      fontSize: '14px'
                    }}>
                      {editingUser?.username}
                    </div>
                  </div>
                  <div style={{ margin: '24px 0' }}>
                    <div style={{ marginBottom: 8, fontSize: 14, color: '#f0f6fc' }}>
                      角色:
                    </div>
                    <TerminalSelect
                      value={editRole}
                      onChange={setEditRole}
                      options={[
                        { value: 'USER', label: 'USER' },
                        { value: 'SUPER', label: 'SUPER' }
                      ]}
                      placeholder="选择角色"
                      style={{ width: '560px' }}
                    />
                  </div>
                  {editError ? <div style={{ marginTop: 8, color: '#ff9a9a' }}>{editError}</div> : null}
                </div>
                <div className={styles.terminalModalFooter}>
                  <button
                    type="button"
                    className={styles.terminalButton}
                    onClick={closeEditModal}
                    disabled={editSaving}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className={styles.terminalPrimaryButton}
                    onClick={handleEditRole}
                    disabled={editSaving}
                  >
                    {editSaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
      <footer className={styles.footer}>
        <p>This web platform is developed by PT, for internal management use only by authorized personnel.</p>
      </footer>
    </>
  );
}

