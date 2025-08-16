@@ .. @@
      // 2. Инициализация docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
+       delimiters: {
+         start: '{',
+         end: '}'
+       },
        nullGetter: () => '', // Возвращаем пустую строку для null/undefined значений
      });