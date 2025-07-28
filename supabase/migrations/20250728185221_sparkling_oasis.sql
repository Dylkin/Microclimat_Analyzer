@@ .. @@
 ALTER TABLE users ENABLE ROW LEVEL SECURITY;
 
 -- Политики доступа
+-- Разрешить создание профиля для аутентифицированных пользователей
+CREATE POLICY "Allow authenticated users to create their own profile"
+  ON users
+  FOR INSERT
+  TO authenticated
+  WITH CHECK (auth.uid() = id);
+
+-- Разрешить обновление собственного профиля
+CREATE POLICY "Allow authenticated users to update their own profile"
+  ON users
+  FOR UPDATE
+  TO authenticated
+  USING (auth.uid() = id);
+
 -- Пользователи могут читать свои данные
 CREATE POLICY "Пользователи могут читать свои данные"
   ON users