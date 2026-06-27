/**
 * ========================================
 * マップモジュール
 * ========================================
 * 3x3マップに保有店舗を配置し、中央マスで1.2倍ボーナスを得る
 */

const mapModule = {
  gridSize: 3,
  grid: new Array(9).fill(null), // 各セルに shopId or null
  selectedShopId: null,

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

  isCenterCell(x, y) {
    return x === 1 && y === 1; // 3x3の中央
  },

  findPlacedShop(shopId) {
    return this.grid.findIndex((id) => id === shopId);
  },

  // -------- 永続化 --------
  getData() {
    return {
      grid: this.grid,
      selectedShopId: this.selectedShopId,
    };
  },

  load(data) {
    if (!data) return;
    if (Array.isArray(data.grid) && data.grid.length === 9) {
      this.grid = data.grid.slice();
    }
    this.selectedShopId = data.selectedShopId ?? null;
  },

  // -------- 描画 --------
  render() {
    const gridEl = document.getElementById('mapGrid');
    if (!gridEl) return;

    gridEl.innerHTML = '';

    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'map-cell';
      cell.dataset.index = i;

      const { x, y } = this.getCoordsFromIndex(i);
      if (this.isCenterCell(x, y)) {
        cell.classList.add('center-cell');
      }

      const shopId = this.grid[i];
      if (shopId) {
        const shop = gameState.shops.find((s) => s.id === shopId);
        if (shop) {
          cell.classList.add('occupied');
          cell.innerHTML = `
            <div class="placed-shop">
              <div class="placed-shop-name">${shop.name}</div>
              <div class="placed-shop-income">+${gameState.getShopIncome(shop)}円/秒</div>
            </div>
          `;
        }
      } else {
        cell.classList.add('empty');
        cell.innerHTML = `<span class="cell-placeholder">空き</span>`;
      }

      cell.addEventListener('click', () => this.onCellClick(i));
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
        <small>${gameState.getShopIncome(shop)}円/秒</small>
      `;
      btn.addEventListener('click', () => {
        this.selectedShopId = shop.id;
        this.renderAvailableShops();
      });

      listEl.appendChild(btn);
    });
  },

  // -------- 操作 --------
  onCellClick(index) {
    const existing = this.grid[index];

    // 置かれている店舗をクリックしたら撤去
    if (existing) {
      this.grid[index] = null;
      this.saveAndRefresh();
      return;
    }

    // 空きセルに選択店舗を配置
    if (this.selectedShopId == null) return;

    // 念のため重複防止
    const oldIndex = this.findPlacedShop(this.selectedShopId);
    if (oldIndex !== -1) {
      this.grid[oldIndex] = null;
    }

    this.grid[index] = this.selectedShopId;
    this.selectedShopId = null;
    this.saveAndRefresh();
  },

  clearMap() {
    this.grid = new Array(9).fill(null);
    this.selectedShopId = null;
    this.saveAndRefresh();
  },

  saveAndRefresh() {
    gameState.save();
    this.render();
    this.renderAvailableShops();
    gameState.render(); // 収入表示更新
  },
};
