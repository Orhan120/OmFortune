
const fetch = require('node-fetch');

// API Test Aracı
async function testAPI() {
  console.log('\x1b[36m%s\x1b[0m', 'OmFortune API Test Başlatılıyor...');
  console.log('==============================');
  
  try {
    const BASE_URL = 'http://localhost:3000';
    
    // 1. Sunucu erişim kontrolü
    console.log('\x1b[1m%s\x1b[0m', '1. Sunucu Erişilebilirlik Testi');
    let response = await fetch(`${BASE_URL}/`).catch(err => {
      throw new Error(`Sunucuya bağlanılamadı: ${err.message}`);
    });
    
    if (response.ok) {
      console.log('\x1b[32m%s\x1b[0m', '✓ Sunucu çalışıyor');
    } else {
      console.error('\x1b[31m%s\x1b[0m', `✗ Sunucu yanıt verdi ama hata kodu: ${response.status}`);
    }
    
    // 2. Veritabanı durum kontrolü
    console.log('\n\x1b[1m%s\x1b[0m', '2. Veritabanı Durum Kontrolü');
    try {
      // Kayıtlı falları sayarak veritabanı durumunu kontrol edelim
      let dbResponse = await fetch(`${BASE_URL}/api/admin/latest-readings`);
      if (dbResponse.ok) {
        const readings = await dbResponse.json();
        console.log('\x1b[32m%s\x1b[0m', `✓ Veritabanı bağlantısı sağlandı, ${readings.length} kayıt bulundu`);
      } else {
        console.error('\x1b[31m%s\x1b[0m', `✗ Veritabanı API hata kodu: ${dbResponse.status}`);
        if (dbResponse.headers.get('content-type')?.includes('application/json')) {
          const errorData = await dbResponse.json();
          console.error('  Hata detayı:', errorData);
        }
      }
    } catch (dbError) {
      console.error('\x1b[31m%s\x1b[0m', `✗ Veritabanı kontrolü başarısız: ${dbError.message}`);
    }
    
    // 3. Test fal verisi gönderme
    console.log('\n\x1b[1m%s\x1b[0m', '3. Test Fal Verisi Gönderme');
    
    const testDate = new Date();
    const testFortune = {
      name: `Test Kullanıcı ${testDate.toLocaleTimeString()}`,
      zodiac: 'Koç',
      fortune: `Bu bir test falıdır - ${testDate.toISOString()}`,
      date: testDate.toISOString().split('T')[0] // YYYY-MM-DD format
    };
    
    console.log('  Gönderilecek test verisi:', testFortune);
    
    try {
      const submitResponse = await fetch(`${BASE_URL}/api/add-fortune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testFortune)
      });
      
      if (submitResponse.ok) {
        const result = await submitResponse.json();
        console.log('\x1b[32m%s\x1b[0m', `✓ Fal başarıyla kaydedildi (ID: ${result.fortuneId})`);
        console.log('  Sunucu yanıtı:', result);
        
        // Kaydedilen veriyi doğrulama
        console.log('\n\x1b[1m%s\x1b[0m', '4. Kaydedilen Veriyi Doğrulama');
        const verifyResponse = await fetch(`${BASE_URL}/api/admin/latest-readings`);
        
        if (verifyResponse.ok) {
          const latestReadings = await verifyResponse.json();
          if (latestReadings.length > 0 && latestReadings[0].username === testFortune.name) {
            console.log('\x1b[32m%s\x1b[0m', '✓ Veri doğrulandı, başarıyla kaydedilmiş!');
            console.log('  Son kayıt:', latestReadings[0]);
          } else {
            console.log('\x1b[33m%s\x1b[0m', '⚠ Son kayıt beklenen veri ile eşleşmiyor');
            if (latestReadings.length > 0) {
              console.log('  Son kayıt:', latestReadings[0]);
            }
          }
        } else {
          console.error('\x1b[31m%s\x1b[0m', `✗ Veri doğrulama API hata kodu: ${verifyResponse.status}`);
        }
      } else {
        console.error('\x1b[31m%s\x1b[0m', `✗ Fal kaydetme API hata kodu: ${submitResponse.status}`);
        try {
          const errorBody = await submitResponse.json();
          console.error('  Hata detayı:', errorBody);
        } catch (e) {
          const errorText = await submitResponse.text();
          console.error('  Hata detayı:', errorText);
        }
      }
    } catch (submitError) {
      console.error('\x1b[31m%s\x1b[0m', `✗ Fal gönderimi kritik hata: ${submitError.message}`);
    }
    
    // İstatistikleri kontrol et
    console.log('\n\x1b[1m%s\x1b[0m', '5. Admin İstatistiklerini Kontrol Etme');
    try {
      const statsResponse = await fetch(`${BASE_URL}/api/admin/stats`);
      
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        console.log('\x1b[32m%s\x1b[0m', '✓ İstatistikler başarıyla alındı');
        console.log('  Toplam Kullanıcı:', stats.totalUsers);
        console.log('  Toplam Fal:', stats.totalReadings);
        console.log('  Bugünkü Fal:', stats.todayReadings);
        console.log('  En Popüler Burç:', stats.mostPopularZodiac);
      } else {
        console.error('\x1b[31m%s\x1b[0m', `✗ İstatistik API hata kodu: ${statsResponse.status}`);
      }
    } catch (statsError) {
      console.error('\x1b[31m%s\x1b[0m', `✗ İstatistik kontrolü kritik hata: ${statsError.message}`);
    }
    
    // Mevcut fal kayıtlarını göster
    console.log('\n\x1b[1m%s\x1b[0m', '6. Veritabanı İçeriği');
    try {
      // Veritabanındaki tüm falları getir
      console.log('  Veritabanında kayıtlı fallar:');
      const dbReadings = await fetch(`${BASE_URL}/api/admin/latest-readings`);
      
      if (dbReadings.ok) {
        const readings = await dbReadings.json();
        console.log(`  Toplam ${readings.length} kayıt bulundu`);
        readings.slice(0, 5).forEach((reading, index) => {
          console.log(`  ${index + 1}. ${reading.username} (${reading.zodiac}) - "${reading.reading.substring(0, 30)}..."`);
        });
      } else {
        console.error('\x1b[31m%s\x1b[0m', `✗ Veritabanı okuma hatası: ${dbReadings.status}`);
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', `✗ Veritabanı okuma kritik hata: ${error.message}`);
    }
    
  } catch (error) {
    console.error('\x1b[31m\x1b[1m%s\x1b[0m', '✗ TEST KRİTİK HATA:');
    console.error('  ', error);
  }
  
  console.log('\n\x1b[36m%s\x1b[0m', 'API Testi Tamamlandı');
  console.log('==============================');
}

// Testi çalıştır
testAPI();
