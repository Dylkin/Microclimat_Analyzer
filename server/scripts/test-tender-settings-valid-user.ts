import * as dotenv from 'dotenv';

dotenv.config();

async function testValidUser() {
  try {
    // Используем ID существующего пользователя из БД
    const testData = {
      userId: '00000000-0000-0000-0000-000000000001', // ID пользователя по умолчанию
      purchaseItems: ['Тестовый предмет'],
      organizationUnps: []
    };
    
    console.log('Отправка запроса с существующим пользователем...');
    console.log('Данные:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3001/api/tenders/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Статус ответа:', response.status);
    
    const responseText = await response.text();
    console.log('Тело ответа:', responseText);
    
    if (!response.ok) {
      console.error('❌ Ошибка:', response.status, responseText);
      process.exit(1);
    }
    
    const data = JSON.parse(responseText);
    console.log('✅ Успешно сохранено:', data);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

testValidUser();


