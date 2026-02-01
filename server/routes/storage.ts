import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB для больших XLS файлов
});

const uploadsRoot = path.join(process.cwd(), 'uploads');

const normalizePathPart = (value: string) => {
  if (!value || typeof value !== 'string') {
    throw new Error('Неверный путь для хранения файла');
  }

  if (value.includes('..')) {
    throw new Error('Запрещены относительные пути');
  }

  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
};

const ensureDirectory = async (dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true });
};

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const bucket = normalizePathPart(req.body.bucket);
    const objectPath = normalizePathPart(req.body.path);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ data: null, error: 'Файл не найден в запросе' });
    }

    const destinationDir = path.join(uploadsRoot, bucket, path.dirname(objectPath));
    await ensureDirectory(destinationDir);

    const destinationPath = path.join(uploadsRoot, bucket, objectPath);
    await fs.writeFile(destinationPath, file.buffer);

    const publicPath = `/uploads/${bucket}/${objectPath}`.replace(/\\/g, '/');
    res.json({
      data: { path: objectPath, publicUrl: publicPath },
      error: null,
    });
  } catch (error: any) {
    console.error('Storage upload error:', error);
    res.status(400).json({ data: null, error: error.message || 'Ошибка загрузки файла' });
  }
});

router.post('/list', async (req, res) => {
  try {
    const bucket = normalizePathPart(req.body.bucket);
    const prefix = req.body.prefix ? normalizePathPart(req.body.prefix) : '';
    const targetDir = path.join(uploadsRoot, bucket, prefix);

    let entries = [];
    try {
      entries = await fs.readdir(targetDir, { withFileTypes: true });
    } catch (readError: any) {
      if (readError.code === 'ENOENT') {
        return res.json({ data: [], error: null });
      }
      throw readError;
    }

    const response = [];
    for (const entry of entries) {
      const entryPath = path.join(targetDir, entry.name);
      const stats = await fs.stat(entryPath);

      response.push({
        name: entry.name,
        id: entry.isDirectory() ? null : entryPath,
        updated_at: stats.mtime.toISOString(),
        created_at: stats.birthtime.toISOString(),
        last_accessed_at: stats.atime.toISOString(),
        metadata: entry.isDirectory()
          ? null
          : {
              size: stats.size,
            },
      });
    }

    res.json({ data: response, error: null });
  } catch (error: any) {
    console.error('Storage list error:', error);
    res.status(400).json({ data: null, error: error.message || 'Ошибка получения списка файлов' });
  }
});

router.post('/remove', async (req, res) => {
  try {
    const bucket = normalizePathPart(req.body.bucket);
    const paths: string[] = req.body.paths || [];

    if (!Array.isArray(paths) || paths.length === 0) {
      return res.json({ data: null, error: null });
    }

    for (const relativePath of paths) {
      const objectPath = normalizePathPart(relativePath);
      const filePath = path.join(uploadsRoot, bucket, objectPath);
      try {
        await fs.unlink(filePath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }

    res.json({ data: null, error: null });
  } catch (error: any) {
    console.error('Storage remove error:', error);
    res.status(400).json({ data: null, error: error.message || 'Ошибка удаления файла' });
  }
});

router.post('/get-public-url', (req, res) => {
  try {
    const bucket = normalizePathPart(req.body.bucket);
    const objectPath = normalizePathPart(req.body.path);
    const publicUrl = `/uploads/${bucket}/${objectPath}`.replace(/\\/g, '/');

    res.json({
      data: { publicUrl },
      error: null,
    });
  } catch (error: any) {
    console.error('Storage public URL error:', error);
    res.status(400).json({ data: null, error: error.message || 'Ошибка получения URL' });
  }
});

export default router;

