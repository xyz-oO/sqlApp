import styles from '../themes/terminal.less';

export default function TerminalTextInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  spellCheck = false,
  style = {},
  className = '',
}) {
  return (
  
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      spellCheck={spellCheck}
      style={{
        minWidth: "560px",
        ...style,
      }}
      className={`${styles.teriminalInputField} ${className}`}
    />
   
  );
}
