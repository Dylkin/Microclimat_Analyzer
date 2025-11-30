import * as dotenv from 'dotenv';

dotenv.config();

async function testAPI() {
  try {
    const testData = {
      userId: '4ddace07-1e3a-5ff9-ac81-0183d0e34403', // UUID v5 для pavel.dylkin@gmail.com
      purchaseItems: ['Тестовый предмет закупки'],
      organizationUnps: ['123456789']
    };
    
    console.log('Отправка запроса к API...');
    console.log('Данные:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3001/api/tenders/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Статус ответа:', response.status);
    console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Тело ответа:', responseText);
    
    if (!response.ok) {
      console.error('Ошибка:', response.status, responseText);
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

testAPI();


