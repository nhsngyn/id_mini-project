// js/index.js
import { loadCandles, normalizeOHLCV, createHoverSync, readInlineJSON } from './shared.js';
import { initPriceChart, updatePriceWindow } from './priceChart.js';
import { initVolumeChart, updateVolumeWindow } from './volumeChart.js';

console.log('[index] module start');

const state = {
  data: null,
  window: { start: 0, end: 1 },
  charts: { price: null, volume: null },
};

const fileMap = {
  mantra: 'mantra_60days.json',
  'stock-a': 'stock_a_60days.json',
  'stock-b': 'stock_b_60days.json',
  'crypto-c': 'crypto_c_60days.json',
};

const $asset = document.getElementById('asset-select');
const $price = document.getElementById('priceChart');
const $vol   = document.getElementById('volumeChart');
const $badge = document.getElementById('badge-range');

// ✅ 추가: 인라인(#ohlcv) 우선, 아니면 data/* 로드
async function loadRows(assetKey) {
  const inline = readInlineJSON();
  if (inline && Array.isArray(inline)) {
    console.log('[index] using inline JSON (#ohlcv)');
    return inline;
  }
  const file = fileMap[assetKey] ?? fileMap.mantra;
  const url = `./data/${file}`;
  console.log('[index] fetch', url);
  return await loadCandles(url);
}

async function loadAndRender(assetKey) {
  try {
    const raw = await loadRows(assetKey);
    console.log('[index] raw type:', Array.isArray(raw) ? 'array' : typeof raw, 'len:', Array.isArray(raw) ? raw.length : 'n/a');

    state.data = normalizeOHLCV(raw);
    console.log('[index] normalized len:', state.data.length);

    if (!state.data.length) {
      throw new Error('정규화 결과가 비었어요. JSON 스키마/값을 확인해줘!');
    }

    if (!state.charts.price) {
      state.charts.price  = initPriceChart($price, state.data);
      state.charts.volume = initVolumeChart($vol, state.data);
      createHoverSync(state.charts.price, state.charts.volume, state.data);

      window.addEventListener('resize', () => {
        state.charts.price?.resize?.();
        state.charts.volume?.resize?.();
      });
    } else {
      updatePriceWindow(state.charts.price, state.data, state.window);
      updateVolumeWindow(state.charts.volume, state.data, state.window);
    }

    if ($badge) $badge.textContent = 'Full Range';
    console.log('[index] init/render done');
    
  } catch (e) {
    console.error('[index] load error', e);
    const box = document.createElement('div');
    box.style.cssText = 'color:#f87171;background:rgba(248,113,113,.1);padding:12px;border:1px solid rgba(248,113,113,.4);border-radius:8px;margin:8px 0;';
    box.textContent = `에러: ${e?.message || e}`;
    $price?.appendChild(box);
  }
}

// 초기 로드 + 드롭다운 변경
loadAndRender($asset.value).catch(e => console.error('[index] load error', e));
$asset.addEventListener('change', () => {
  loadAndRender($asset.value).catch(e => console.error('[index] switch error', e));
});
