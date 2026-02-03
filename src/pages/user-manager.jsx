import { useEffect, useMemo, useState } from 'react';
import { Link, request } from 'umi';
import { Button, Card, Input, Switch, Table } from 'antd';
import styles from '../themes/terminal.less';
import ChangePasswordModal from '../components/ChangePasswordModal';
import NewUserModal from '../components/NewUserModal';
import SidebarNav from '../components/SidebarNav';

export default function UserManagerPage() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
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
  }, []);

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
      setSaveError('Please enter a new password.');
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
    } catch (error) {
      setSaveError('Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setCreateUsername('');
    setCreatePassword('');
    setCreateError('');
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateUsername('');
    setCreatePassword('');
    setCreateError('');
  };

  const handleCreateUser = async () => {
    if (!createUsername.trim() || !createPassword.trim()) {
      setCreateError('Please enter username and password.');
      return;
    }
    setCreateSaving(true);
    setCreateError('');
    try {
      await request('/users', {
        method: 'POST',
        data: { username: createUsername.trim(), password: createPassword },
      });
      const data = await request('/users');
      setUsers(data?.users || []);
      setCreateModalOpen(false);
      setCreateUsername('');
      setCreatePassword('');
    } catch (error) {
      if (error?.response?.status === 409) {
        setCreateError('User already exists.');
      } else {
        setCreateError('Failed to create user.');
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
    } catch (error) {
      setUsers(previousUsers);
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
        title: 'Username',
        dataIndex: 'username',
        key: 'username',
      },
      {
        title: 'Status',
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
        title: 'Action',
        key: 'action',
        render: (_, record) => (
          <Button
            className={styles.secondaryButton}
            type="button"
            onClick={() => openPasswordModal(record)}
          >
            change password
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <div className={styles.dashboard}>
        <aside
          className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
        >
          <div className={styles.sidebarHeader}>
            <span>System</span>
            <button
              className={styles.sidebarToggle}
              type="button"
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? '>' : '<'}
            </button>
          </div>
          <SidebarNav userLabel="用户管理" sqlLabel="SQL管理" />
        </aside>
        <section className={styles.dashboardContent}>
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
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              allowClear
              className={styles.terminalInput}
            />
          </div>
          <Card style={{ marginTop: 16, background: '#0a110d', borderColor: '#1f2f23' }}>
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
            onUsernameChange={setCreateUsername}
            onPasswordChange={setCreatePassword}
            onCancel={closeCreateModal}
            onSave={handleCreateUser}
            saving={createSaving}
            error={createError}
          />
        </section>
      </div>
      <footer className={styles.footer}>
        <p>This web platform is developed by PT, for internal management use only by authorized personnel.</p>
      </footer>
    </>
  );
}

