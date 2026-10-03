import 'dotenv/config';
import { createApp } from './app';
import cron from 'node-cron';
import { ReportService } from './services/report.service';
import { prisma } from './config/prisma';
import { runAsUser } from './common/auth/requestContext';


const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 FinTrack Backend API running on http://localhost:${PORT}`);
});

const runMonthlyReport = async () => {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    await runAsUser(user.id, () => new ReportService().sendPreviousMonthIfDue())
      .catch((error) => console.error(`Monthly report delivery failed for user ${user.id}:`, error));
  }
};

// A daily check makes missed runs recover safely; ReportDelivery prevents duplicates.
cron.schedule('5 0 * * *', runMonthlyReport, { timezone: process.env.REPORT_TIMEZONE || 'Asia/Kolkata' });
void runMonthlyReport();
