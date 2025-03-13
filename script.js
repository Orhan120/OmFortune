// Zodiac sign names in Turkish
const zodiacSigns = ["Koç", "Boğa", "İkizler", "Yengeç", "Aslan", "Başak", "Terazi", "Akrep", "Yay", "Oğlak", "Kova", "Balık"];

// Sayfa geçişleri için animasyon fonksiyonu
function smoothPageTransition(currentPage, nextPage, direction = 'forward') {
  if (!currentPage || !nextPage) return;

  // Geçerli sayfayı gizle
  currentPage.style.opacity = '0';
  currentPage.style.transform = direction === 'forward' ? 'translateY(-20px)' : 'translateY(20px)';

  // Kısa bir gecikme ile geçiş yap
  setTimeout(() => {
    currentPage.classList.remove('visible');
    currentPage.classList.add('hidden');

    // Yeni sayfayı hazırla
    nextPage.style.opacity = '0';
    nextPage.style.transform = direction === 'forward' ? 'translateY(20px)' : 'translateY(-20px)';
    nextPage.classList.remove('hidden');
    nextPage.classList.add('visible');

    // Yeni sayfayı göster
    setTimeout(() => {
      nextPage.style.opacity = '1';
      nextPage.style.transform = 'translateY(0)';

      // Geçiş tamamlandıktan sonra stili temizle
      setTimeout(() => {
        nextPage.style.opacity = '';
        nextPage.style.transform = '';
        currentPage.style.opacity = '';
        currentPage.style.transform = '';
      }, 500);
    }, 50);
  }, 300);
}

// Elementi üzerinde parıltı efekti oluşturan fonksiyon
function addGlowEffect(element, options = {}) {
  if (!element) return;

  const defaults = {
    color: 'rgba(156, 39, 176, 0.5)',
    duration: 2,
    size: 30,
    count: 3
  };

  const settings = {...defaults, ...options};

  for (let i = 0; i < settings.count; i++) {
    const glow = document.createElement('div');
    glow.className = 'element-glow';

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .element-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${settings.size}px;
        height: ${settings.size}px;
        border-radius: 50%;
        background: ${settings.color};
        opacity: 0;
        filter: blur(${settings.size / 4}px);
        animation: elemGlow ${settings.duration}s infinite ease-in-out ${i * (settings.duration / settings.count)}s;
        pointer-events: none;
      }

      @keyframes elemGlow {
        0%, 100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        50% {
          opacity: 0.8;
          transform: translate(-50%, -50%) scale(1.2);
        }
      }
    `;

    document.head.appendChild(styleEl);

    // Element pozisyonuna göre ayarla
    const originalPosition = element.style.position;
    if (originalPosition !== 'absolute' && originalPosition !== 'relative' && originalPosition !== 'fixed') {
      element.style.position = 'relative';
    }

    element.appendChild(glow);
  }

  return {
    remove: () => {
      element.querySelectorAll('.element-glow').forEach(g => g.remove());
    }
  };
}

// Fal sonucunu backend'e gönderen fonksiyon
function saveFortuneToServer(name, zodiac, fortune) {
  // İstemci tarafında doğrulama yap
  if (!name || !zodiac || !fortune) {
    console.error('Fal kaydı için gerekli alanlar eksik');
    return Promise.reject(new Error('Eksik veri'));
  }

  // Veriyi hazırla
  const today = new Date();
  const fortuneData = {
    name: name.trim(),
    zodiac: zodiac,
    fortune: fortune,
    date: today.toISOString().split('T')[0], // YYYY-MM-DD formatında tarih
    timestamp: today.toISOString()
  };

  // Sunucuya gönder
  console.log('Fal sunucuya gönderiliyor:', fortuneData);

  console.log('Gönderilen veri:', JSON.stringify(fortuneData));
  return fetch('/api/add-fortune', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fortuneData)
  })
  .then(response => {
    if (!response.ok) {
      console.error('Server yanıtı:', response.status);
      return response.text().then(text => {
        try {
          const errorData = JSON.parse(text);
          throw new Error('Server yanıtı başarısız: ' + response.status + ' - ' + (errorData.message || errorData.error || text));
        } catch (e) {
          throw new Error('Server yanıtı başarısız: ' + response.status + ' - ' + text);
        }
      });
    }
    return response.json();
  })
  .then(data => {
    console.log('Fal sunucuya kaydedildi:', data);

    // Başarılı kayıt sonrası local storage'a da kaydedelim (yedek olarak)
    try {
      // Son 10 falı saklayalım
      const savedFortunes = JSON.parse(localStorage.getItem('recentFortunes') || '[]');
      savedFortunes.unshift(fortuneData);
      // En fazla 10 kayıt tutalım
      if (savedFortunes.length > 10) {
        savedFortunes.pop();
      }
      localStorage.setItem('recentFortunes', JSON.stringify(savedFortunes));
    } catch (e) {
      console.warn('Local Storage kayıt hatası:', e);
    }

    return data;
  })
  .catch(error => {
    console.error('Fal kaydı hatası:', error);

    // Hata durumunda, daha sonra tekrar denenebilmesi için local storage'a geçici kaydet
    try {
      const pendingFortunes = JSON.parse(localStorage.getItem('pendingFortunes') || '[]');
      pendingFortunes.push(fortuneData);
      localStorage.setItem('pendingFortunes', JSON.stringify(pendingFortunes));
      console.log('Fal geçici olarak kaydedildi, daha sonra tekrar denenecek');
    } catch (e) {
      console.error('Geçici kayıt hatası:', e);
    }

    throw error;
  });
}

// Sunucudan son falları getirir
function getLatestFortunes() {
  return fetch('/api/admin/latest-readings')
    .then(response => {
      if (!response.ok) {
        throw new Error('Son fallar alınamadı: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log('Son fallar alındı:', data);
      return data;
    })
    .catch(error => {
      console.error('Son fallar alınamadı:', error);
      // Hata durumunda local storage'dan alınan verileri döndür
      const savedFortunes = JSON.parse(localStorage.getItem('recentFortunes') || '[]');
      return savedFortunes;
    });
}

// Sunucudan burç dağılımı istatistiklerini getirir
function getZodiacDistribution() {
  return fetch('/api/admin/zodiac-distribution')
    .then(response => {
      if (!response.ok) {
        throw new Error('Burç dağılımı alınamadı: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log('Burç dağılımı alındı:', data);
      return data;
    })
    .catch(error => {
      console.error('Burç dağılımı alınamadı:', error);
      // Hata durumunda boş bir dağılım döndür
      return {
        zodiacSigns: zodiacSigns,
        counts: Array(12).fill(0)
      };
    });
}

// Sayfa yüklendiğinde bekleyen fal kayıtlarını kontrol et ve tekrar göndermeyi dene
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    try {
      const pendingFortunes = JSON.parse(localStorage.getItem('pendingFortunes') || '[]');
      if (pendingFortunes.length > 0) {
        console.log(`${pendingFortunes.length} bekleyen fal kaydı bulundu, gönderiliyor...`);

        // Sırayla göndermeyi dene
        const sendPendingFortune = (index) => {
          if (index >= pendingFortunes.length) {
            localStorage.removeItem('pendingFortunes');
            return;
          }

          const fortune = pendingFortunes[index];
          fetch('/api/add-fortune', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fortune)
          })
          .then(response => {
            if (response.ok) {
              console.log(`Bekleyen fal #${index+1} başarıyla gönderildi`);
              // Bir sonrakini gönder
              sendPendingFortune(index + 1);
            } else {
              console.error(`Bekleyen fal #${index+1} gönderilemedi`);
              // Bekleyen falları güncelle, başarısız olanları tut
              localStorage.setItem('pendingFortunes', JSON.stringify(pendingFortunes.slice(index)));
              throw new Error('Server error');
            }
          })
          .catch(err => {
            console.error('Bekleyen falları gönderme hatası:', err);
          });
        };

        // İlk bekleyen falı göndermeyi başlat
        sendPendingFortune(0);
      }
    } catch (e) {
      console.error('Bekleyen falları işlerken hata:', e);
    }
  }, 3000); // 3 saniye gecikmeyle kontrol et
});

document.addEventListener('DOMContentLoaded', function() {
    // AdminLoginForm işlemleri
    const adminLoginForm = document.getElementById('adminLoginForm');

// Gelişmiş kayan yıldız oluşturma fonksiyonu
function createEnhancedShootingStar(container) {
  const shootingStar = document.createElement('div');
  shootingStar.classList.add('shooting-star');

  // Rastgele pozisyon ve boyut
  const startX = Math.random() * 30;
  const startY = Math.random() * 60;
  const width = Math.random() * 120 + 60;
  const height = Math.random() * 1.5 + 1.5;
  const angle = Math.random() * 20 - 10;

  // Yıldızı yerleştir ve boyutlandır
  shootingStar.style.left = `${startX}%`;
  shootingStar.style.top = `${startY}%`;
  shootingStar.style.width = `${width}px`;
  shootingStar.style.height = `${height}px`;
  shootingStar.style.transform = `rotate(${angle}deg)`;

  // Rastgele renk efekti (mavi veya mor tonları)
  if (Math.random() > 0.7) {
    const hue = Math.floor(Math.random() * 60) + 200;
    shootingStar.style.background = `linear-gradient(to right, 
      rgba(255, 255, 255, 0), 
      hsla(${hue}, 80%, 70%, 0.4), 
      hsla(${hue}, 80%, 80%, 0.8), 
      hsla(${hue}, 80%, 90%, 1))`;

    shootingStar.style.boxShadow = `0 0 15px hsla(${hue}, 80%, 70%, 0.7),
                                    0 0 30px hsla(${hue}, 80%, 70%, 0.3)`;
  }

  // Animasyon süresi ve gecikmesi
  const duration = Math.random() * 2 + 1.5;
  const delay = Math.random() * 5;

  shootingStar.style.animationDuration = `${duration}s`;
  shootingStar.style.animationDelay = `${delay}s`;

  container.appendChild(shootingStar);

  // Animasyon bittiğinde elementi sil
  setTimeout(() => {
    shootingStar.remove();
  }, (duration + delay) * 1000);

  // Yıldız kuyruğu efekti ekle
  setTimeout(() => {
    if (!shootingStar.isConnected) return;

    const starTrail = document.createElement('div');
    starTrail.className = 'star-trail';
    starTrail.style.position = 'absolute';
    starTrail.style.left = `${startX + 5}%`;
    starTrail.style.top = `${startY + 0.5}%`;
    starTrail.style.width = `${width * 0.8}px`;
    starTrail.style.height = `${height * 0.7}px`;
    starTrail.style.transform = `rotate(${angle}deg)`;
    starTrail.style.background = 'linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.2))';
    starTrail.style.borderRadius = '50%';
    starTrail.style.filter = 'blur(3px)';
    starTrail.style.opacity = '0.5';
    starTrail.style.animation = `shooting ${duration * 0.9}s linear forwards ${delay + duration * 0.1}s`;

    container.appendChild(starTrail);

    setTimeout(() => {
      starTrail.remove();
    }, (duration + delay) * 1000);
  }, delay * 1000 + 100);
}

// Yeni gökyüzü animasyonları
function enhanceSkyAnimations() {
  // Gökyüzü renk değişimleri
  const skyColorAnimation = document.createElement('div');
  skyColorAnimation.className = 'sky-color-animation';
  skyColorAnimation.style.position = 'fixed';
  skyColorAnimation.style.top = '0';
  skyColorAnimation.style.left = '0';
  skyColorAnimation.style.width = '100%';
  skyColorAnimation.style.height = '100%';
  skyColorAnimation.style.pointerEvents = 'none';
  skyColorAnimation.style.zIndex = '-2';
  skyColorAnimation.style.opacity = '0.3';
  skyColorAnimation.style.animation = 'skyColorChange 120s infinite';

  document.body.appendChild(skyColorAnimation);

  // Animasyon için stil ekle
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes skyColorChange {
      0%, 100% {
        background: radial-gradient(circle at top right, rgba(83, 51, 237, 0.2), transparent 60%);
      }
      25% {
        background: radial-gradient(circle at top left, rgba(123, 31, 162, 0.2), transparent 60%);
      }
      50% {
        background: radial-gradient(circle at bottom right, rgba(74, 20, 140, 0.2), transparent 60%);
      }
      75% {
        background: radial-gradient(circle at bottom left, rgba(49, 27, 146, 0.2), transparent 60%);
      }
    }

    .star-trail {
      position: absolute;
      pointer-events: none;
      z-index: 0;
    }
  `;

  document.head.appendChild(styleEl);
}

// Fal sonuçları için görsel iyileştirmeler
function enhanceFortuneResults() {
  // Bazı fal sembollerini rastgele arka plana ekle
  const fortuneContainer = document.getElementById('fortuneResult');
  if (!fortuneContainer) return;

  const symbols = ['✧', '☽', '☆', '✦', '⋆', '⊹', '✵', '⁕'];

  for (let i = 0; i < 10; i++) {
    const symbol = document.createElement('span');
    symbol.className = 'fortune-symbol';
    symbol.textContent = symbols[Math.floor(Math.random() * symbols.length)];

    symbol.style.position = 'absolute';
    symbol.style.fontSize = `${Math.random() * 14 + 8}px`;
    symbol.style.opacity = '0.2';
    symbol.style.color = 'rgba(255, 255, 255, 0.5)';
    symbol.style.zIndex = '1';
    symbol.style.userSelect = 'none';
    symbol.style.pointerEvents = 'none';

    // Rastgele pozisyon
    symbol.style.top = `${Math.random() * 100}%`;
    symbol.style.left = `${Math.random() * 100}%`;

    // Animasyon
    symbol.style.animation = `symbol-twinkle ${Math.random() * 3 + 3}s infinite ease-in-out ${Math.random() * 3}s`;

    fortuneContainer.appendChild(symbol);
  }

  // Sembol animasyonu için stil ekle
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes symbol-twinkle {
      0%, 100% {
        opacity: 0.1;
        transform: scale(0.8) rotate(0deg);
      }
      50% {
        opacity: 0.4;
        transform: scale(1.2) rotate(10deg);
      }
    }
  `;

  document.head.appendChild(styleEl);
}


    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const password = document.getElementById('adminPassword').value;

            // Basit şifre kontrolü (gerçek uygulamada daha güvenli bir yöntem kullanılmalıdır)
            if (password === "admin123") {
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminAuthTime', Date.now());
                showNotification('success', 'Başarılı!', 'Giriş yapılıyor...');

                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 1000);
            } else {
                document.querySelector('.login-container').classList.add('shake-animation');
                showNotification('error', 'Hata!', 'Geçersiz şifre girdiniz.');

                setTimeout(() => {
                    document.querySelector('.login-container').classList.remove('shake-animation');
                }, 500);
            }
        });
    }

    // Admin sayfasındaysa ve giriş yapmamışsa, login sayfasına yönlendir
    if (window.location.pathname.includes('admin-dashboard.html')) {
        if (localStorage.getItem('adminLoggedIn') !== 'true') {
            window.location.href = 'admin.html';
        } else {
            // Admin dashboardu yüklenmişse ve giriş yapılmışsa, gerçek verileri çek
            initAdminDashboard(); //Call initAdminDashboard instead of loadAdminDashboardData
        }
    }

    // Ana sayfada popüler burçları ve son falları göster
    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        // Burç dağılımını al ve göster
        getZodiacDistribution()
            .then(data => {
                // En popüler burcun indeksini bul
                const maxIndex = data.counts.indexOf(Math.max(...data.counts));
                if (maxIndex !== -1) {
                    console.log('En popüler burç:', data.zodiacSigns[maxIndex]);
                    // İsterseniz bu bilgiyi ana sayfada gösterebilirsiniz
                }
            })
            .catch(error => {
                console.error('Burç istatistikleri alınamadı:', error);
            });
    }
});

// Reklam gösterimi için yardımcı fonksiyon
function showInterstitialAd() {
    console.log('Yeni fal için reklam gösterimi atlandı - reklam işlevselliği devre dışı.');
    // Burada ileride reklam gösterimi ekleyebilirsiniz
}

// Admin dashboard verilerini yükle
function loadAdminDashboardData() {
    console.log('Admin paneli verileri yükleniyor...');

    // Admin panelinde olduğumuzu kontrol et
    const isAdminDashboard = window.location.pathname.includes('admin-dashboard.html');
    if (!isAdminDashboard) {
        console.log('Admin dashboard sayfasında değiliz, veri yükleme işlemi atlanıyor.');
        return;
    }

    // Admin giriş durumunu kontrol et
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
        console.log('Admin girişi yapılmamış, login sayfasına yönlendiriliyor...');
        window.location.href = 'admin.html';
        return;
    }

    // API durumunu kontrol et ve görsel olarak göster
    const apiStatusEl = document.getElementById('apiStatus');
    if (apiStatusEl) {
        apiStatusEl.className = 'status-indicator status-pending';
        const apiStatusTextEl = document.getElementById('apiStatusText');
        if (apiStatusTextEl) apiStatusTextEl.textContent = 'Kontrol ediliyor...';
    }

    // Timeout promise oluştur - daha uzun timeout süresi
    const createTimeoutPromise = () => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API yanıt zaman aşımı')), 8000);
    });

    // Yükleniyor göstergelerini göster
    const loaders = ['userStatsLoader', 'readingsStatsLoader', 'todayStatsLoader', 'zodiacStatsLoader', 
                    'zodiacChartLoader', 'activityChartLoader', 'readingsTableLoader'];
    loaders.forEach(id => {
        const loader = document.getElementById(id);
        if (loader) loader.style.display = 'flex';
    });

    // API durumunu kontrol et
    checkApiStatus()
        .then(isOnline => {
            if (isOnline) {
                console.log('API çevrimiçi, gerçek veriler yükleniyor...');
                loadRealData();
            } else {
                console.log('API çevrimdışı, demo veriler yükleniyor...');
                loadDemoData();
            }
        });

    // API durumunu kontrol eden fonksiyon
    function checkApiStatus() {
        return fetch('/api/status')
            .then(response => {
                const isOnline = response.ok;
                updateApiStatusIndicator(isOnline);
                return isOnline;
            })
            .catch(error => {
                console.error('API durumu kontrol hatası:', error);
                updateApiStatusIndicator(false);
                return false;
            });
    }

    // API durum göstergesini güncelle
    function updateApiStatusIndicator(isOnline) {
        const apiStatusEl = document.getElementById('apiStatus');
        const apiStatusTextEl = document.getElementById('apiStatusText');

        if (apiStatusEl) {
            apiStatusEl.className = `status-indicator status-${isOnline ? 'online' : 'offline'}`;
        }

        if (apiStatusTextEl) {
            apiStatusTextEl.textContent = isOnline ? 'Çevrimiçi' : 'Çevrimdışı';
        }
    }

    // Gerçek verileri yükle
    function loadRealData() {
        // Tüm API isteklerini bir arada yap
        Promise.allSettled([
            // Admin istatistikleri
            Promise.race([
                fetch('/api/admin/stats'),
                createTimeoutPromise()
            ])
                .then(response => {
                    if (!response.ok) throw new Error('İstatistikler alınamadı: ' + response.status);
                    return response.json();
                }),

            // Son fallar
            Promise.race([
                fetch('/api/admin/latest-readings'),
                createTimeoutPromise()
            ])
                .then(response => {
                    if (!response.ok) throw new Error('Son fallar alınamadı: ' + response.status);
                    return response.json();
                }),

            // Burç dağılımı
            Promise.race([
                fetch('/api/admin/zodiac-distribution'),
                createTimeoutPromise()
            ])
                .then(response => {
                    if (!response.ok) throw new Error('Burç dağılımı alınamadı: ' + response.status);
                    return response.json();
                }),

            // Aktivite verileri
            Promise.race([
                fetch('/api/admin/activity-data'),
                createTimeoutPromise()
            ])
                .then(response => {
                    if (!response.ok) throw new Error('Aktivite verileri alınamadı: ' + response.status);
                    return response.json();
                })
        ])
        .then(results => {
            console.log('Tüm API istekleri tamamlandı:', results);

            // Her bir sonucu işle
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    switch (index) {
                        case 0: // İstatistikler
                            if (window.updateStatsCards && typeof window.updateStatsCards === 'function') {
                                window.updateStatsCards(result.value);
                            }
                            document.getElementById('userStatsLoader').style.display = 'none';
                            document.getElementById('readingsStatsLoader').style.display = 'none';
                            document.getElementById('todayStatsLoader').style.display = 'none';
                            document.getElementById('zodiacStatsLoader').style.display = 'none';
                            break;
                        case 1: // Son fallar
                            if (window.updateReadingsTable && typeof window.updateReadingsTable === 'function') {
                                window.updateReadingsTable(result.value);
                            }
                            document.getElementById('readingsTableLoader').style.display = 'none';
                            break;
                        case 2: // Burç dağılımı
                            if (window.updateZodiacChart && typeof window.updateZodiacChart === 'function') {
                                window.updateZodiacChart(result.value);
                            }
                            document.getElementById('zodiacChartLoader').style.display = 'none';
                            break;
                        case 3: // Aktivite verileri
                            if (window.updateActivityChart && typeof window.updateActivityChart === 'function') {
                                window.updateActivityChart(result.value);
                            }
                            document.getElementById('activityChartLoader').style.display = 'none';
                            break;
                    }
                } else {
                    console.error(`API isteği ${index} başarısız:`, result.reason);
                    // Hata durumunu işle ve ilgili yükleme spinnerını gizle
                    switch (index) {
                        case 0: // İstatistikler
                            if (window.updateStatsCards && typeof window.updateStatsCards === 'function') {
                                window.updateStatsCards(getDemoStats());
                            }
                            document.getElementById('userStatsLoader').style.display = 'none';
                            document.getElementById('readingsStatsLoader').style.display = 'none';
                            document.getElementById('todayStatsLoader').style.display = 'none';
                            document.getElementById('zodiacStatsLoader').style.display = 'none';
                            break;
                        case 1: // Son fallar
                            if (window.updateReadingsTable && typeof window.updateReadingsTable === 'function') {
                                window.updateReadingsTable(getDemoReadings());
                            }
                            document.getElementById('readingsTableLoader').style.display = 'none';
                            break;
                        case 2: // Burç dağılımı
                            if (window.updateZodiacChart && typeof window.updateZodiacChart === 'function') {
                                window.updateZodiacChart(getDemoZodiacDistribution());
                            }
                            document.getElementById('zodiacChartLoader').style.display = 'none';
                            break;
                        case 3: // Aktivite verileri
                            if (window.updateActivityChart && typeof window.updateActivityChart === 'function') {
                                window.updateActivityChart(getDemoActivityData());
                            }
                            document.getElementById('activityChartLoader').style.display = 'none';
                            break;
                    }
                }
            });

            // Son yenileme zamanını güncelle
            updateLastRefreshTime();
        });
    }

    // Demo verileri yükle
    function loadDemoData() {
        // Demo veri fonksiyonları
        function getDemoStats() {
            return {
                totalUsers: 120,
                totalReadings: 358,
                todayReadings: 42,
                mostPopularZodiac: 'Aslan',
                userGrowth: 8,
                readingGrowth: 12,
                todayGrowth: 5,
                zodiacGrowth: 15,
                lastUpdated: new Date().toISOString()
            };
        }

        function getDemoReadings() {
            return [
                { username: 'Ahmet Yılmaz', zodiac: 'Koç', reading: 'Önünüzdeki engelleri aşmanın yolu cesaret ve sabırdan geçiyor.', date: '2025-03-12 14:24:38' },
                { username: 'Ayşe Demir', zodiac: 'Boğa', reading: 'Finansal açıdan yükselişe geçeceğiniz bir dönem başlıyor.', date: '2025-03-12 13:42:23' },
                { username: 'Mehmet Kaya', zodiac: 'İkizler', reading: 'İletişim konusunda kendinizi geliştirecek yeni fırsatlara açık olun.', date: '2025-03-12 11:15:39' },
                { username: 'Zeynep Şahin', zodiac: 'Yengeç', reading: 'Duygusal dengenizi koruyun, ailenize zaman ayırmanız gerekiyor.', date: '2025-03-12 10:07:12' },
                { username: 'Ali Özkan', zodiac: 'Aslan', reading: 'Liderlik vasıflarınızı kullanma zamanı, kendinize güvenin.', date: '2025-03-11 17:34:19' }
            ];
        }

        function getDemoZodiacDistribution() {
            return {
                zodiacSigns: ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'],
                counts: [42, 38, 25, 31, 48, 22, 19, 36, 29, 27, 18, 23]
            };
        }

        function getDemoActivityData() {
            const labels = [];
            const values = [];

            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
                values.push(Math.floor(Math.random() * 40) + 10);
            }

            return { labels, values };
        }

        // Demo verileri güncelle
        if (window.updateStatsCards && typeof window.updateStatsCards === 'function') {
            window.updateStatsCards(getDemoStats());
        }
        if (window.updateReadingsTable && typeof window.updateReadingsTable === 'function') {
            window.updateReadingsTable(getDemoReadings());
        }
        if (window.updateZodiacChart && typeof window.updateZodiacChart === 'function') {
            window.updateZodiacChart(getDemoZodiacDistribution());
        }
        if (window.updateActivityChart && typeof window.updateActivityChart === 'function') {
            window.updateActivityChart(getDemoActivityData());
        }

        // Yükleniyor göstergelerini gizle
        loaders.forEach(id => {
            const loader = document.getElementById(id);
            if (loader) loader.style.display = 'none';
        });

        // Bildirim göster
        if (window.showNotification && typeof window.showNotification === 'function') {
            window.showNotification('info', 'Demo Veriler', 'API erişilemediği için demo veriler görüntüleniyor.');
        }

        // Son yenileme zamanını güncelle
        updateLastRefreshTime();
    }

    // Son yenileme zamanını güncelle
    function updateLastRefreshTime() {
        const lastRefreshTimeEl = document.getElementById('lastRefreshTime');
        if (lastRefreshTimeEl) {
            const now = new Date();
            lastRefreshTimeEl.textContent = now.toLocaleTimeString();
        }
    }
}

// Admin istatistiklerini göster
function displayAdminStats(stats) {
    // Bu fonksiyonu admin-dashboard.html sayfasına göre özelleştirin
    const elements = {
        totalUsers: document.getElementById('totalUsers'),
        totalReadings: document.getElementById('totalReadings'),
        todayReadings: document.getElementById('todayReadings'),
        mostPopularZodiac: document.getElementById('mostPopularZodiac'),
        userGrowth: document.getElementById('userGrowth'),
        readingGrowth: document.getElementById('readingGrowth'),
        todayGrowth: document.getElementById('todayGrowth'),
        lastUpdated: document.getElementById('lastUpdated')
    };

    // Elementler varsa değerleri güncelle
    if (elements.totalUsers) elements.totalUsers.textContent = stats.totalUsers || 0;
    if (elements.totalReadings) elements.totalReadings.textContent = stats.totalReadings || 0;0;
    if (elements.todayReadings) elements.todayReadings.textContent = stats.todayReadings || 0;
    if (elements.mostPopularZodiac) elements.mostPopularZodiac.textContent = stats.mostPopularZodiac || 'Belirtilmemiş';

    // Büyüme oranlarını göster
    if (elements.userGrowth) {
        const userGrowthValue = stats.userGrowth || 0;
        elements.userGrowth.textContent = `${userGrowthValue}%`;
        elements.userGrowth.className = userGrowthValue >= 0 ? 'positive-growth' : 'negative-growth';
    }

    if (elements.readingGrowth) {
        const readingGrowthValue = stats.readingGrowth || 0;
        elements.readingGrowth.textContent = `${readingGrowthValue}%`;
        elements.readingGrowth.className = readingGrowthValue >= 0 ? 'positive-growth' : 'negative-growth';
    }

    if (elements.todayGrowth) {
        const todayGrowthValue = stats.todayGrowth || 0;
        elements.todayGrowth.textContent = `${todayGrowthValue}%`;
        elements.todayGrowth.className = todayGrowthValue >= 0 ? 'positive-growth' : 'negative-growth';
    }

    // Son güncelleme zamanını göster
    if (elements.lastUpdated && stats.lastUpdated) {
        const lastUpdatedDate = new Date(stats.lastUpdated);
        elements.lastUpdated.textContent = `Son Güncelleme: ${lastUpdatedDate.toLocaleString('tr-TR')}`;
    }
}

// Son falları göster
function displayLatestFortunes(fortunes) {
    const fortunesList = document.getElementById('latestFortunesList');
    if (!fortunesList) return;

    fortunesList.innerHTML = '';

    if (fortunes.length === 0) {
        fortunesList.innerHTML = '<tr><td colspan="4" class="text-center">Henüz kaydedilmiş fal bulunmamaktadır.</td></tr>';
        return;
    }

    fortunes.forEach(fortune => {
        const row = document.createElement('tr');

        // Kullanıcı adı
        const nameCell = document.createElement('td');
        nameCell.textContent = fortune.username;
        row.appendChild(nameCell);

        // Burç
        const zodiacCell = document.createElement('td');
        zodiacCell.textContent = fortune.zodiac;
        row.appendChild(zodiacCell);

        // Fal özeti
        const readingCell = document.createElement('td');
        // Fal metninin ilk 30 karakterini göster
        readingCell.textContent = fortune.reading.length > 30 ? 
            fortune.reading.substring(0, 30) + '...' : 
            fortune.reading;

        // Tam metni tooltip olarak göster
        readingCell.title = fortune.reading;
        row.appendChild(readingCell);

        // Tarih
        const dateCell = document.createElement('td');
        dateCell.textContent = fortune.date;
        row.appendChild(dateCell);

        fortunesList.appendChild(row);
    });
}

// Burç dağılımını göster
function displayZodiacDistribution(data) {
    console.log('Burç dağılımı görüntüleniyor:', data);

    const chartContainer = document.getElementById('zodiacChartContainer');
    if (chartContainer) {
        chartContainer.classList.remove('loading');
    }

    const ctx = document.getElementById('zodiacChart');
    if (!ctx) return;

    // Loading spinner'ı kaldır
    const loadingSpinner = document.querySelector('#zodiacChartContainer .loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }

    // Verinin doğru formatta olup olmadığını kontrol et
    const labels = data.zodiacSigns || data.labels || ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'];
    const chartData = data.counts || data.data || Array(12).fill(0);

    // Chart.js kullanarak dağılımı göster
    if (window.zodiacChart) {
        window.zodiacChart.destroy();
    }

    window.zodiacChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Burç Dağılımı',
                data: chartData,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(199, 199, 199, 0.7)',
                    'rgba(83, 102, 255, 0.7)',
                    'rgba(40, 159, 64, 0.7)',
                    'rgba(210, 102, 255, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)'
                ],
                borderColor: [
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 206, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(153, 102, 255)',
                    'rgb(255, 159, 64)',
                    'rgb(199, 199, 199)',
                    'rgb(83, 102, 255)',
                    'rgb(40, 159, 64)',
                    'rgb(210, 102, 255)',
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Bildirim göster
function showNotification(type, title, message) {
    // Bu fonksiyon kullanıcıya bildirim gösterecek şekilde implemente edilebilir
    // Örnek: Bootstrap toast, custom alert, vb.
    console.log(`[${type}] ${title}: ${message}`);

    // Basit bir alert
    if (type === 'error') {
        alert(`${title}\n${message}`);
    }
}

// ... (rest of the fortune telling code, assuming it includes nameInput, selectedZodiac, fortune, resultContainer, and backButton variables) ...

// Ana sayfadaki fal gönderim fonksiyonu
function submitFortune(nameInput, selectedZodiac, fortune) {
  if (!nameInput || !selectedZodiac || !fortune) {
    console.error("Fal göndermek için gerekli veriler eksik");
    return;
  }

  console.log("Fal gönderiliyor:", fortune);

  // Falı sunucuya kaydet
  saveFortuneToServer(nameInput, selectedZodiac, fortune)
    .then(response => {
      console.log("Fal kaydedildi:", response);

      // Sonucu göster
      const resultContainer = document.querySelector('.result-container');
      if (resultContainer) {
        resultContainer.classList.add('result-visible');
      }

      // Geri dönüş butonunu göster
      const backButton = document.querySelector('.back-button');
      if (backButton) {
        setTimeout(() => {
          backButton.style.display = 'block';
          backButton.classList.add('fade-in');
        }, 1000);
      }
    })
    .catch(error => {
      console.error("Fal kaydedilemedi:", error);      alert("Fal kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.");
    });
}

// Admin dashboard fonksiyonları
function initAdminDashboard() {
    console.log("Admin paneli yükleniyor...");

    // API durum elementini kontrol et
    const apiStatusElement = document.getElementById('apiStatus');

    if (apiStatusElement) {
        apiStatusElement.textContent = 'Kontrol ediliyor...';
        apiStatusElement.className = 'status-badge pending';
    }

    // Önce API durumunu kontrol et, sonra verileri yükle
    fetch('/api/status')
        .then(response => {
            if (response.ok) {
                if (apiStatusElement) {
                    apiStatusElement.textContent = 'Çevrimiçi';
                    apiStatusElement.className = 'status-badge online';
                }
                loadRealData();

                // 60 saniyede bir yenile
                setInterval(loadRealData, 60000);
            } else {
                if (apiStatusElement) {
                    apiStatusElement.textContent = 'Çevrimdışı';
                    apiStatusElement.className = 'status-badge offline';
                }
                loadDemoData();
                console.warn('API yanıt verdi ancak hata döndü, demo veriler yükleniyor');
            }
        })
        .catch(error => {
            console.error('API erişimi yok:', error);
            if (apiStatusElement) {
                apiStatusElement.textContent = 'Çevrimdışı';
                apiStatusElement.className = 'status-badge offline';
            }
            loadDemoData();
            console.warn('API erişimi yok, demo veriler yükleniyor');
        });
}

// API durumunu kontrol et
function checkApiStatus() {
    console.log("API durumu kontrol ediliyor...");
    fetch('/api/status')
        .then(response => {
            if (response.ok) {
                document.getElementById('apiStatus').textContent = 'Çevrimiçi';
                document.getElementById('apiStatus').className = 'status-badge online';
                loadRealData();
            } else {
                console.log('API yanıt verdi ancak hata döndü:', response.status);
                document.getElementById('apiStatus').textContent = 'Çevrimdışı';
                document.getElementById('apiStatus').className = 'status-badge offline';
                loadDemoData();
            }
        })
        .catch(error => {
            console.log('API erişimi yok:', error);
            document.getElementById('apiStatus').textContent = 'Çevrimdışı';
            document.getElementById('apiStatus').className = 'status-badge offline';
            loadDemoData();
        });
}

// Gerçek verileri API'den yükle
function loadRealData() {
    console.log('Gerçek verileri yüklemeye başlıyorum...');

    // Yükleniyor durumunu göster
    document.querySelectorAll('.loading-spinner').forEach(spinner => {
        spinner.style.display = 'block';
    });

    document.querySelectorAll('.stat-card, .chart-container, .readings-table').forEach(element => {
        if (element) element.classList.add('loading');
    });

    // Tüm API isteklerini Promise.all ile yap
    Promise.all([
        // Son falları getir
        fetch('/api/admin/latest-readings')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP hata! Durum: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('Son fallar alınamadı:', error);
                throw error; // Hatayı yukarı taşı
            }),

        // İstatistikleri getir
        fetch('/api/admin/stats')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP hata! Durum: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('İstatistikler alınamadı:', error);
                throw error; // Hatayı yukarı taşı
            }),

        // Burç dağılımını getir
        fetch('/api/admin/zodiac-distribution')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP hata! Durum: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('Burç dağılımı alınamadı:', error);
                throw error; // Hatayı yukarı taşı
            })
    ])
    .then(([fortunes, stats, distribution]) => {
        console.log('Tüm veriler başarıyla alındı');

        // Verileri göster
        displayLatestFortunes(fortunes);
        displayStats(stats);
        displayZodiacDistribution(distribution);

        // Yükleniyor durumunu kaldır
        document.querySelectorAll('.loading-spinner').forEach(spinner => {
            spinner.style.display = 'none';
        });

        document.querySelectorAll('.stat-card, .chart-container, .readings-table').forEach(element => {
            if (element) element.classList.remove('loading');
        });

        // API durumunu güncelle
        const apiStatusElement = document.getElementById('apiStatus');
        if (apiStatusElement) {
            apiStatusElement.textContent = 'Çevrimiçi';
            apiStatusElement.className = 'status-badge online';
        }
    })
    .catch(error => {
        console.error('Veri yükleme hatası:', error);

        // Demo verileri yükle
        loadDemoData();

        // API durumunu güncelle
        const apiStatusElement = document.getElementById('apiStatus');
        if (apiStatusElement) {
            apiStatusElement.textContent = 'Çevrimdışı';
            apiStatusElement.className = 'status-badge offline';
        }
    });
}

// Demo verileri yükle
function loadDemoData() {
    console.log("Demo veriler yükleniyor...");

    // İstatistikler için demo veri
    const demoStats = {
        totalUsers: 120,
        totalFortunes: 358,
        todayFortunes: 42,
        popularZodiac: 'Aslan',
        lastUpdated: new Date().toISOString()
    };

    displayStats(demoStats);

    // Son fallar için demo veri
    const demoFortunes = [
        { username: 'Ahmet Yılmaz', zodiac: 'Koç', reading: 'Önünüzdeki engelleri aşmanın yolu cesaret ve sabırdan geçiyor.', date: '2025-03-12 05:24:38' },
        { username: 'Ayşe Demir', zodiac: 'Boğa', reading: 'Finansal açıdan yükselişe geçeceğiniz bir dönem başlıyor.', date: '2025-03-12 05:24:38' },
        { username: 'Mehmet Kaya', zodiac: 'İkizler', reading: 'İletişim konusunda kendinizi geliştirecek yeni fırsatlara açık olun.', date: '2025-03-12 05:24:39' },
        { username: 'Zeynep Şahin', zodiac: 'Yengeç', reading: 'Duygusal dengenizi koruyun, ailenize zaman ayırmanız gerekiyor.', date: '2025-03-12 05:24:39' },
        { username: 'Ali Özkan', zodiac: 'Aslan', reading: 'Liderlik vasıflarınızı kullanma zamanı, kendinize güvenin.', date: '2025-03-12 05:24:39' },
        { username: 'Fatma Yıldız', zodiac: 'Başak', reading: 'Detaylara özen gösterin, bu dönemde titizliğiniz ödüllendirilecek.', date: '2025-03-12 05:24:39' },
        { username: 'Mustafa Şen', zodiac: 'Terazi', reading: 'Dengeyi sağlamanın önemi bu dönemde artacak, ilişkilerinizde adaletli olun.', date: '2025-03-12 05:24:39' },
        { username: 'Sema Ünal', zodiac: 'Akrep', reading: 'İçgüdüleriniz size doğru yolu gösterecek, onları dinleyin.', date: '2025-03-12 05:24:39' },
        { username: 'Emre Yıldız', zodiac: 'Yay', reading: 'Uzak yerlerden güzel haberler alacak, yeni maceralara atılacaksınız.', date: '2025-03-12 05:24:39' },
        { username: 'Gülşen Toprak', zodiac: 'Oğlak', reading: 'Disiplininiz ve çalışkanlığınız sonuç verecek, hedeflerinize ulaşacaksınız.', date: '2025-03-12 05:24:39' }
    ];

    displayLatestFortunes(demoFortunes);

    // Burç dağılımı için demo veri
    const demoZodiacData = {
        labels: ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'],
        data: [42, 38, 25, 31, 48, 22, 19, 36, 29, 27, 18, 23]
    };

    displayZodiacDistribution(demoZodiacData);
}

// İstatistikleri yükle
function loadStats() {
    console.log("İstatistikler yükleniyor...");
    fetch('/api/admin/stats')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP hata! Durum: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayStats(data);
        })
        .catch(error => {
            console.log('İstatistik yükleme hatası:', error);
            // Hata durumunda demo verileri göster
            const demoStats = {
                totalUsers: 120,
                totalFortunes: 358,
                todayFortunes: 42,
                popularZodiac: 'Aslan',
                lastUpdated: new Date().toISOString()
            };
            displayStats(demoStats);
        });
}

// Son falları yükle
function loadLatestFortunes() {
    console.log("Son fallar yükleniyor...");
    fetch('/api/admin/latest-fortunes')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP hata! Durum: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayLatestFortunes(data);
        })
        .catch(error => {
            console.log('Son fallar yükleme hatası:', error);
            // Hata durumunda demo verileri göster
            const demoFortunes = [
                { username: 'Ahmet Yılmaz', zodiac: 'Koç', reading: 'Önünüzdeki engelleri aşmanın yolu cesaret ve sabırdan geçiyor.', date: '2025-03-12 05:24:38' },
                { username: 'Ayşe Demir', zodiac: 'Boğa', reading: 'Finansal açıdan yükselişe geçeceğiniz bir dönem başlıyor.', date: '2025-03-12 05:24:38' },
                { username: 'Mehmet Kaya', zodiac: 'İkizler', reading: 'İletişim konusunda kendinizi geliştirecek yeni fırsatlara açık olun.', date: '2025-03-12 05:24:39' },
                { username: 'Zeynep Şahin', zodiac: 'Yengeç', reading: 'Duygusal dengenizi koruyun, ailenize zaman ayırmanız gerekiyor.', date: '2025-03-12 05:24:39' },
                { username: 'Ali Özkan', zodiac: 'Aslan', reading: 'Liderlik vasıflarınızı kullanma zamanı, kendinize güvenin.', date: '2025-03-12 05:24:39' }
            ];
            displayLatestFortunes(demoFortunes);
        });
}

// Burç dağılımını yükle
function loadZodiacDistribution() {
    console.log("Burç dağılımı yükleniyor...");
    fetch('/api/admin/zodiac-distribution')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP hata! Durum: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayZodiacDistribution(data);
        })
        .catch(error => {
            console.log('Burç dağılımı yükleme hatası:', error);
            // Hata durumunda demo verileri göster
            const demoZodiacData = {
                labels: ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'],
                data: [42, 38, 25, 31, 48, 22, 19, 36, 29, 27, 18, 23]
            };
            displayZodiacDistribution(demoZodiacData);
        });
}

// Admin panelindeki eventleri ayarlar
function setupAdminEvents() {
    // ... (Event listener'ları buraya ekleyin) ...
}


// İstatistikleri göster
function displayStats(stats) {
    console.log('İstatistikler görüntüleniyor:', stats);

    // Loading spinner'ları kaldır
    document.querySelectorAll('.loading-spinner').forEach(spinner => {
        spinner.style.display = 'none';
    });

    // Elementlere eriş
    const elements = {
        totalUsers: document.getElementById('totalUsers'),
        totalReadings: document.getElementById('totalReadings'),
        todayReadings: document.getElementById('todayReadings'),
        mostPopularZodiac: document.getElementById('mostPopularZodiac'),
        userGrowth: document.getElementById('userGrowth'),
        readingGrowth: document.getElementById('readingGrowth'),
        todayGrowth: document.getElementById('todayGrowth'),
        lastUpdated: document.getElementById('lastUpdated')
    };

    // Elementler varsa değerleri güncelle
    if (elements.totalUsers) elements.totalUsers.textContent = stats.totalUsers || 0;
    if (elements.totalReadings) elements.totalReadings.textContent = stats.totalReadings || stats.totalFortunes || 0;
    if (elements.todayReadings) elements.todayReadings.textContent = stats.todayReadings || stats.todayFortunes || 0;
    if (elements.mostPopularZodiac) elements.mostPopularZodiac.textContent = stats.mostPopularZodiac || stats.popularZodiac || 'Belirtilmemiş';

    // Büyüme oranlarını göster
    if (elements.userGrowth) {
        const userGrowthValue = stats.userGrowth || 0;
        elements.userGrowth.textContent = `${userGrowthValue}%`;
        elements.userGrowth.className = userGrowthValue >= 0 ? 'positive-growth' : 'negative-growth';
    }

    if (elements.readingGrowth) {
        const readingGrowthValue = stats.readingGrowth || 0;
        elements.readingGrowth.textContent = `${readingGrowthValue}%`;
        elements.readingGrowth.className = readingGrowthValue >= 0 ? 'positive-growth' : 'negative-growth';
    }

    if (elements.todayGrowth) {
        const todayGrowthValue = stats.todayGrowth || 0;
        elements.todayGrowth.textContent = `${todayGrowthValue}%`;
        elements.todayGrowth.className = todayGrowthValue >= 0 ? 'positive-growth' : 'negative-growth';
    }

    // Son güncelleme zamanını göster
    if (elements.lastUpdated && stats.lastUpdated) {
        const lastUpdatedDate = new Date(stats.lastUpdated);
        elements.lastUpdated.textContent = `Son Güncelleme: ${lastUpdatedDate.toLocaleString('tr-TR')}`;
    }

    // İstatistik kartlarını görünür yap
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('loading');
    });
}
function startFingerprint(e) {
                if (music && !music.paused) {
                    music.volume = 0.1;
                }

                if (e.type === 'touchstart') {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                } else {
                    startX = e.clientX;
                    startY = e.clientY;
                }

                if (e.type === 'touchstart') e.preventDefault();
                isFingerprintActive = true;

                // Add processing class for animation
                fingerprintButton.classList.add('processing');

                const fingerprintLoader = document.getElementById('fingerprintLoader');
                if (fingerprintLoader) {
                    fingerprintLoader.style.display = 'block';
                }

                const scanLine = document.getElementById('scanLine');
                if (scanLine) {
                    scanLine.style.display = 'block';
                }

                // Add enhanced biometric sound effect
                const scanSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-notification-221.mp3');
                scanSound.volume = 0.2;
                try {
                    scanSound.play().catch(e => console.log("Sound playing error:", e));
                } catch(e) {
                    console.log("Sound error:", e);
                }

                // Create progress bar
                const progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                fingerprintButton.appendChild(progressBar);

                // Add scanner line animations
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        const scannerLine = document.createElement('div');
                        scannerLine.className = 'scanner-line';
                        scannerLine.style.top = `${20 + (i * 20)}%`;
                        scannerLine.style.animationDuration = `${1 + (i * 0.3)}s`;
                        scannerLine.style.opacity = '0.8';
                        fingerprintButton.appendChild(scannerLine);
                    }, i * 300);
                }

                // Add wave ripple effects
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        const ripple = document.createElement('div');
                        ripple.className = 'wave-ripple';
                        fingerprintButton.appendChild(ripple);
                    }, i * 600);
                }

                // Add DNA pattern effect
                const dnaPattern = document.createElement('div');
                dnaPattern.className = 'dna-pattern';
                fingerprintButton.appendChild(dnaPattern);

                // Add holographic overlay
                const holoEffect = document.createElement('div');
                holoEffect.className = 'holo-effect';
                fingerprintButton.appendChild(holoEffect);

                if (fingerprintIcon) {
                    fingerprintIcon.style.opacity = '0.7';
                }

                // Advanced pulse animation
                let pulseCount = 0;
                const pulseAnimation = setInterval(() => {
                    if (!isFingerprintActive) {
                        clearInterval(pulseAnimation);
                        return;
                    }

                    // Update icon animation
                    if (fingerprintIcon) {
                        const pulseValue = 1.2 + Math.sin(pulseCount * 0.2) * 0.2;
                        const hueShift = Math.sin(pulseCount * 0.1) * 10;
                        fingerprintIcon.style.filter = `brightness(${pulseValue}) hue-rotate(${hueShift}deg)`;
                        fingerprintIcon.style.transform = `scale(${0.95 + Math.sin(pulseCount * 0.2) * 0.05})`;
                    }

                    // Update progress bar
                    if (progressBar) {
                        const progress = Math.min(100, (pulseCount / 30) * 100);
                        progressBar.style.width = `${progress}%`;
                    }

                    // Create occasional particles
                    if (pulseCount % 5 === 0) {
                        createScanParticle(fingerprintButton);
                    }

                    pulseCount++;
                }, 50);

                // Create scan particles effect
                createScanParticles(fingerprintButton);

                // Create orbiting particles
                createOrbitingParticles(fingerprintButton);

                fingerprintTimer = setTimeout(function() {
                    clearInterval(pulseAnimation);
                    resetFingerprint();
                }, 3000);
            }

            // Create a single scan particle
            function createScanParticle(container) {
                const particle = document.createElement('div');
                particle.className = 'scan-particle';

                // Random size and position
                const size = Math.random() * 4 + 2;
                const posX = Math.random() * 80 + 10; // 10-90%
                const posY = Math.random() * 80 + 10; // 10-90%

                // Random color
                const hue = Math.random() > 0.5 ? 
                    Math.floor(Math.random() * 40 + 240) : // blue range
                    Math.floor(Math.random() * 60 + 280);  // purple range

                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.left = `${posX}%`;
                particle.style.top = `${posY}%`;
                particle.style.background = `hsla(${hue}, 80%, 70%, 0.8)`;
                particle.style.boxShadow = `0 0 ${size * 2}px hsla(${hue}, 80%, 60%, 0.6)`;

                container.appendChild(particle);

                // Remove after animation
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 1500);
            }

            // Create scanning particles for tech effect
            function createScanParticles(container) {
                if (!container) return;

                const particleCount = 30; // Increased particle count

                for (let i = 0; i < particleCount; i++) {
                    setTimeout(() => {
                        // Check if fingerprint process is still active
                        if (!isFingerprintActive) return;

                        const particle = document.createElement('div');
                        particle.className = 'scan-particle';

                        // Random position and properties
                        const size = Math.random() * 5 + 2;
                        const startX = Math.random() * 80 + 10;
                        const startY = Math.random() * 80 + 10;
                        const angle = Math.random() * 360;
                        const duration = Math.random() * 1.5 + 0.5;

                        // Random color values for more vibrant particles
                        const hue = Math.floor(Math.random() * 60) + 220; // Blue to purple range
                        const saturation = Math.floor(Math.random() * 40) + 60; // 60-100%
                        const lightness = Math.floor(Math.random() * 30) + 60; // 60-90%

                        particle.style.width = `${size}px`;
                        particle.style.height = `${size}px`;
                        particle.style.left = `${startX}%`;
                        particle.style.top = `${startY}%`;
                        particle.style.animationDuration = `${duration}s`;
                        particle.style.transform = `rotate(${angle}deg)`;
                        particle.style.background = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`;
                        particle.style.boxShadow = `0 0 ${size}px hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;

                        container.appendChild(particle);

                        // Remove particle after animation
                        setTimeout(() => {
                            if (particle.parentNode) {
                                particle.parentNode.removeChild(particle);
                            }
                        }, duration * 1000);
                    }, i * 50); // Reduced delay between particles
                }
            }

            // Create enhanced orbiting particles with data visualization style
            function createOrbitingParticles(container) {
                if (!container) return;

                const orbitCount = 3; // Three distinct orbits

                // Different particle configs for each orbit
                const orbitConfigs = [
                    { 
                        radius: 30, 
                        particleCount: 6, 
                        speed: 12, 
                        particleSize: 3.5, 
                        hueRange: [260, 290],
                        delay: 0
                    },
                    { 
                        radius: 40, 
                        particleCount: 8, 
                        speed: 18, 
                        particleSize: 2.5, 
                        hueRange: [220, 260],
                        delay: 0.5
                    },
                    { 
                        radius: 48, 
                        particleCount: 12, 
                        speed: 24, 
                        particleSize: 2, 
                        hueRange: [180, 220],
                        delay: 1
                    }
                ];

                // Create each orbit
                for (let orbitIndex = 0; orbitIndex < orbitCount; orbitIndex++) {
                    const config = orbitConfigs[orbitIndex];
                    const direction = orbitIndex % 2 === 0 ? 1 : -1; // Alternate directions

                    // Create orbit container for animation
                    const orbitContainer =document.createElement('div');
                    orbitContainer.className = 'orbit-container';
                    orbitContainer.style.position = 'absolute';
                    orbitContainer.style.width = '100%';
                    orbitContainer.style.height = '100%';
                    orbitContainer.style.top = '0';
                    orbitContainer.style.left = '0';
                    orbitContainer.style.animation = `orbit ${config.speed}s linear infinite ${config.delay}s`;
                    orbitContainer.style.animationDirection = direction > 0 ? 'normal' : 'reverse';
                    container.appendChild(orbitContainer);

                    // Add particles to this orbit
                    for (let i = 0; i < config.particleCount; i++) {
                        const angle = (i / config.particleCount) * 360;
                        const particle = document.createElement('div');
                        particle.className = 'orbit-particle';

                        // Calculate hue from the range
                        const hue = Math.floor(Math.random() * (config.hueRange[1] - config.hueRange[0])) + config.hueRange[0];

                        // Randomize size slightly for more organic look
                        const size = config.particleSize * (0.8 + Math.random() * 0.4);

                        // Apply styles
                        particle.style.width = `${size}px`;
                        particle.style.height = `${size}px`;
                        particle.style.background = `hsla(${hue}, 85%, 65%, 0.85)`;
                        particle.style.boxShadow = `0 0 ${size * 2}px hsla(${hue}, 90%, 60%, 0.7)`;

                        // Position at the orbit radius
                        const x = 50 + config.radius * Math.cos(angle * Math.PI / 180);
                        const y = 50 + config.radius * Math.sin(angle * Math.PI / 180);
                        particle.style.left = `${x}%`;
                        particle.style.top = `${y}%`;

                        // Add slight pulsing for some particles
                        if (Math.random() > 0.7) {
                            particle.style.animation = `pulse 2s ease-in-out infinite ${Math.random()}s`;
                        }

                        orbitContainer.appendChild(particle);
                    }

                    // Remove after scan completes
                    setTimeout(() => {
                        if (orbitContainer.parentNode) {
                            orbitContainer.classList.add('fade-out');
                            setTimeout(() => {
                                if (orbitContainer.parentNode) {
                                    orbitContainer.parentNode.removeChild(orbitContainer);
                                }
                            }, 500);
                        }
                    }, 3100);
                }
            }

function resetFingerprint() {
                if (fingerprintTimer) {
                    clearTimeout(fingerprintTimer);
                    fingerprintTimer = null;
                }

                // Get loader and scan line elements
                const fingerprintLoader = document.getElementById('fingerprintLoader');
                const scanLine = document.getElementById('scanLine');

                // Start completion animation before removing elements
                let isSuccess = Math.random() > 0.2; // 80% success rate for demo

                if (isSuccess) {
                    // Success confirmation animation
                    const successPulse = document.createElement('div');
                    successPulse.className = 'success-pulse';
                    fingerprintButton.appendChild(successPulse);

                    // Confirmation checkmark
                    const checkmark = document.createElement('div');
                    checkmark.className = 'success-checkmark';
                    checkmark.innerHTML = '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="25" fill="none"/><path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>';
                    checkmark.classList.add('active');
                    fingerprintButton.appendChild(checkmark);

                    // Success sound
                    const successSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-magical-coin-win-1936.mp3');
                    successSound.volume = 0.3;
                    try {
                        successSound.play().catch(e => console.log("Sound playing error:", e));
                    } catch(e) {
                        console.log("Sound error:", e);
                    }

                    // Create success particles
                    for (let i = 0; i < 20; i++) {
                        setTimeout(() => {
                            createSuccessParticle(fingerprintButton);
                        }, i * 50);
                    }
                } else {
                    // Error animation for unsuccessful scan
                    const errorPulse = document.createElement('div');
                    errorPulse.className = 'error-pulse';
                    fingerprintButton.appendChild(errorPulse);

                    // Error X mark
                    const errorMark = document.createElement('div');
                    errorMark.className = 'error-mark';
                    errorMark.innerHTML = '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="25" fill="none"/><path fill="none" d="M16 16 36 36 M36 16 16 36"/></svg>';
                    errorMark.classList.add('active');
                    fingerprintButton.appendChild(errorMark);

                    // Error sound
                    const errorSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alert-quick-chime-766.mp3');
                    errorSound.volume = 0.3;
                    try {
                        errorSound.play().catch(e => console.log("Sound playing error:", e));
                    } catch(e) {
                        console.log("Sound error:", e);
                    }
                }

                // Add fade-out class to all animation elements
                const animationElements = [
                    '.progress-bar',
                    '.scan-particle',
                    '.orbit-particle',
                    '.orbit-container',
                    '.scanner-line',
                    '.wave-ripple',
                    '.dna-pattern',
                    '.holo-effect',
                    '.fingerprint-dots'
                ];

                animationElements.forEach(selector => {
                    const elements = fingerprintButton.querySelectorAll(selector);
                    elements.forEach(el => {
                        el.classList.add('fade-out');
                    });
                });

                // Delayed cleanup after fade out
                setTimeout(() => {
                    isFingerprintActive = false;

                    if (fingerprintLoader) {
                        fingerprintLoader.style.display = 'none';
                    }

                    if (scanLine) {
                        scanLine.style.display = 'none';
                    }

                    // Restore icon to normal state
                    if (fingerprintIcon) {
                        fingerprintIcon.style.transition = 'all 0.5s ease-out';
                        fingerprintIcon.style.opacity = '1';
                        fingerprintIcon.style.transform = '';
                        fingerprintIcon.style.filter = '';
                    }

                    // Remove processing class
                    fingerprintButton.classList.remove('processing');

                    // Remove all animation elements
                    animationElements.forEach(selector => {
                        const elements = fingerprintButton.querySelectorAll(selector);
                        elements.forEach(el => {
                            if (el.parentNode) {
                                el.parentNode.removeChild(el);
                            }
                        });
                    });

                    // Remove success/error indicators after animation completes
                    setTimeout(() => {
                        const successMark = fingerprintButton.querySelector('.success-checkmark');
                        const errorMark = fingerprintButton.querySelector('.error-mark');
                        const successPulse = fingerprintButton.querySelector('.success-pulse');
                        const errorPulse = fingerprintButton.querySelector('.error-pulse');

                        if (successMark) successMark.classList.add('fade-out');
                        if (errorMark) errorMark.classList.add('fade-out');
                        if (successPulse) successPulse.classList.add('fade-out');
                        if (errorPulse) errorPulse.classList.add('fade-out');

                        setTimeout(() => {
                            if (successMark && successMark.parentNode) successMark.parentNode.removeChild(successMark);
                            if (errorMark && errorMark.parentNode) errorMark.parentNode.removeChild(errorMark);
                            if (successPulse && successPulse.parentNode) successPulse.parentNode.removeChild(successPulse);
                            if (errorPulse && errorPulse.parentNode) errorPulse.parentNode.removeChild(errorPulse);
                        }, 500);
                    }, 1500);
                }, 500);
            }

            // Create success particle
            function createSuccessParticle(container) {
                if (!container) return;

                const particle = document.createElement('div');
                particle.className = 'success-particle';

                // Random size
                const size = Math.random() * 6 + 3;

                // Random position from center
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 30 + 10;
                const x = 50 + Math.cos(angle) * distance;
                const y = 50 + Math.sin(angle) * distance;

                // Random color (greens and golds for success)
                const colors = ['#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FFEB3B'];
                const color = colors[Math.floor(Math.random() * colors.length)];

                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.left = `${x}%`;
                particle.style.top = `${y}%`;
                particle.style.backgroundColor = color;
                particle.style.boxShadow = `0 0 ${size}px ${color}`;

                container.appendChild(particle);

                // Remove after animation
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 1000);
            }

            // Create celebration particles for successful scan
            function createSuccessParticles() {
                const container = fingerprintButton;
                const particleCount = 40;

                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    particle.className = 'success-particle';

                    // Random properties for confetti effect
                    const size = Math.random() * 6 + 3;
                    const angle = Math.random() * 360;
                    const distance = Math.random() * 60 + 20;
                    const duration = Math.random() * 1 + 0.8;
                    const delay = Math.random() * 0.3;

                    // Random color
                    const colors = ['#76FF03', '#64FFDA', '#18FFFF', '#EEFF41', '#FFFF00', '#69F0AE'];
                    const color = colors[Math.floor(Math.random() * colors.length)];

                    particle.style.width = `${size}px`;
                    particle.style.height = `${size}px`;
                    particle.style.backgroundColor = color;
                    particle.style.boxShadow = `0 0 ${size/2}px ${color}`;
                    particle.style.left = '50%';
                    particle.style.top = '50%';
                    particle.style.animationDuration = `${duration}s`;
                    particle.style.animationDelay = `${delay}s`;

                    // Set unique transform for each particle
                    const transform = `rotate(${angle}deg) translate(${distance}px)`;
                    particle.style.transform = transform;

                    container.appendChild(particle);

                    // Remove particle after animation
                    setTimeout(() => {
                        if (particle.parentNode) {
                            particle.parentNode.removeChild(particle);
                        }
                    }, (duration + delay) * 1000);
                }
            }
// Reklam gösterimi için yardımcı fonksiyon
function showInterstitialAd() {
    console.log('Yeni fal için reklam gösterimi atlandı - reklam işlevselliği devre dışı.');
    // Burada ileride reklam gösterimi ekleyebilirsiniz
}

document.getElementById('newFortuneButton').addEventListener('click', function() {
                // Hide fortune section
                fortuneSection.classList.remove('visible');
                fortuneSection.classList.add('hidden');

                // Hide horoscope section if it's visible
                horoscopeSection.classList.remove('visible');
                horoscopeSection.classList.add('hidden');

                // Show the name input section (main screen)
                nameSection.classList.remove('hidden');
                nameSection.classList.add('visible');

                // Reset interstitial ad flag to show it again when user looks at a new fortune
                let interstitialAdShown = false;

                // Show interstitial ad when user clicks "Yeni Fal" button
                showInterstitialAd();

                // Clear the input fields
                document.getElementById('firstName').value = '';
                document.getElementById('lastName').value = '';
                document.getElementById('birthdate').value = '';
            });

// Admin dashboard başlatma fonksiyonu
function initAdminDashboard() {
    console.log("Admin dashboard başlatılıyor...");

    // Eğer admin sayfasında değilsek, işlem yapma
    if (!window.location.pathname.includes('admin-dashboard.html')) {
        console.log('Admin dashboard sayfasında değiliz.');
        return;
    }

    // Admin giriş durumunu kontrol et
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
        console.log('Admin girişi yapılmamış, login sayfasına yönlendiriliyor...');
        window.location.href = 'admin.html';
        return;
    }

    // API durumunu kontrol et
    const apiStatusElement = document.getElementById('apiStatus');
    if (apiStatusElement) {
        apiStatusElement.textContent = 'Kontrol ediliyor...';
        apiStatusElement.className = 'status-badge pending';
    }

    // Admin verilerini yükle
    loadAdminDashboardData();

    // Event listener'ları ayarla
    setupAdminEvents();

    // Her 60 saniyede bir verileri otomatik yenile
    setInterval(() => {
        loadAdminDashboardData();
    }, 60000);
}

// Admin paneli event listener'larını ayarla
function setupAdminEvents() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadAdminDashboardData();
            showNotification('info', 'Yenileniyor', 'Veriler yenileniyor...');
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('adminLoggedIn');
            localStorage.setItem('adminLastLogout', Date.now());
            showNotification('success', 'Çıkış Yapılıyor', 'Çıkış işlemi gerçekleştiriliyor...');

            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        });
    }
}

.fingerprint-dots {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 4;
            opacity: 0;
            background-image: radial-gradient(
                rgba(255, 255, 255, 0.9) 1px, 
                transparent 1px
            );
            background-size: 6px 6px;
            border-radius: 50%;
            animation: fingerprint-dots-reveal 3s ease forwards;
}

@keyframes fingerprint-dots-reveal {
    0% {
        opacity: 0;
    }
    50% {
        opacity: 0.8;
    }
    100% {
        opacity: 0;
    }
}

.dna-pattern {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 3;
    opacity: 0;
    background-image: linear-gradient(
        45deg, 
        rgba(255, 255, 255, 0.2) 25%, 
        transparent 25%, 
        transparent 50%, 
        rgba(255, 255, 255, 0.2) 50%, 
        rgba(255, 255, 255, 0.2) 75%, 
        transparent 75%
    );
    background-size: 10px 10px;
    animation: dna-pattern-reveal 2s ease forwards;
}

@keyframes dna-pattern-reveal {
    0% {
        opacity: 0;
    }
    50% {
        opacity: 0.5;
    }
    100% {
        opacity: 0;
    }
}

.fingerprint-match {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 5;
    opacity: 0;
    background-image: radial-gradient(
        circle at center, 
        rgba(255, 255, 255, 0.3), 
        transparent
    );
    background-size: 40px 40px;
    animation: fingerprint-match-reveal 1.5s ease forwards;
}

@keyframes fingerprint-match-reveal {
    0% {
        opacity: 0;
        transform: scale(0.8);
    }
    50% {
        opacity: 0.5;
        transform: scale(1.2);
    }
    100% {
        opacity: 0;
        transform: scale(1);
    }
}

.wave-ripple {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 2;
    border: 2px solid rgba(123, 104, 238, 0.6);
    border-radius: 50%;
    animation: wave-ripple-animation 1.2s ease-in-out infinite;
}

@keyframes wave-ripple-animation {
    0% {
        transform: scale(0.5);
        opacity: 1;
    }
    50% {
        transform: scale(1.2);
        opacity: 0.5;
    }
    100% {
        transform: scale(1.5);
        opacity: 0;
    }
}

.scanning-beam {
    position: absolute;
    width: 2px;
    height: 100%;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(255, 255, 255, 0.5);
    animation: scanning-beam-animation 1s linear infinite;
}

@keyframes scanning-beam-animation {
    0%, 100% {
        transform: translateX(-50%) translateY(0);
    }
    50% {
        transform: translateX(-50%) translateY(100%);
    }
}


.holo-overlay {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 1;
    background-image: radial-gradient(
        circle at 20% 30%, 
        rgba(123, 104, 238, 0.1), 
        transparent 50%
    );
    animation: holo-overlay-animation 2s infinite linear;
}

@keyframes holo-overlay-animation {
    0% {
        background-position: 0 0;
    }
    100% {
        background-position: -200px -200px;
    }
}

.scan-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 4px;
    background-color: rgba(255, 255, 255, 0.7);
}

.scanner-line {
    position: absolute;
    bottom: 5px;
    width: 100%;
    background-color: rgba(255, 255, 255, 0.4);
    animation: scanner-line-animation 0.6s linear infinite;
}

@keyframes scanner-line-animation {
    0%, 100% {
        transform: scaleX(0);
    }
    50% {
        transform: scaleX(1);
    }
}

.scan-particle {
    position: absolute;
    border-radius: 50%;
    animation: scan-particle-animation linear forwards;
}

@keyframes scan-particle-animation {
    0% {
        opacity: 1;
        transform: scale(1);
    }
    100% {
        opacity: 0;
        transform: scale(2);
    }
}

.orbit-particle {
    position: absolute;
    border-radius: 50%;
    animation: orbit linear infinite;
}

@keyframes orbit {
    0% {
        transform: rotate(0deg) translate(0) rotate(0deg);
    }
    100% {
        transform: rotate(360deg) translate(0) rotate(-360deg);
    }
}

.success-flash {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: rgba(0, 255, 0, 0.4);
    border-radius: 50%;
    animation: success-flash-animation 0.8s ease-out forwards;
}

@keyframes success-flash-animation {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

.success-checkmark {
    position: absolute;
    width: 60px;
    height: 60px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
}

.success-checkmark svg {
    width: 100%;
    height: 100%;
}

.success-checkmark svg circle {
    stroke: #00CC00;
    stroke-width: 4;
    stroke-dasharray: 157;
    stroke-dashoffset: 157;
    animation: success-checkmark-circle-animation 0.6s ease-out forwards 0.1s;
}

.success-checkmark svg path {
    stroke: #00CC00;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    animation: success-checkmark-path-animation 0.8s ease-out forwards 0.3s;
}

@keyframes success-checkmark-circle-animation {
    0% {
        stroke-dashoffset: 157;
    }
    100% {
        stroke-dashoffset: 0;
    }
}

@keyframes success-checkmark-path-animation {
    0% {
        stroke-dashoffset: 40;
    }
    100% {
        stroke-dashoffset: 0;
    }
}

.error-flash {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: rgba(255, 0, 0, 0.4);
    border-radius: 50%;
    animation: error-flash-animation 0.8s ease-out forwards;
}

@keyframes error-flash-animation {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

.error-mark {
    position: absolute;
    width: 60px;
    height: 60px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
}

.error-mark svg {
    width: 100%;
    height: 100%;
}

.error-mark svg circle {
    stroke: #FF0000;
    stroke-width: 4;
    stroke-dasharray: 157;
    stroke-dashoffset: 157;
    animation: error-mark-circle-animation 0.6s ease-out forwards 0.1s;
}

.error-mark svg path {
    stroke: #FF0000;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    animation: error-mark-path-animation 0.8s ease-out forwards 0.3s;
}

@keyframes error-mark-circle-animation {
    0% {
        stroke-dashoffset: 157;
    }
    100% {
        stroke-dashoffset: 0;
    }
}

@keyframes error-mark-path-animation {
    0% {
        stroke-dashoffset: 40;
    }
    100% {
        stroke-dashoffset: 0;
    }
}

.success-particle, .error-particle {
    position: absolute;
    border-radius: 50%;
    animation: particle-animation linear forwards;
}

@keyframes particle-animation {
    0% {
        opacity: 1;
        transform: scale(1);
    }
    100% {
        opacity: 0;
        transform: scale(2);
    }
}

.fade-out {
    animation: fade-out 0.5s forwards;
}


@keyframes fade-out {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

.processing {
    filter: grayscale(0.5); /* Add a subtle grayscale effect */
    animation: pulse 1.2s ease-in-out infinite; /* Add a pulsing animation */
}

@keyframes pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
    100% {
        transform: scale(1);
    }
}

.orbit-container {
    animation: orbit linear infinite;
}

@keyframes orbit {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
document.getElementById('shareButton').addEventListener('click', function() {
                const fortune = document.getElementById('fortuneResult').textContent;
                const userName = userInfo.firstName + " " + userInfo.lastName;
                const zodiac = userInfo.zodiac;

                const shareText = `${userName} - ${zodiac}\n\n${fortune}\n\nOmFortune tarafından hazırlandı`;

                if (navigator.share) {
                    navigator.share({
                        title: 'OmFortune - Falım',
                        text: shareText
                    }).catch(error => {
                        console.error('Paylaşım hatası:', error);
                        alert(shareText);
                    });
                } else {
                    alert(shareText);
                }
            });