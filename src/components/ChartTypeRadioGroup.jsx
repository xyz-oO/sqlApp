import Radio from 'antd/es/radio';
import { LineChartOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons';
import styles from '../themes/terminal.less';

export default function ChartTypeRadioGroup({
  value,
  onChange,
  className,
  style,
  disabled,
}) {
  return (
    <Radio.Group
      className={className || styles.terminalRadioGroup}
      value={value}
      onChange={onChange}
      style={style}
      disabled={disabled}
    >
      <Radio value="lineChart">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <LineChartOutlined />
          lineChart
        </span>
      </Radio>
      <Radio value="Bar-v-chart">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <BarChartOutlined />
          Bar-v-chart
        </span>
      </Radio>
      <Radio value="Bar-h-chart">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <BarChartOutlined />
          Bar-h-chart
        </span>
      </Radio>
      <Radio value="PieChart">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <PieChartOutlined />
          PieChart
        </span>
      </Radio>
    </Radio.Group>
  );
}

