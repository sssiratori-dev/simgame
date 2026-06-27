/**
 * ========================================
 * 経営シミュレーションゲーム - メインロジック
 * ========================================
 * 
 * 機能:
 * - 店舗管理システム
 * - 自動収入ロジック（マップボーナス対応）
 * - レベルアップ機能
 * - マップシステム統合
 * - localStorage による自動保存
 */

// ========================================
// ゲーム状態管理
// ========================================
const gameState = {
  // プレイヤー資産
  money: 1000,

  // ゲーム時間
  totalTime: 0,

  // 累計収益（統計用）
  totalEarned: 0,

  // 店舗データ
  shops: [
    {
      id: 1,
      name: '📚 書店',
      baseCost: 100,
      baseIncome: 5,
      level: 0,
      owned: false,
    },
    {
      id: 2,
      name: '☕ カフェ',
      baseCost: 200,
      baseIncome: 12,
      level: 0,
      owned: false,
    },
    {
      id: 3,
      name: '🍕 ピザ屋',
      baseCost: 350,
      baseIncome: 25,
      level: 0,
      owned: false,
    },
    {
      id: 4,
      name: '🏥 クリニック',
      baseCost: 500,
      baseIncome: 50,
      level: 0,
      owned: false,
    },
    {
      id: 5,
      name: '🏨 ホテル',
      baseCost: 1000,
      baseIncome: 120,
      level: 0,
      owned: false,
    },
    {
      id: 6,
      name: '🏭 工場',
      baseCost: 2000,
      baseIncome: 300,
      level: 0,
      owned: false,
    },
  ],

  // ========================================
  // 計算系メソッド
  // ========================================

  /**
   * 店舗の現在の購入価格を計算
   */
  getShopCost(shop) {
    // レベルが上がるたびに価格が上昇
    return Math.floor(shop.baseCost * Math.pow(1.15, shop.level));
  },

  /**
   * 店舗の現在の基本収入を計算（マップボーナスなし）
   */
  getShopIncome(shop) {
    // レベルが上がるたびに収入が増加
    return Math.floor(shop.baseIncome * Math.pow(1.1, shop.level));
  },

  /**
   * 店舗の実際の収入を計算（地形・シナジー・イベントボーナス適用）
   */
  getShopActualIncome(shop) {
    const base = this.getShopIncome(shop);
    if (!mapModule || !mapModule.grid) return base;
    const multiplier = mapModule.getTotalMultiplier(shop.id);
    return Math.floor(base * multiplier);
  },

  /**
   * 秒間の総収入を計算（マップボーナス適用）
   */
  getTotalIncomePerSecond() {
    return this.shops
      .filter((shop) => shop.owned)
      .reduce((sum, shop) => sum + this.getShopActualIncome(shop), 0);
  },

  /**
   * 保有店舗数を計算
   */
  getOwnedShopCount() {
    return this.shops.filter((shop) => shop.owned).length;
  },

  // ========================================
  // ゲームアクション
  // ========================================

  /**
   * 店舗を購入する
   */
  buyShop(shopId) {
    const shop = this.shops.find((s) => s.id === shopId);
    if (!shop) return false;

    const cost = this.getShopCost(shop);

    // お金が足りなければ購入不可
    if (this.money < cost) return false;

    // 購入処理
    this.money -= cost;
    shop.owned = true;
    shop.level = 1;

    this.save();
    this.render();
    showToast(`✨ ${shop.name} を購入！`, 'success', `収入 +${this.getShopIncome(shop).toLocaleString('ja-JP')}円/秒`);
    return true;
  },

  /**
   * 店舗をレベルアップする
   */
  upgradeShop(shopId) {
    const shop = this.shops.find((s) => s.id === shopId);
    if (!shop || !shop.owned) return false;

    const cost = this.getShopCost(shop);

    // お金が足りなければアップグレード不可
    if (this.money < cost) return false;

    // アップグレード処理
    this.money -= cost;
    shop.level += 1;

    this.save();
    this.render();
    showToast(`⬆️ ${shop.name} Lv.${shop.level}！`, 'info', `収入 +${this.getShopIncome(shop).toLocaleString('ja-JP')}円/秒`);
    return true;
  },

  /**
   * 毎フレーム実行
   */
  update(deltaTime) {
    const incomePerSecond = this.getTotalIncomePerSecond();
    const earned = incomePerSecond * deltaTime;
    this.money       += earned;
    this.totalEarned += earned;
    this.totalTime   += deltaTime;

    // 1秒ごとにフローティング収入を表示
    if (incomePerSecond > 0 &&
        Math.floor(this.totalTime) > Math.floor(this.totalTime - deltaTime)) {
      spawnFloatingIncome(Math.floor(incomePerSecond));
    }
  },

  // ========================================
  // セーブ/ロード機能
  // ========================================

  /**
   * ゲーム状態を localStorage に保存
   */
  save() {
    const saveData = {
      money: this.money,
      totalTime: this.totalTime,
      totalEarned: this.totalEarned,
      shops: this.shops,
      map: mapModule ? mapModule.getData() : null,
    };
    localStorage.setItem('simgame_save', JSON.stringify(saveData));
  },

  /**
   * localStorage からゲーム状態を復元
   */
  load() {
    const saveData = localStorage.getItem('simgame_save');
    if (!saveData) return false;

    try {
      const data = JSON.parse(saveData);
      this.money       = data.money;
      this.totalTime   = data.totalTime;
      this.totalEarned = data.totalEarned ?? 0;
      this.shops       = data.shops;

      // マップデータを復元
      if (mapModule && data.map) {
        mapModule.load(data.map);
      }

      return true;
    } catch (e) {
      console.error('Failed to load save data:', e);
      return false;
    }
  },

  /**
   * ゲームをリセット
   */
  reset() {
    if (
      confirm(
        'ゲームをリセットしてもよろしいですか？\nセーブデータが削除されます。'
      )
    ) {
      this.money       = 1000;
      this.totalTime   = 0;
      this.totalEarned = 0;
      this.shops.forEach((shop) => {
        shop.level = 0;
        shop.owned = false;
      });

      // マップもリセット
      if (mapModule) {
        mapModule.grid          = new Array(16).fill(null);
        mapModule.selectedShopId = null;
        mapModule.unlockedCells  = [];
        mapModule.activeEvents   = [];
        mapModule.eventTimer     = 0;
        mapModule.nextEventIn    = 45;
      }

      localStorage.removeItem('simgame_save');
      this.render();
      if (mapModule) {
        mapModule.render();
      }
    }
  },

  // ========================================
  // UI更新
  // ========================================

  /**
   * 画面を全て再描画
   */
  render() {
    this.updateInfoPanel();
    this.updateShopsContainer();
    this.updateStatsPanel();
    if (mapModule) {
      mapModule.renderAvailableShops();
    }
  },

  /**
   * 情報パネルを更新
   */
  updateInfoPanel() {
    const moneyDisplay = document.getElementById('moneyDisplay');
    const shopCountDisplay = document.getElementById('shopCountDisplay');
    const incomePerSecDisplay = document.getElementById('incomePerSecDisplay');

    moneyDisplay.textContent = this.money.toLocaleString('ja-JP', {
      maximumFractionDigits: 0,
    });
    shopCountDisplay.textContent = this.getOwnedShopCount();
    incomePerSecDisplay.textContent = this.getTotalIncomePerSecond();
  },

  /**
   * 店舗コンテナを更新
   */
  updateShopsContainer() {
    const container = document.getElementById('shopsContainer');
    if (!container) return;

    container.innerHTML = '';

    this.shops.forEach((shop) => {
      const card = document.createElement('div');
      card.className = 'shop-card' + (shop.owned ? ' owned' : '');

      const cost = this.getShopCost(shop);
      const income = this.getShopIncome(shop);
      const actualIncome = this.getShopActualIncome(shop);
      const canAfford = this.money >= cost;

      let statusText = '未購入';
      let actionButtonHTML = '';

      if (shop.owned) {
        statusText = `レベル: ${shop.level}`;
        const upgradeButtonClass = canAfford ? 'btn-upgrade' : '';
        actionButtonHTML = `
          <button 
            class="btn ${upgradeButtonClass}" 
            ${!canAfford ? 'disabled' : ''} 
            onclick="gameState.upgradeShop(${shop.id})"
          >
            レベルアップ (${cost.toLocaleString('ja-JP')}円)
          </button>
        `;
      } else {
        const buyButtonClass = canAfford ? 'btn-buy' : '';
        actionButtonHTML = `
          <button 
            class="btn ${buyButtonClass}" 
            ${!canAfford ? 'disabled' : ''} 
            onclick="gameState.buyShop(${shop.id})"
          >
            購入 (${cost.toLocaleString('ja-JP')}円)
          </button>
        `;
      }

      // 配置ボーナス表示
      const bonusHTML =
        shop.owned && actualIncome !== income
          ? `<p><strong>配置ボーナス:</strong> ${income.toLocaleString('ja-JP')}円 → ${actualIncome.toLocaleString('ja-JP')}円</p>`
          : '';

      // 進捗バー（次のアクションまでの資金充足率）
      const progressPct = Math.min(100, Math.round((this.money / cost) * 100));
      const progressBarHTML = `
        <div class="shop-progress-wrap">
          <div class="shop-progress-label">
            <span>${shop.owned ? 'Lv.Up' : '購入'}まで</span>
            <span>${progressPct >= 100 ? '✅ 可能' : progressPct + '%'}</span>
          </div>
          <div class="shop-progress-track">
            <div class="shop-progress-bar" style="width: ${progressPct}%"></div>
          </div>
        </div>`;

      card.innerHTML = `
        <h3>${shop.name}</h3>
        <p>状態: <strong>${statusText}</strong></p>
        <p>毎秒の収入: <strong>${actualIncome.toLocaleString('ja-JP')}円</strong></p>
        ${bonusHTML}
        ${progressBarHTML}
        <p>説明: ${this.getShopDescription(shop.id)}</p>
        ${actionButtonHTML}
      `;

      container.appendChild(card);
    });
  },

  /**
   * 統計パネルを更新
   */
  updateStatsPanel() {
    const totalEarnedEl   = document.getElementById('totalEarnedDisplay');
    const playtimeEl      = document.getElementById('playtimeDisplay');
    const topShopEl       = document.getElementById('topShopDisplay');
    const unlockedCellsEl = document.getElementById('unlockedCellsDisplay');

    if (totalEarnedEl) {
      totalEarnedEl.textContent = Math.floor(this.totalEarned).toLocaleString('ja-JP') + '円';
    }
    if (playtimeEl) {
      const m = Math.floor(this.totalTime / 60);
      const s = Math.floor(this.totalTime % 60);
      playtimeEl.textContent = m > 0 ? `${m}分${s}秒` : `${s}秒`;
    }
    if (topShopEl) {
      const owned = this.shops.filter((s) => s.owned);
      if (owned.length > 0) {
        const top = owned.reduce((a, b) =>
          this.getShopActualIncome(a) >= this.getShopActualIncome(b) ? a : b
        );
        topShopEl.textContent = top.name;
      } else {
        topShopEl.textContent = '--';
      }
    }
    if (unlockedCellsEl && mapModule) {
      unlockedCellsEl.textContent = `${mapModule.unlockedCells.length} / 4`;
    }
  },

  /**
   * 店舗の説明文を取得
   */
  getShopDescription(shopId) {
    const descriptions = {
      1: '本を売ってお金を稼ぐ',
      2: 'コーヒーを売ってお金を稼ぐ',
      3: 'ピザを売ってお金を稼ぐ',
      4: '医療サービスでお金を稼ぐ',
      5: '宿泊サービスでお金を稼ぐ',
      6: '製品を製造してお金を稼ぐ',
    };
    return descriptions[shopId] || '';
  },
};

// ========================================
// ユーティリティ関数
// ========================================

/**
 * トースト通知を表示
 */
function showToast(title, type = 'info', sub = '') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.innerHTML = `
    <div class="toast-title">${title}</div>
    ${sub ? `<div class="toast-sub">${sub}</div>` : ''}
  `;
  container.appendChild(div);
  setTimeout(() => {
    div.style.animation = 'toastOut 0.3s ease-in forwards';
    setTimeout(() => div.remove(), 350);
  }, 3500);
}

/**
 * フローティング収入テキストを表示
 */
function spawnFloatingIncome(amount) {
  if (amount <= 0) return;
  const el = document.getElementById('moneyDisplay');
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'floating-income';
  div.textContent = `+${amount.toLocaleString('ja-JP')}円`;
  div.style.left = `${rect.left + rect.width / 2 + (Math.random() - 0.5) * 40}px`;
  div.style.top  = `${rect.top - 10}px`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1700);
}

/**
 * 統計パネルの折りたたみ切り替え
 */
function toggleStats() {
  const panel = document.getElementById('statsPanel');
  if (panel) panel.classList.toggle('collapsed');
}

// ========================================
// ゲームループ
// ========================================

let lastTime = Date.now();

function gameLoop() {
  const now = Date.now();
  const deltaTime = (now - lastTime) / 1000;
  lastTime = now;

  // ゲーム状態を更新
  gameState.update(deltaTime);

  // マップイベントタイマーを更新
  if (mapModule) {
    mapModule.update(deltaTime);
  }

  // 情報パネルと統計を更新（毎フレーム）
  gameState.updateInfoPanel();
  gameState.updateStatsPanel();

  // 定期的にセーブ (3秒ごと)
  if (Math.floor(gameState.totalTime) % 3 === 0) {
    gameState.save();
  }

  requestAnimationFrame(gameLoop);
}

// ========================================
// タブ切り替え機能
// ========================================

function setupTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;

      // すべてのタブボタンを非アクティブに
      tabButtons.forEach((btn) => btn.classList.remove('active'));
      // すべてのタブコンテンツを非表示に
      tabContents.forEach((content) => content.classList.remove('active'));

      // 選択されたタブをアクティブに
      button.classList.add('active');
      const selectedTab = document.getElementById(`${tabName}-tab`);
      if (selectedTab) {
        selectedTab.classList.add('active');

        // マップタブが表示された場合は、マップを再レンダリング
        if (tabName === 'map' && mapModule) {
          mapModule.render();
        }
      }
    });
  });
}

// ========================================
// 初期化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // マップモジュールを初期化
  if (mapModule) {
    mapModule.init();
  }

  // セーブデータを読み込む
  if (!gameState.load()) {
    console.log('新しいゲームを開始します');
  }

  // UI を初期化
  gameState.render();

  // タブ切り替え機能を初期化
  setupTabSwitching();

  // ゲームループを開始
  gameLoop();
});
