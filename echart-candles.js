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
  const SLIDER_H = 16;     // (지금은 dataZoom 비활성이라 높이에만 반영 안 해도 OK)
  const SLIDER_GAP = 10;

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

  // ----- 파서: [d,o,c,l,h,v] → ECharts -----
  function splitData(raw) {
    const categoryData = [], values = [], volumes = [], dirs = [];
    if (!Array.isArray(raw)) return { categoryData, values, volumes, dirs };

    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      if (!r || r.length < 6) continue;

      const ds   = String(r[0]).replace(/[.\/]/g, '-'); // YYYY-MM-DD
      const open = +r[1];
      const close= +r[2];
      const low  = +r[3];
      const high = +r[4];
      const vol  = +r[5];

      categoryData.push(ds);
      values.push([open, close, low, high]); // [O, C, L, H]
      const dir = open > close ? 1 : -1;     // 1=하락(빨강), -1=상승(초록)
      volumes.push(vol);                     // bar는 값만
      dirs.push(dir);                        // 색상용 보조배열
    }
    return { categoryData, values, volumes, dirs };
  }

  // ----- 옵션 -----
  function buildOption(data, elWidth) {
    const priceTop = TOP;
    const priceHeight = PRICE_H;
    const volumeTop = priceTop + priceHeight + GAP;
    const volumeHeight = VOLUME_H;

    // 퍼센트 → 소수점 반올림으로 넘침이 생길 수 있어 픽셀로도 계산 가능
    // 필요 시 아래 두 줄을 주석 해제해서 픽셀 고정으로 사용해도 돼.
    // const GRID_L = Math.round(elWidth * 0.06);
    // const GRID_R = Math.round(elWidth * 0.05);

    const MMM=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    return {
      backgroundColor: 'transparent',
      animation: false,
      axisPointer: { link: [{ xAxisIndex: [0, 1] }] },

      grid: [
        { left: '6%', right: '5%', top: priceTop,  height: priceHeight  }, // 픽셀 고정 쓰려면 left: GRID_L, right: GRID_R
        { left: '6%', right: '5%', top: volumeTop, height: volumeHeight }
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
    interval: function (index, value) {
      // 7일 간격마다 표시
      return index % 7 === 0;
    },
    formatter: (val) => {
      const [y,m,d] = String(val).split(/[-/]/);
      const MMM=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${d} ${MMM[(+m||1)-1]||''}`;
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
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#7f8ea1' },
          splitLine: { lineStyle: { color: '#1e242b', type: 'dashed' } }
        },
        {
          scale: true, gridIndex: 1,
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

      // ✅ 호버 카드 (상승=초록, 하락=빨강, VOLUME 포함)
    tooltip: {
  trigger: 'axis',
  confine: true,                  // 가장자리 잘림 방지
  axisPointer: { type: 'cross', snap: true },
  backgroundColor: 'transparent', // 카드 자체를 HTML로 그림
  borderWidth: 0,
  padding: 0,
  formatter: function (params) {
    const k = params.find(p => p.seriesType === 'candlestick');
    const v = params.find(p => p.seriesName === 'Volume');
    if (!k) return '';

    const [open, close, low, high] = k.data.map(Number);
    const volume = v ? Number(v.data) : null;
    const isUp = close >= open;
    const valColor = isUp ? 'var(--green_light, #4FF68C)' : 'var(--red_light, #FF3B52);';

    const fmt    = n => (Number.isFinite(n) ? n.toFixed(3) : '-');
    const fmtVol = n => {
      if (!Number.isFinite(n)) return '—';
      if (n >= 1e9) return (n/1e9).toFixed(1)+'B';
      if (n >= 1e6) return (n/1e6).toFixed(0)+'M';
      if (n >= 1e3) return (n/1e3).toFixed(0)+'K';
      return String(n);
    };

    const label = k.axisValueLabel || k.axisValue || '';
    const [dateStr, timeStrFull] = String(label).split(/[ T]/);
    const timeStr = timeStrFull ? timeStrFull.slice(0,5) : '09:00';

    // 공통 행 컴포넌트: 좌 라벨, 우 값
    const row = (name, value, extraTop = false) => `
      <div style="display:flex; width:100%; justify-content:space-between; align-items:center; ${extraTop ? 'margin-top:6px;' : ''}">
        <span style="color:var(--gray100,#E4E6ED); font-family:Poppins; font-size:16px; font-weight:400; line-height:normal;">
          ${name}
        </span>
        <span style="color:${valColor}; text-align:right; font-family:Poppins; font-size:16px; font-weight:500; line-height:normal; letter-spacing:0.32px;">
          ${value}
        </span>
      </div>`;

    return `
<div style="
  display:flex; width:179px; padding:12px 20px;
  flex-direction:column; justify-content:center; align-items:flex-start; gap:6px;
  border-radius:6px;
  background: var(--gray-80, rgba(46,46,52,0.80));
  backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
">
  <!-- 날짜 / 시간 -->
  <div style="display:flex; width:100%; justify-content:space-between; align-items:center;
              color:var(--gray300,#818D9C);
              font-family:Poppins; font-size:12px; font-weight:400; line-height:normal; letter-spacing:0.24px;">
    <span>${dateStr || ''}</span>
    <span>${timeStr}</span>
  </div>

  ${row('OPEN',  fmt(open))}
  ${row('HIGH',  fmt(high))}
  ${row('LOW',   fmt(low))}
  ${row('CLOSE', fmt(close))}
 ${volume != null ? `
  <div style="display:flex; width:100%; justify-content:space-between; align-items:center; margin-top:6px;">
    <span style="color:var(--gray100,#E4E6ED);
                 font-family:Poppins;
                 font-size:16px;
                 font-weight:600;
                 line-height:normal;
                 letter-spacing:0.32px;">
      VOLUME
    </span>
    <span style="color:${valColor};
                 text-align:right;
                 font-family:Poppins;
                 font-size:16px;
                 font-weight:600;
                 line-height:normal;
                 letter-spacing:0.32px;">
      ${fmtVol(volume)}
    </span>
  </div>
` : ''}
</div>`;
  }
},


      // ✅ 스크롤/슬라이더/휠줌 모두 비활성화
      dataZoom: [],

      series: [
        {
          id:'price', name:'Price', type:'candlestick', data:data.values,
          itemStyle:{ color: upColor, borderColor: upColor, color0: downColor, borderColor0: downColor }
        },
        {
          name:'Volume', type:'bar', xAxisIndex:1, yAxisIndex:1,
          data: data.volumes, barWidth:'60%',
          itemStyle:{
            opacity:.85,
            color: (p) => (data.dirs[p.dataIndex] === 1 ? downColor : upColor)
          }
        }
      ]
    };
  }

  // ----- 배지 업데이트(선택) -----
  function updateBadges(categoryData) {
    const elInt = document.getElementById('badge-interval');
    const elRng = document.getElementById('badge-range');
    if (!elInt && !elRng) return;

    const days = categoryData.length;
    const fmt = (ds) => {
      const [, m, d] = String(ds).split('-');
      return (m && d) ? `${m}/${d}` : ds;
    };
    if (elInt) elInt.textContent = '1 Day';
    if (elRng) {
      elRng.textContent = days
        ? `${days} Days (${fmt(categoryData[0])}–${fmt(categoryData[days - 1])})`
        : '—';
    }
  }

  // ----- 부트 -----
  async function boot({ containerId='chart', defaultFile='mantra_60days.json' } = {}) {
    const el = document.getElementById(containerId);
    if (!el) return console.error(`#${containerId} 를 찾을 수 없습니다.`);

    // 크기 보장 (폭 100%, 높이 명시)
    el.style.width = '100%';
    el.style.height = (PRICE_H + VOLUME_H + GAP + TOP + /*SLIDER_H + SLIDER_GAP +*/ BOTTOM) + 'px'; // ≈ 618px

    // 실제 박스 크기 로그
    const rect = el.getBoundingClientRect();
    console.log('[chart rect]', { w: rect.width, h: rect.height });

    // 데이터 로드
    let raw = readInlineJSON();
    if (!raw && Array.isArray(window.rawData)) raw = window.rawData;
    if (!raw) raw = await loadJSON(defaultFile);
    if (!raw || !Array.isArray(raw) || !raw.length) {
      el.innerHTML = '<div style="color:#f87171;padding:12px">데이터가 없습니다.</div>';
      return;
    }
    raw.sort((a, b) => new Date(a[0]) - new Date(b[0]));

    const parsed = splitData(raw);
    const chart = echarts.init(el, null, { renderer: 'canvas' });

    // ✅ 내부 넘침 차단(툴팁 drop-shadow 등)
    const dom = chart.getDom();
    dom.style.overflow = 'hidden';
    dom.style.maxWidth = '100%';

    // 옵션 적용
    chart.setOption(buildOption(parsed, rect.width), true);
    updateBadges(parsed.categoryData);

    // 캔들 폭에 맞춰 밴드 두께 보정
    chart.on('updateAxisPointer', () => {
      const xAxisModel = chart.getModel().getComponent('xAxis', 0);
      if (!xAxisModel) return;
      const idxExtent = xAxisModel.axis.scale.getExtent();
      const pxExtent  = xAxisModel.axis.getExtent();
      const pixelW    = Math.abs(pxExtent[1] - pxExtent[0]);
      const count     = Math.max(1, idxExtent[1] - idxExtent[0]);
      const barW      = Math.max(6, Math.min(20, pixelW / count));
      chart.setOption({ xAxis: [{ axisPointer: { lineStyle: { width: barW } } }] }, false);
    });

    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const r = el.getBoundingClientRect();
        chart.setOption({ grid: chart.getOption().grid }, false); // 레이아웃 유지용 no-op
        chart.resize();
      }, 120);
    });

    return chart;
  }

  // 전역 노출
  window.ECandleBoot = boot;
})();
