// DOM要素の取得
const itemForm = document.getElementById('item-form');
const inventoryBody = document.getElementById('inventory-body');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter-buttons button');
const noItemsMessage = document.getElementById('no-items');

// 初期状態のフィルタ (未/未使用のみ表示)
let currentFilter = 'uncompleted'; 
let inventory = []; // 在庫データを格納する配列

// --- データ操作とローカルストレージ ---

// ローカルストレージからデータを読み込む
function loadInventory() {
    const storedInventory = localStorage.getItem('inventory');
    if (storedInventory) {
        inventory = JSON.parse(storedInventory);
    }
}

// ローカルストレージにデータを保存する
function saveInventory() {
    localStorage.setItem('inventory', JSON.stringify(inventory));
}

// --- イベントリスナー ---

// アイテム登録フォームの送信処理
itemForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const expiry = document.getElementById('expiry').value;
    const location = document.getElementById('location').value.trim();

    if (!name) return;

    const newItem = {
        id: Date.now(), // 一意なIDとしてタイムスタンプを使用
        name: name,
        expiry: expiry,
        location: location,
        isCompleted: false, // 状態: 未（未使用）
    };

    inventory.push(newItem);
    saveInventory();
    renderInventory();
    
    // フォームをリセット
    itemForm.reset();
});

// 検索入力時の処理
searchInput.addEventListener('input', () => {
    renderInventory();
});

// フィルタボタンの処理
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // アクティブなボタンの切り替え
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // フィルタ状態の更新
        if (button.id === 'filter-all') {
            currentFilter = 'all';
        } else if (button.id === 'filter-completed') {
            currentFilter = 'completed';
        } else {
            currentFilter = 'uncompleted';
        }

        renderInventory();
    });
});

// リスト内のボタン（状態切り替え、削除）の処理
inventoryBody.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('toggle-button') || target.classList.contains('delete-button')) {
        const id = Number(target.closest('tr').dataset.id); // TRタグからIDを取得
        
        if (target.classList.contains('toggle-button')) {
            toggleCompletion(id);
        } else if (target.classList.contains('delete-button')) {
            deleteItem(id);
        }
    }
});

// --- 主要な機能 ---

// 済/未の状態を切り替える
function toggleCompletion(id) {
    const itemIndex = inventory.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
        inventory[itemIndex].isCompleted = !inventory[itemIndex].isCompleted;
        saveInventory();
        renderInventory();
    }
}

// アイテムを削除する
function deleteItem(id) {
    // 削除確認
    if (!confirm('このアイテムを削除してもよろしいですか？')) {
        return;
    }
    inventory = inventory.filter(item => item.id !== id);
    saveInventory();
    renderInventory();
}

// 在庫リストを表示する
function renderInventory() {
    inventoryBody.innerHTML = ''; // リストをクリア

    // 1. フィルタリング
    let filteredInventory = inventory.filter(item => {
        if (currentFilter === 'uncompleted') return !item.isCompleted;
        if (currentFilter === 'completed') return item.isCompleted;
        return true; // all
    });

    // 2. 検索 (商品名)
    const searchText = searchInput.value.toLowerCase();
    if (searchText) {
        filteredInventory = filteredInventory.filter(item => 
            item.name.toLowerCase().includes(searchText)
        );
    }
    
    // 3. 表示件数の確認
    if (filteredInventory.length === 0) {
        inventoryBody.innerHTML = '';
        noItemsMessage.style.display = 'block';
        return;
    } else {
        noItemsMessage.style.display = 'none';
    }

    // 4. テーブル行の生成
    filteredInventory.forEach(item => {
        const row = document.createElement('tr');
        row.dataset.id = item.id;
        if (item.isCompleted) {
            row.classList.add('completed-item');
        }

        // 'isCompleted'の値に応じてボタンの表示テキストを決定
        const toggleText = item.isCompleted ? '未に戻す' : '済にする';

        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.expiry || '未設定'}</td>
            <td>${item.location || '未設定'}</td>
            <td>${item.isCompleted ? '済' : '未'}</td>
            <td>
                <button class="action-button toggle-button">${toggleText}</button>
                <button class="action-button delete-button">削除</button>
            </td>
        `;
        inventoryBody.appendChild(row);
    });
}

// アプリの起動
loadInventory();
renderInventory();
