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
    fortuneCountSpan.textContent = fortuneLogs.length;
    
    // Tabloyu doldur
    fortuneLogTable.innerHTML = `
        <tr>
            <th>Tarih</th>
            <th>İsim</th>
            <th>Burç</th>
            <th>Fal Metni</th>
        </tr>
    `;
    
    fortuneLogs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.date}</td>
            <td>${log.name}</td>
            <td>${log.zodiac}</td>
            <td>${log.fortune.substring(0, 100)}...</td>
        `;
        fortuneLogTable.appendChild(row);
    });
}
