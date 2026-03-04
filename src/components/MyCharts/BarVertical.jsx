import ReactECharts from 'echarts-for-react';

const LEGEND_COLORS = ['#8dff9d', '#2f5c39', '#4b7a5a'];

const BarVertical = ({ resultData, height = 320 }) => {
  const xAxisData = resultData.map(item => item[Object.keys(item)[0]]);
  const yAxisData = resultData.map(item => item[Object.keys(item)[1]]);
  const seriesName = resultData?.[0] ? Object.keys(resultData[0])[1] || 'Value' : 'Value';

  const BAR_COLORS = [
    '#8dff9d', 
    '#9a9aff',
    '#ff9a9a',  
    '#2196F3',  
    '#FF9800',  
    '#9C27B0',  
    '#00BCD4'   
  ];

  const option = {
    legend: {
      data: [seriesName],
      textStyle: { color: '#b7d3bd' },
      top: 20
    },
    color: LEGEND_COLORS,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel:{color:'green'}
    },
    yAxis: {
      type: 'value',
      // axisLabel: { color: 'yellow' },
      splitLine: {
            show: true,
            lineStyle: { width: 0.5, color: 'gray' }
          }
    },
    series: [
      {
        name: seriesName,
        data: yAxisData.map((val, i) => ({
                                  value: val,
                                  itemStyle: { color: BAR_COLORS[i % BAR_COLORS.length] }
                                })),
        type: 'bar',
        itemStyle: { color: LEGEND_COLORS[0] }
      }
    ]
  };
  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
      lazyUpdate
    />
  );
};

export default BarVertical;
