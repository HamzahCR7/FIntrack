import 'dotenv/config';
import { createApp } from './app';
import cron from 'node-cron';
import { ReportService } from './services/report.service';
import { FinancialAlertService } from './services/financialAlert.service';
import { backfillDebtPaymentTransactions } from './services/debtPaymentBackfill.service';
import { ensureFinancialReferenceData } from './services/referenceData.service';


const PORT = process.env.PORT || 3000;
const app = createApp();

// Safe and idempotent migration for repayments generated before the marker existed.
void backfillDebtPaymentTransactions().catch((error) => console.error('Debt-payment transaction backfill failed:', error));
void ensureFinancialReferenceData().catch((error) => console.error('Financial reference-data initialization failed:', error));

app.listen(PORT, () => {
  console.log(`🚀 FinTrack Backend API running on http://localhost:${PORT}`);
});

const runMonthlyReport = () => new ReportService().sendPreviousMonthIfDue()
  .catch((error) => console.error('Monthly report delivery failed:', error));

// A daily check makes missed runs recover safely; ReportDelivery prevents duplicates.
cron.schedule('5 0 * * *', runMonthlyReport, { timezone: process.env.REPORT_TIMEZONE || 'Asia/Kolkata' });
void runMonthlyReport();

const runFinancialAlerts = () => new FinancialAlertService().sendDailyAlerts()
  .catch((error) => console.error('Financial push alert delivery failed:', error));
cron.schedule('0 9 * * *', runFinancialAlerts, { timezone: process.env.REPORT_TIMEZONE || 'Asia/Kolkata' });
void runFinancialAlerts();
