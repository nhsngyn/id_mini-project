// 공동 유틸(데이터 로딩, 이벤트 버스 등)

// ===== 상수/테마 =====
export const COLORS = {
  up: '#0FA76C',
  down: '#C93C50',
  hoverBand: 'rgba(55,60,66,0.30)',
};

export function fmtDateLabel(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const y = String(d.getFullYear()).slice(2);
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}/${m}/${day}`;
}


// 숫자 서식
export const f3 = (n) => (Number.isFinite(+n) ? (+n).toFixed(3) : '—');

// 날짜 라벨 (YYYY-MM-DD → "DD Mon")
export function fmtDateShort(val) {
  const [y, m, d] = String(val).split(/[-/]/);
  const MMM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${MMM[(+m || 1) - 1]}`;
}

// unit 축 라벨 포맷
export function fmtUnit(v) {
  const n = +v;
  if (!Number.isFinite(n)) return v;
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

// JSON 로더
export async function loadCandles(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// 인라인 JSON (#ohlcv) 사용시
export function readInlineJSON() {
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

// 원본: ["YYYY/MM/DD", open, close, low, high, volume]
export function normalizeOHLCV(raw) {
  if (!Array.isArray(raw)) return [];
  const looksLikeObject = raw[0] && typeof raw[0] === 'object' && !Array.isArray(raw[0]);
  let rows = raw.slice();

  rows.sort((a, b) => {
    const A = looksLikeObject ? a.date : a[0];
    const B = looksLikeObject ? b.date : b[0];
    return new Date(A) - new Date(B);
  });

  const out = rows.map(r => {
    if (looksLikeObject) {
      const ds = String(r.date).replace(/[.\/]/g, '-');
      return {
        date: ds,
        open:  +r.open,
        high:  +r.high,
        low:   +r.low,
        close: +r.close,
        volume:+r.volume,
      };
    } else {
      const ds = String(r[0]).replace(/[.\/]/g, '-');
      return {
        date: ds,
        open:  +r[1],
        close: +r[2], // ✅ 종가
        low:   +r[3],
        high:  +r[4], // ✅ 고가
        volume:+r[5],
      };
    }
  }).filter(d =>
    Number.isFinite(d.open) &&
    Number.isFinite(d.high) &&
    Number.isFinite(d.low) &&
    Number.isFinite(d.close) &&
    Number.isFinite(d.volume)
  );

  return out;
}


// 0~1 구간 슬라이스
export function sliceByWindow(data, win = { start: 0, end: 1 }) {
  const n = data.length;
  const s = Math.floor(win.start * (n - 1));
  const e = Math.max(s + 1, Math.floor(win.end * (n - 1)));
  return data.slice(s, e + 1);
}

/**
 * 두 개의 차트(price, volume)를 원래 단일 캔버스 동작처럼 동기화
 * - hover 위치에 맞춰 y축 배지/markLine 업데이트
 * - 마우스아웃 시 리셋
 * - 막대(축 포인터) 두께 보정
 */
export function createHoverSync(priceChart, volumeChart, data) {
  let __currOpen = null;
  let __currVol = null;
  let syncing = false;

  const getIndexFromAxisInfo = (chart, e) => {
    const xi = (e.axesInfo || []).find(a => (a.axisDim || a.axisDimension) === 'x');
    if (!xi) return -1;
    if (typeof xi.value === 'number') return xi.value;
    const arr = data.map(d => d.date);
    return arr.indexOf(xi.value);
  };

  const updateBarWidth = (chart) => {
    const xAxisModel = chart.getModel().getComponent('xAxis', 0);
    if (!xAxisModel) return;
    const idxExtent = xAxisModel.axis.scale.getExtent();
    const pxExtent = xAxisModel.axis.getExtent();
    const barW = Math.max(
      6,
      Math.min(20, Math.abs(pxExtent[1] - pxExtent[0]) / Math.max(1, idxExtent[1] - idxExtent[0]))
    );
    chart.setOption({ xAxis: [{ axisPointer: { lineStyle: { width: barW } } }] }, false);
  };

  const handleUpdate = (fromChart, toChart, e) => {
    if (syncing) return;
    const idx = getIndexFromAxisInfo(fromChart, e);
    if (idx < 0 || !data[idx]) return;

    const k = data[idx];
    __currOpen = Number.isFinite(k.open) ? k.open : null;
    __currVol  = Number.isFinite(k.volume) ? k.volume : null;

    // 점선(markLine) 갱신
    priceChart.setOption({
      series: [{ id: 'price', markLine: { data: (__currOpen != null ? [{ yAxis: __currOpen }] : []) } }]
    }, false);
    volumeChart.setOption({
      series: [{ name: 'Volume', markLine: { data: (__currVol != null ? [{ yAxis: __currVol }] : []) } }]
    }, false);

    // 축 배지 강제 갱신
    syncing = true;
    const xPxFrom = fromChart.convertToPixel({ xAxisIndex: 0 }, idx);
    if (__currOpen != null) {
      const yPx0 = priceChart.convertToPixel({ gridIndex: 0, yAxisIndex: 0 }, __currOpen);
      priceChart.dispatchAction({ type: 'updateAxisPointer', currTrigger: 'mousemove', x: xPxFrom, y: yPx0 });
    }
    if (__currVol != null) {
      const yPx1 = volumeChart.convertToPixel({ gridIndex: 0, yAxisIndex: 0 }, __currVol);
      volumeChart.dispatchAction({ type: 'updateAxisPointer', currTrigger: 'mousemove', x: xPxFrom, y: yPx1 });
    }
    updateBarWidth(fromChart);
    syncing = false;
  };

  // 이벤트 바인딩
  priceChart.off('updateAxisPointer');
  volumeChart.off('updateAxisPointer');

  priceChart.on('updateAxisPointer', (e) => handleUpdate(priceChart, volumeChart, e));
  volumeChart.on('updateAxisPointer', (e) => handleUpdate(volumeChart, priceChart, e));

  // 마우스아웃 리셋
  const resetMarks = () => {
    __currOpen = null;
    __currVol = null;
    priceChart.setOption({ series: [{ id: 'price', markLine: { data: [] } }] }, false);
    volumeChart.setOption({ series: [{ name: 'Volume', markLine: { data: [] } }] }, false);
  };
  priceChart.getZr().off('mouseout');
  volumeChart.getZr().off('mouseout');
  priceChart.getZr().on('mouseout', resetMarks);
  volumeChart.getZr().on('mouseout', resetMarks);
}


// y축 배지 부착기
export function attachYAxisBadge(chart, {
  gridIndex = 0,              // 이 차트의 grid
  yAxisIndex = 0,             // 이 차트의 yAxis
  // X 인덱스로 Y값을 계산하는 함수(없으면 axesInfo의 y 사용 시도)
  valueResolver = null,       // (idx) => number
  // 표시 포맷
  format = (v)=>String(v),
  // 스타일
  box = {
    h: 24, padX: 8,
    bg: 'rgba(34,39,47,0.10)',   // var(--gray-10)
    stroke: '#6D89AB',           // var(--blue300)
    text: '#E4E6ED',             // var(--gray100)
    font: '500 14px Poppins, sans-serif'
  },
  // 플롯영역 왼쪽과의 간격 (축 라벨 바로 옆 = 6~10 추천)
  gapToGrid = 6,
  // 플롯 "왼쪽 밖"이 아니라 "축 라벨 바로 위(안쪽)"에 붙이고 싶으면 true
  stickInside = false
} = {}) {

  const GID = `ybadge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const initW = 64;

  chart.setOption({
    graphic: {
      id: GID, type: 'group', z: 1000, left: 0, top: 0, invisible: true,
      children: [
        { id: `${GID}-rect`, type: 'rect',
          shape: { x: 0, y: 0, width: initW, height: box.h, r: 4 },
          style: { fill: box.bg, stroke: box.stroke, lineWidth: 1 } },
        { id: `${GID}-text`, type: 'text',
          style: { x: box.padX, y: box.h/2, text: '0.00',
                   fill: box.text, font: box.font, textVerticalAlign: 'middle' } },
        { id: `${GID}-tri`, type: 'polygon',
          shape: { points: [] }, style: { fill: box.stroke } }
      ]
    }
  }, false);

  const measure = (txt) =>
    Math.ceil(echarts.format.getTextRect(txt, { font: box.font }).width);

  const place = (val) => {
    if (!Number.isFinite(+val)) {
      chart.setOption({ graphic: { id: GID, invisible: true } }, false);
      return;
    }
    const txt  = format(+val);
    const w    = Math.max(40, box.padX + measure(txt) + box.padX);
    const h    = box.h;

    const grid = chart.getModel().getComponent('grid', gridIndex)
                      .coordinateSystem.getRect();
    const yPx  = chart.convertToPixel({ yAxisIndex }, +val);

    // 위치: 축 라벨 "바로 위"에 붙이려면 stickInside=true
    const left = stickInside ? (grid.x + 2) : (grid.x - w - gapToGrid);
    const top  = yPx - h/2;

    // 화살표: 안쪽 모드면 왼쪽을 향하게(◀), 바깥 모드면 오른쪽(▶)
    const tri = stickInside
      ? [[0, h/2], [-12, h/2-6], [-12, h/2+6]]      // ◀
      : [[w, h/2], [w+12, h/2-6], [w+12, h/2+6]];   // ▶

    chart.setOption({
      graphic: {
        id: GID, invisible: false, left, top,
        children: [
          { id: `${GID}-rect`, shape: { width: w, height: h } },
          { id: `${GID}-text`, style: { x: box.padX, y: h/2, text: txt } },
          { id: `${GID}-tri`,  shape: { points: tri } }
        ]
      }
    }, false);
  };

  const clear = () => chart.setOption({ graphic: { id: GID, invisible: true } }, false);

  chart.on('updateAxisPointer', (e) => {
    // 1) y값 직접 제공되면 사용
    const yi = (e.axesInfo || []).find(a => (a.axisDim||a.axisDimension)==='y' && a.axisIndex===yAxisIndex);
    if (yi && Number.isFinite(+yi.value)) { place(+yi.value); return; }

    // 2) y정보가 없으면 x 인덱스로부터 계산
    const xi = (e.axesInfo || []).find(a => (a.axisDim||a.axisDimension)==='x');
    let idx  = (xi && typeof xi.value==='number') ? xi.value : null;
    if (idx==null && xi && xi.value!=null) {
      const axis = chart.getModel().getComponent('xAxis', 0).axis;
      idx = axis.scale.getOrdinalMeta().categories.indexOf(xi.value);
    }
    if (valueResolver && Number.isInteger(idx) && idx>=0) {
      const v = valueResolver(idx);
      place(v);
    }
  });

  chart.getZr().on('mouseout', clear);
  chart.on('finished', clear);
}
