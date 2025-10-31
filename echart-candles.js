// echart-candles.js
(() => {
  const upColor   = '#0FA76C';
  const downColor = '#C93C50';
  const hoverBand = 'rgba(55,60,66,0.30)';

  // ===== 레이아웃 픽셀 스펙 =====
  const PRICE_H = 470;
  const VOLUME_H = 120;
  const GAP = 1;
  const TOP = 12;
  const BOTTOM = 16;

  // 현재 호버 중인 값(배지/점선 표시용)
  let __currOpen = null;
  let __currVol  = null;

  // ----- 데이터 로드 -----
  async function loadJSON(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('fetch 실패:', url, e);
      return null;
    }
  }

  // 인라인 JSON (#ohlcv)
  function readInlineJSON() {
    const el = document.getElementById('ohlcv');
    if (!el) return null;
    try {
      const txt = el.textContent.trim();
      return txt ? JSON.parse(txt) : null;
    } catch (e) {
      console.error('JSON 파싱 실패(ohlcv):', e);
      return null;
    }
  }

// [date, open, high, low, close, volume]
function splitData(raw) {
  const categoryData = [], values = [], volumes = [], dirs = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.length < 6) continue;

    const ds    = String(r[0]).replace(/[.\/]/g, '-'); // 'YYYY-MM-DD'로 통일
    const open  = +r[1];
    const high  = +r[2];
    const low   = +r[3];
    const close = +r[4];
    const vol   = +r[5];

    categoryData.push(ds);
    // ECharts는 [open, close, low, high]
    values.push([open, close, low, high]);
    volumes.push(vol);
    dirs.push(open > close ? 1 : -1);
  }
  return { categoryData, values, volumes, dirs };
}



  // ----- 옵션 -----
  function buildOption(data) {
    const priceTop = TOP;
    const priceHeight = PRICE_H;
    const volumeTop = priceTop + priceHeight + GAP;
    const volumeHeight = VOLUME_H;

    return {
      backgroundColor: 'transparent',
      animation: false,
      axisPointer: { link: [{ xAxisIndex: [0, 1] }] },

      grid: [
        { left: '6%', right: '5%', top: priceTop,  height: priceHeight, containLabel: true },
        { left: '6%', right: '5%', top: volumeTop, height: volumeHeight, containLabel: true }
      ],

      xAxis: [
        {
          type: 'category',
          data: data.categoryData,
          boundaryGap: true,
          min: 'dataMin', max: 'dataMax',
          axisLine: { lineStyle: { color: '#2b323a' } },
          axisTick: { show: false },
          axisLabel: { show: false },
          axisPointer: {
            show: true, type: 'shadow',
            label: { show: false },
            lineStyle: { color: hoverBand, width: 10, opacity: .6 },
            shadowStyle: { color: hoverBand }
          },
          splitLine: { show: false }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: data.categoryData,
          boundaryGap: true,
          min: 'dataMin', max: 'dataMax',
          axisLine: { lineStyle: { color: '#2b323a' } },
          axisTick: { show: false },
          axisLabel: {
            show: true,
            color: '#7f8ea1',
            interval: (i) => i % 7 === 0,
            formatter: (val) => {
              const [y, m, d] = String(val).split(/[-/]/);
              const MMM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              return `${d} ${MMM[(+m||1)-1]}`;
            }
          },
          axisPointer: {
            show: true, type: 'shadow',
            label: { show: false },
            lineStyle: { color: hoverBand, width: 10, opacity: .6 },
            shadowStyle: { color: hoverBand }
          },
          splitLine: { show: false }
        }
      ],

      yAxis: [
        {
          scale: true,
         axisPointer: {
  show: true,
  lineStyle: { opacity: 0 },
  label: {
    show: true,
    padding: [2,8],
    color: '#E4E6ED',
    backgroundColor: 'rgba(34,39,47,0.10)',
    borderColor: '#6D89AB', borderWidth: 1, borderRadius: 4, margin: 6,
    formatter: () => (__currOpen!=null && isFinite(+__currOpen)) ? (+__currOpen).toFixed(3) : '—'
  }
          },
          splitLine: { lineStyle: { color: '#1e242b', type: 'dashed' } }
        },
        {
          scale: true, gridIndex: 1,
          axisPointer: {
  show: true,
  lineStyle: { opacity: 0 },
  label: {
    show: true,
    padding: [2,8],
    color: '#E4E6ED',
    backgroundColor: 'rgba(34,39,47,0.10)',
    borderColor: '#6D89AB', borderWidth: 1, borderRadius: 4, margin: 6,
    formatter: () => {
      if (__currVol==null || !isFinite(+__currVol)) return '—';
      const n = +__currVol;
      if (n>=1e9) return (n/1e9).toFixed(1)+'B';
      if (n>=1e6) return (n/1e6).toFixed(3);   // ← 툴팁과 맞추려면 .toFixed(3)로 바꿔도 됨
      if (n>=1e3) return (n/1e3).toFixed(3);
      return n.toFixed(3);
              }
            }
          },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: '#7f8ea1',
            formatter: (v) => v>=1e9 ? (v/1e9).toFixed(1)+'B'
              : v>=1e6 ? (v/1e6).toFixed(0)+'M'
              : v>=1e3 ? (v/1e3).toFixed(0)+'K' : v
          },
          splitLine: { lineStyle: { color: '#1e242b', type: 'dashed' } }
        }
      ],

      // 교차선이 축배지를 덮지 않도록 none
  tooltip: {
  trigger: 'axis',
  confine: true,
  axisPointer: { type: 'none' },                // 교차선 숨김 (배지 가리지 않게)
  backgroundColor: 'rgba(46,46,52,0.80)',
  borderWidth: 0,
  padding: 10,
  formatter: function (params) {
    const k = params.find(p => p.seriesType === 'candlestick');
    const v = params.find(p => p.seriesName === 'Volume');
    if (!k) return '';

    // values = [open, close, low, high]
    const a = (Array.isArray(k.data) ? k.data : []).map(Number);
    const open = a[0], close = a[1], low = a[2], high = a[3];
    const vol  = v ? Number(v.data) : NaN;
    const f3 = n => (Number.isFinite(n) ? n.toFixed(3) : '—');

    // 요구: OPEN → HIGH → LOW → CLOSE → VOLUME
    return [
      `OPEN&nbsp;&nbsp;${f3(open)}`,
      `HIGH&nbsp;&nbsp;${f3(high)}`,
      `LOW&nbsp;&nbsp;&nbsp;&nbsp;${f3(low)}`,
      `CLOSE&nbsp;${f3(close)}`,
      `VOLUME ${f3(vol)}`
    ].join('<br>');
  }
},




      dataZoom: [],

      series: [
        {
          id:'price',
          name:'Price',
          type:'candlestick',
          data:data.values,
          itemStyle:{
            color: upColor, borderColor: upColor,
            color0: downColor, borderColor0: downColor
          },
          markLine: {
            symbol:'none', silent:true, animation:false,
            lineStyle:{ color:'#3A3F46', type:'dashed', width:1, opacity:.95 },
            label:{ show:false },
            emphasis:{ label:{ show:false } },
            data:[]
          }
        },
        {
          name:'Volume',
          type:'bar',
          xAxisIndex:1, yAxisIndex:1,
          data:data.volumes,
          barWidth:'60%',
          itemStyle:{
            opacity:.85,
            color: (p) => (data.dirs[p.dataIndex] === 1 ? downColor : upColor)
          },
          markLine:{
            symbol:'none', silent:true, animation:false,
            lineStyle:{ type:'dashed', width:1, opacity:.6 },
            label:{ show:false },
            data:[]
          }
        }
      ]
    };
  }

  // ----- 부트 -----
  async function boot({ containerId='chart', defaultFile='mantra_60days.json' } = {}) {
    const el = document.getElementById(containerId);
    if (!el) return console.error(`#${containerId} 를 찾을 수 없습니다.`);

    // 크기
    el.style.width = '100%';
    el.style.height = (PRICE_H + VOLUME_H + GAP + TOP + BOTTOM) + 'px';

    // 데이터
    let raw = readInlineJSON() || window.rawData || await loadJSON(defaultFile);
    if (!raw || !Array.isArray(raw) || !raw.length) {
      el.innerHTML = '<div style="color:#f87171;padding:12px">데이터가 없습니다.</div>';
      return;
    }
    raw.sort((a, b) => new Date(a[0]) - new Date(b[0]));

    const parsed = splitData(raw);
    const chart = echarts.init(el, null, { renderer: 'canvas' });

    // 넘침 차단
    const dom = chart.getDom();
    dom.style.overflow = 'hidden';
    dom.style.maxWidth = '100%';

    // 옵션
    chart.setOption(buildOption(parsed), true);

    // === 상태 ===
    let syncing = false;
    let lastIdx = -1;

    // === 포인터 업데이트 ===
    chart.off('updateAxisPointer');
    chart.on('updateAxisPointer', (e) => {
  // (A) 막대 두께 보정 (그대로 유지)
  const xAxisModel = chart.getModel().getComponent('xAxis', 0);
  if (xAxisModel) {
    const idxExtent = xAxisModel.axis.scale.getExtent();
    const pxExtent  = xAxisModel.axis.getExtent();
    const barW = Math.max(6,
      Math.min(20, Math.abs(pxExtent[1]-pxExtent[0]) / Math.max(1, idxExtent[1]-idxExtent[0]))
    );
    chart.setOption({ xAxis:[{ axisPointer:{ lineStyle:{ width: barW } } }] }, false);
  }

  if (syncing) return;
  const xi = (e.axesInfo || []).find(a => (a.axisDim||a.axisDimension)==='x' && a.axisIndex===0);
  if (!xi) return;

  let idx = xi.value;
  if (typeof idx !== 'number') {
    idx = (parsed.categoryData || []).indexOf(xi.value);
  }
  if (idx < 0) return;

  // (B) 값 계산: values = [open, close, low, high]
  const k = parsed.values[idx];
  if (!k) return;
  const open = Number(k[0]);
  const vol  = Number(parsed.volumes[idx]);

  __currOpen = Number.isFinite(open) ? open : null;
  __currVol  = Number.isFinite(vol)  ? vol  : null;

  // (C) 점선 갱신: price=open, volume=vol
  chart.setOption({
    series: [
      { id:'price',    markLine:{ data: (__currOpen!=null ? [{ yAxis: __currOpen }] : []) } },
      { name:'Volume', markLine:{ data: (__currVol !=null ? [{ yAxis: __currVol  }] : []) } }
    ]
  }, false);

  // (D) 축배지 강제 갱신 (두 y축 모두)
  syncing = true;

  // 1) 축 좌표 방식
  const axes = [{ axisDim:'x', axisIndex:0, value: idx }];
  if (__currOpen != null) axes.push({ axisDim:'y', axisIndex:0, value:+__currOpen });
  if (__currVol  != null) axes.push({ axisDim:'y', axisIndex:1, value:+__currVol  });
  chart.dispatchAction({ type:'updateAxisPointer', currTrigger:'mousemove', axesInfo: axes });

  // 2) 픽셀 방식(환경별 누락 방지)
  const xPx = chart.convertToPixel({ xAxisIndex:0 }, idx);
  if (__currOpen != null) {
    const yPx0 = chart.convertToPixel({ gridIndex:0, yAxisIndex:0 }, __currOpen);
    chart.dispatchAction({ type:'updateAxisPointer', currTrigger:'mousemove', x:xPx, y:yPx0 });
  }
  if (__currVol != null) {
    const yPx1 = chart.convertToPixel({ gridIndex:1, yAxisIndex:1 }, __currVol);
    chart.dispatchAction({ type:'updateAxisPointer', currTrigger:'mousemove', x:xPx, y:yPx1 });
  }

  syncing = false;
});



    // 차트 밖으로 나가면 점선/배지 리셋
    chart.getZr().off('mouseout');
    chart.getZr().on('mouseout', () => {
      lastIdx = -1;
      __currOpen = null;
      __currVol  = null;
      chart.setOption({
        series: [
          { id:'price',    markLine: { data: [] } },
          { name:'Volume', markLine: { data: [] } }
        ]
      }, false);
    });

    // 리사이즈
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => chart.resize(), 120);
    });

    return chart;
  }

  // 전역 노출
  window.ECandleBoot = boot;
})();
