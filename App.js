import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Modal, Animated, TextInput, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

export default function App() {
  const [fingerprintPressed, setFingerprintPressed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Tema başlangıç durumu
  const [sound, setSound] = useState(); 
  const [progress, setProgress] = useState(0); 
  const [timer, setTimer] = useState(null); 
  const [modalAnimation] = useState(new Animated.Value(0)); 
  const [message, setMessage] = useState(""); 
  const [lastMessageTime, setLastMessageTime] = useState(null); 
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [formValid, setFormValid] = useState(false);
  const [zodiacSign, setZodiacSign] = useState('');  // Burç bilgisini saklamak için

  const messages = [
    "Geleceğinde büyük değişimler var, ama bu değişimler seni daha güçlü yapacak.",
    "Bir süredir içinde sıkışmış hissettiğini biliyorum, ancak yakında özgürlüğünü bulacaksın.",
    "Kalbinde bir çatlak var, ama sevgi seni iyileştirecek.",
    "Geçmişte yaşadığın bir kırgınlık seni geride tutuyor, ancak şifa yolda.",
    "Yolunda bir engel var, ama senin azmin onu aşmanı sağlayacak.",
    "Gözlerinde bir parıltı görüyorum, bu senin içindeki potansiyelin işareti.",
    "Bugün alacağın bir karar, gelecekte büyük bir fırsata dönüşecek.",
    "Bir sırrın peşindesin, ama unutma, gerçeğin ortaya çıkması için zaman lazım.",
    "Yakında bir kişi hayatına girecek ve sana büyük bir ilham verecek.",
    "Hayatında önemli bir dönüm noktasına geldin, ama doğru yolu bulmak için kalbini dinlemelisin!"
  ];

  // Burçları hesaplamak için fonksiyon
  const getZodiacSign = (day, month) => {
    const zodiacSigns = [
      { sign: 'Kova', start: { month: 1, day: 20 }, end: { month: 2, day: 18 } },
      { sign: 'Balık', start: { month: 2, day: 19 }, end: { month: 3, day: 20 } },
      { sign: 'Koç', start: { month: 3, day: 21 }, end: { month: 4, day: 19 } },
      { sign: 'Boğa', start: { month: 4, day: 20 }, end: { month: 5, day: 20 } },
      { sign: 'İkizler', start: { month: 5, day: 21 }, end: { month: 6, day: 20 } },
      { sign: 'Yengeç', start: { month: 6, day: 21 }, end: { month: 7, day: 22 } },
      { sign: 'Aslan', start: { month: 7, day: 23 }, end: { month: 8, day: 22 } },
      { sign: 'Başak', start: { month: 8, day: 23 }, end: { month: 9, day: 22 } },
      { sign: 'Terazi', start: { month: 9, day: 23 }, end: { month: 10, day: 22 } },
      { sign: 'Akrep', start: { month: 10, day: 23 }, end: { month: 11, day: 21 } },
      { sign: 'Yay', start: { month: 11, day: 22 }, end: { month: 12, day: 21 } },
      { sign: 'Oğlak', start: { month: 12, day: 22 }, end: { month: 1, day: 19 } },
    ];

    for (let i = 0; i < zodiacSigns.length; i++) {
      const sign = zodiacSigns[i];
      if (
        (month === sign.start.month && day >= sign.start.day) || 
        (month === sign.end.month && day <= sign.end.day)
      ) {
        return sign.sign;
      }
    }
    return '';
  };

  const playSound = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('./assets/mystic-sound.mp3') // Mistik ses dosyasını ekleyin
    );
    setSound(sound);
    await sound.playAsync();
  };

  const handleFingerprintPressIn = () => {
    setFingerprintPressed(true);
    playSound(); 
    startProgress(); 
    if (!lastMessageTime) { 
      showRandomMessage(); 
      setLastMessageTime(new Date()); 
    }
  };

  const handleFingerprintPressOut = () => {
    setFingerprintPressed(false);  
    setProgress(0); 
    clearTimeout(timer);  
  };

  const startProgress = () => {
    let progressValue = progress;
    const animateProgress = () => {
      if (progressValue >= 100) {
        setModalVisible(true); 
        return;
      }
      progressValue += 1; 
      setProgress(progressValue);
      setTimer(setTimeout(animateProgress, 50)); 
    };
    animateProgress(); 
  };

  const showRandomMessage = () => {
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setMessage(randomMessage); 
  };

  const updateMessageAfter1Minute = () => {
    setTimeout(() => {
      showRandomMessage(); 
    }, 60000); 
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const validateForm = () => {
    const validName = name.length >= 3;
    const validSurname = surname.length >= 3;
    const validBirthYear = birthYear.length === 4 && !isNaN(birthYear);
    const validBirthMonth = birthMonth >= 1 && birthMonth <= 12;
    const validBirthDay = birthDay >= 1 && birthDay <= 31;
    
    setFormValid(validName && validSurname && validBirthYear && validBirthMonth && validBirthDay);
  };

  useEffect(() => {
    validateForm(); // Her değişiklikte formu kontrol et
  }, [name, surname, birthYear, birthMonth, birthDay]);

  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      setZodiacSign(getZodiacSign(Number(birthDay), Number(birthMonth)));
    }
  }, [birthDay, birthMonth, birthYear]);

  useEffect(() => {
    if (modalVisible) {
      Animated.spring(modalAnimation, {
        toValue: 1, 
        friction: 5, 
        tension: 50, 
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible]);

  useEffect(() => {
    if (lastMessageTime) {
      const timeDiff = new Date() - lastMessageTime;
      if (timeDiff >= 60000) {
        showRandomMessage(); 
        setLastMessageTime(null); 
      }
    }
  }, [lastMessageTime]);

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.header, isDarkMode ? styles.darkText : styles.lightText]}>Parmağını okut falına bak!</Text>
      
      {/* Form Alanları */}
      <TextInput
        style={[styles.input, isDarkMode ? styles.darkText : styles.lightText]}
        placeholder="Ad"
        placeholderTextColor={isDarkMode ? '#ccc' : '#333'}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, isDarkMode ? styles.darkText : styles.lightText]}
        placeholder="Soyad"
        placeholderTextColor={isDarkMode ? '#ccc' : '#333'}
        value={surname}
        onChangeText={setSurname}
      />
      
      {/* Doğum Tarihi Girişi */}
      <View style={styles.dateInputContainer}>
        <TextInput
          style={[styles.input, styles.dateInput, isDarkMode ? styles.darkText : styles.lightText]}
          placeholder="Yıl"
          placeholderTextColor={isDarkMode ? '#ccc' : '#333'}
          value={birthYear}
          onChangeText={setBirthYear}
          keyboardType="numeric"
          maxLength={4}
        />
        <Text style={styles.separator}>/</Text>
        <TextInput
          style={[styles.input, styles.dateInput, isDarkMode ? styles.darkText : styles.lightText]}
          placeholder="Ay"
          placeholderTextColor={isDarkMode ? '#ccc' : '#333'}
          value={birthMonth}
          onChangeText={setBirthMonth}
          keyboardType="numeric"
          maxLength={2}
        />
        <Text style={styles.separator}>/</Text>
        <TextInput
          style={[styles.input, styles.dateInput, isDarkMode ? styles.darkText : styles.lightText]}
          placeholder="Gün"
          placeholderTextColor={isDarkMode ? '#ccc' : '#333'}
          value={birthDay}
          onChangeText={setBirthDay}
          keyboardType="numeric"
          maxLength={2}
        />
      </View>
      
      {/* Burç */}
      {zodiacSign && (
        <Text style={[styles.zodiacText, isDarkMode ? styles.darkText : styles.lightText]}>
          Burcunuz: {zodiacSign}
        </Text>
      )}

      {/* Parmak İzi */}
      <TouchableOpacity
        style={[styles.fingerprintContainer, !formValid && styles.fingerprintDisabled]}
        onPressIn={handleFingerprintPressIn}
        onPressOut={handleFingerprintPressOut}
        disabled={!formValid}
      >
        <Ionicons name="finger-print" size={70} color={formValid ? "#ff9900" : "#ccc"} />
        <Text style={[styles.fingerprintLabel, isDarkMode ? styles.darkText : styles.lightText]}>
          Parmak izinizi okuturken bekleyin...
        </Text>
      </TouchableOpacity>
      
      {/* Yükleme Barı */}
      <View style={styles.progressBarContainer}>
        <Text style={styles.progressText}>Yükleniyor: {progress}%</Text>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBar,
              { width: `${progress}%`, backgroundColor: progress >= 100 ? "#4caf50" : "#ff9900" }
            ]}
          />
        </View>
      </View>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: modalAnimation,
                transform: [{ scale: modalAnimation }],
              },
            ]}
          >
            <Text style={styles.modalText}>
              {message}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Kapat</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Tema Değiştirme Butonu */}
      <TouchableOpacity style={styles.themeButton} onPress={toggleTheme}>
        <Text style={styles.themeButtonText}>Tema Değiştir</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  darkContainer: {
    backgroundColor: '#1e0033',
  },
  lightContainer: {
    backgroundColor: '#fff',
  },
  darkText: {
    color: '#fff',
  },
  lightText: {
    color: '#000',
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    fontFamily: 'Cursive',
    textAlign: 'center',
    textShadowColor: '#ffcc00', 
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  input: {
    width: '80%',
    height: 40,
    borderWidth: 1,
    paddingLeft: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  dateInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateInput: {
    width: 40,
    textAlign: 'center',
  },
  separator: {
    fontSize: 24,
    marginHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#4caf50',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    width: '80%',
  },
  buttonDisabled: {
    backgroundColor: '#888',
  },
  submitButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  fingerprintContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  fingerprintDisabled: {
    opacity: 0.5,
  },
  fingerprintLabel: {
    fontSize: 16,
    marginTop: 10,
  },
  progressBarContainer: {
    width: '100%',
    marginTop: 20,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 16,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#ccc',
    borderRadius: 5,
    marginTop: 10,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#4caf50',
    borderRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#1e0033',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    fontFamily: 'Cursive',
    textAlign: 'center',
    textShadowColor: '#ffcc00',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  closeButton: {
    backgroundColor: '#4caf50',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
  },
  themeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ff9900',
    borderRadius: 5,
  },
  themeButtonText: {
    color: '#fff',
  },
  zodiacText: {
    fontSize: 18,
    marginTop: 20,
    fontWeight: 'bold',
  },
});