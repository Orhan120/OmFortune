const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// CORS ayarları (geliştirme modunda)
app.use(cors());

// Hata yakalama ve loglama için
const logRequest = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};

app.use(logRequest);

// SQLite veritabanı bağlantısı
const db = new sqlite3.Database('./fortune.db', (err) => {
  if (err) {
    console.error('Veritabanına bağlanırken hata:', err.message);
  } else {
    console.log('SQLite veritabanına bağlandı.');

    // Veritabanı şemasını oluştur (eğer yoksa)
    db.run(`CREATE TABLE IF NOT EXISTS fortunes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      zodiac TEXT NOT NULL,
      fortune TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      date TEXT DEFAULT (date('now'))
    )`, (err) => {
      if (err) {
        console.error('Tablo oluşturma hatası:', err);
      } else {
        console.log('Fortunes tablosu hazır');

        // Verileri kontrol et ve yoksa örnek veri ekle
        db.get('SELECT COUNT(*) AS count FROM fortunes', (err, row) => {
          if (err) {
            console.error('Veri sayma hatası:', err);
          } else if (row.count === 0) {
            console.log('Örnek veriler ekleniyor...');
            const sampleData = [
              {name: 'Ahmet Yılmaz', zodiac: 'Koç', fortune: 'Önünüzdeki engelleri aşmanın yolu cesaret ve sabırdan geçiyor.'},
              {name: 'Ayşe Demir', zodiac: 'Boğa', fortune: 'Finansal açıdan yükselişe geçeceğiniz bir dönem başlıyor.'},
              {name: 'Mehmet Kaya', zodiac: 'İkizler', fortune: 'İletişim yetenekleriniz bu ay size yeni kapılar açacak.'},
              {name: 'Fatma Şahin', zodiac: 'Yengeç', fortune: 'Aile ilişkileriniz güçlenecek ve evinizdeki huzur artacak.'},
              {name: 'Ali Özkan', zodiac: 'Aslan', fortune: 'Liderlik vasıflarınız öne çıkacak, çevrenizdekiler size güvenecek.'},
              {name: 'Zeynep Koç', zodiac: 'Başak', fortune: 'Detaylara verdiğiniz önem sayesinde mükemmel sonuçlar alacaksınız.'},
              {name: 'Mustafa Şen', zodiac: 'Terazi', fortune: 'Dengeyi sağlamanın önemi bu dönemde artacak, ilişkilerinizde adaletli olun.'},
              {name: 'Sema Ünal', zodiac: 'Akrep', fortune: 'İçgüdüleriniz size doğru yolu gösterecek, onları dinleyin.'},
              {name: 'Emre Yıldız', zodiac: 'Yay', fortune: 'Uzak yerlerden güzel haberler alacak, yeni maceralara atılacaksınız.'},
              {name: 'Gülşen Toprak', zodiac: 'Oğlak', fortune: 'Disiplininiz ve çalışkanlığınız sonuç verecek, hedeflerinize ulaşacaksınız.'},
              {name: 'Burak Avcı', zodiac: 'Kova', fortune: 'Yenilikçi fikirleriniz ilgi görecek, kendinizi ifade etmekten çekinmeyin.'},
              {name: 'Esra Gül', zodiac: 'Balık', fortune: 'Sezgileriniz güçlenecek, içsel yolculuğunuz sizi aydınlatacak.'}
            ];

            const insertStmt = db.prepare('INSERT INTO fortunes (name, zodiac, fortune) VALUES (?, ?, ?)');
            sampleData.forEach(item => {
              insertStmt.run(item.name, item.zodiac, item.fortune, function(err) {
                if (err) {
                  console.error('Veri ekleme hatası:', err.message);
                } else {
                  console.log(`Kayıt eklendi ID: ${this.lastID}`);
                }
              });
            });
            insertStmt.finalize();
          }
        });
      }
    });
  }
});

// Static dosyaları sunmak için
app.use(express.static(path.join(__dirname, './')));
app.use(express.json());

// API durum kontrolü 
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Fal ekleme endpoint'i
app.post('/api/add-fortune', (req, res) => {
  try {
    console.log('API isteği alındı:', req.body);
    const { name, zodiac, fortune } = req.body;

    // Detaylı veri doğrulama
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Geçerli bir isim gereklidir.' });
    }

    if (!zodiac || typeof zodiac !== 'string' || zodiac.trim() === '') {
      return res.status(400).json({ success: false, message: 'Geçerli bir burç adı gereklidir.' });
    }

    if (!fortune || typeof fortune !== 'string' || fortune.trim() === '') {
      return res.status(400).json({ success: false, message: 'Geçerli bir fal metni gereklidir.' });
    }

    // Tarihi oluştur
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Veritabanına kaydet
    db.run('INSERT INTO fortunes (name, zodiac, fortune, date) VALUES (?, ?, ?, ?)', 
      [name.trim(), zodiac.trim(), fortune.trim(), today], 
      function(err) {
        if (err) {
          console.error('Fal kaydetme hatası:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Veritabanı hatası', 
            error: err.message,
            errorCode: err.code || 'UNKNOWN_ERROR'
          });
        }

        // Başarılı yanıt
        console.log('Fal başarıyla kaydedildi, ID:', this.lastID);
        res.status(201).json({ 
          success: true, 
          message: 'Fal başarıyla kaydedildi', 
          fortuneId: this.lastID,
          timestamp: new Date().toISOString()
        });
      }
    );
  } catch (error) {
    console.error('API işleme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Admin API endpoint'leri
app.get('/api/admin/stats', (req, res) => {
    db.get("SELECT COUNT(DISTINCT name) as totalUsers FROM fortunes", (err, totalUsers) => {
        if (err) {
            console.error('İstatistik API hatası:', err);
            return res.status(500).json({ error: err.message });
        }

        db.get("SELECT COUNT(*) as totalReadings FROM fortunes", (err, totalReadings) => {
            if (err) {
                console.error('İstatistik API hatası:', err);
                return res.status(500).json({ error: err.message });
            }

            const today = new Date().toISOString().split('T')[0];
            db.get("SELECT COUNT(*) as todayReadings FROM fortunes WHERE date LIKE ?", [`${today}%`], (err, todayReadings) => {
                if (err) {
                    console.error('İstatistik API hatası:', err);
                    return res.status(500).json({ error: err.message });
                }

                db.get("SELECT zodiac, COUNT(*) as count FROM fortunes GROUP BY zodiac ORDER BY count DESC LIMIT 1", (err, popularZodiac) => {
                    if (err) {
                        console.error('İstatistik API hatası:', err);
                        return res.status(500).json({ error: err.message });
                    }

                    res.json({
                        totalUsers: totalUsers.totalUsers,
                        totalReadings: totalReadings.totalReadings,
                        todayReadings: todayReadings.todayReadings,
                        mostPopularZodiac: popularZodiac ? popularZodiac.zodiac : 'N/A',
                        lastUpdated: new Date().toISOString()
                    });
                });
            });
        });
    });
});

app.get('/api/admin/latest-readings', (req, res) => {
  try {
    console.log('Son fallar isteniyor...');
    db.all(`
      SELECT name as username, zodiac, fortune as reading, datetime(timestamp, 'localtime') as date 
      FROM fortunes 
      ORDER BY timestamp DESC 
      LIMIT 10`, 
      (err, rows) => {
        if (err) {
          console.error("Son fal sorgusu hatası:", err);
          return res.status(500).json({ error: "Veritabanı hatası", details: err.message });
        }

        console.log(`Son ${rows.length} fal başarıyla alındı`);
        res.json(rows);
      }
    );
  } catch (error) {
    console.error("Son fallar API hatası:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

app.get('/api/admin/zodiac-distribution', (req, res) => {
  try {
    const zodiacSigns = ["Koç", "Boğa", "İkizler", "Yengeç", "Aslan", "Başak", "Terazi", "Akrep", "Yay", "Oğlak", "Kova", "Balık"];

    db.all(`
      SELECT zodiac, COUNT(*) as count 
      FROM fortunes 
      GROUP BY zodiac 
      ORDER BY 
        CASE
          WHEN zodiac = 'Koç' THEN 1
          WHEN zodiac = 'Boğa' THEN 2
          WHEN zodiac = 'İkizler' THEN 3
          WHEN zodiac = 'Yengeç' THEN 4
          WHEN zodiac = 'Aslan' THEN 5
          WHEN zodiac = 'Başak' THEN 6
          WHEN zodiac = 'Terazi' THEN 7
          WHEN zodiac = 'Akrep' THEN 8
          WHEN zodiac = 'Yay' THEN 9
          WHEN zodiac = 'Oğlak' THEN 10
          WHEN zodiac = 'Kova' THEN 11
          WHEN zodiac = 'Balık' THEN 12
          ELSE 13
        END
    `, 
    (err, rows) => {
      if (err) {
        console.error("Burç dağılımı sorgusu hatası:", err);
        return res.status(500).json({ error: "Veritabanı hatası" });
      }

      const counts = Array(12).fill(0);
      rows.forEach(row => {
        const index = zodiacSigns.indexOf(row.zodiac);
        if (index !== -1) {
          counts[index] = row.count;
        }
      });

      res.json({
        zodiacSigns: zodiacSigns,
        counts: counts
      });
    });
  } catch (error) {
    console.error("Burç dağılımı API hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Ana sayfadan gelen falları kaydetme endpoint'i (iki endpoint de aynı işlevi yapar)
app.post('/api/submit-reading', (req, res) => {
  const { name, zodiac, fortune } = req.body;

  if (!name || !zodiac || !fortune) {
    return res.status(400).json({ success: false, message: 'Ad, burç ve fal metni gereklidir.' });
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  db.run('INSERT INTO fortunes (name, zodiac, fortune, date) VALUES (?, ?, ?, ?)', 
    [name, zodiac, fortune, today], 
    function(err) {
      if (err) {
        console.error('Fal kaydetme hatası:', err);
        return res.status(500).json({ success: false, message: 'Veritabanı hatası' });
      }

      res.json({ 
        success: true, 
        message: 'Fal başarıyla kaydedildi', 
        fortuneId: this.lastID,
        timestamp: new Date().toISOString() 
      });
    }
  );
});

// /api/add-fortune endpoint'i (script.js ile uyumluluk için)
app.post('/api/add-fortune', (req, res) => {
  try {
    console.log('API isteği alındı:', req.body);
    const { name, zodiac, fortune, date } = req.body;

    if (!name || !zodiac || !fortune) {
      console.log('Eksik veri:', { name, zodiac, fortune });
      return res.status(400).json({ success: false, message: 'Ad, burç ve fal metni gereklidir.' });
    }

    // Bugünün tarihini al (eğer date parametresi verilmediyse)
    const today = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Tarih bilgisiyle kaydet
    db.run('INSERT INTO fortunes (name, zodiac, fortune, date) VALUES (?, ?, ?, ?)', 
      [name, zodiac, fortune, today], 
      function(err) {
        if (err) {
          console.error('Fal kaydetme hatası:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Veritabanı hatası', 
            error: err.message 
          });
        }

        console.log('Fal başarıyla kaydedildi, ID:', this.lastID);
        res.status(201).json({ 
          success: true, 
          message: 'Fal başarıyla kaydedildi', 
          fortuneId: this.lastID,
          timestamp: new Date().toISOString()
        });
      }
    );
  } catch (error) {
    console.error('API işleme hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Aktif sunucu bağlantısını tutacak değişken
let activeServer = null;

// Mevcut port kullanımını kontrol eden ve alternatif portlar deneyen fonksiyon
function startServer(initialPort) {
  const tryPort = (currentPort) => {
    console.log(`Port ${currentPort} deneniyor...`);
    
    const server = app.listen(currentPort, '0.0.0.0', () => {
      console.log(`Sunucu ${currentPort} portunda başarıyla çalışıyor!`);
      activeServer = server;
      
      // Global port değişkenini güncelle (istemci tarafı bağlantılar için)
      global.serverPort = currentPort;
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${currentPort} zaten kullanımda!`);
        // Port 3000-3010 arasında deneme yap
        const nextPort = currentPort + 1;
        if (nextPort <= 3010) {
          tryPort(nextPort);
        } else {
          console.error("Kullanılabilir port bulunamadı (3000-3010 arası).");
          process.exit(1);
        }
      } else {
        console.error('Sunucu başlatma hatası:', err);
        process.exit(1);
      }
    });
  };
  
  // İlk portu dene
  tryPort(initialPort);
}

// Sunucuyu başlat
startServer(port);

// Uygulama kapatıldığında veritabanını kapat
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Veritabanı kapatma hatası:', err.message);
    } else {
      console.log('Veritabanı bağlantısı kapatıldı.');
    }
    process.exit(0);
  });
});