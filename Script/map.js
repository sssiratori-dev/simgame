/**
 * ========================================
 * マップモジュール（拡張版）
 * ========================================
 * 4×4マップ、地形ボーナス、隣接シナジー、ランダムイベント、ツールチップ
 */

// 地形タイプ定義
const TERRAIN_TYPES = {
  commercial:  { id: 'commercial',  icon: '🏪', name: '商業地区',  bonus: 1.5 },
  transport:   { id: 'transport',   icon: '🚉', name: '交通拠点',  bonus: 1.3 },
  residential: { id: 'residential', icon: '🏘️', name: '住宅地区',  bonus: 1.1 },
  empty:       { id: 'empty',       icon: '⬜', name: '空き地',    bonus: 1.0 },
  locked:      { id: 'locked',      icon: '🔒', name: 'ロック中',  bonus: 1.0, locked: true, unlockCost: 800 },
};

// 4×4 地形レイアウト（固定）
// Row0: LOCKED / TRANSPORT  / COMMERCIAL / LOCKED
// Row1: RESIDENTIAL / EMPTY / EMPTY      / TRANSPORT
// Row2: COMMERCIAL / EMPTY  / EMPTY      / RESIDENTIAL
// Row3: LOCKED / TRANSPORT  / COMMERCIAL / LOCKED
const TERRAIN_MAP = [
  'locked',      'transport',   'commercial',  'locked',
  'residential', 'empty',       'empty',       'transport',
  'commercial',  'empty',       'empty',       'residential',
  'locked',      'transport',   'commercial',  'locked',
];

// 隣接シナジー定義
const SYNERGIES = [
  { shops: [1, 2], bonus: 0.20, name: '📖☕ 勉強カフェ' },
  { shops: [3, 5], bonus: 0.15, name: '🍕🏨 ルームサービス' },
  { shops: [4, 6], bonus: 0.25, name: '🏥🏭 労働者診療' },
];

// ランダムイベント定義
const MAP_EVENTS = [
  { id: 'sale',         name: '🎉 セール！',   desc: '収入が10秒間2倍！',    duration: 10, multiplier: 2.0 },
  { id: 'fire',         name: '🔥 火事発生！',  desc: '収入が5秒間停止...',   duration: 5,  multiplier: 0.0 },
  { id: 'construction', name: '🚧 道路工事',    desc: '収入が10秒間30%減...', duration: 10, multiplier: 0.7 },
];

const mapModule = {
  gridSize: 4,
  grid: new Array(16).fill(null),
  selectedShopId: null,
  unlockedCells: [],
  activeEvents: [],
  eventTimer: 0,
  nextEventIn: 45,

  init() {
    this.render();
    this.renderAvailableShops();
  },

  // -------- 座標/セルユーティリティ --------
  getIndexFromCoords(x, y) {
    return y * this.gridSize + x;
  },

  getCoordsFromIndex(index) {
    return {
      x: index % this.gridSize,
      y: Math.floor(index / this.gridSize),
    };
  },

  getAdjacentIndices(index) {
    const { x, y } = this.getCoordsFromIndex(index);
    const adj = [];
    if (x > 0)                  adj.push(this.getIndexFromCoords(x - 1, y));
    if (x < this.gridSize - 1)  adj.push(this.getIndexFromCoords(x + 1, y));
    if (y > 0)                  adj.push(this.getIndexFromCoords(x, y - 1));
    if (y < this.gridSize - 1)  adj.push(this.getIndexFromCoords(x, y + 1));
    return adj;
  },

  findPlacedShop(shopId) {
    return this.grid.findIndex((id) => id === shopId);
  },

  // -------- 地形ボーナス --------
  getTerrainBonus(index) {
    const terrain = TERRAIN_TYPES[TERRAIN_MAP[index]];
    if (!terrain || terrain.locked) return 1.0;
    return terrain.bonus;
  },

  // -------- 隣接シナジーボーナス --------
  getSynergyResult(shopId) {
    const shopIndex = this.findPlacedShop(shopId);
    if (shopIndex === -1) return { multiplier: 1.0, synergies: [] };

    const adjacentIndices = this.getAdjacentIndices(shopIndex);
    let totalBonus = 0;
    const appliedSynergies = [];

    for (const synergy of SYNERGIES) {
      if (!synergy.shops.includes(shopId)) continue;
      for (const partnerId of synergy.shops.filter((id) => id !== shopId)) {
        const partnerIndex = this.findPlacedShop(partnerId);
        if (partnerIndex !== -1 && adjacentIndices.includes(partnerIndex)) {
          totalBonus += synergy.bonus;
          appliedSynergies.push(synergy.name);
        }
      }
    }
    return { multiplier: 1.0 + totalBonus, synergies: appliedSynergies };
  },

  // -------- イベントボーナス --------
  getEventMultiplier(shopId) {
    const now = Date.now() / 1000;
    const active = this.activeEvents.filter((e) => e.shopId === shopId && e.endTime > now);
    if (active.length === 0) return 1.0;
    return active[active.length - 1].multiplier;
  },

  // -------- 総合倍率（terrain × synergy × event）--------
  getTotalMultiplier(shopId) {
    const shopIndex = this.findPlacedShop(shopId);
    if (shopIndex === -1) return 1.0;
    const terrain  = this.getTerrainBonus(shopIndex);
    const synergy  = this.getSynergyResult(shopId).multiplier;
    const event    = this.getEventMultiplier(shopId);
    return terrain * synergy * event;
  },

  // -------- イベントシステム --------
  update(deltaTime) {
    this.eventTimer += deltaTime;
    if (this.eventTimer >= this.nextEventIn) {
      this.eventTimer = 0;
      this.nextEventIn = 30 + Math.random() * 30;
      this.triggerRandomEvent();
    }

    const now = Date.now() / 1000;
    const prevLen = this.activeEvents.length;
    this.activeEvents = this.activeEvents.filter((e) => e.endTime > now);
    if (this.activeEvents.length < prevLen) {
      this.render();
    }
  },

  triggerRandomEvent() {
    const placed = this.grid.filter((id) => id !== null);
    if (placed.length === 0) return;

    const shopId = placed[Math.floor(Math.random() * placed.length)];
    const event  = MAP_EVENTS[Math.floor(Math.random() * MAP_EVENTS.length)];
    const now    = Date.now() / 1000;

    this.activeEvents.push({
      shopId,
      eventId: event.id,
      endTime: now + event.duration,
      multiplier: event.multiplier,
    });

    const shop = gameState.shops.find((s) => s.id === shopId);
    showToast(
      `${event.name} ${shop ? shop.name : ''}に発生！`,
      event.id === 'sale' ? 'success' : 'warning',
      event.desc
    );
    this.render();
  },

  // -------- ロックセル解放 --------
  isUnlocked(index) {
    return !TERRAIN_TYPES[TERRAIN_MAP[index]]?.locked || this.unlockedCells.includes(index);
  },

  unlockCell(index) {
    const cost = TERRAIN_TYPES.locked.unlockCost;
    if (gameState.money < cost) {
      showToast('💸 お金が足りません！', 'error', `解放コスト: ${cost.toLocaleString('ja-JP')}円`);
      return false;
    }
    gameState.money -= cost;
    this.unlockedCells.push(index);
    showToast('🔓 セルを解放しました！', 'success', '新しいマスが使えます');
    gameState.save();
    this.render();
    gameState.updateInfoPanel();
    return true;
  },

  // -------- 永続化 --------
  getData() {
    return {
      grid: this.grid,
      selectedShopId: this.selectedShopId,
      unlockedCells: this.unlockedCells,
      eventTimer: this.eventTimer,
      nextEventIn: this.nextEventIn,
    };
  },

  load(data) {
    if (!data) return;
    // 旧フォーマット（9マス）はリセット
    if (Array.isArray(data.grid) && data.grid.length === 16) {
      this.grid = data.grid.slice();
    } else {
      this.grid = new Array(16).fill(null);
    }
    this.selectedShopId = data.selectedShopId ?? null;
    this.unlockedCells  = Array.isArray(data.unlockedCells) ? data.unlockedCells.slice() : [];
    this.eventTimer     = data.eventTimer  ?? 0;
    this.nextEventIn    = data.nextEventIn ?? 45;
  },

  // -------- 描画 --------
  render() {
    const gridEl = document.getElementById('mapGrid');
    if (!gridEl) return;

    gridEl.innerHTML = '';

    for (let i = 0; i < 16; i++) {
      const cell      = document.createElement('div');
      cell.className  = 'map-cell';
      cell.dataset.index   = i;

      const terrainId = TERRAIN_MAP[i];
      const terrain   = TERRAIN_TYPES[terrainId];
      cell.dataset.terrain = terrainId;

      const isLocked = terrain.locked && !this.unlockedCells.includes(i);

      if (isLocked) {
        cell.classList.add('locked-cell');
        cell.innerHTML = `
          <div class="terrain-badge">${terrain.icon}</div>
          <div class="lock-info">
            <div class="lock-icon">🔒</div>
            <div class="lock-cost">${terrain.unlockCost.toLocaleString('ja-JP')}円<br>で解放</div>
          </div>
        `;
        cell.addEventListener('click', () => this.unlockCell(i));
      } else {
        const shopId = this.grid[i];
        const now    = Date.now() / 1000;
        const activeEvent = shopId
          ? this.activeEvents.find((e) => e.shopId === shopId && e.endTime > now)
          : null;

        if (activeEvent) cell.classList.add(`event-${activeEvent.eventId}`);

        if (shopId) {
          const shop = gameState.shops.find((s) => s.id === shopId);
          if (shop) {
            cell.classList.add('occupied');
            const tBonus      = this.getTerrainBonus(i);
            const synResult   = this.getSynergyResult(shopId);
            const evMult      = this.getEventMultiplier(shopId);
            const totalIncome = Math.floor(gameState.getShopIncome(shop) * tBonus * synResult.multiplier * evMult);

            const synergyHTML = synResult.synergies.length > 0
              ? `<div class="synergy-badge">⚡ ${synResult.synergies.join(' ')}</div>`
              : '';
            const evDef    = activeEvent ? MAP_EVENTS.find((e) => e.id === activeEvent.eventId) : null;
            const eventHTML = evDef
              ? `<div class="event-badge event-badge-${evDef.id}">${evDef.name}</div>`
              : '';

            cell.innerHTML = `
              <div class="terrain-badge">${terrain.icon}</div>
              <div class="placed-shop">
                <div class="placed-shop-name">${shop.name}</div>
                <div class="placed-shop-income">+${totalIncome.toLocaleString('ja-JP')}円/秒</div>
                ${synergyHTML}${eventHTML}
              </div>
            `;
          }
        } else {
          cell.classList.add('empty');
          cell.innerHTML = `
            <div class="terrain-badge">${terrain.icon}</div>
            <span class="cell-placeholder">${terrain.name}</span>
            ${terrain.bonus > 1.0 ? `<span class="terrain-bonus-badge">×${terrain.bonus}</span>` : ''}
          `;
        }

        cell.addEventListener('click', () => this.onCellClick(i));
        cell.addEventListener('mouseenter', (e) => this.showTooltip(e, i));
        cell.addEventListener('mouseleave', () => this.hideTooltip());
      }

      gridEl.appendChild(cell);
    }
  },

  renderAvailableShops() {
    const listEl = document.getElementById('availableShops');
    if (!listEl) return;

    listEl.innerHTML = '';

    const ownedNotPlaced = gameState.shops.filter(
      (shop) => shop.owned && this.findPlacedShop(shop.id) === -1
    );

    if (ownedNotPlaced.length === 0) {
      listEl.innerHTML = `<p class="empty-text">配置可能な店舗はありません</p>`;
      return;
    }

    ownedNotPlaced.forEach((shop) => {
      const btn = document.createElement('button');
      btn.className = 'available-shop-btn';
      if (this.selectedShopId === shop.id) btn.classList.add('selected');

      btn.innerHTML = `
        <span>${shop.name}</span>
        <small>${gameState.getShopIncome(shop).toLocaleString('ja-JP')}円/秒</small>
      `;
      btn.addEventListener('click', () => {
        this.selectedShopId = shop.id;
        this.renderAvailableShops();
      });
      listEl.appendChild(btn);
    });
  },

  // -------- ツールチップ --------
  showTooltip(e, index) {
    const tooltip = document.getElementById('cellTooltip');
    if (!tooltip) return;

    const terrainId = TERRAIN_MAP[index];
    const terrain   = TERRAIN_TYPES[terrainId];
    const shopId    = this.grid[index];

    let html = `<div class="tooltip-terrain">${terrain.icon} <strong>${terrain.name}</strong>`;
    if (terrain.bonus > 1.0) html += ` <span class="tooltip-bonus">×${terrain.bonus}</span>`;
    html += `</div>`;

    if (shopId) {
      const shop = gameState.shops.find((s) => s.id === shopId);
      if (shop) {
        const tBonus  = this.getTerrainBonus(index);
        const syn     = this.getSynergyResult(shopId);
        const evMult  = this.getEventMultiplier(shopId);
        const base    = gameState.getShopIncome(shop);
        const total   = Math.floor(base * tBonus * syn.multiplier * evMult);

        html += `<div class="tooltip-shop">${shop.name} Lv.${shop.level}</div>`;
        html += `<div class="tooltip-income-breakdown">`;
        html += `<div>基本収入: ${base.toLocaleString('ja-JP')}円/秒</div>`;
        if (tBonus > 1.0)          html += `<div>地形ボーナス: ×${tBonus}</div>`;
        if (syn.multiplier > 1.0)  html += `<div>シナジー: ×${syn.multiplier.toFixed(2)} (${syn.synergies.join(', ')})</div>`;
        if (evMult !== 1.0)        html += `<div>イベント: ×${evMult}</div>`;
        html += `<div class="tooltip-total">合計: ${total.toLocaleString('ja-JP')}円/秒</div>`;
        html += `</div><div class="tooltip-hint">クリックで撤去</div>`;
      }
    } else {
      html += `<div class="tooltip-hint">クリックで店舗を配置</div>`;
    }

    tooltip.innerHTML = html;
    tooltip.classList.remove('hidden');

    const rect      = e.currentTarget.getBoundingClientRect();
    const tooltipW  = 230;
    const rawLeft   = rect.right + 8 + window.scrollX;
    const left      = rawLeft + tooltipW > window.innerWidth
      ? rect.left - tooltipW - 8 + window.scrollX
      : rawLeft;
    tooltip.style.left = `${left}px`;
    tooltip.style.top  = `${Math.min(rect.top + window.scrollY, window.scrollY + window.innerHeight - 220)}px`;
  },

  hideTooltip() {
    const tooltip = document.getElementById('cellTooltip');
    if (tooltip) tooltip.classList.add('hidden');
  },

  // -------- 操作 --------
  onCellClick(index) {
    if (this.grid[index]) {
      this.grid[index] = null;
      this.saveAndRefresh();
      return;
    }
    if (this.selectedShopId == null) return;

    const oldIndex = this.findPlacedShop(this.selectedShopId);
    if (oldIndex !== -1) this.grid[oldIndex] = null;

    this.grid[index] = this.selectedShopId;
    this.selectedShopId = null;
    this.saveAndRefresh();
  },

  clearMap() {
    this.grid = new Array(16).fill(null);
    this.selectedShopId = null;
    this.saveAndRefresh();
  },

  saveAndRefresh() {
    gameState.save();
    this.render();
    this.renderAvailableShops();
    gameState.render();
  },
};
