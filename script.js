// =========================================================
// === 在庫管理アプリ - 最終整理版 ===
// =========================================================

// DOM要素の取得
const itemForm = document.getElementById('item-form');
const inventoryBody = document.getElementById('inventory-body');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter-buttons button');
const noItemsMessage = document.getElementById('no-items');
const listTitle = document.getElementById('list-title'); // リストタイトル要素
const settingsButton = document.getElementById('settings-button');
const passwordModal = document.getElementById('password-modal');
const closeButton = document.querySelector('.close-button');
const passwordForm = document.getElementById('password-form');
const passwordMessage = document.getElementById('password-message');

// *** 【セキュリティ設定と初期化】 ***
function getPassword() {
    const storedPassword = localStorage.getItem('editPassword');
    // 初期パスワードは '0000'
    if (!storedPassword) {
        localStorage.setItem('editPassword', '0000');
        return '0000';
    }
    return storedPassword;
}
let currentEditPassword = getPassword();
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

// アイテム登録フォームの送信処理 (変更なし)
itemForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value, 10);
    const expiry = document.getElementById('expiry').value;
    const location = document.getElementById('location').value.trim();

    if (!name || isNaN(quantity) || quantity < 1) return;

    // 既存アイテムとの結合を試みる
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
            quantity: quantity,
            expiry: expiry,
            location: location,
            isCompleted: false,
        };
        inventory.push(newItem);
    }

    saveInventory();
    renderInventory();
    
    // フォームをリセット
    document.getElementById('quantity').value = 1;
    document.getElementById('name').value = '';
    document.getElementById('expiry').value = '';
    document.getElementById('location').value = '';
});

// 検索入力時の処理 (変更なし)
searchInput.addEventListener('input', () => { renderInventory(); });

// フィルタボタン（タブ）の処理
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // タブに応じてリストタイトルを更新
        if (button.id === 'filter-completed') {
            currentFilter = 'completed';
            listTitle.textContent = '履歴一覧';
        } else {
            currentFilter = 'uncompleted';
            listTitle.textContent = '在庫一覧';
        }
        renderInventory();
    });
});

// リスト内のボタン（削除）およびプルダウン（数量変更）の処理
inventoryBody.addEventListener('click', (e) => {
    const target = e.target;
    
    // 削除ボタンの処理
    if (target.classList.contains('delete-button')) {
        // パスワードチェック
        const inputPassword = prompt("パスワードが必要です。");
        if (inputPassword !== currentEditPassword) {
            alert("パスワードが違います。");
            return;
        }
        const id = Number(target.closest('tr').dataset.id); 
        deleteItem(id);
    }
});

// 数量プルダウン変更時の処理
inventoryBody.addEventListener('change', (e) => {
    const target = e.target;
    if (target.classList.contains('quantity-select')) {
        // パスワードチェック
        const inputPassword = prompt("パスワードが必要です。");
        if (inputPassword !== currentEditPassword) {
            alert("パスワードが違います。");
            // 変更をキャンセルするため、元の数量に戻す
            renderInventory(); 
            return;
        }

        const id = Number(target.closest('tr').dataset.id);
        const newQuantity = parseInt(target.value, 10);
        updateQuantity(id, newQuantity);
    }
});

// --- 主要な機能 ---

// 数量の更新と完了への移動ロジック
function updateQuantity(id, newQuantity) {
    const itemIndex = inventory.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
        inventory[itemIndex].quantity = newQuantity;

        if (newQuantity === 0) {
            // 数量が0になったら完了リストへ移動
            inventory[itemIndex].isCompleted = true;
        }
        
        saveInventory();
        renderInventory();
    }
}

// アイテムを削除する
function deleteItem(id) {
    if (!confirm('削除していいですか？')) {
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

    let filteredInventory = inventory.filter(item => {
        // タブによるフィルタリング
        const filterMatch = 
            (currentFilter === 'uncompleted' && !item.isCompleted) ||
            (currentFilter === 'completed' && item.isCompleted);
        
        // 検索
        const searchText = searchInput.value.toLowerCase();
        const searchMatch = !searchText || item.name.toLowerCase().includes(searchText);

        return filterMatch && searchMatch;
    });
    
    // 賞味期限によるソート（期限が近い順）
    filteredInventory.sort((a, b) => {
        const dateA = a.expiry ? new Date(a.expiry) : new Date(8640000000000000); 
        const dateB = b.expiry ? new Date(b.expiry) : new Date(8640000000000000);

        // 完了アイテムは常にリストの最後尾（完了タブ内）
        if (a.isCompleted !== b.isCompleted) {
            return a.isCompleted ? 1 : -1;
        }
        
        return dateA - dateB;
    });

    if (filteredInventory.length === 0) {
        inventoryBody.innerHTML = '';
        noItemsMessage.style.display = 'block';
        return;
    } else {
        noItemsMessage.style.display = 'none';
    }

    filteredInventory.forEach(item => {
        const row = document.createElement('tr');
        row.dataset.id = item.id;
        
        let alertClass = '';
        if (item.expiry && !item.isCompleted) {
            const expiryDate = new Date(item.expiry);
            expiryDate.setHours(0, 0, 0, 0);
            
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 3) {
                alertClass = 'alert-expired'; 
            } else if (diffDays <= 7) {
                alertClass = 'alert-warning'; 
            } else {
                alertClass = 'alert-safe'; 
            }
        }
        
        if (item.isCompleted) {
            row.classList.add('completed-item');
        } else if (alertClass) {
            row.classList.add(alertClass);
        }

        // 数量表示のロジック: 未完了リストではプルダウン、完了リストでは固定表示
        let quantityHtml;
        if (currentFilter === 'uncompleted') {
            let options = '';
            // 数量0から現在の数量までのプルダウンオプションを生成
            for (let i = 0; i <= item.quantity; i++) {
                options += `<option value="${i}" ${i === item.quantity ? 'selected' : ''}>${i}</option>`;
            }
            quantityHtml = `<select class="quantity-select" data-id="${item.id}">${options}</select>`;
        } else {
            // 完了リストでは、数量を固定表示
            quantityHtml = item.quantity;
        }

        row.innerHTML = `
            <td>${item.name}</td>
            <td>${quantityHtml}</td> 
            <td>${item.expiry || '未設定'}</td>
            <td>${item.location || '未設定'}</td>
            <td>-</td>
            <td>
                <button class="action-button delete-button">削除</button>
            </td>
        `;
        inventoryBody.appendChild(row);
    });
}

// *** 【設定ボタンとモーダルの処理】 (変更なし) ***

settingsButton.addEventListener('click', () => {
    passwordModal.style.display = 'block';
    passwordMessage.textContent = '';
    passwordForm.reset();
});

closeButton.addEventListener('click', () => {
    passwordModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === passwordModal) {
        passwordModal.style.display = 'none';
    }
});

passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const currentPass = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-new-password').value;

    if (currentPass !== currentEditPassword) {
        passwordMessage.textContent = 'エラー: 現在のパスワードが違います。';
        return;
    }

    if (newPass !== confirmPass) {
        passwordMessage.textContent = 'エラー: 新しいパスワードが一致しません。';
        return;
    }
    
    if (newPass.length < 4) {
        passwordMessage.textContent = 'エラー: パスワードは4文字にしてください。';
        return;
    }

    currentEditPassword = newPass;
    localStorage.setItem('editPassword', newPass);
    
    passwordMessage.textContent = 'パスワードが正常に変更されました！';
    passwordMessage.style.color = 'green';

    setTimeout(() => {
        passwordModal.style.display = 'none';
        passwordMessage.textContent = '';
        passwordMessage.style.color = 'red';
    }, 1500);
});


// アプリの起動
loadInventory();
renderInventory();
