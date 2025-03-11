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
function saveFortune(userName, userZodiac, fortuneText, birthDate = '') {
    // Debug için konsola verileri yazdır (hem geliştirme hem gerçek ortamda)
    console.log("Kullanıcı:", userName);
    console.log("Burç:", userZodiac);
    console.log("Fal:", fortuneText);

    try {
        // Cihaz bilgilerini al
        const deviceInfo = getDeviceInfo();

        // Oturum süresini hesapla
        const sessionDuration = Math.floor((Date.now() - (window.sessionStartTime || Date.now())) / 1000);

        // Backend API'ye kaydet
        fetch('/api/fortunes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: userName,
                zodiac: userZodiac,
                fortune: fortuneText,
                birthDate: birthDate,
                deviceInfo: deviceInfo,
                sessionDuration: sessionDuration
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("Fal başarıyla veritabanına kaydedildi:", data);

            // Lokalede de saklayalım (yedek olarak)
            saveFortuneToLocalStorage(userName, userZodiac, fortuneText, birthDate, deviceInfo, sessionDuration, data.id, data.date);
        })
        .catch(error => {
            console.error("API hatası, lokalede saklayalım:", error);
            // API başarısız olursa, verileri lokalede sakla
            saveFortuneToLocalStorage(userName, userZodiac, fortuneText, birthDate, deviceInfo, sessionDuration);
        });

        return true;
    } catch (error) {
        console.error("Fal kaydedilirken hata oluştu:", error);

        // Hataya rağmen verileri kurtarmak için yeni bir deneme yap
        try {
            const backupName = "fortuneLogs_backup_" + Date.now();
            localStorage.setItem(backupName, JSON.stringify([{
                date: new Date().toISOString(),
                name: userName,
                zodiac: userZodiac,
                fortune: fortuneText,
                recoveryBackup: true
            }]));
            console.log("Yedek kayıt oluşturuldu:", backupName);
        } catch (backupError) {
            console.error("Yedek kayıt oluşturulurken hata:", backupError);
        }

        return false;
    }
}

// LocalStorage'a fal kaydetme yardımcı fonksiyonu
function saveFortuneToLocalStorage(userName, userZodiac, fortuneText, birthDate, deviceInfo, sessionDuration, id = null, apiDate = null) {
    try {
        let fortuneLogs = [];
        try {
            // localStorage'dan mevcut falları al
            const existingData = localStorage.getItem('fortuneLogs');

            fortuneLogs = JSON.parse(existingData || '[]');
            if (!Array.isArray(fortuneLogs)) {
                console.error("fortuneLogs bir dizi değil, sıfırlanıyor:", fortuneLogs);
                fortuneLogs = [];
            }
        } catch (e) {
            console.error("fortuneLogs parse edilirken hata oluştu, sıfırlanıyor:", e);
            fortuneLogs = [];
        }

        let dailyStats = {};
        try {
            dailyStats = JSON.parse(localStorage.getItem('dailyStats') || '{}');
            if (typeof dailyStats !== 'object') {
                console.error("dailyStats bir obje değil, sıfırlanıyor:", dailyStats);
                dailyStats = {};
            }
        } catch (e) {
            console.error("dailyStats parse edilirken hata oluştu, sıfırlanıyor:", e);
            dailyStats = {};
        }

        // Günlük istatistikler için bugünün tarihini al
        const today = new Date().toISOString().split('T')[0];

        // Bugün için istatistikler yoksa oluştur
        if (!dailyStats[today]) {
            dailyStats[today] = {
                visitors: 0,
                fortunes: 0,
                zodiacCounts: {},
                deviceCounts: {},
                hourlyStats: Array(24).fill(0)
            };
        }

        // Günlük fal sayısını artır
        dailyStats[today].fortunes++;

        // Burç istatistiklerini güncelle
        const zodiac = userZodiac || 'Belirtilmemiş';
        dailyStats[today].zodiacCounts[zodiac] = (dailyStats[today].zodiacCounts[zodiac] || 0) + 1;

        // Saatlik istatistikleri güncelle
        const currentHour = new Date().getHours();
        dailyStats[today].hourlyStats[currentHour]++;

        // Cihaz istatistiklerini güncelle
        const deviceType = deviceInfo.isMobile ? 'Mobil' : 'Masaüstü';
        dailyStats[today].deviceCounts[deviceType] = (dailyStats[today].deviceCounts[deviceType] || 0) + 1;

        // Yeni fal kaydını oluştur
        const date = apiDate || new Date().toISOString();
        const newFortune = {
            id: id || Date.now(),
            date: date,
            localDate: new Date(date).toLocaleString('tr-TR'),
            name: userName,
            birthDate: birthDate,
            zodiac: userZodiac,
            fortune: fortuneText,
            fortuneLength: fortuneText.length,
            deviceInfo: deviceInfo,
            phoneModel: deviceInfo.phoneModel,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            screenSize: `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`,
            isMobile: deviceInfo.isMobile,
            sessionDuration: sessionDuration
        };

        // Veri limitini aşmamak için en eski kayıtları sil (eğer çok fazla kayıt varsa)
        const MAX_RECORDS = 5000;
        if (fortuneLogs.length > MAX_RECORDS) {
            fortuneLogs = fortuneLogs.slice(-MAX_RECORDS);
        }

        // Yeni fal kaydını ekle
        fortuneLogs.push(newFortune);

        // Tarihe göre sırala (en yeniler en üstte)
        fortuneLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        // localStorage'a veriyi yazmadan önce kontrol et
        try {
            localStorage.setItem('fortuneLogs', JSON.stringify(fortuneLogs));
        } catch (error) {
            console.error("localStorage'a veri yazılırken hata:", error);
        }

        localStorage.setItem('dailyStats', JSON.stringify(dailyStats));

        // Ziyaretçi sayacını güncelle ve API'ye bildir
        updateVisitorCount();

        // Admin paneli açıksa verileri otomatik güncelle
        triggerAdminPanelUpdate(newFortune);

    } catch (error) {
        console.error("Lokal depolama hatası:", error);
    }
}

// Ziyaretçi sayısını artırma fonksiyonu
function updateVisitorCount() {
    // Önce lokalede güncelle
    let visitorCount = localStorage.getItem('visitorCount') || 0;
    visitorCount = parseInt(visitorCount) + 1;
    localStorage.setItem('visitorCount', visitorCount);

    // API'ye de bildir
    fetch('/api/visitors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => console.log("Ziyaretçi kaydı güncellendi:", data))
    .catch(err => console.error("Ziyaretçi kaydı güncellenirken hata:", err));
}

// Admin paneline otomatik güncelleme sinyali gönderme
function triggerAdminPanelUpdate(newFortune) {
    console.log("Admin paneline güncelleme sinyali gönderiliyor:", newFortune);

    // CustomEvent kullanarak admin paneline veri ekleme sinyali gönder
    const updateEvent = new CustomEvent('fortuneDataUpdated', { 
        detail: { 
            fortune: newFortune,
            timestamp: Date.now() 
        } 
    });

    // Event'i window objesine yayınla
    window.dispatchEvent(updateEvent);

    // Admin paneli açıksa ve farklı bir pencere/tab'daysa
    // localStorage üzerinden sinyal gönder
    try {
        // Sinyal olarak kullanmak için lastFortuneUpdate
        localStorage.setItem('lastFortuneUpdate', JSON.stringify({
            fortune: newFortune,
            timestamp: Date.now()
        }));

        // Yeni falı doğrudan fortuneLogs'a ekle
        let fortuneLogs = JSON.parse(localStorage.getItem('fortuneLogs') || '[]');
        if (!Array.isArray(fortuneLogs)) fortuneLogs = [];

        // Eğer bu kayıt zaten yoksa ekle (id ile kontrol)
        if (!fortuneLogs.some(log => log.id === newFortune.id)) {
            fortuneLogs.push(newFortune);

            // Tarihe göre sırala (en yeniler en üstte)
            fortuneLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

            localStorage.setItem('fortuneLogs', JSON.stringify(fortuneLogs));
            console.log("Yeni fal kaydı localStorage'a eklendi:", newFortune.name);
        }
    } catch (e) {
        console.error("Admin paneli güncelleme sinyali gönderilemedi:", e);
    }
}

// Sayfa yüklendiğinde oturum başlangıç zamanını kaydet
document.addEventListener('DOMContentLoaded', function() {
    window.sessionStartTime = Date.now();
});

// Cihaz bilgilerini tespit etme
function getDeviceInfo() {
    const userAgent = navigator.userAgent;

    // İşletim sistemi tespiti
    let os = "Bilinmiyor";
    if (/Windows/i.test(userAgent)) os = "Windows";
    else if (/Macintosh|Mac OS X/i.test(userAgent)) os = "MacOS";
    else if (/Android/i.test(userAgent)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(userAgent)) os = "iOS";
    else if (/Linux/i.test(userAgent)) os = "Linux";

    // Tarayıcı tespiti
    let browser = "Bilinmiyor";
    if (/Edge/i.test(userAgent)) browser = "Edge";
    else if (/Chrome/i.test(userAgent)) browser = "Chrome";
    else if (/Firefox/i.test(userAgent)) browser = "Firefox";
    else if (/Safari/i.test(userAgent)) browser = "Safari";
    else if (/Opera|OPR/i.test(userAgent)) browser = "Opera";
    else if (/MSIE|Trident/i.test(userAgent)) browser = "Internet Explorer";

    // Telefon modeli tespiti
    let phoneModel = "Bilinmiyor";

    // iPhone model tespiti
    if (/iPhone/i.test(userAgent)) {
        const iPhoneMatch = userAgent.match(/iPhone\s*(?:OS\s*)?(\d+)?(?:_\d+)?/i);
        if (iPhoneMatch) {
            phoneModel = "iPhone " + (iPhoneMatch[1] || "");
        } else {
            phoneModel = "iPhone";
        }
    } 
    // Android model tespiti
    else if (/Android/i.test(userAgent)) {
        const matches = userAgent.match(/Android\s([0-9.]+);\s*([^;)]+)(?:[;)])/);
        if (matches && matches.length > 2) {
            phoneModel = matches[2].trim();
        } else {
            phoneModel = "Android Cihaz";
        }
    }
    // Diğer mobil cihazlar
    else if (/iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        if (/iPad/i.test(userAgent)) phoneModel = "iPad";
        else if (/iPod/i.test(userAgent)) phoneModel = "iPod";
        else if (/BlackBerry/i.test(userAgent)) phoneModel = "BlackBerry";
        else if (/IEMobile/i.test(userAgent)) phoneModel = "Windows Phone";
        else if (/Opera Mini/i.test(userAgent)) phoneModel = "Opera Phone";
    } 
    // Mobil cihaz değilse
    else {
        phoneModel = "Masaüstü Cihaz";
    }

    return {
        userAgent: userAgent,
        os: os,
        browser: browser,
        phoneModel: phoneModel,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
    };
}

// Admin şifre kontrolü
function checkAdminPassword(password) {
    // Şifre kontrolü - güçlü bir şifre tanımlandı
    const correctPassword = "123456"; // Bu şifreyi kimseyle paylaşmayın

    // Şifre eşleşmesini kontrol et
    if (password === correctPassword) {
        // Başarılı giriş durumunda
        const loginDate = new Date().toISOString();
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminLastLogin', loginDate);

        // Başarılı giriş bildirimi
        showNotification('success', 'Başarılı', 'Yönetici paneline yönlendiriliyorsunuz...', 1500);

        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 1500);
    } else {
        // Başarısız giriş durumunda
        const button = document.querySelector('#adminLoginForm button');
        button.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/></svg> Giriş Yap';
        button.disabled = false;

        // Başarısız giriş girişimlerini kaydet
        let failedAttempts = JSON.parse(localStorage.getItem('adminFailedAttempts') || '[]');
        failedAttempts.push({
            timestamp: new Date().toISOString(),
            enteredPassword: password.substring(0, 3) + '***' // Güvenlik için tam şifreyi kaydetmiyoruz
        });
        localStorage.setItem('adminFailedAttempts', JSON.stringify(failedAttempts));

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
    } else if (type === 'info') {
        icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#2196F3"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
    }

    // Başlık ve mesajın ayrı ayrı belirtildiği durum
    if (title && message) {
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
    } 
    // Sadece tek mesaj parametresi verildiği durum
    else {
        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-message">${title}</div>
            </div>
            <div class="notification-close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </div>
        `;
    }

    document.body.appendChild(notification);

    // Ses çal (varsa)
    try {
        const notificationSound = document.getElementById('notificationSound');
        if (notificationSound) {
            notificationSound.play().catch(e => console.error("Bildirim sesi çalınamadı:", e));
        }
    } catch (e) {
        console.error("Bildirim sesi çalma hatası:", e);
    }

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

    // Yükleniyor göstergesi
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = `
        <div class="spinner-large"></div>
        <p>Veriler yükleniyor...</p>
    `;
    document.body.appendChild(loadingIndicator);

    // Gerekli DOM elementlerini kontrol et ve güvenli bir şekilde eriş
    const fortuneLogTable = document.getElementById('fortuneLogTable');
    const visitorCountSpan = document.getElementById('visitorCount');
    const fortuneCountSpan = document.getElementById('fortuneCount');

    if (!fortuneLogTable) {
        console.error('Fortune log tablosu bulunamadı!');
        if (document.body.contains(loadingIndicator)) {
            document.body.removeChild(loadingIndicator);
        }
        return;
    }

    // Verileri asenkron olarak yükle
    setTimeout(() => {
        try {
            // Backend API'den ziyaretçi sayısını al
            fetch('/api/visitors')
                .then(response => response.json())
                .then(data => {
                    if (visitorCountSpan) visitorCountSpan.textContent = data.count || 0;
                })
                .catch(error => {
                    console.error("Ziyaretçi sayısı alınamadı:", error);
                    // Hata durumunda lokalden al
                    const actualVisitorCount = localStorage.getItem('visitorCount') || '0';
                    if (visitorCountSpan) visitorCountSpan.textContent = actualVisitorCount;
                });

            // Backend API'den falları al
            fetch('/api/fortunes')
                .then(response => response.json())
                .then(fortuneLogs => {
                    console.log("API'den fallar yüklendi:", fortuneLogs.length);
                    processFortuneData(fortuneLogs);
                })
                .catch(error => {
                    console.error("API başarısız oldu, localStorage'dan veriler yükleniyor:", error);
                    // API başarısız olursa localStorage'dan yükle
                    let fortuneLogs = [];
                    try {
                        fortuneLogs = JSON.parse(localStorage.getItem('fortuneLogs') || '[]');

                        // Boş kontrolü
                        if (!fortuneLogs || fortuneLogs.length === 0) {
                            console.log("Fal kayıtları boş, örnek veri oluşturuluyor...");

                            // Veritabanında hiç veri yoksa örnek veri oluştur
                            const demoFortunes = [
                                {
                                    id: Date.now(),
                                    date: new Date().toISOString(),
                                    localDate: new Date().toLocaleString('tr-TR'),
                                    name: "Demo Kullanıcı 1",
                                    zodiac: "Koç",
                                    fortune: "Yakın zamanda yeni bir iş fırsatı ile karşılaşacaksın. Bu fırsat, uzun zamandır beklediğin değişim için bir kapı açabilir.",
                                    deviceInfo: {
                                        browser: "Chrome",
                                        os: "Android",
                                        phoneModel: "Samsung Galaxy",
                                        isMobile: true,
                                        screenWidth: 375,
                                        screenHeight: 812
                                    }
                                },
                                {
                                    id: Date.now() + 1,
                                    date: new Date(Date.now() - 86400000).toISOString(), // 1 gün önce
                                    localDate: new Date(Date.now() - 86400000).toLocaleString('tr-TR'),
                                    name: "Demo Kullanıcı 2",
                                    zodiac: "Balık",
                                    fortune: "Duygusal açıdan yoğun bir dönemdesin. İçine kapanmak yerine sevdiklerinle duygularını paylaşırsan rahatladığını göreceksin.",
                                    deviceInfo: {
                                        browser: "Safari",
                                        os: "iOS",
                                        phoneModel: "iPhone 12",
                                        isMobile: true,
                                        screenWidth: 390,
                                        screenHeight: 844
                                    }
                                }
                            ];

                            // Örnek verileri kaydet
                            localStorage.setItem('fortuneLogs', JSON.stringify(demoFortunes));
                            fortuneLogs = demoFortunes;
                        }
                    } catch (error) {
                        console.error('Lokal fal kayıtları yüklenemedi:', error);
                        showNotification('error', 'Hata', 'Fal kayıtları yüklenirken bir sorun oluştu.', 3000);
                        fortuneLogs = [];
                    }

                    processFortuneData(fortuneLogs);
                });

        } catch (error) {
            console.error('Veriler yüklenirken beklenmedik bir hata oluştu:', error);
            if (document.body.contains(loadingIndicator)) {
                document.body.removeChild(loadingIndicator);
            }
            showNotification('error', 'Hata', 'Veriler yüklenirken beklenmedik bir hata oluştu.', 3000);
        }
    }, 300); // Küçük bir gecikme ekleyelim ki yükleniyor animasyonu görünsün

    // Veri işleme fonksiyonu
    function processFortuneData(fortuneLogs) {
        // Tarihe göre sırala (en yeniler en üstte)
        fortuneLogs.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        // Fal sayısını göster
        if (fortuneCountSpan) fortuneCountSpan.textContent = fortuneLogs.length;

        // Tabloyu doldur
        renderFortuneTable(fortuneLogTable, fortuneLogs);

        // İstatistikleri güncelle - hatadan etkilenemeyecek şekilde
        try {
            // Cihaz istatistiklerini güncelle
            updateDeviceStatistics(fortuneLogs);

            // Diğer detaylı grafikleri güncelle
            // Önce DOM'da oluştur, sonra verileri doldur
            prepareChartContainers();
            setTimeout(() => {
                loadAllCharts(fortuneLogs);
            }, 300);
        } catch (error) {
            console.error('İstatistikler güncellenirken hata oluştu:', error);
        }

        // Yükleme tamamlandı
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator && document.body.contains(loadingIndicator)) {
            document.body.removeChild(loadingIndicator);
        }

        // İlk yüklendiğinde bildirim göster
        showNotification('success', 'Hoş geldiniz', 'Yönetici paneline başarıyla giriş yaptınız.', 3000);

        // İstatistikleri backend'den al
        fetch('/api/stats/daily')
            .then(response => response.json())
            .then(stats => {
                console.log("API'den günlük istatistikler yüklendi:", stats.length);
                // Burada istatistiklerle ilgili ek işlemler yapılabilir
            })
            .catch(error => {
                console.error("API isteği başarısız:", error);
            });
    }
}

// Tablo render fonksiyonu
function renderFortuneTable(fortuneLogTable, fortuneLogs) {
    console.log("Tabloya yerleştirilecek fal kayıtları:", fortuneLogs);

    // Tabloyu doldur
    fortuneLogTable.innerHTML = `
        <tr>
            <th>Tarih</th>
            <th>İsim</th>
            <th>Telefon Modeli</th>
            <th>Burç</th>
            <th>Fal Metni</th>
            <th>İşlemler</th>
        </tr>
    `;

    if (!fortuneLogs || fortuneLogs.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 30px;">
                <div style="opacity: 0.6;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white" style="margin-bottom: 10px; opacity: 0.5;">
                        <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/>
                    </svg>
                    <p>Henüz kaydedilmiş fal bulunmamaktadır.</p>
                </div>
            </td>
        `;
        fortuneLogTable.appendChild(emptyRow);
        return;
    }

    // Falları batches halinde render et (büyük veri setleri için performans iyileştirmesi)
    const batchSize = 20;
    const totalEntries = fortuneLogs.length;

    // İlk batch'i hemen render et
    renderBatch(0, Math.min(batchSize, totalEntries));

    function renderBatch(startIndex, endIndex) {
        for (let i = startIndex; i < endIndex; i++) {
            const log = fortuneLogs[i];
            renderFortuneRow(log, i);
        }

        // Eğer daha fazla veri varsa, sonraki batch'i zamanla
        if (endIndex < totalEntries) {
            setTimeout(() => {
                renderBatch(endIndex, Math.min(endIndex + batchSize, totalEntries));
            }, 10);
        }
    }

    function renderFortuneRow(log, index) {
        if (!log) {
            console.error(`Kayıt ${index} tanımsız veya null:`, log);
            return;
        }

        const row = document.createElement('tr');

        try {
            // Safe values handling with detailed logging for debugging
            const name = log.name || 'İsimsiz';
            console.log(`Kayıt ${index} isim:`, name);

            let date = 'Tarih Yok';
            try {
                date = log.date ? formatDate(log.date) : 'Tarih Yok';
            } catch (e) {
                console.error(`Tarih formatlanırken hata (Kayıt ${index}):`, e);
            }

            const zodiac = log.zodiac || 'Belirsiz';
            console.log(`Kayıt ${index} burç:`, zodiac);

            const fortune = log.fortune || 'Fal metni bulunamadı';
            console.log(`Kayıt ${index} fal metni:`, fortune.substring(0, 30) + (fortune.length > 30 ? '...' : ''));

            let phoneModel = 'Bilinmiyor';
            if (log.phoneModel) {
                phoneModel = log.phoneModel;
            } else if (log.deviceInfo && log.deviceInfo.phoneModel) {
                phoneModel = log.deviceInfo.phoneModel;
            }

            // Burcun ilk harfini alarak renk kodu oluştur
            let zodiacInitial = 65; // Default 'A'
            try {
                zodiacInitial = zodiac.charCodeAt(0) || 65;
            } catch (e) {
                console.error(`Burç harfi alınırken hata (Kayıt ${index}):`, e);
            }

            const hue = (zodiacInitial * 15) % 360;
            const zodiacColor = `hsl(${hue}, 70%, 60%)`;

            // Cihaz tipi belirleme
            let isMobile = false;
            try {
                isMobile = log.deviceInfo && log.deviceInfo.isMobile;
            } catch (e) {
                console.error(`Cihaz tipi belirlenirken hata (Kayıt ${index}):`, e);
            }

            const deviceStyle = isMobile ? 
                'background-color: rgba(76, 175, 80, 0.2);' : 
                'background-color: rgba(33, 150, 243, 0.2);';

            row.innerHTML = `
                <td>${date}</td>
                <td>${name}</td>
                <td>
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; ${deviceStyle} font-size: 0.85rem; font-weight: 500;">
                        ${phoneModel}
                    </span>
                </td>
                <td>
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; background-color: ${zodiacColor}; font-size: 0.85rem; font-weight: 500;">
                        ${zodiac}
                    </span>
                </td>
                <td>
                    <div class="fortune-preview tooltip" data-fortune-id="${index}">
                        ${fortune.substring(0, 70)}${fortune.length > 70 ? '...' : ''}
                        <span class="tooltip-text">Tıklayarak tam metni görüntüleyin</span>
                    </div>
                </td>
                <td>
                    <button class="action-button view-button" data-fortune-id="${index}" style="background: none; padding: 5px; margin: 0;">
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
                openFortuneDetailModal(fortuneLogs[index]);
            }

            if (fortunePreview) fortunePreview.addEventListener('click', showFortuneDetail);
            if (viewButton) viewButton.addEventListener('click', showFortuneDetail);
        } catch (error) {
            console.error(`Satır ${index} işlenirken hata:`, error);
            console.log(`Hatalı kayıt verisi:`, log);
            row.innerHTML = `
                <td colspan="6" style="color: #ff6b6b;">
                    Veri hatası - Bu kayıt geçersiz veya bozuk (Kayıt #${index+1})
                </td>
            `;
            fortuneLogTable.appendChild(row);
        }
    }
}

// Fal detayları modalı
function openFortuneDetailModal(fortune) {
    // Check if a modal already exists and remove it to prevent duplicates
    const existingModal = document.querySelector('.fortune-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }

    try {
        const modal = document.createElement('div');
        modal.className = 'fortune-modal';

        // Cihaz bilgisi kısmını oluştur
        let deviceInfoHTML = '';
        if (fortune.deviceInfo) {
            deviceInfoHTML = `
                <div class="fortune-device-info">
                    <h4>Cihaz Bilgileri</h4>
                    <p><strong>Telefon Modeli:</strong> ${fortune.phoneModel || 'Belirtilmemiş'}</p>
                    <p><strong>İşletim Sistemi:</strong> ${fortune.os || 'Belirtilmemiş'}</p>
                    <p><strong>Tarayıcı:</strong> ${fortune.browser || 'Belirtilmemiş'}</p>
                    <p><strong>Cihaz Tipi:</strong> ${fortune.deviceInfo.isMobile ? 'Mobil' : 'Masaüstü'}</p>
                    <p><strong>Ekran Boyutu:</strong> ${fortune.deviceInfo.screenWidth || 0}x${fortune.deviceInfo.screenHeight || 0}</p>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="fortune-modal-content">
                <div class="fortune-modal-header">
                    <h3>${fortune.name || 'İsimsiz'} - ${fortune.zodiac || 'Belirsiz'}</h3>
                    <button class="close-modal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div class="fortune-modal-body">
                    <p class="fortune-date">${fortune.date || 'Tarih Yok'}</p>
                    <p class="fortune-device"><strong>Cihaz:</strong> ${fortune.phoneModel || 'Belirtilmemiş'}</p>
                    <div class="fortune-text">${(fortune.fortune || 'Fal metni bulunamadı').replace(/\n/g, '<br>')}</div>
                    ${deviceInfoHTML}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Animasyonları etkinleştir
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('.fortune-modal-content').style.transform = 'translateY(0)';
        }, 10);

        // Modalı kapatma
        const closeButton = modal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                closeFortuneModal(modal);
            });
        }

        // Modal dışına tıklama
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeFortuneModal(modal);
            }
        });
    } catch (error) {
        console.error('Fal detay modalı açılırken hata oluştu:', error);
        showNotification('error', 'Hata', 'Fal detayları yüklenirken bir sorun oluştu.', 3000);
    }
}

// Modal kapatma fonksiyonu
function closeFortuneModal(modal) {
    if (!modal) return;

    modal.style.opacity = '0';
    const content = modal.querySelector('.fortune-modal-content');
    if (content) content.style.transform = 'translateY(20px)';

    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

// Grafik konteynerlerini hazırla
function prepareChartContainers() {
    // Grafik konteynerlerini DOM'a ekle
    const adminDashboard = document.querySelector('.admin-dashboard');
    if (!adminDashboard) return;

    // Eğer konteynerler zaten varsa boşalt
    const existingContainer = document.getElementById('chartsMainContainer');
    if (existingContainer) {
        existingContainer.innerHTML = '';
    } else {
        // Yoksa yeni konteyner oluştur
        const container = document.createElement('div');
        container.id = 'chartsMainContainer';
        container.className = 'stats-summary';
        container.innerHTML = `
            <h3 class="section-title">Detaylı Veri Analizi</h3>
            <div class="charts-loading">
                <div class="spinner"></div>
                <p>Grafikler hazırlanıyor...</p>
            </div>
            <div class="chart-grid" id="chartGrid">
                <div class="chart-container">
                    <h4>Günlük Fal Aktivitesi</h4>
                    <canvas id="dailyActivityChart"></canvas>
                </div>
                <div class="chart-container">
                    <h4>Burç Dağılımı</h4>
                    <canvas id="zodiacDistributionChart"></canvas>
                </div>
                <div class="chart-container">
                    <h4>Saatlik Aktivite</h4>
                    <canvas id="hourlyActivityChart"></canvas>
                </div>
                <div class="chart-container">
                    <h4>Cihaz Kullanımı</h4>
                    <canvas id="deviceUsageChart"></canvas>
                </div>
            </div>

            <h3 class="section-title" style="margin-top: 30px;">Gerçek Zamanlı Aktivite</h3>
            <div class="realtime-stats">
                <div class="realtime-stat-box">
                    <div class="realtime-stat-title">Şu An Aktif</div>
                    <div class="realtime-stat-value" id="currentActiveUsers">0</div>
                    <div class="realtime-stat-label">kullanıcı</div>
                </div>
                <div class="realtime-stat-box">
                    <div class="realtime-stat-title">Son 1 Saatte</div>
                    <div class="realtime-stat-value" id="lastHourFortunes">0</div>
                    <div class="realtime-stat-label">fal bakıldı</div>
                </div>
                <div class="realtime-stat-box">
                    <div class="realtime-stat-title">Bugün</div>
                    <div class="realtime-stat-value" id="todaysTotalFortunes">0</div>
                    <div class="realtime-stat-label">fal bakıldı</div>
                </div>
                <div class="realtime-stat-box">
                    <div class="realtime-stat-title">Ortalama Süre</div>
                    <div class="realtime-stat-value" id="averageSessionTime">0s</div>
                    <div class="realtime-stat-label">site kullanımı</div>
                </div>
            </div>
        `;

        // Container'ı sayfaya ekle
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            adminDashboard.insertBefore(container, actionButtons);
        } else {
            adminDashboard.appendChild(container);
        }

        // Stil ekle
        addChartStyles();
    }
}

// Chart stilleri
function addChartStyles() {
    const styleId = 'chartStyles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .chart-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .chart-container {
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 15px;
            height: 250px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .chart-container:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .chart-container h4 {
            text-align: center;
            margin-top: 0;
            margin-bottom: 10px;
            color: #e0f7fa;
            font-size: 1rem;
        }

        .spinner-large {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #9c27b0;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }

        .loading-indicator {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-size: 1.2rem;
        }

        .charts-loading {
            padding: 20px;
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
        }

        .realtime-stats {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 15px;
        }

        .realtime-stat-box {
            background: linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(103, 58, 183, 0.2));
            border-radius: 10px;
            padding: 15px;
            text-align: center;
            flex: 1;
            min-width: 150px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            position: relative;
            overflow: hidden;
            transition: transform 0.3s ease;
        }

        .realtime-stat-box:hover {
            transform: translateY(-3px);
        }

        .realtime-stat-box::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, rgba(103, 58, 183, 0), rgba(103, 58, 183, 0.8), rgba(103, 58, 183, 0));
            bottom: 0;
            left: 0;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% {
                opacity: 0.3;
            }
            50% {
                opacity: 1;
            }
            100% {
                opacity: 0.3;
            }
        }

        .realtime-stat-title {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 8px;
        }

        .realtime-stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .realtime-stat-label {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.6);
        }
    `;

    document.head.appendChild(style);
}

// Tüm grafikleri yükle
function loadAllCharts(fortuneLogs) {
    try {
        // Yükleniyor göstergesini kaldır
        const loadingIndicator = document.querySelector('.charts-loading');
        if (loadingIndicator) loadingIndicator.style.display = 'none';

        // Her grafik için ayrı try-catch bloklarıyla hata yakalama
        try {
            loadDailyActivityChart(fortuneLogs);
        } catch (error) {
            console.error('Günlük aktivite grafiği yüklenirken hata:', error);
            showErrorInChart('dailyActivityChart');
        }

        try {
            loadZodiacDistributionChart(fortuneLogs);
        } catch (error) {
            console.error('Burç dağılımı grafiği yüklenirken hata:', error);
            showErrorInChart('zodiacDistributionChart');
        }

        try {
            loadHourlyActivityChart(fortuneLogs);
        } catch (error) {
            console.error('Saatlik aktivite grafiği yüklenirken hata:', error);
            showErrorInChart('hourlyActivityChart');
        }

        try {
            loadDeviceUsageChart(fortuneLogs);
        } catch (error) {
            console.error('Cihaz kullanımı grafiği yüklenirken hata:', error);
            showErrorInChart('deviceUsageChart');
        }

        // Gerçek zamanlı istatistikler
        updateRealtimeStats(fortuneLogs);
    } catch (error) {
        console.error('Grafikler yüklenirken genel hata:', error);
    }
}

// Grafik yükleme hatası durumunda hata gösterme
function showErrorInChart(chartId) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    // Canvas'ı gizle ve hata mesajı göster
    canvas.style.display = 'none';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'chart-error';
    errorDiv.innerHTML = `
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#ff6b6b">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p>Grafik yüklenemedi</p>
        <button class="retry-button">Yeniden Dene</button>
    `;

    container.appendChild(errorDiv);

    // Yeniden deneme düğmesi
    const retryButton = errorDiv.querySelector('.retry-button');
    if (retryButton) {
        retryButton.addEventListener('click', function() {
            // Hata mesajını kaldır ve canvas'ı geri göster
            container.removeChild(errorDiv);
            canvas.style.display = '';

            // Grafiği yeniden yüklemeyi dene
            try {
                const fortuneLogs = JSON.parse(localStorage.getItem('fortuneLogs') || '[]');
                switch(chartId) {
                    case 'dailyActivityChart':
                        loadDailyActivityChart(fortuneLogs);
                        break;
                    case 'zodiacDistributionChart':
                        loadZodiacDistributionChart(fortuneLogs);
                        break;
                    case 'hourlyActivityChart':
                        loadHourlyActivityChart(fortuneLogs);
                        break;
                    case 'deviceUsageChart':
                        loadDeviceUsageChart(fortuneLogs);
                        break;
                }
            } catch (error) {
                console.error(`${chartId} yeniden yüklenirken hata:`, error);
                showErrorInChart(chartId);
            }
        });
    }
}

// Cihaz istatistiklerini güncelleme
function updateDeviceStatistics(fortuneLogs) {
    // Zaten HTML'de cihaz istatistikleri bölümü var mı kontrol et
    let deviceStatsContainer = document.getElementById('deviceStatsContainer');

    // Yoksa oluştur
    if (!deviceStatsContainer) {
        const statsSummary = document.querySelector('.stats-summary');
        if (!statsSummary) return;

        deviceStatsContainer = document.createElement('div');
        deviceStatsContainer.id = 'deviceStatsContainer';
        deviceStatsContainer.className = 'stats-summary';
        deviceStatsContainer.innerHTML = `
            <h3 class="section-title">Cihaz İstatistikleri</h3>
            <div class="device-stats-grid" id="deviceStatsGrid"></div>
        `;

        statsSummary.after(deviceStatsContainer);

        // Çizelge için stil ekle
        const style = document.createElement('style');
        style.textContent = `
            .device-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            .device-stat-box {
                background-color: rgba(0, 0, 0, 0.3);
                border-radius: 10px;
                padding: 15px;
                text-align: center;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .device-stat-box:hover {
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            }
            .device-stat-title {
                font-size: 1rem;
                margin-bottom: 10px;
                color: #e0f7fa;
            }
            .device-stat-count {
                font-size: 1.8rem;
                font-weight: bold;
                margin-bottom: 5px;
            }
            .device-stat-percentage {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.7);
            }
            .device-chart-container {
                height: 300px;
                margin-top: 20px;
            }
            .empty-device-stats {
                text-align: center;
                padding: 30px;
                opacity: 0.6;
            }
        `;
        document.head.appendChild(style);
    }

    // Cihaz istatistik grid'ini temizle
    const deviceStatsGrid = document.getElementById('deviceStatsGrid');
    deviceStatsGrid.innerHTML = '';

    // Cihaz sayılarını hesapla
    const deviceCounts = {};
    const osCounts = {};
    const browserCounts = {};
    let mobileCount = 0;
    let desktopCount = 0;

    fortuneLogs.forEach(log => {
        // Telefon modeli istatistiği
        const phoneModel = log.phoneModel || 'Bilinmiyor';
        deviceCounts[phoneModel] = (deviceCounts[phoneModel] || 0) + 1;

        // İşletim sistemi istatistiği
        if (log.os) {
            osCounts[log.os] = (osCounts[log.os] || 0) + 1;
        }

        // Tarayıcı istatistiği
        if (log.browser) {
            browserCounts[log.browser] = (browserCounts[log.browser] || 0) + 1;
        }

        // Mobil/Masaüstü istatistiği
        if (log.deviceInfo && log.deviceInfo.isMobile) {
            mobileCount++;
        } else {
            desktopCount++;
        }
    });

    if (fortuneLogs.length === 0) {
        deviceStatsGrid.innerHTML = `
            <div class="empty-device-stats">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="white" style="margin-bottom: 10px; opacity: 0.5;">
                    <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-1-6h-3V8h-2v5H8l4 4 4-4z"/>
                </svg>
                <p>Henüz cihaz verisi bulunmamaktadır.</p>
            </div>
        `;
        return;
    }

    // En popüler cihazları al ve göster (ilk 4)
    const deviceEntries = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]);
    const topDevices = deviceEntries.slice(0, 4);

    topDevices.forEach(([device, count]) => {
        const percentage = ((count / fortuneLogs.length) * 100).toFixed(1);
        const deviceStatBox = document.createElement('div');
        deviceStatBox.className = 'device-stat-box';
        deviceStatBox.innerHTML = `
            <div class="device-stat-title">${device}</div>
            <div class="device-stat-count">${count}</div>
            <div class="device-stat-percentage">${percentage}% Kullanıcı</div>
        `;
        deviceStatsGrid.appendChild(deviceStatBox);
    });

    // Mobil/Masaüstü istatistiği
    const mobilePercentage = ((mobileCount / fortuneLogs.length) * 100).toFixed(1);
    const desktopPercentage = ((desktopCount / fortuneLogs.length) * 100).toFixed(1);

    const deviceTypeBox = document.createElement('div');
    deviceTypeBox.className = 'device-stat-box';
    deviceTypeBox.innerHTML = `
        <div class="device-stat-title">Cihaz Türü</div>
        <div class="device-stat-count">${mobileCount + desktopCount}</div>
        <div class="device-stat-percentage">
            <span style="color: #4CAF50;">${mobilePercentage}% Mobil</span> / 
            <span style="color: #2196F3;">${desktopPercentage}% Masaüstü</span>
        </div>
    `;
    deviceStatsGrid.appendChild(deviceTypeBox);

    // Grafik için container oluştur
    let chartContainer = document.getElementById('deviceChartContainer');

    if (!chartContainer) {
        chartContainer = document.createElement('div');
        chartContainer.id = 'deviceChartContainer';
        chartContainer.className = 'device-chart-container';

        // Canvas ekle
        const canvas = document.createElement('canvas');
        canvas.id = 'deviceChart';
        chartContainer.appendChild(canvas);

        deviceStatsContainer.appendChild(chartContainer);
    }

    // Cihaz grafiği oluştur
    const ctx = document.getElementById('deviceChart').getContext('2d');

    // Eğer önceden bir grafik varsa temizle
    if (window.deviceChart) {
        window.deviceChart.destroy();
    }

    // Grafik verilerini hazırla
    const deviceLabels = topDevices.map(([device]) => device);
    const deviceData = topDevices.map(([_, count]) => count);

    // Rastgele renkler oluştur
    const generateColors = (count) => {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const hue = (i * 137) % 360; // Altın oran ile renkler arası dağılım
            colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
        }
        return colors;
    };

    const backgroundColors = generateColors(deviceLabels.length);

    // Grafiği oluştur
    window.deviceChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: deviceLabels,
            datasets: [{
                data: deviceData,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'white',
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Cihaz Dağılımı',
                    color: 'white',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
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

// Günlük aktivite grafiği yükleme fonksiyonu
function loadDailyActivityChart(fortuneLogs) {
    const chartElement = document.getElementById('dailyActivityChart');
    if (!chartElement) {
        console.error('dailyActivityChart canvas bulunamadı');
        return;
    }

    const ctx = chartElement.getContext('2d');
    if (!ctx) {
        console.error('2D context alınamadı');
        return    }

    // Eğer önceki bir grafik varsa yok et
    if (window.dailyActivityChart) {
        window.dailyActivityChart.destroy();
    }

    // Son 14 günün tarihlerini ve verilerini hazırla
    const dates = [];
    const fortuneData = [];
    const visitorData = [];

    const dailyStats = JSON.parse(localStorage.getItem('dailyStats') || '{}');

    // Son 14 günü al
    for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        dates.push(formatShortDate(date));

        if (dailyStats[dateString]) {
            fortuneData.push(dailyStats[dateString].fortunes || 0);
            visitorData.push(dailyStats[dateString].visitors || 0);
        } else {
            fortuneData.push(0);
            visitorData.push(0);
        }
    }

    window.dailyActivityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Bakılan Fallar',
                    data: fortuneData,
                    borderColor: 'rgba(156, 39, 176, 0.8)',
                    backgroundColor: 'rgba(156, 39, 176, 0.2)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Ziyaretçiler',
                    data: visitorData,
                    borderColor: 'rgba(33, 150, 243, 0.8)',
                    backgroundColor: 'rgba(33, 150, 243, 0.2)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

// Burç dağılımı grafiği
function loadZodiacDistributionChart(fortuneLogs) {
    const chartElement = document.getElementById('zodiacDistributionChart');
    if (!chartElement) {
        console.error('zodiacDistributionChart canvas bulunamadı');
        return;
    }

    const ctx = chartElement.getContext('2d');
    if (!ctx) {
        console.error('2D context alınamadı');
        return;
    }

    // Eğer önceki bir grafik varsa yok et
    if (window.zodiacDistributionChart) {
        window.zodiacDistributionChart.destroy();
    }

    const zodiacCounts = {};

    // Burç sayılarını hesapla
    fortuneLogs.forEach(log => {
        if (!log) return;
        const zodiac = log.zodiac || 'Belirtilmemiş';
        zodiacCounts[zodiac] = (zodiacCounts[zodiac] || 0) + 1;
    });

    // Veriyi graph formatına dönüştür
    const labels = Object.keys(zodiacCounts);
    const data = Object.values(zodiacCounts);

    // Burçlar için renkler
    const colors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)',
        'rgba(83, 102, 255, 0.7)',
        'rgba(40, 159, 64, 0.7)',
        'rgba(210, 199, 30, 0.7)',
        'rgba(180, 40, 150, 0.7)',
        'rgba(70, 90, 220, 0.7)'
    ];

    // Verileri en çoktan en aza sırala
    const combined = labels.map((label, i) => ({ label, data: data[i] }));
    combined.sort((a, b) => b.data - a.data);

    const sortedLabels = combined.map(item => item.label);
    const sortedData = combined.map(item => item.data);
    const sortedColors = combined.map((_, i) => colors[i % colors.length]);

    window.zodiacDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedLabels,
            datasets: [{
                data: sortedData,
                backgroundColor: sortedColors,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Saatlik aktivite grafiği
function loadHourlyActivityChart(fortuneLogs) {
    const chartElement = document.getElementById('hourlyActivityChart');
    if (!chartElement) {
        console.error('hourlyActivityChart canvas bulunamadı');
        return;
    }

    const ctx = chartElement.getContext('2d');
    if (!ctx) {
        console.error('2D context alınamadı');
        return;
    }

    // Eğer önceki bir grafik varsa yok et
    if (window.hourlyActivityChart) {
        window.hourlyActivityChart.destroy();
    }

    // Bugünün saatlik verisini al
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = JSON.parse(localStorage.getItem('dailyStats') || '{}');
    let hourlyData = (dailyStats[today] && dailyStats[today].hourlyStats) || Array(24).fill(0);

    // Eğer veri yoksa, falların saatlerinden hesapla
    if (hourlyData.every(val => val === 0) && fortuneLogs.length > 0) {
        hourlyData = Array(24).fill(0);

        const todayLogs = fortuneLogs.filter(log => {
            if (!log || !log.date) return false;
            try {
                const logDate = new Date(log.date);
                const logDateStr = logDate.toISOString().split('T')[0];
                return logDateStr === today;
            } catch (e) {
                return false;
            }
        });

        todayLogs.forEach(log => {
            try {
                const logDate = new Date(log.date);
                const hour = logDate.getHours();
                if (hour >= 0 && hour < 24) {
                    hourlyData[hour]++;
                }
            } catch (e) {
                console.error('Saat hesaplama hatası:', e);
            }
        });
    }

    // Saat etiketleri
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

    window.hourlyActivityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'Saat Başına Fal',
                data: hourlyData,
                backgroundColor: 'rgba(103, 58, 183, 0.6)',
                borderColor: 'rgba(103, 58, 183, 0.8)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        maxRotation: 90,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

// Cihaz kullanımı grafiği
function loadDeviceUsageChart(fortuneLogs) {
    const chartElement = document.getElementById('deviceUsageChart');
    if (!chartElement) {
        console.error('deviceUsageChart canvas bulunamadı');
        return;
    }

    const ctx = chartElement.getContext('2d');
    if (!ctx) {
        console.error('2D context alınamadı');
        return;
    }

    // Eğer önceki bir grafik varsa yok et
    if (window.deviceUsageChart) {
        window.deviceUsageChart.destroy();
    }

    const deviceCounts = {
        'Mobil': 0,
        'Masaüstü': 0
    };

    // Cihaz sayılarını hesapla
    fortuneLogs.forEach(log => {
        if (!log) return;
        if (log.deviceInfo && log.deviceInfo.isMobile) {
            deviceCounts['Mobil']++;
        } else {
            deviceCounts['Masaüstü']++;
        }
    });

    // Telefon modeli dağılımını hesapla (en popüler 5 telefon)
    const phoneModelCounts = {};
    fortuneLogs.forEach(log => {
        if (!log || !log.phoneModel) return;
        const phoneModel = log.phoneModel;
        if (phoneModel !== 'Masaüstü Cihaz' && phoneModel !== 'Bilinmiyor') {
            phoneModelCounts[phoneModel] = (phoneModelCounts[phoneModel] || 0) + 1;
        }
    });

    // En popüler 5 telefon modeli
    const topPhoneModels = Object.entries(phoneModelCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});

    // Ana cihaz dağılımı grafiği
    window.deviceUsageChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Mobil', 'Masaüstü'],
            datasets: [{
                data: [deviceCounts['Mobil'], deviceCounts['Masaüstü']],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.7)',
                    'rgba(33, 150, 243, 0.7)'
                ],
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Eğer üst telefon modelleri için detay kısmı eklemek istiyorsanız:
    if (Object.keys(topPhoneModels).length > 0) {
        const container = chartElement.parentElement;
        if (container) {
            const detailDiv = document.createElement('div');
            detailDiv.className = 'phone-models-detail';
            detailDiv.innerHTML = `
                <div class="phone-models-title">En Popüler Telefonlar</div>
                <div class="phone-models-list">
                    ${Object.entries(topPhoneModels).map(([model, count], index) => `
                        <div class="phone-model-item">
                            <span class="phone-model-rank">${index + 1}</span>
                            <span class="phone-model-name">${model}</span>
                            <span class="phone-model-count">${count}</span>
                        </div>
                    `).join('')}
                </div>
            `;

            // Eğer zaten detay varsa kaldır
            const existingDetail = container.querySelector('.phone-models-detail');
            if (existingDetail) {
                container.removeChild(existingDetail);
            }

            container.appendChild(detailDiv);

            // Stil ekle
            const style = document.createElement('style');
            style.textContent = `
                .phone-models-detail {
                    margin-top: 15px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 10px;
                }
                .phone-models-title {
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 8px;
                    text-align: center;
                }
                .phone-models-list {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .phone-model-item {
                    display: flex;
                    align-items: center;
                    font-size: 0.8rem;
                }
                .phone-model-rank {
                    background-color: rgba(76, 175, 80, 0.7);
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 8px;
                    font-size: 0.7rem;
                    font-weight: bold;
                }
                .phone-model-name {
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .phone-model-count {
                    background-color: rgba(0, 0, 0, 0.3);
                    padding: 2px 6px;
                    border-radius: 10px;
                    margin-left: 5px;
                }
            `;

            // Eğer stil yoksa ekle
            const existingStyle = document.getElementById('phone-models-style');
            if (!existingStyle) {
                style.id = 'phone-models-style';
                document.head.appendChild(style);
            }
        }
    }
}

// Kısa tarih formatı (gün/ay)
function formatShortDate(date) {
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

// Saniyeyi dakika:saniye formatına dönüştür
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    } else {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}d ${remainingSeconds}s`;
    }
}

// Gerçek zamanlı istatistikleri güncelle
function updateRealtimeStats(fortuneLogs) {
    try {
        fortuneLogs = fortuneLogs || JSON.parse(localStorage.getItem('fortuneLogs') || '[]');
        const now = new Date();
        const oneHourAgo = new Date(now - (60 * 60 * 1000));
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Son bir saatteki fallar
        const lastHourFortunes = fortuneLogs.filter(log => {
            if (!log || !log.date) return false;
            try {
                const logDate = new Date(log.date);
                return logDate >= oneHourAgo;
            } catch (e) {
                return false;
            }
        }).length;

        // Bugünkü toplam fallar
        const todaysFortunes = fortuneLogs.filter(log => {
            if (!log || !log.date) return false;
            try {
                const logDate = new Date(log.date);
                return logDate >= today;
            } catch (e) {
                return false;
            }
        }).length;

        // Ortalama oturum süresi (son 50 kayıt)
        let totalSessionTime = 0;
        let sessionCount = 0;

        const recentLogs = fortuneLogs.slice(-50);
        recentLogs.forEach(log => {
            if (log && log.sessionDuration && log.sessionDuration > 0) {
                totalSessionTime += log.sessionDuration;
                sessionCount++;
            }
        });

        const avgSessionTime = sessionCount > 0 ? Math.round(totalSessionTime / sessionCount) : 0;

        // Aktif kullanıcı sayısı simülasyonu
        const maxActiveUsers = Math.max(1, Math.floor(lastHourFortunes / 2));
        const activeUsers = Math.floor(Math.random() * maxActiveUsers) + 1;

        // İstatistikleri güncelle - null kontrol
        const elements = {
            'currentActiveUsers': activeUsers,
            'lastHourFortunes': lastHourFortunes,
            'todaysTotalFortunes': todaysFortunes,
            'averageSessionTime': formatTime(avgSessionTime)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                highlightValue(id);
            }
        });
    } catch (error) {
        console.error('Gerçek zamanlı istatistik güncelleme hatası:', error);
    }
}

// Element değerini vurgula
function highlightValue(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.style.color = '#FFC107';

    setTimeout(() => {
        element.style.transition = 'color 1s ease';
        element.style.color = '';
    }, 300);
}

// Tüm grafikleri tek seferde yükleme
function loadAllCharts(fortuneLogs) {
    try {
        // Yükleniyor göstergesini kaldır
        const loadingIndicator = document.querySelector('.charts-loading');
        if (loadingIndicator) loadingIndicator.style.display = 'none';

        // Her grafik için ayrı try-catch bloklarıyla hata yakalama
        try {
            loadDailyActivityChart(fortuneLogs);
        } catch (error) {
            console.error('Günlük aktivite grafiği yüklenirken hata:', error);
            showErrorInChart('dailyActivityChart');
        }

        try {
            loadZodiacDistributionChart(fortuneLogs);
        } catch (error) {
            console.error('Burç dağılımı grafiği yüklenirken hata:', error);
            showErrorInChart('zodiacDistributionChart');
        }

        try {
            loadHourlyActivityChart(fortuneLogs);
        } catch (error) {
            console.error('Saatlik aktivite grafiği yüklenirken hata:', error);
            showErrorInChart('hourlyActivityChart');
        }

        try {
            loadDeviceUsageChart(fortuneLogs);
        } catch (error) {
            console.error('Cihaz kullanımı grafiği yüklenirken hata:', error);
            showErrorInChart('deviceUsageChart');
        }

        // Gerçek zamanlı istatistikler
        updateRealtimeStats(fortuneLogs);
    } catch (error) {
        console.error('Grafikler yüklenirken genel hata:', error);
    }
}
function showInterstitialAd() {
    // Bu fonksiyon reklamları göstermek için kullanılıyordu
    // Şimdi reklam olmadığı için sadece false döndürüyoruz
    console.log("Reklam gösterme fonksiyonu çağrıldı fakat reklamlar devre dışı.");
    return false;
}