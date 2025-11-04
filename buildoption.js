function buildOption(data) {
  // ★ 1일에만 라벨/틱을 찍기
  const cat = data.categoryData;    // ["YYYY/MM/DD", ...]
  const DayOfMonthIdx = new Set();
  for (let i = 0; i < cat.length; i++) {
    const [y, m, d] = String(cat[i]).split('/'); // "YYYY/MM/DD"
    if (d === '25') DayOfMonthIdx.add(i);
  }
  const MMM = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    backgroundColor: 'transparent',
    animation: false,
    axisPointer: {
      type: 'line',
      link: [{ xAxisIndex: 'all' }],
      triggerOn: 'mousemove|click',
      lineStyle: { width: 1, color: 'rgba(255,255,255,0.35)' },
      z: 10
    },
    grid: [
      { left: '6%', right: '5%', top: 20, height: '58%' },
      { left: '6%', right: '5%', top: '68%', height: '22%' }
    ],


    xAxis: [{
      type: 'category',
      data: data.categoryData,
      axisTick: { show: false },
      axisLabel: { show: false },
      axisPointer: {           // ✦ 세로선 스타일
        show: true,
        lineStyle: {
          color: '#2E2E34cc',
          width: 5,
          type: 'shadow',      // ← 세로선은 점선
          opacity: 0.3
        }
      },
      splitLine: { show: false }, // 그리드 라인 숨김
      min: 'dataMin',
      max: 'dataMax'
    },
    {
      type: 'category',
      gridIndex: 1,
      data: data.categoryData,
      boundaryGap: true,
      min: 'dataMin',
      max: 'dataMax',
      axisLine: { lineStyle: { color: '#2b323a' } },
      axisTick: { show: false },
      axisLabel: {
        show: true,
        color: '#7f8ea1',
        interval: function (index, value) {
          return index % 7 === 0; // 7일 단위만 라벨 표시
        },
        formatter: (val) => {
          const [y, m, d] = String(val).split(/[-/]/);
          const MMM = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${d} ${MMM[(+m || 1) - 1] || ''}`; // 예: 25 Sep
        }
      },
      // 밴드 (세로 hover 영역)
      axisPointer: {
        show: true, type: 'shadow',
        label: { show: false }, //
        shadowStyle: { color: hoverBand }
      },
      splitLine: { show: false }
    }
    ],

    yAxis: [
      {
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#7f8ea1' },
        splitLine: { lineStyle: { color: '#1e242b', type: 'dashed' } }, //가격 기준선(그리드 라인 점선)
        splitArea: { show: false }
      },
      {
        scale: true,
        gridIndex: 1,
        axisLine: { show: false },        // 세로축 라인은 그대로 숨김
        axisTick: { show: false },
        axisLabel: {                      // ✅ 볼륨 축 라벨 표시
          show: true,
          color: '#7f8ea1',
          formatter: (v) => {
            if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
            if (v >= 1e6) return (v / 1e6).toFixed(0) + 'M';
            if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
            return v;
          }
        },
        splitLine: {                      // 판매량 가로 기준선(그리드 라인)
          show: true,
          lineStyle: {
            color: '#1e242b',
            type: 'dashed'
          }

        }
      }
    ],

    //툴팁--------------------------
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: {
        show: false
      },
      backgroundColor: 'rgba(46,46,52,0.1)', // ← 진짜 글라스는 투명 배경 + 내부 스타일
      borderWidth: 0,
      padding: 0,
      formatter: function (params) {
        const k = params.find(p => p.seriesType === 'candlestick');
        const v = params.find(p => p.seriesName === 'Volume'); // bar series
        if (!k) return '';

        // candlestick data is [open, close, low, high]
        const [, open, close, low, high] = k.data.map(Number);
        const isUp = close >= open;
        const valColor = isUp ? '#4FF68C' : '#FF3B52';
        const fmt = n => (Number.isFinite(n) ? n.toFixed(3) : '-');

        // Volume data may be [index, volume, dir] or a plain number
        let volume = null;
        if (v) {
          if (Array.isArray(v.data)) {
            volume = Number(v.data[1]);
          } else {
            volume = Number(v.data);
          }
        }

        const fmtVol = (n) => {
          if (!Number.isFinite(n)) return '—';
          if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
          if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
          if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
          return String(n);
        };

        const label = k.axisValueLabel || k.name || '';
        const [dateStr, t] = String(label).split(/[ T]/);
        const timeStr = t ? t.slice(0, 5) : '09:00';

        return `
  <div style="
    min-width:180px;
    padding:16px;
    border-radius:12px;
    background: rgba(24,28,33,0.01);
    border: 1px solid rgba(255,255,255,0);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color:#E6EBF2;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  ">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#818D9C;font-size:12px;font-weight:600">
      <span>${dateStr || ''}</span><span>${timeStr}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;row-gap:6px;font-size:13px;">
      <span>OPEN</span><span style="text-align:right;color:${valColor}">${fmt(open)}</span>
      <span>HIGH</span><span style="text-align:right;color:${valColor}">${fmt(high)}</span>
      <span>LOW</span><span style="text-align:right;color:${valColor}">${fmt(low)}</span>
      <span>CLOSE</span><span style="text-align:right;color:${valColor}">${fmt(close)}</span>
      ${volume != null ? `<span style="font-weight:800">VOLUME</span><span style="text-align:right;color:${valColor}">${fmtVol(volume)}</span>` : ``}
    </div>
  </div>`;
      }
    },
    graphic: [{
      id: 'global-hover-line',
      type: 'line',
      silent: true,
      invisible: true,
      z: 9,
      shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
      style: { stroke: 'rgba(255,255,255,0.35)', lineWidth: 1 }
    },
    // ── Price OPEN horizontal line + badge
    {
      id: 'price-open-line',
      type: 'line',
      silent: true,
      invisible: true,
      z: 12,
      shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
      style: { stroke: 'rgba(125, 211, 252, 0.6)', lineWidth: 1, lineDash: [4, 4] }
    },
    {
      id: 'price-open-badge',
      type: 'group',
      silent: true,
      invisible: true,
      z: 13,
      children: [
        {
          type: 'rect',
          shape: { x: 0, y: 0, width: 64, height: 20, r: 4 },
          style: { fill: 'rgba(24,28,33,0.75)', stroke: '#6D89AB', lineWidth: 1 }
        },
        {
          type: 'text',
          style: { x: 6, y: 3, text: '', fill: '#E6EBF2', font: '12px Poppins, system-ui' }
        }
      ]
    },
    // ── Volume horizontal line + badge
    {
      id: 'volume-line',
      type: 'line',
      silent: true,
      invisible: true,
      z: 12,
      shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
      style: { stroke: 'rgba(148, 163, 184, 0.6)', lineWidth: 1, lineDash: [4, 4] }
    },
    {
      id: 'volume-badge',
      type: 'group',
      silent: true,
      invisible: true,
      z: 13,
      children: [
        {
          type: 'rect',
          shape: { x: 0, y: 0, width: 64, height: 20, r: 4 },
          style: { fill: 'rgba(24,28,33,0.75)', stroke: '#6D89AB', lineWidth: 1 }
        },
        {
          type: 'text',
          style: { x: 6, y: 3, text: '', fill: '#E6EBF2', font: '12px Poppins, system-ui' }
        }
      ]
    },
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: 40, end: 100 },

    ],
    visualMap: {
      show: false,
      seriesIndex: 1,
      dimension: 2, // volumes: [i, volume, dir]
      pieces: [
        { value: 1, color: downColor }, // 1 → 하락(빨강)
        { value: -1, color: upColor }   // -1 → 상승(초록)
      ]
    },
    series: [
      {
        name: 'Price',
        type: 'candlestick',
        data: data.values,
        itemStyle: {
          color: upColor,
          color0: downColor,
          borderColor: upColor,
          borderColor0: downColor
        }
      },
      {
        name: 'Volume',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: data.volumes,
        barWidth: '60%',
        itemStyle: { opacity: 0.85 },
        markLine: {                       // ✅ 0 기준선
          symbol: 'none',
          label: { show: false },
          lineStyle: { color: '#334155', width: 1 },
          data: [{ yAxis: 0 }]
        }
      }
    ]
  };
}