
// Ziyaretçi sayacı ve fal kayıtları için veritabanı işlemleri
document.addEventListener('DOMContentLoaded', function() {
    // Ziyaretçi sayısını artır
    incrementVisitorCount();
    
    // Admin panel giriş kontrolü
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const password = document.getElementById('adminPassword').value;
            const button = this.querySelector('button');
            
            // Giriş yapıyor animasyonu
            button.innerHTML = '<div class="spinner"></div> Giriş Yapılıyor...';
            button.disabled = true;
            
            setTimeout(() => {
                checkAdminPassword(password);
            }, 1000);
        });
    }
    
    // Admin panelinde falları gösterme
    if (document.getElementById('fortuneLogTable')) {
        // Admin giriş kontrolü
        if (localStorage.getItem('adminLoggedIn') !== 'true') {
            window.location.href = 'admin.html';
            return;
        }
        
        // Tarih ve saat göster
        updateDateTime();
        setInterval(updateDateTime, 60000); // Her dakika güncelle
        
        loadFortuneLogs();
        
        // Arama işlevi
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                filterFortuneLogs(this.value);
            });
        }
        
        // Verileri dışa aktarma
        const exportButton = document.getElementById('exportButton');
        if (exportButton) {
            exportButton.addEventListener('click', exportFortuneData);
        }
    }
    
    // Çıkış butonu
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            this.innerHTML = '<div class="spinner"></div> Çıkış Yapılıyor...';
            this.disabled = true;
            
            setTimeout(() => {
                localStorage.removeItem('adminLoggedIn');
                window.location.href = 'admin.html';
            }, 800);
        });
    }
    
    // Tarih ve saati güncelleme
    function updateDateTime() {
        const dateTimeElement = document.getElementById('currentDateTime');
        if (dateTimeElement) {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            dateTimeElement.textContent = now.toLocaleDateString('tr-TR', options);
        }
    }
    
    // Fal kayıtlarını filtreleme
    function filterFortuneLogs(searchText) {
        const fortuneLogTable = document.getElementById('fortuneLogTable');
        const rows = fortuneLogTable.getElementsByTagName('tr');
        
        // İlk satır başlık satırı olduğu için 1'den başla
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const text = row.textContent.toLowerCase();
            
            if (text.includes(searchText.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    }
    
    // Verileri CSV olarak dışa aktarma
    function exportFortuneData() {
        let fortuneLogs = JSON.parse(localStorage.getItem('fortuneLogs') || '[]');
        
        if (fortuneLogs.length === 0) {
            alert('Dışa aktarılacak veri bulunamadı.');
            return;
        }
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Tarih,İsim,Burç,Fal Metni\n";
        
        fortuneLogs.forEach(log => {
            csvContent += `${log.date},${log.name},${log.zodiac},"${log.fortune.replace(/"/g, '""')}"\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `OmFortune_Fallar_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});

// Ziyaretçi sayısını artırma fonksiyonu
function incrementVisitorCount() {
    let visitorCount = localStorage.getItem('visitorCount') || 0;
    visitorCount = parseInt(visitorCount) + 1;
    localStorage.setItem('visitorCount', visitorCount);
    
    // Bu bilgiyi gerçek zamanlı veritabanına kaydetmek için istek gönderilebilir
    // Bu örnekte localStorage kullanıyoruz ama ileride Firebase veya başka bir veritabanı eklenebilir
}

// Fal sonucunu kaydetme
function saveFortune(userName, userZodiac, fortuneText) {
    let fortuneLogs = JSON.parse(localStorage.getItem('fortuneLogs') || '[]');
    
    fortuneLogs.push({
        id: Date.now(),
        date: new Date().toLocaleString(),
        name: userName,
        zodiac: userZodiac,
        fortune: fortuneText
    });
    
    localStorage.setItem('fortuneLogs', JSON.stringify(fortuneLogs));
}

// Admin şifre kontrolü
function checkAdminPassword(password) {
    // Şifre kontrolü - daha güvenli bir yöntemle değiştirebilirsiniz
    const correctPassword = "OmFortune2023"; // Buraya kendi şifrenizi yazın
    
    if (password === correctPassword) {
        localStorage.setItem('adminLoggedIn', 'true');
        showNotification('success', 'Başarılı', 'Yönetici paneline yönlendiriliyorsunuz...', 1500);
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 1500);
    } else {
        const button = document.querySelector('#adminLoginForm button');
        button.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/></svg> Giriş Yap';
        button.disabled = false;
        
        showNotification('error', 'Hata', 'Hatalı şifre girdiniz. Lütfen tekrar deneyin.', 3000);
    }
}

// Bildirim gösterme sistemi
function showNotification(type, title, message, duration = 3000) {
    // Mevcut bildirimler
    const existingNotifications = document.querySelectorAll('.notification');
    let offsetTop = 20;
    
    existingNotifications.forEach(notification => {
        offsetTop += notification.offsetHeight + 10;
    });
    
    // Bildirim içeriği
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.top = `${offsetTop}px`;
    
    // İkon belirleme
    let icon = '';
    if (type === 'success') {
        icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#4CAF50"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    } else if (type === 'error') {
        icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#F44336"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    }
    
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <div class="notification-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Kapat düğmesi
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // Otomatik kapat
    setTimeout(() => {
        closeNotification(notification);
    }, duration);
}

function closeNotification(notification) {
    notification.style.animation = 'slideOut 0.3s ease-out forwards';
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
            repositionNotifications();
        }
    }, 300);
}

function repositionNotifications() {
    const notifications = document.querySelectorAll('.notification');
    let offsetTop = 20;
    
    notifications.forEach(notification => {
        notification.style.top = `${offsetTop}px`;
        offsetTop += notification.offsetHeight + 10;
    });
}

// Admin paneli için fal kayıtlarını yükleme
function loadFortuneLogs() {
    // Admin girişi kontrol et
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'admin.html';
        return;
    }
    
    const fortuneLogTable = document.getElementById('fortuneLogTable');
    const visitorCountSpan = document.getElementById('visitorCount');
    const fortuneCountSpan = document.getElementById('fortuneCount');
    
    // Ziyaretçi sayısını göster
    visitorCountSpan.textContent = localStorage.getItem('visitorCount') || '0';
    
    // Fal kayıtlarını göster
    let fortuneLogs = JSON.parse(localStorage.getItem('fortuneLogs') || '[]');
    
    // Tarihe göre sırala (en yeniler en üstte)
    fortuneLogs.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    fortuneCountSpan.textContent = fortuneLogs.length;
    
    // Tabloyu doldur
    fortuneLogTable.innerHTML = `
        <tr>
            <th>Tarih</th>
            <th>İsim</th>
            <th>Burç</th>
            <th>Fal Metni</th>
            <th>İşlemler</th>
        </tr>
    `;
    
    if (fortuneLogs.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="5" style="text-align: center; padding: 30px;">
                <div style="opacity: 0.6;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white" style="margin-bottom: 10px; opacity: 0.5;">
                        <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/>
                    </svg>
                    <p>Henüz kaydedilmiş fal bulunmamaktadır.</p>
                </div>
            </td>
        `;
        fortuneLogTable.appendChild(emptyRow);
    } else {
        fortuneLogs.forEach((log, index) => {
            const row = document.createElement('tr');
            
            // Burcun ilk harfini alarak renk kodu oluştur
            const zodiacInitial = log.zodiac.charCodeAt(0);
            const hue = (zodiacInitial * 15) % 360;
            const zodiacColor = `hsl(${hue}, 70%, 60%)`;
            
            row.innerHTML = `
                <td>${formatDate(log.date)}</td>
                <td>${log.name}</td>
                <td>
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; background-color: ${zodiacColor}; font-size: 0.85rem; font-weight: 500;">
                        ${log.zodiac}
                    </span>
                </td>
                <td>
                    <div class="fortune-preview tooltip" data-fortune-id="${index}">
                        ${log.fortune.substring(0, 70)}${log.fortune.length > 70 ? '...' : ''}
                        <span class="tooltip-text">Tıklayarak tam metni görüntüleyin</span>
                    </div>
                </td>
                <td>
                    <button class="action-button view-button" data-fortune-id="${index}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                    </button>
                </td>
            `;
            fortuneLogTable.appendChild(row);
            
            // Tam fal metnini görüntüleme için olay dinleyicisi
            const fortunePreview = row.querySelector('.fortune-preview');
            const viewButton = row.querySelector('.view-button');
            
            function showFortuneDetail() {
                const fortuneId = this.getAttribute('data-fortune-id');
                const fortune = fortuneLogs[fortuneId];
                
                const modal = document.createElement('div');
                modal.className = 'fortune-modal';
                modal.innerHTML = `
                    <div class="fortune-modal-content">
                        <div class="fortune-modal-header">
                            <h3>${fortune.name} - ${fortune.zodiac}</h3>
                            <button class="close-modal">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                </svg>
                            </button>
                        </div>
                        <div class="fortune-modal-body">
                            <p class="fortune-date">${fortune.date}</p>
                            <div class="fortune-text">${fortune.fortune.replace(/\n/g, '<br>')}</div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Modal stillerini ekle
                const style = document.createElement('style');
                style.textContent = `
                    .fortune-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.7);
                        backdrop-filter: blur(5px);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                    .fortune-modal-content {
                        background-color: rgba(30, 30, 50, 0.95);
                        border-radius: 15px;
                        width: 90%;
                        max-width: 600px;
                        max-height: 80vh;
                        overflow: hidden;
                        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
                        transform: translateY(20px);
                        transition: transform 0.3s ease;
                        border: 1px solid rgba(156, 39, 176, 0.3);
                    }
                    .fortune-modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 15px 20px;
                        background: linear-gradient(135deg, rgba(156, 39, 176, 0.8), rgba(103, 58, 183, 0.8));
                        color: white;
                    }
                    .fortune-modal-header h3 {
                        margin: 0;
                        font-size: 1.3rem;
                        font-weight: 600;
                    }
                    .close-modal {
                        background: transparent;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 5px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background-color 0.2s ease;
                    }
                    .close-modal:hover {
                        background-color: rgba(255, 255, 255, 0.1);
                    }
                    .fortune-modal-body {
                        padding: 20px;
                        overflow-y: auto;
                        max-height: calc(80vh - 60px);
                    }
                    .fortune-date {
                        color: rgba(255, 255, 255, 0.6);
                        font-size: 0.9rem;
                        margin-bottom: 15px;
                    }
                    .fortune-text {
                        line-height: 1.6;
                        font-size: 1.1rem;
                    }
                `;
                
                document.head.appendChild(style);
                
                // Animasyonları etkinleştir
                setTimeout(() => {
                    modal.style.opacity = '1';
                    modal.querySelector('.fortune-modal-content').style.transform = 'translateY(0)';
                }, 10);
                
                // Modalı kapatma
                modal.querySelector('.close-modal').addEventListener('click', () => {
                    modal.style.opacity = '0';
                    modal.querySelector('.fortune-modal-content').style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        document.body.removeChild(modal);
                    }, 300);
                });
                
                // Modal dışına tıklama
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        modal.style.opacity = '0';
                        modal.querySelector('.fortune-modal-content').style.transform = 'translateY(20px)';
                        
                        setTimeout(() => {
                            document.body.removeChild(modal);
                        }, 300);
                    }
                });
            }
            
            fortunePreview.addEventListener('click', showFortuneDetail);
            viewButton.addEventListener('click', showFortuneDetail);
        });
    }
    
    // İlk yüklendiğinde bildirim göster
    showNotification('success', 'Hoş geldiniz', 'Yönetici paneline başarıyla giriş yaptınız.', 3000);
}

// Tarihi daha güzel formatlama
function formatDate(dateString) {
    const date = new Date(dateString);
    
    // Bugün
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Dün
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Tarih kontrolü
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    if (dateToCheck.getTime() === today.getTime()) {
        // Bugün ise saat göster
        return `Bugün ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (dateToCheck.getTime() === yesterday.getTime()) {
        // Dün ise
        return `Dün ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
        // Diğer günler için normal format
        const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('tr-TR', options);
    }
}
