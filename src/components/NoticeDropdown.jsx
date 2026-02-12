import { useEffect, useMemo, useRef, useState } from 'react';
import { BellOutlined } from '@ant-design/icons';
import styles from '../themes/terminal.less';

const truncateWords = (text, maxWords = 20) => {
  const value = String(text || '').trim();
  if (!value) return '';
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(' ')}...`;
};

export default function NoticeDropdown({ messages, onSelectMessage, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const unreadCount = useMemo(() => {
    return (messages || []).filter((m) => !m?.read).length;
  }, [messages]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!open) return;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      if (wrapper.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div className={styles.messageDropdownWrapper} ref={wrapperRef}>
      <button
        className={styles.messageDropdownButton}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <BellOutlined className={styles.messageDropdownIcon} />
        {unreadCount > 0 ? <span className={styles.noticeUnreadBadge}>{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className={styles.messageDropdownMenu} role="menu">
          {(messages || []).map((item) => (
            <button
              key={item.id ?? item.title}
              type="button"
              className={styles.messageDropdownItem}
              role="menuitem"
              onClick={() => {
                onSelectMessage?.(item);
                setOpen(false);
              }}
            >
              <span className={styles.messageDropdownItemTitle}>{truncateWords(item.title, 20)}</span>
              <span className={item.read ? styles.noticeReadTag : styles.noticeUnreadTag}>
                {item.read ? '已读' : '未读'}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

