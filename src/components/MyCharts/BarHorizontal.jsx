import ReactECharts from 'echarts-for-react';

const BAR_COLORS = [
    '#8dff9d', 
    '#9a9aff',
    '#ff9a9a',  
    '#2196F3',  
    '#FF9800',  
    '#9C27B0',  
    '#00BCD4'   
  ];


const BarHorizontal = ({ resultData, height = 320 }) => {
  const xAxisData = resultData.map(item => item[Object.keys(item)[0]]);
  const yAxisData = resultData.map(item => item[Object.keys(item)[1]]);
  const seriesName = resultData?.[0] ? Object.keys(resultData[0])[1] || 'Value' : 'Value';

  const option = {
    // title: {
    //   text: 'World Population'
    // },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {top: 20},
    xAxis: {
      type: 'value',
      boundaryGap: [0, 0.01]
    },
    yAxis: {
      type: 'category',
      data: xAxisData
    },
    series: [
      {
        name: seriesName,
        type: 'bar',
        data: yAxisData.map((val, i) => ({
                                  value: val,
                                  itemStyle: { color: BAR_COLORS[i % BAR_COLORS.length] }
                                })),
      },
    //   {
    //     name: '2012',
    //     type: 'bar',
    //     data: [19325, 23438, 31000, 121594, 134141, 681807]
    //   }
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

export default BarHorizontal;
