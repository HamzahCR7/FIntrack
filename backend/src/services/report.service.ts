import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { prisma } from '../config/prisma';
import { BadRequestError } from '../common/errors';
import { TransactionRepository } from '../repositories/transaction.repository';
import { currentUserId } from '../common/auth/requestContext';

type ReportTransaction = Awaited<ReturnType<TransactionRepository['findByDateRange']>>[number];

const FINTRACK_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#22c55e"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#bg)"/>
  <path d="M13 20C22 12 42 12 51 20" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="4" stroke-linecap="round"/>
  <rect x="15" y="37" width="8" height="13" rx="2" fill="#0b1220" fill-opacity=".55"/>
  <rect x="27" y="31" width="8" height="19" rx="2" fill="#0b1220" fill-opacity=".65"/>
  <rect x="39" y="24" width="8" height="26" rx="2" fill="#0b1220" fill-opacity=".75"/>
  <path d="M16 47L28 39L40 33L47 26" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="47" cy="26" r="3" fill="#fff"/>
</svg>`;

export class ReportService {
  private transactions = new TransactionRepository();

  async getSettings() {
    const userId = currentUserId();
    if (!userId) throw new Error('Authenticated user required');
    return prisma.reportSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async emailReport(input: {
    email: string;
    startDate: Date;
    endDate: Date;
    periodLabel: string;
    enableMonthly?: boolean;
  }) {
    const transactions = await this.transactions.findByDateRange(input.startDate, input.endDate);
    if (!transactions.length) throw new BadRequestError('No transactions found for the selected period.');

    if (input.enableMonthly !== undefined) {
      const userId = currentUserId();
      if (!userId) throw new Error('Authenticated user required');
      await prisma.reportSettings.upsert({
        where: { userId },
        create: { userId, recipientEmail: input.email, monthlyReportsEnabled: input.enableMonthly },
        update: { recipientEmail: input.email, monthlyReportsEnabled: input.enableMonthly },
      });
    }

    const pdf = await this.createPdf(transactions, input.periodLabel);
    await this.sendEmail(input.email, input.periodLabel, input.startDate, input.endDate, pdf);
    return { recipient: input.email, transactionCount: transactions.length };
  }

  async sendPreviousMonthIfDue(now = new Date()) {
    const userId = currentUserId();
    if (!userId) throw new Error('Authenticated user required');
    const settings = await this.getSettings();
    if (!settings.monthlyReportsEnabled || !settings.recipientEmail) return { sent: false, reason: 'disabled' };

    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const periodKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const existing = await prisma.reportDelivery.findUnique({
      where: { userId_periodKey_recipientEmail: { userId, periodKey, recipientEmail: settings.recipientEmail } },
    });
    if (existing) return { sent: false, reason: 'already-sent' };

    const periodLabel = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const transactions = await this.transactions.findByDateRange(start, end);
    if (!transactions.length) return { sent: false, reason: 'no-transactions' };

    const pdf = await this.createPdf(transactions, periodLabel);
    await this.sendEmail(settings.recipientEmail, periodLabel, start, end, pdf);
    await prisma.reportDelivery.create({ data: { userId, periodKey, recipientEmail: settings.recipientEmail } });
    return { sent: true, periodKey };
  }

  private async createPdf(transactions: ReportTransaction[], periodLabel: string): Promise<Buffer> {
    const totalIncome = transactions.filter((tx) => tx.type === 'INCOME').reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalExpenses = transactions.filter((tx) => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0);
    const currency = (amount: number) => `INR ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 42, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const drawFinTrackWatermark = () => {
        const centerX = doc.page.width / 2;
        const centerY = doc.page.height / 2;
        const cursorX = doc.x;
        const cursorY = doc.y;

        doc.save().opacity(0.045);
        doc.roundedRect(centerX - 105, centerY - 115, 210, 210, 48).fill('#0ea5e9');
        doc.fillColor('#0f172a');
        doc.roundedRect(centerX - 66, centerY - 10, 28, 70, 7).fill();
        doc.roundedRect(centerX - 14, centerY - 42, 28, 102, 7).fill();
        doc.roundedRect(centerX + 38, centerY - 78, 28, 138, 7).fill();
        doc.strokeColor('#ffffff').lineWidth(9)
          .moveTo(centerX - 64, centerY + 42)
          .lineTo(centerX - 2, centerY - 3)
          .lineTo(centerX + 52, centerY - 48)
          .stroke();
        doc.fillColor('#0f172a').fontSize(52).text('FinTrack', 0, centerY + 125, {
          width: doc.page.width,
          align: 'center',
          lineBreak: false,
        });
        doc.restore();
        doc.x = cursorX;
        doc.y = cursorY;
      };

      drawFinTrackWatermark();
      doc.on('pageAdded', drawFinTrackWatermark);

      doc.fontSize(22).fillColor('#1e293b').text('FinTrack Ledger Report');
      doc.moveDown(0.3).fontSize(11).fillColor('#64748b').text(`Period: ${periodLabel}`);
      doc.moveDown(0.55).fontSize(10).fillColor('#475569').text(
        'A clear overview of your income, spending, net position, and transaction activity for the selected period. Use this report to review your financial progress and make informed decisions.',
        { lineGap: 2 },
      );
      doc.moveDown().fontSize(12).fillColor('#0f172a');
      doc.text(`Income: ${currency(totalIncome)}`);
      doc.text(`Expenses: ${currency(totalExpenses)}`);
      doc.text(`Net: ${currency(totalIncome - totalExpenses)}`);
      doc.moveDown().fontSize(15).text(`Transactions (${transactions.length})`);
      doc.moveDown(0.4).fontSize(9);

      const drawTransactionHeader = () => {
        const headerY = doc.y;
        doc.fillColor('#475569').fontSize(8);
        doc.text('DATE', 42, headerY, { width: 58, lineBreak: false });
        doc.text('MERCHANT / PAYEE', 106, headerY, { width: 102, lineBreak: false });
        doc.text('DESCRIPTION', 214, headerY, { width: 126, lineBreak: false });
        doc.text('CATEGORY', 346, headerY, { width: 78, lineBreak: false });
        doc.text('AMOUNT', 430, headerY, { width: doc.page.width - 472, align: 'right', lineBreak: false });
        doc.strokeColor('#cbd5e1').lineWidth(0.75)
          .moveTo(42, headerY + 14)
          .lineTo(doc.page.width - 42, headerY + 14)
          .stroke();
        doc.x = 42;
        doc.y = headerY + 22;
        doc.fontSize(9);
      };

      drawTransactionHeader();

      for (const tx of transactions) {
        const rowHeight = 24;
        if (doc.y + rowHeight > doc.page.height - 42) {
          doc.addPage();
          drawTransactionHeader();
        }
        const date = new Date(tx.transactionDate).toLocaleDateString('en-IN');
        const merchant = tx.merchant || '—';
        const description = tx.description || '—';
        const category = tx.category?.name || 'Unassigned';
        const amountColor = tx.type === 'INCOME' ? '#059669' : tx.type === 'EXPENSE' ? '#e11d48' : '#2563eb';
        const rowY = doc.y;

        doc.fillColor('#334155').text(date, 42, rowY, { width: 58, lineBreak: false });
        doc.text(merchant, 106, rowY, { width: 102, ellipsis: true, lineBreak: false });
        doc.fillColor('#64748b').text(description, 214, rowY, { width: 126, ellipsis: true, lineBreak: false });
        doc.text(category, 346, rowY, { width: 78, ellipsis: true, lineBreak: false });
        doc.fillColor(amountColor).text(currency(Number(tx.amount)), 430, rowY, {
          width: doc.page.width - 472,
          align: 'right',
          lineBreak: false,
        });
        doc.strokeColor('#e2e8f0').lineWidth(0.5)
          .moveTo(42, rowY + 15)
          .lineTo(doc.page.width - 42, rowY + 15)
          .stroke();
        doc.x = 42;
        doc.y = rowY + rowHeight;
      }
      doc.end();
    });
  }

  private async sendEmail(recipient: string, periodLabel: string, startDate: Date, endDate: Date, pdf: Buffer) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new BadRequestError('Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM.');
    }
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    const formatDate = (date: Date) => date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const dateRange = `${formatDate(startDate)} to ${formatDate(endDate)}`;
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[character] || character);

    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: recipient,
      subject: `FinTrack report - ${periodLabel}`,
      text: [
        'Hello,',
        '',
        'We hope you are doing well.',
        `Please find attached your FinTrack financial report for ${dateRange}. It provides a clear summary of your income, expenses, net position, and transactions for the selected period.`,
        '',
        'We hope this report helps you review your finances and make informed decisions.',
        '',
        'Thanks,',
        'FinTrack Team',
      ].join('\n'),
      html: `
        <!doctype html>
        <html>
          <head>
            <style>
              @keyframes fintrackFloat { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-5px) rotate(2deg); } }
              @keyframes fintrackPulse { 0%,100% { opacity:.35; transform:scale(1); } 50% { opacity:.75; transform:scale(1.12); } }
              .fintrack-logo { animation:fintrackFloat 3.8s ease-in-out infinite; }
              .fintrack-orb { animation:fintrackPulse 4s ease-in-out infinite; }
              @media (prefers-reduced-motion:reduce) { .fintrack-logo,.fintrack-orb { animation:none !important; } }
            </style>
          </head>
          <body style="margin:0;padding:24px 12px;background:#f1f5f9;">
            <div style="display:none;max-height:0;overflow:hidden;color:transparent;">Your FinTrack report for ${escapeHtml(periodLabel)} is ready.</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 35px rgba(15,23,42,.12);font-family:Arial,sans-serif;color:#1e293b;">
              <tr>
                <td style="position:relative;padding:34px 38px;background:linear-gradient(135deg,#081b33 0%,#0c4a6e 58%,#0f766e 100%);color:#ffffff;">
                  <div class="fintrack-orb" style="position:absolute;width:110px;height:110px;border-radius:999px;background:rgba(56,189,248,.22);right:-22px;top:-38px;"></div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td width="82" valign="middle">
                        <img class="fintrack-logo" src="cid:fintrack-logo" width="66" height="66" alt="FinTrack" style="display:block;width:66px;height:66px;border:0;filter:drop-shadow(0 8px 14px rgba(0,0,0,.24));">
                      </td>
                      <td valign="middle">
                        <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#bae6fd;font-weight:700;">Personal finance report</div>
                        <div style="font-size:30px;line-height:1.15;font-weight:800;margin-top:5px;">FinTrack</div>
                        <div style="font-size:14px;color:#dbeafe;margin-top:6px;">Your money, clearly understood.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:34px 38px;line-height:1.65;">
                  <p style="margin:0 0 14px;font-size:17px;font-weight:700;color:#0f172a;">Hello,</p>
                  <p style="margin:0 0 22px;color:#475569;">Your latest financial report is ready. A detailed PDF has been attached for your review.</p>
                  <div style="padding:17px 20px;border-radius:12px;background:#f0f9ff;border-left:4px solid #0ea5e9;margin-bottom:22px;">
                    <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#0369a1;font-weight:700;">Report period</div>
                    <div style="font-size:17px;color:#0f172a;font-weight:700;margin-top:3px;">${escapeHtml(dateRange)}</div>
                  </div>
                  <p style="margin:0;color:#475569;">The attached report gives you a clear summary of income, expenses, net position, and every transaction recorded during this period—helping you understand your progress and make informed financial decisions.</p>
                  <p style="margin:28px 0 0;color:#475569;">Thanks,<br><strong style="color:#0f172a;">FinTrack Team</strong></p>
                </td>
              </tr>
              <tr><td style="padding:16px 38px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">Confidential personal financial report • Generated securely by FinTrack</td></tr>
            </table>
          </body>
        </html>
      `,
      attachments: [
        { filename: 'fintrack-logo.svg', content: Buffer.from(FINTRACK_LOGO_SVG), contentType: 'image/svg+xml', cid: 'fintrack-logo' },
        { filename: `FinTrack-${periodLabel.replace(/\s+/g, '-')}.pdf`, content: pdf, contentType: 'application/pdf' },
      ],
    });
  }
}
