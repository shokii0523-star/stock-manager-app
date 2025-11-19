// =========================================================
// === 在庫管理アプリ - 数量・パスワード設定機能追加版 ===
// =========================================================

// DOM要素の取得
const itemForm = document.getElementById('item-form');
const inventoryBody = document.getElementById('inventory-body');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter-buttons button');
const noItemsMessage = document.getElementById('no-items');
const settingsButton = document.getElementById('settings-button');
const passwordModal = document.getElementById('password-modal');
const closeButton = document.querySelector('.close-button');
const passwordForm = document.getElementById('password-form');
const passwordMessage = document.getElementById('password-message');

// *** 【セキュリティ設定と初期化】 ***
// パスワードをローカルストレージから読み込む。存在しない場合は初期値 '0000' を設定。
function getPassword() {
    const storedPassword = localStorage.getItem('editPassword');
    // 初期PW '0000'
    if (!storedPassword) {
        localStorage.setItem('editPassword', '0000');
        return '0000';
    }
    return storedPassword;
}
let currentEditPassword = getPassword();
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

// 検索・フィルタボタンの処理 (変更なし)
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
        const inputPassword = prompt("編集時はPWが必要です。");
        if (inputPassword !== currentEditPassword) {
            alert("wrong PW");
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

// *** 【設定ボタンとモーダルの処理】 ***

// 1. 設定ボタンを押したらモーダルを表示
settingsButton.addEventListener('click', () => {
    passwordModal.style.display = 'block';
    passwordMessage.textContent = ''; // メッセージをクリア
    passwordForm.reset();
});

// 2. 閉じるボタン (x) を押したらモーダルを非表示
closeButton.addEventListener('click', () => {
    passwordModal.style.display = 'none';
});

// 3. モーダル外をクリックしたらモーダルを非表示
window.addEventListener('click', (event) => {
    if (event.target === passwordModal) {
        passwordModal.style.display = 'none';
    }
});

// 4. パスワード変更フォームの送信処理
passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const currentPass = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-new-password').value;

    if (currentPass !== currentEditPassword) {
        passwordMessage.textContent = 'エラー: worng PW';
        return;
    }

    if (newPass !== confirmPass) {
        passwordMessage.textContent = 'エラー: worng PW';
        return;
    }
    
    if (newPass.length < 4) {
        passwordMessage.textContent = 'エラー: PWは4文字までです';
        return;
    }

    // パスワードの更新
    currentEditPassword = newPass;
    localStorage.setItem('editPassword', newPass);
    
    passwordMessage.textContent = '変更完了';
    passwordMessage.style.color = 'green';

    // 成功後、フォームをクリアしモーダルを閉じる (UXのため数秒後に閉じる)
    setTimeout(() => {
        passwordModal.style.display = 'none';
        passwordMessage.textContent = '';
        passwordMessage.style.color = 'red';
    }, 1500);
});

// --- 在庫リストの表示ロジック (変更なし) ---

function toggleCompletion(id) {
    const itemIndex = inventory.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
        inventory[itemIndex].isCompleted = !inventory[itemIndex].isCompleted;
        saveInventory();
        renderInventory();
    }
}

function deleteItem(id) {
    if (!confirm('削除しますか？')) {
        return;
    }
    inventory = inventory.filter(item => item.id !== id);
    saveInventory();
    renderInventory();
}

function renderInventory() {
    inventoryBody.innerHTML = ''; 
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    let filteredInventory = inventory.filter(item => {
        const filterMatch = 
            (currentFilter === 'uncompleted' && !item.isCompleted) ||
            (currentFilter === 'completed' && item.isCompleted) ||
            (currentFilter === 'all');
        
        const searchText = searchInput.value.toLowerCase();
        const searchMatch = !searchText || item.name.toLowerCase().includes(searchText);

        return filterMatch && searchMatch;
    });
    
    filteredInventory.sort((a, b) => {
        const dateA = a.expiry ? new Date(a.expiry) : new Date(8640000000000000); 
        const dateB = b.expiry ? new Date(b.expiry) : new Date(8640000000000000);

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

        const toggleText = item.isCompleted ? '戻す' : '済';

        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td> 
            <td>${item.expiry || '-'}</td>
            <td>${item.location || '-'}</td>
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
