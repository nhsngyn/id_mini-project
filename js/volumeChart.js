// 거래량 차트
// js/volumeChart.js
import { COLORS, sliceByWindow, fmtDateShort, fmtUnit, f3 } from './shared.js';

export function initVolumeChart(rootEl, data) {
  const chart = echarts.init(rootEl);
  const option = {
    animation: false,
    backgroundColor: 'transparent',
    grid: { left: '6%', right: '5%', top: 16, bottom: 10, containLabel: true },
   
    xAxis: [{
      type: 'category',
      data: data.map(d => d.date),
      boundaryGap: true,
      min: 'dataMin', max: 'dataMax',
      axisLine: { lineStyle: { color: '#2b323a' } },
      axisTick: { show: false },
      axisLabel: { color: '#7f8ea1', interval: i => i % 7 === 0, formatter: fmtDateShort },
      axisPointer: {
        show: true, type: 'shadow',
        label: { show: false },
        lineStyle: { color: COLORS.hoverBand, width: 10, opacity: .6 },
        shadowStyle: { color: COLORS.hoverBand }
      },
      splitLine: { show: false }
    }],

   yAxis: [{
  scale: true,
  minInterval: 100000000, // 100M 단위
  splitNumber: 4,
  axisLabel: {
    color: '#6C7989',               // 동일한 gray400
    fontFamily: 'Poppins, sans-serif',
    fontSize: 12,
    fontWeight: 400,
    letterSpacing: 0.24,
    align: 'right',
    formatter: (v) => {
      if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
      if (v >= 1e6) return (v / 1e6).toFixed(0) + 'M';
      return v.toFixed(0);
    }
  },
  axisPointer: {
    show: true,
    lineStyle: { opacity: 0 },
    label: {
      show: true,
      padding: [2, 8],
      color: '#E4E6ED',
      backgroundColor: 'rgba(34,39,47,0.10)',
      borderColor: '#6D89AB',
      borderWidth: 1,
      borderRadius: 4,
      margin: 6,
      formatter: (p) => {
        const n = +p.value;
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
        return n.toFixed(0);
      }
    }
  },
  splitLine: { lineStyle: { color: '#1e242b', type: 'dashed' } }
}],

tooltip: { show: false },

    series: [{
      name: 'Volume',
      type: 'bar',
      data: data.map(d => d.volume),
      barWidth: '60%',
      itemStyle: {
        opacity: .85,
        color: p => {
          const i = p.dataIndex;
          const prevClose = i > 0 ? data[i - 1].close : data[i].close;
          return data[i].close >= prevClose ? COLORS.up : COLORS.down;
        }
      },
      markLine: {
        symbol: 'none', silent: true, animation: false,
        lineStyle: { type: 'dashed', width: 1, opacity: .6 },
        label: { show: false },
        data: []
      }
    }]
  };
  chart.setOption(option, true);
  return chart;
}

export function updateVolumeWindow(chart, data, win = { start: 0, end: 1 }) {
  const sliced = sliceByWindow(data, win);
  chart.setOption({
    xAxis: [{ data: sliced.map(d => d.date) }],
    series: [{ name: 'Volume', data: sliced.map(d => d.volume) }]
  });
}

