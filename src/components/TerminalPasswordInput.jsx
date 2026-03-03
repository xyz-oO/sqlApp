import { useState } from 'react';
import styles from '../themes/terminal.less';

export default function TerminalPasswordInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  spellCheck = false,
  style = {},
  className = '',
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={passwordVisible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={spellCheck}
        style={{
          minWidth: "560px",
          ...style,
        }}
        className={`${styles.terminalPasswordField} ${className}`}
      />
      <span
        className={styles.terminalPasswordToggleIcon}
        onClick={() => setPasswordVisible(!passwordVisible)}
      >
        {passwordVisible ? '👁️' : '🙈'}
      </span>
    </div>
  );
}
