import bcrypt from 'bcryptjs';

const password = 'Admin123!'; // сюда ваш пароль

const hash = await bcrypt.hash(password, 10);
console.log('HASH:', hash);