import { useEffect, useState } from 'react';
import { Button, Table, Typography } from 'antd';
import { history, request } from 'umi';
import { PlusOutlined } from '@ant-design/icons';
import SidebarNav from '../components/SidebarNav';
import TerminalAlert from '../components/TerminalAlert';
import NoticeModal from '../components/NoticeModal';
import NewNoticeModal from '../components/NewNoticeModal';
import styles from '../themes/terminal.less';
import { useApp } from '../contexts/appContext';

const { Text } = Typography;

export default function NoticeManagerPage() {
  const { session, sessionChecked } = useApp();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [activeMessage, setActiveMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const isSuper = session?.role === 'SUPER';
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadNotices = async () => {
    setLoading(true);
    try {
      const data = await request('/notices');
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e) {
      setNotice({ type: 'error', message: 'Load notices failed.' });
      setTimeout(() => setNotice({ type: '', message: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionChecked && !isSuper) {
      history.push('/');
      return;
    }
    if (sessionChecked && isSuper) {
      loadNotices();
    }
  }, [isSuper, sessionChecked]);

  const openNewNotice = () => {
    setNewTitle('');
    setNewBody('');
    setCreateError('');
    setNewModalOpen(true);
  };

  const closeNewNotice = () => {
    if (creating) return;
    setNewModalOpen(false);
    setNewTitle('');
    setNewBody('');
    setCreateError('');
  };

  const handleCreateNotice = async () => {
    if (!newTitle.trim() || !newBody.trim()) {
      setCreateError('标题和内容不能为空。');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await request('/notices/send', {
        method: 'POST',
        data: {
          title: newTitle.trim(),
          body: newBody,
          footer: '',
        },
      });
      setNotice({ type: 'success', message: '通知已发送。' });
      setTimeout(() => setNotice({ type: '', message: '' }), 2000);
      setNewModalOpen(false);
      setNewTitle('');
      setNewBody('');
      await loadNotices();
    } catch (e) {
      const msg = e?.response?.data?.error || '创建失败，请重试。';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  if (sessionChecked && !isSuper) {
    return null;
  }

  return (
    <div className={styles.dashboard}>
      <SidebarNav userLabel="用户管理" sqlLabel="SQL管理" />
      <section className={styles.dashboardContent}>
        {notice.message ? (
          <div style={{ marginBottom: 16 }}>
            <TerminalAlert message={notice.message} type={notice.type || 'info'} showIcon={true} />
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className={styles.dashboardTitle}>通知管理</h2>
            <p className={styles.dashboardSubtitle}>Manage notices from backend server.</p>
          </div>
          <Button className={styles.primaryButton} type="button" onClick={openNewNotice}>
            <span style={{ marginRight: 6 }}>
              <PlusOutlined />
            </span>
            新增通知
          </Button>
        </div>

        <div className={styles.dashboardPanel}>
          <Table
            rowKey="id"
            className={styles.terminalTable}
            loading={loading}
            dataSource={messages}
            pagination={{ pageSize: 8 }}
            columns={[
              {
                title: '#',
                key: 'index',
                width: 60,
                render: (_, __, index) => <span className={styles.terminalTableHeader}>{index + 1}</span>,
              },
              {
                title: 'Title',
                dataIndex: 'title',
                key: 'title',
                render: (text) => <Text className={styles.terminalText}>{text}</Text>,
              },
              {
                title: 'Pushed At',
                dataIndex: 'pushedAt',
                key: 'pushedAt',
                width: 220,
                render: (text) => <Text className={styles.terminalText}>{text || '-'}</Text>,
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 220,
                render: (_, record) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={() => {
                        setActiveMessage(record);
                        setModalOpen(true);
                      }}
                    >
                      View
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>

        <NoticeModal
          open={modalOpen}
          title={activeMessage?.title}
          body={activeMessage?.body}
          footer={activeMessage?.footer}
          onCancel={() => {
            setModalOpen(false);
            setActiveMessage(null);
          }}
        />

        <NewNoticeModal
          open={newModalOpen}
          title={newTitle}
          body={newBody}
          onTitleChange={setNewTitle}
          onBodyChange={setNewBody}
          onCancel={closeNewNotice}
          onSave={handleCreateNotice}
          saving={creating}
          error={createError}
        />
      </section>
    </div>
  );
}

