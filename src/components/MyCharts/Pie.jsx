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

  const SERIES_LABEL = {
    show: true,
    position: 'top',
    fontSize: 18,
    fontFamily: 'Arial, Consolas, Roboto',
    color: 'green'
  };

const Pie = ({ resultData, height = 460 }) => {
  
  
 const option = {
    // title: {
    //   text: 'Referer of a Website',
    //   subtext: 'Fake Data',
    //   left: 'center'
    // },
    tooltip: {
      trigger: 'item'
    },
    legend: {
    //   orient: 'vertical',
      top: 0
    },
    series: [
      {
        label:{
            ...SERIES_LABEL
        },
        name: 'Access From',
        type: 'pie',
        radius: '80%',
        data:  resultData.map(item => ({name: item[Object.keys(resultData[0])[0]], value: item[Object.keys(resultData[0])[1]] })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
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

export default Pie;
