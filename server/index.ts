import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/database.js';
import usersRouter from './routes/users.js';
import projectsRouter from './routes/projects.js';
import equipmentRouter from './routes/equipment.js';
import contractorsRouter from './routes/contractors.js';
import qualificationObjectsRouter from './routes/qualificationObjects.js';
import qualificationProtocolsRouter from './routes/qualificationProtocols.js';
import qualificationWorkScheduleRouter from './routes/qualificationWorkSchedule.js';
import testingPeriodsRouter from './routes/testingPeriods.js';
import loggerDataRouter from './routes/loggerData.js';
import uploadedFilesRouter from './routes/uploadedFiles.js';
import projectDocumentsRouter from './routes/projectDocuments.js';
import documentApprovalRouter from './routes/documentApproval.js';
import auditLogsRouter from './routes/auditLogs.js';
import reportsRouter from './routes/reports.js';
import tendersRouter from './routes/tenders.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: (error as Error).message });
  }
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/contractors', contractorsRouter);
app.use('/api/qualification-objects', qualificationObjectsRouter);
app.use('/api/qualification-protocols', qualificationProtocolsRouter);
app.use('/api/qualification-work-schedule', qualificationWorkScheduleRouter);
app.use('/api/testing-periods', testingPeriodsRouter);
app.use('/api/logger-data', loggerDataRouter);
app.use('/api/uploaded-files', uploadedFilesRouter);
app.use('/api/project-documents', projectDocumentsRouter);
app.use('/api/document-approval', documentApprovalRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/tenders', tendersRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

