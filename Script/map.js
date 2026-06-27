/**
 * ========================================
 * マップシステムモジュール
 * ========================================
 * 
 * 機能:
 * - 3x3グリッドマップの管理
 * - 店舗の配置・移動ロジック
 * - ドラッグ&ドロップおよびクリック配置UI
 * - マップボーナス計算（中央マスで1.2倍）
 */

const mapModule = {
  // ========================================
  // マップ状態
  // ========================================
  
  /**
   * マップグリッド (3x3)
   * null = 空き、shopId = 配置された店舗ID
   */
  grid: [
    null, null, null,
    null, null, null,
    null, null, null,
  ],

  /**
   * 選択中の店舗ID（クリック配置用）
   */
  selectedShopId: null,

  /**
   * ドラッグ中の店舗ID
   */
  draggedShopId: null,

  // ========================================
  // 初期化
  // ========================================

  /**
   * マップモジュールを初期化
   */
  init() {
    this.grid = new Array(9).fill(null);
    this.selectedShopId = null;
    this.render();
    this.setupEventListeners();
  },

  /**
   * 保存済みマップデータを復元
   */
  load(mapData) {
    if (Array.isArray(mapData) && mapData.length === 9) {
      this.grid = [...mapData];
    }
  },

  /**
   * マップデータを取得（保存用）
   */
  getData() {
    return [...this.grid];
  },

  // ========================================
  // グリッド操作
  // ========================================

  /**
   * グリッドの座標からインデックスを取得
   * @param {number} x - X座標 (0-2)
   * @param {number} y - Y座標 (0-2)
   * @returns {number} インデックス (0-8)
   */
  getIndexFromCoords(x, y) {
    if (x < 0 || x > 2 || y < 0 || y > 2) return -1;
    return y * 3 + x;
  },

  /**
   * インデックスから座標を取得
   * @param {number} index - インデックス (0-8)
   * @returns {{x: number, y: number}}
   */
  getCoordsFromIndex(index) {
    return {
      x: index % 3,
      y: Math.floor(index / 3),
    };
  },

  /**
   * 指定座標が中央マスか判定
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isCenterCell(x, y) {
    return x === 1 && y === 1;
  },

  /**
   * マスが空いているか判定
   * @param {number} index
   * @returns {boolean}
   */
  isEmptyCell(index) {
    return this.grid[index] === null;
  },

  /**
   * マスに店舗が配置されているか判定（別の店舗）
   * @param {number} index
   * @param {number} shopIdToExclude - 除外する店舗ID
   * @returns {boolean}
   */
  hasDifferentShop(index, shopIdToExclude) {
    const cellShopId = this.grid[index];
    return cellShopId !== null && cellShopId !== shopIdToExclude;
  },

  /**
   * グリッドに既に配置されている店舗IDを取得
   * @param {number} shopId
   * @returns {number|null} インデックス、配置されていない場合はnull
   */
  findPlacedShop(shopId) {
    return this.grid.indexOf(shopId);
  },

  /**
   * 店舗をグリッドに配置
   * @param {number} shopId
   * @param {number} cellIndex
   * @returns {boolean} 成功したか
   */
  placeShop(shopId, cellIndex) {
    // 既に配置されている場合は移動
    const existingIndex = this.findPlacedShop(shopId);
    if (existingIndex !== -1) {
      this.grid[existingIndex] = null;
    }

    // 新しい位置に配置
    if (this.isEmptyCell(cellIndex)) {
      this.grid[cellIndex] = shopId;
      return true;
    }

    return false;
  },

  /**
   * グリッドから店舗を取り外す
   * @param {number} shopId
   * @returns {boolean} 成功したか
   */
  removeShop(shopId) {
    const index = this.findPlacedShop(shopId);
    if (index !== -1) {
      this.grid[index] = null;
      return true;
    }
    return false;
  },

  /**
   * マップをクリア
   */
  clearMap() {
    if (confirm('マップをクリアしてもよろしいですか？')) {
      this.grid = new Array(9).fill(null);
      this.selectedShopId = null;
      this.render();
      gameState.save();
    }
  },

  // ========================================
  // イベントリスナー設定
  // ========================================

  setupEventListeners() {
    const mapGrid = document.getElementById('mapGrid');
    if (!mapGrid) return;

    // グリッドセルのクリックイベント
    mapGrid.addEventListener('click', (e) => {
      const cell = e.target.closest('.map-cell');
      if (!cell) return;

      const cellIndex = parseInt(cell.dataset.index);
      this.handleCellClick(cellIndex);
    });

    // グリッドセルのドラッグオーバーイベント
    mapGrid.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    // グリッドセルのドロップイベント
    mapGrid.addEventListener('drop', (e) => {
      e.preventDefault();
      const cell = e.target.closest('.map-cell');
      if (!cell) return;

      const cellIndex = parseInt(cell.dataset.index);
      if (this.draggedShopId !== null) {
        this.placeShop(this.draggedShopId, cellIndex);
        this.draggedShopId = null;
        this.render();
        gameState.save();
      }
    });

    // 左パネルの店舗のドラッグイベント
    const availableShops = document.getElementById('availableShops');
    if (availableShops) {
      availableShops.addEventListener('dragstart', (e) => {
        const shopItem = e.target.closest('.available-shop-item');
        if (!shopItem) return;

        const shopId = parseInt(shopItem.dataset.shopId);
        this.draggedShopId = shopId;
        e.dataTransfer.effectAllowed = 'move';
      });

      availableShops.addEventListener('dragend', () => {
        this.draggedShopId = null;
      });
    }
  },

  // ========================================
  // ユーザー操作
  // ========================================

  /**
   * グリッドセルをクリック
   * @param {number} cellIndex
   */
  handleCellClick(cellIndex) {
    // 既に配置されている店舗をクリック → 取り外す
    if (!this.isEmptyCell(cellIndex)) {
      const shopId = this.grid[cellIndex];
      this.removeShop(shopId);
      this.selectedShopId = null;
      this.render();
      gameState.save();
      return;
    }

    // 店舗が選択されていない場合は何もしない
    if (this.selectedShopId === null) {
      return;
    }

    // 選択中の店舗を配置
    this.placeShop(this.selectedShopId, cellIndex);
    this.selectedShopId = null;
    this.render();
    gameState.save();
  },

  /**
   * 配置可能な店舗を選択（クリック配置用）
   * @param {number} shopId
   */
  selectShop(shopId) {
    // 既に選択されている場合は選択解除
    if (this.selectedShopId === shopId) {
      this.selectedShopId = null;
    } else {
      this.selectedShopId = shopId;
    }
    this.renderAvailableShops();
  },

  /**
   * 配置可能な店舗を削除
   * @param {number} shopId
   */
  removeAvailableShop(shopId) {
    this.removeShop(shopId);
    this.selectedShopId = null;
    this.render();
    gameState.save();
  },

  // ========================================
  // レンダリング
  // ========================================

  /**
   * マップ全体をレンダリング
   */
  render() {
    this.renderGrid();
    this.renderAvailableShops();
  },

  /**
   * マップグリッドをレンダリング
   */
  renderGrid() {
    const mapGrid = document.getElementById('mapGrid');
    if (!mapGrid) return;

    mapGrid.innerHTML = '';

    this.grid.forEach((shopId, index) => {
      const coords = this.getCoordsFromIndex(index);
      const cell = document.createElement('div');
      cell.className = 'map-cell';
      cell.dataset.index = index;

      // 中央マスにマーク
      if (this.isCenterCell(coords.x, coords.y)) {
        cell.classList.add('map-cell-center');
      }

      // セル内容
      if (shopId === null) {
        // 空きマス
        cell.innerHTML = `
          <div class="cell-empty">
            <span class="cell-coords">(${coords.x},${coords.y})</span>
            ${this.isCenterCell(coords.x, coords.y) ? '<span class="cell-center-mark">⭐</span>' : ''}
          </div>
        `;
      } else {
        // 配置済み店舗
        const shop = gameState.shops.find((s) => s.id === shopId);
        if (shop) {
          const income = gameState.getShopIncome(shop);
          const centerBonus = this.isCenterCell(coords.x, coords.y) ? 1.2 : 1;
          const bonusIncome = Math.floor(income * centerBonus);

          cell.innerHTML = `
            <div class="cell-shop">
              <div class="cell-shop-name">${shop.name}</div>
              <div class="cell-shop-level">Lv${shop.level}</div>
              <div class="cell-shop-income">
                ${income}円<span class="cell-shop-income-bonus">${centerBonus > 1 ? `→${bonusIncome}円` : ''}</span>
              </div>
              <div class="cell-coords">(${coords.x},${coords.y})</div>
            </div>
          `;
          cell.classList.add('map-cell-occupied');

          // 長押しで取り外す機能
          cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.removeAvailableShop(shopId);
          });
        }
      }

      mapGrid.appendChild(cell);
    });
  },

  /**
   * 配置可能な店舗リストをレンダリング
   */
  renderAvailableShops() {
    const availableShops = document.getElementById('availableShops');
    if (!availableShops) return;

    availableShops.innerHTML = '';

    const ownedShops = gameState.shops.filter((shop) => shop.owned);

    if (ownedShops.length === 0) {
      availableShops.innerHTML = '<p class="no-shops-message">購入済みの店舗がありません</p>';
      return;
    }

    ownedShops.forEach((shop) => {
      const isPlaced = this.findPlacedShop(shop.id) !== -1;
      const isSelected = this.selectedShopId === shop.id;
      const income = gameState.getShopIncome(shop);

      const shopItem = document.createElement('div');
      shopItem.className = `available-shop-item ${isPlaced ? 'placed' : ''} ${isSelected ? 'selected' : ''}`;
      shopItem.dataset.shopId = shop.id;
      shopItem.draggable = true;

      const statusText = isPlaced ? '✓ 配置済み' : '○ 未配置';

      shopItem.innerHTML = `
        <div class="shop-item-header">
          <span class="shop-item-name">${shop.name}</span>
          <span class="shop-item-status">${statusText}</span>
        </div>
        <div class="shop-item-details">
          <span>Lv${shop.level}</span>
          <span>${income}円/秒</span>
        </div>
        <button class="btn-remove-shop" onclick="event.stopPropagation(); mapModule.removeAvailableShop(${shop.id})">
          🗑️ 削除
        </button>
        <div class="shop-item-hint">
          ${isPlaced ? 'ドラッグで移動 / クリックで選択解除' : 'ドラッグで配置 / クリックで選択'}
        </div>
      `;

      // クリック時の選択・解除
      shopItem.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-remove-shop')) {
          this.selectShop(shop.id);
        }
      });

      availableShops.appendChild(shopItem);
    });
  },
};
