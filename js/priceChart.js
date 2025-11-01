// 가격 차트

import { COLORS, sliceByWindow, f3, fmtDateLabel, fmtUnit } from './shared.js';

export function initPriceChart(rootEl, data) {
  const chart = echarts.init(rootEl);

  const option = {
    animation: false,
    backgroundColor: 'transparent',
    grid: { left: '6%', right: '5%', top: 12, height: 470, containLabel: true },

    xAxis: [{
      type: 'category',
      data: data.map(d => d.date),
      boundaryGap: true,
      min: 'dataMin', max: 'dataMax',
      axisLine: { lineStyle: { color: '#2b323a' } },
      axisTick: { show: false },
      axisLabel: { show: false },
      axisPointer: {
        show: true, type: 'shadow',
        label: { show: false },
        lineStyle: { color: COLORS.hoverBand, width: 10, opacity: .6 },
        shadowStyle: { color: COLORS.hoverBand }
      },
      splitLine: { show: false }
    }],

    yAxis: [{
        minInterval: 0.05, // 0.05 단위
        splitNumber: 5,
        axisLabel: {
          color: '#6C7989',               // var(--gray400)
          fontFamily: 'Poppins, sans-serif',
          fontSize: 12,
          fontWeight: 400,
          letterSpacing: 0.24,
          lineHeight: 1,
          align: 'right',                 // text-align: right
          formatter: (v) => v.toFixed(2)
        },
      axisPointer: {
        show: true,
        lineStyle: { opacity: 0 },
        label: {
          show: true,
          padding: [2, 8],
          color: '#E4E6ED',
          backgroundColor: 'rgba(34,39,47,0.10)',
          borderColor: '#6D89AB', borderWidth: 1, borderRadius: 4, margin: 6,
          // __currOpen은 shared에서 관리 → 여기서 값 문자열만 렌더(빈값은 —)
          formatter: (p) => (Number.isFinite(+p.value) ? f3(+p.value) : '—')
        }
      },
      splitLine: { lineStyle: { color: '#1e242b', type: 'dashed' } }
    }],

     tooltip: {
  trigger: 'axis',
  confine: true,
  axisPointer: { type: 'none' }, // 교차선 숨김
  backgroundColor: 'rgba(46,46,52,0.92)',
  borderWidth: 0,
  padding: 0, // 내부 컨테이너에서 패딩 처리
  extraCssText: 'border-radius:12px; overflow:hidden;',

  formatter: (params) => {
    const i = params?.[0]?.dataIndex ?? 0;
    const d = data[i];
    if (!d) return '';

    const o = d.open, c = d.close;
    const h = Math.max(d.high, d.low, o, c);
    const l = Math.min(d.high, d.low, o, c);

    // ====== 공통 스타일 (피그마 스펙) ======
    const labelStyle = `
      color: var(--gray100, #E4E6ED);
      font-family: Poppins; font-size:16px; font-weight:400; line-height:normal;
    `;
    const valueStyle = `
      color: var(--green_light, #4FF68C);
      text-align:right; font-family:Poppins; font-size:16px; font-weight:500; 
      line-height:normal; letter-spacing:0.32px;
    `;
    const labelBoldStyle = `
      color: var(--gray100, #E4E6ED);
      font-family:Poppins; font-size:16px; font-weight:600; line-height:normal; letter-spacing:0.32px;
    `;
    const valueBoldStyle = `
      color: var(--green_light, #4FF68C);
      text-align:right; font-family:Poppins; font-size:16px; font-weight:600; 
      line-height:normal; letter-spacing:0.32px;
    `;

    // ====== 헤더 (좌: 날짜 / 우: 09:00) ======
    const head = `
      <div style="
        display:flex; justify-content:space-between; align-items:flex-start; 
        align-self:stretch; width:100%; opacity:.85; margin-bottom:6px;">
        <span style="color: var(--gray300, #818D9C);font-family: Poppins;font-size: 12px;font-style: normal;font-weight: 400;line-height: normal;letter-spacing: 0.24px;">${d.date.replaceAll('-', '/')}</span>
        <span style="color: var(--gray300, #818D9C);font-family: Poppins;font-size: 12px;font-style: normal;font-weight: 400;line-height: normal;letter-spacing: 0.24px;">09:00</span>
      </div>
    `;

    // ====== 본문 row 유틸 (좌/우 정렬 + stretch) ======
    const row = (k, v, bold=false) => `
      <div style="
        display:flex; justify-content:space-between; align-items:center; align-self:stretch; width:100%;">
        <span style="${bold ? labelBoldStyle : labelStyle}">${k}</span>
        <span style="${bold ? valueBoldStyle : valueStyle}">${v}</span>
      </div>
    `;

    const f3 = (n) => (Number.isFinite(+n) ? (+n).toFixed(3) : '—');
    const vol = (() => {
      const n = +d.volume;
      if (!Number.isFinite(n)) return '—';
      if (n >= 1e9) return (n/1e9).toFixed(1) + 'B';
      if (n >= 1e6) return (n/1e6).toFixed(0) + 'M';
      if (n >= 1e3) return (n/1e3).toFixed(0) + 'K';
      return String(n);
    })();

    const body = [
      row('OPEN',  f3(o)),
      row('HIGH',  f3(h)),
      row('LOW',   f3(l)),
      row('CLOSE', f3(c)),
      row('VOLUME', vol, true) // 라벨/값 둘 다 볼드
    ].join('');

    // ====== 바깥 컨테이너 (피그마 박스) ======
    return `
      <div style="
        display:flex; width:179px; padding:12px 20px; 
        flex-direction:column; justify-content:center; align-items:flex-start; gap:6px;">
        ${head}
        ${body}
      </div>
    `;
  }
},


    series: [{
      id: 'price',
      name: 'Price',
      type: 'candlestick',
      data: data.map(d => [d.open, d.close, d.low, d.high]), // ECharts 순서: [O,C,L,H]
       barMinWidth: 3, barMaxWidth: 16,
      itemStyle: {
        color: COLORS.up,         // 상승(양봉)
        borderColor: COLORS.up,
        color0: COLORS.down,      // 하락(음봉)
        borderColor0: COLORS.down
    },
    z: 3, zlevel: 0,
      markLine: {
        symbol: 'none', silent: true, animation: false,
        lineStyle: { color: '#3A3F46', type: 'dashed', width: 1, opacity: .95 },
        label: { show: false },
        emphasis: { label: { show: false } },
        data: []
      }
    }]
  };

  chart.setOption(option, true);

  return chart;
}

export function updatePriceWindow(chart, data, win = { start: 0, end: 1 }) {
  const sliced = sliceByWindow(data, win);
  chart.setOption({
  xAxis: [{ data: sliced.map(d => d.date) }],
  series: [{ id: 'price', data: sliced.map(d => [d.open, d.close, d.low, d.high]) }]
});
}
