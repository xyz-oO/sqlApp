import ReactECharts from 'echarts-for-react';

const SERIES_LABEL = {
  show: true,
  position: 'top',
  fontSize: 18,
  fontFamily: 'Arial, Consolas, Roboto',
  color: 'green'
};

// const SERIES_DATA = [
//   { name: 'Series A', data: [120, 132, 101, 134, 90, 230, 210] },
//   // { name: 'Series B', data: [220, 182, 191, 234, 290, 330, 310] }
// ];

const Line = ({ resultData, height = 320, yAxisRange }) => {

  const xAxisData = [...new Set(resultData.map(item => item[Object.keys(item)[0]]))];
  let SERIES_DATA;
  const obkeysLength = Object.keys(resultData[0]).length;
  const test ={name:'value', data: resultData.map(item=>item[Object.keys(item)[1]]) }
  console.log("test:",test)
  if(obkeysLength > 2){
    SERIES_DATA = [];
    const label = [...new Set(resultData.map(item => item[Object.keys(item)[1]]))];
    label.forEach(x => {
      SERIES_DATA.push({ name: x, data: resultData.filter(item => item[Object.keys(item)[1]] === x).map(item => item[Object.keys(item)[2]]) });
    });

    // SERIES_DATA = [
    //   { name: 'Series A', data: [120, 132, 101, 134, 90, 230, 210] },
    //   { name: 'Series B', data: [220, 182, 191, 234, 290, 330, 310] }
    // ];
  }else{
    SERIES_DATA = [
      // { name: 'Series A', data: [120, 132, 99, 134, 90, 230, 210] }
      {name:'value', data: resultData.map(item=>item[Object.keys(item)[1]]) }
    ];
    console.log("else")
  }
 
  const option = {
    tooltip: { trigger: 'axis' },
    legend: {
      type: 'scroll',
      top: 0,
      data: SERIES_DATA.map(s => s.name)
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: { interval: 0 }
    },
    yAxis: {
      type: 'value',
      ...(yAxisRange?.min != null && { min: yAxisRange.min }),
      ...(yAxisRange?.max != null && { max: yAxisRange.max }),
      splitLine: {
        show: true,
        lineStyle: { width: 0.5, color: 'gray' }
      }
    },
    series: SERIES_DATA.map(({ name, data }) => ({
      name,
      type: 'line',
      stack: 'Total',
      data,
      smooth: true,
      label: SERIES_LABEL
    }))
  };
  

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
      lazyUpdate
    />
  );
}

export default Line;