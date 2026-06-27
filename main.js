/**
 * ========================================
 * 経営シミュレーションゲーム - メインロジック
 * ========================================
 * 
 * 機能:
 * - 店舗管理システム
 * - 自動収入ロジック
 * - レベルアップ機能
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
   * 店舗の現在の収入を計算
   */
  getShopIncome(shop) {
    // レベルが上がるたびに収入が増加
    return Math.floor(shop.baseIncome * Math.pow(1.1, shop.level));
  },

  /**
   * 秒間の総収入を計算
   */
  getTotalIncomePerSecond() {
    return this.shops
      .filter((shop) => shop.owned)
      .reduce((sum, shop) => sum + this.getShopIncome(shop), 0);
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
    return true;
  },

  /**
   * 毎フレーム実行 (1秒ごと)
   */
  update(deltaTime) {
    // 自動収入を加算
    const incomePerSecond = this.getTotalIncomePerSecond();
    this.money += incomePerSecond * deltaTime;

    this.totalTime += deltaTime;
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
      shops: this.shops,
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
      this.money = data.money;
      this.totalTime = data.totalTime;
      this.shops = data.shops;
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
      this.money = 1000;
      this.totalTime = 0;
      this.shops.forEach((shop) => {
        shop.level = 0;
        shop.owned = false;
      });
      localStorage.removeItem('simgame_save');
      this.render();
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
    container.innerHTML = '';

    this.shops.forEach((shop) => {
      const card = document.createElement('div');
      card.className = 'shop-card' + (shop.owned ? ' owned' : '');

      const cost = this.getShopCost(shop);
      const income = this.getShopIncome(shop);
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

      card.innerHTML = `
        <h3>${shop.name}</h3>
        <p>状態: <strong>${statusText}</strong></p>
        <p>毎秒の収入: <strong>${income}円</strong></p>
        <p>説明: ${this.getShopDescription(shop.id)}</p>
        ${actionButtonHTML}
      `;

      container.appendChild(card);
    });
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
// ゲームループ
// ========================================

let lastTime = Date.now();

function gameLoop() {
  const now = Date.now();
  const deltaTime = (now - lastTime) / 1000; // ミリ秒から秒に変換
  lastTime = now;

  // ゲーム状態を更新
  gameState.update(deltaTime);

  // 情報パネルを更新（毎フレーム）
  gameState.updateInfoPanel();

  // 定期的にセーブ (3秒ごと)
  if (Math.floor(gameState.totalTime) % 3 === 0) {
    gameState.save();
  }

  requestAnimationFrame(gameLoop);
}

// ========================================
// 初期化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // セーブデータを読み込む
  if (!gameState.load()) {
    console.log('新しいゲームを開始します');
  }

  // UI を初期化
  gameState.render();

  // ゲームループを開始
  gameLoop();
});
