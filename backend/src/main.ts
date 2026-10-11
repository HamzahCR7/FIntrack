import 'dotenv/config';
import { createApp } from './app';
import cron from 'node-cron';
import { ReportService } from './services/report.service';
import { FinancialAlertService } from './services/financialAlert.service';
import { backfillDebtPaymentTransactions } from './services/debtPaymentBackfill.service';
import { ensureFinancialReferenceData } from './services/referenceData.service';


const PORT = process.env.PORT || 3000;
const app = createApp();

async function startServer() {
  try {
    // A deployment is not ready until its built-in account and payment options
    // have been applied to the active database.
    await ensureFinancialReferenceData();
    console.log('Financial reference data is up to date.');
  } catch (error) {
    console.error('Financial reference-data initialization failed; server will not start:', error);
    process.exitCode = 1;
    return;
  }

  // Safe and idempotent migration for repayments generated before the marker existed.
  void backfillDebtPaymentTransactions().catch((error) => console.error('Debt-payment transaction backfill failed:', error));

  app.listen(PORT, () => {
    console.log(`🚀 FinTrack Backend API running on http://localhost:${PORT}`);
  });
}

void startServer();

const runMonthlyReport = () => new ReportService().sendPreviousMonthIfDue()
  .catch((error) => console.error('Monthly report delivery failed:', error));

// A daily check makes missed runs recover safely; ReportDelivery prevents duplicates.
cron.schedule('5 0 * * *', runMonthlyReport, { timezone: process.env.REPORT_TIMEZONE || 'Asia/Kolkata' });
void runMonthlyReport();

const runFinancialAlerts = () => new FinancialAlertService().sendDailyAlerts()
  .catch((error) => console.error('Financial push alert delivery failed:', error));
cron.schedule('0 9 * * *', runFinancialAlerts, { timezone: process.env.REPORT_TIMEZONE || 'Asia/Kolkata' });
void runFinancialAlerts();
