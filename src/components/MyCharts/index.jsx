import BarVertical from './BarVertical';
import BarHorizontal from './BarHorizontal';
import Line from './Line';
import Pie from './Pie';

export default function MyChart({ resultData, chartType, height = 320, yAxisRange }) {
  if (chartType === 'Bar-v-chart') return <BarVertical resultData={resultData} height={height} />;
  if (chartType === 'Bar-h-chart') return <BarHorizontal resultData={resultData} height={height} />;
  if(chartType === 'PieChart') return <Pie resultData={resultData} height={460} />;
  return <Line resultData={resultData} height={height} yAxisRange={yAxisRange} />;
}

