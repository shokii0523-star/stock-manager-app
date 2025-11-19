// =========================================================
// === 在庫管理アプリ - 数量管理とパスワード機能追加版 ===
// =========================================================

// DOM要素の取得
const itemForm = document.getElementById('item-form');
const inventoryBody = document.getElementById('inventory-body');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter-buttons button');
const noItemsMessage = document.getElementById('no-items');

// *** 【セキュリティ設定】 ***
// パスワードを設定します。
// 閲覧は可能ですが、編集時はこのパスワードが必要です。
const EDIT_PASSWORD = '123'; // !!! ここを任意の文字列に変更してください !!!
// **************************

let currentFilter = 'uncompleted'; 
let inventory = []; // 在庫データを格納する配列

// --- データ操作とローカルストレージ ---

function loadInventory() {
    const storedInventory = localStorage.getItem('inventory');
    if (storedInventory) {
        inventory = JSON.parse(storedInventory);
    }
}

function saveInventory() {
    localStorage.setItem('inventory', JSON.stringify(inventory));
}

// --- イベントリスナー ---

// アイテム登録フォームの送信処理
itemForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value, 10);
    const expiry = document.getElementById('expiry').value;
    const location = document.getElementById('location').value.trim();

    if (!name || isNaN(quantity) || quantity < 1) return;

    // *** 【数量管理ロジック】: 既存アイテムとの結合を試みる ***
    // 同じ商品名、同じ賞味期限、かつ未完了のアイテムを探す
    const existingItemIndex = inventory.findIndex(item => 
        item.name === name && item.expiry === expiry && !item.isCompleted
    );

    if (existingItemIndex !== -1) {
        // 既存の未完了アイテムが見つかった場合、数量を合算
        inventory[existingItemIndex].quantity += quantity;
    } else {
        // 新しいアイテムとして登録
        const newItem = {
            id: Date.now(),
            name: name,
            quantity: quantity, // 数量プロパティを追加
            expiry: expiry,
            location: location,
            isCompleted: false,
        };
        inventory.push(newItem);
    }
    // **********************************************************

    saveInventory();
    renderInventory();
    
    // フォームをリセット (数量を1に戻す)
    document.getElementById('quantity').value = 1;
    document.getElementById('name').value = '';
    document.getElementById('expiry').value = '';
    document.getElementById('location').value = '';
});

// 検索・フィルタボタンの処理
searchInput.addEventListener('input', () => { renderInventory(); });
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

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
        
        // *** 【パスワードチェック】: 編集・削除前にパスワードを求める ***
        const inputPassword = prompt("編集にはパスワードが必要です。");
        if (inputPassword !== EDIT_PASSWORD) {
            alert("wrong password");
            return;
        }
        // ***************************************************************
        
        const id = Number(target.closest('tr').dataset.id); 
        
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
    if (!confirm('削除しますか？')) {
        return;
    }
    inventory = inventory.filter(item => item.id !== id);
    saveInventory();
    renderInventory();
}

// 在庫リストを表示する (ソート、アラート、数量表示ロジックを含む)
function renderInventory() {
    inventoryBody.innerHTML = ''; 
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    // 1. フィルタリングと検索
    let filteredInventory = inventory.filter(item => {
        const filterMatch = 
            (currentFilter === 'uncompleted' && !item.isCompleted) ||
            (currentFilter === 'completed' && item.isCompleted) ||
            (currentFilter === 'all');
        
        const searchText = searchInput.value.toLowerCase();
        const searchMatch = !searchText || item.name.toLowerCase().includes(searchText);

        return filterMatch && searchMatch;
    });
    
    // 2. 賞味期限によるソート（期限が近い順）
    filteredInventory.sort((a, b) => {
        // 賞味期限未設定のアイテムは遠い未来の日付としてソート
        const dateA = a.expiry ? new Date(a.expiry) : new Date(8640000000000000); 
        const dateB = b.expiry ? new Date(b.expiry) : new Date(8640000000000000);

        // 済みのものはソート順を下にする（リストの最後に表示）
        if (a.isCompleted !== b.isCompleted) {
            return a.isCompleted ? 1 : -1;
        }
        
        // 日付が早い順（昇順）に並べ替え
        return dateA - dateB;
    });

    // 3. 表示件数の確認
    if (filteredInventory.length === 0) {
        inventoryBody.innerHTML = '';
        noItemsMessage.style.display = 'block';
        return;
    } else {
        noItemsMessage.style.display = 'none';
    }

    // 4. テーブル行の生成とアラートクラスの適用
    filteredInventory.forEach(item => {
        const row = document.createElement('tr');
        row.dataset.id = item.id;
        
        // --- アラートロジックの適用 ---
        let alertClass = '';
        if (item.expiry && !item.isCompleted) {
            const expiryDate = new Date(item.expiry);
            expiryDate.setHours(0, 0, 0, 0);
            
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 3) {
                alertClass = 'alert-expired'; // 3日以内・期限切れ: 赤
            } else if (diffDays <= 7) {
                alertClass = 'alert-warning'; // 7日以内: 黄色
            } else {
                alertClass = 'alert-safe'; // 7日より先: 緑
            }
        }
        
        if (item.isCompleted) {
            row.classList.add('completed-item');
        } else if (alertClass) {
            row.classList.add(alertClass);
        }

        const toggleText = item.isCompleted ? '未に戻す' : '済にする';

        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td> 
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
