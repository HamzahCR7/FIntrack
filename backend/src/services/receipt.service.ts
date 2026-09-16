import { createWorker, PSM } from 'tesseract.js';
import sharp from 'sharp';
import { PDFParse } from 'pdf-parse';
import { BadRequestError } from '../common/errors';
import { ParseReceiptDto, ParsedReceiptData } from '../dtos/receipt.dto';

export class ReceiptService {
  async parseReceipt(payload: ParseReceiptDto): Promise<ParsedReceiptData> {
    const fileBuffer = this.decodeBase64(payload.imageBase64);
    const isPdf = payload.mimeType === 'application/pdf';

    const rawText = isPdf
      ? await this.extractTextFromPdf(fileBuffer)
      : await this.extractTextFromImage(fileBuffer);

    if (!rawText) {
      throw new BadRequestError('Unable to extract text from receipt. Please upload a clearer file.');
    }

    const amount = this.extractAmount(rawText);
    const amountCandidates = this.extractAmountCandidates(rawText, amount);

    return {
      amount,
      amountCandidates,
      merchant: this.extractMerchant(rawText),
      transactionDate: this.extractDate(rawText),
      currency: this.extractCurrency(rawText),
      paymentMethodHint: this.extractPaymentMethod(rawText),
      description: this.extractDescription(rawText),
      rawText,
    };
  }

  private decodeBase64(fileBase64: string): Buffer {
    try {
      return Buffer.from(fileBase64, 'base64');
    } catch {
      throw new BadRequestError('Invalid base64 file payload');
    }
  }

  private async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    const variants = await this.buildImageVariants(imageBuffer);
    const worker = await createWorker('eng');

    try {
      const texts: string[] = [];

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });

      for (const variant of variants) {
        const result = await worker.recognize(variant);
        const text = (result.data.text || '').trim();
        if (text) texts.push(text);
      }

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist: '0123456789.,₹INRRS',
      });

      for (const variant of variants.slice(1)) {
        const result = await worker.recognize(variant);
        const text = (result.data.text || '').trim();
        if (text) texts.push(text);
      }

      return texts.join('\n').trim();
    } finally {
      await worker.terminate();
    }
  }

  private async buildImageVariants(imageBuffer: Buffer): Promise<Buffer[]> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;

    if (!width || !height) {
      return [imageBuffer];
    }

    const enhancedFull = await sharp(imageBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .resize({ width: Math.min(1500, Math.round(width * 2.0)), withoutEnlargement: false })
      .png()
      .toBuffer();

    const amountBandTop = Math.max(0, Math.floor(height * 0.14));
    const amountBandHeight = Math.max(120, Math.floor(height * 0.24));
    const amountBandLeft = Math.max(0, Math.floor(width * 0.2));
    const amountBandWidth = Math.max(120, Math.floor(width * 0.6));

    const amountBand = await sharp(imageBuffer)
      .extract({
        left: amountBandLeft,
        top: amountBandTop,
        width: Math.min(amountBandWidth, width - amountBandLeft),
        height: Math.min(amountBandHeight, height - amountBandTop),
      })
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(170)
      .resize({ width: 1200, withoutEnlargement: false })
      .png()
      .toBuffer();

    return [imageBuffer, enhancedFull, amountBand];
  }

  private async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: pdfBuffer });
    try {
      const data = await parser.getText();
      return (data.text || '').trim();
    } catch {
      throw new BadRequestError('Failed to parse receipt PDF');
    } finally {
      await parser.destroy();
    }
  }

  private extractAmount(rawText: string): number | undefined {
    const normalized = this.normalizeText(rawText);
    const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);

    const gpayAmount = this.extractGpayAmount(lines);
    if (gpayAmount !== undefined) return gpayAmount;

    const totalMatch = normalized.match(/(?:GRAND\s*TOTAL|TOTAL\s*AMOUNT|AMOUNT\s*DUE|NET\s*TOTAL|TOTAL|PAID\s*AMOUNT|AMOUNT\s*PAID)\s*[:\-]?\s*(?:INR|RS\.?)?\s*([0-9]{2,7}(?:[.,][0-9]{1,2})?)/);
    if (totalMatch?.[1]) {
      return this.toNumber(totalMatch[1]);
    }

    const currencyMatch = normalized.match(/(?:₹|INR|RS\.?)\s*([0-9]{2,7}(?:[.,][0-9]{1,2})?)/);
    if (currencyMatch?.[1]) {
      return this.toNumber(currencyMatch[1]);
    }

    return undefined;
  }

  private extractAmountCandidates(rawText: string, primary?: number): number[] {
    const normalized = this.normalizeText(rawText);
    const tokens = [...normalized.matchAll(/(?:₹|INR|RS\.?)?\s*([0-9]{2,7}(?:[.,][0-9]{1,2})?)/g)]
      .map((m) => this.toNumber(m[1]))
      .filter((v): v is number => v !== undefined)
      .filter((v) => v >= 20 && v <= 200000);

    const all = primary !== undefined ? [primary, ...tokens] : tokens;
    return [...new Set(all)].slice(0, 5);
  }

  private extractGpayAmount(lines: string[]): number | undefined {
    const completedIndex = lines.findIndex((line) => line.includes('COMPLETED'));
    const scanStart = completedIndex > 0 ? Math.max(0, completedIndex - 6) : 0;
    const scanEnd = completedIndex > 0 ? completedIndex : Math.min(lines.length, 10);

    for (let i = scanStart; i < scanEnd; i += 1) {
      const line = lines[i];

      if (line.includes(':')) continue;
      if (line.includes('@')) continue;
      if (line.includes('BANK')) continue;
      if (line.includes('ACCOUNT')) continue;
      if (line.includes('TRANSACTION')) continue;
      if (line.includes('UPI')) continue;
      if (line.includes('GOOGLE PAY')) continue;
      if (line.includes('G PAY')) continue;
      if (/\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(line)) continue;
      if (/\b\d{1,2}\s+[A-Z]{3,9}\s+\d{2,4}\b/.test(line)) continue;

      const direct = line.match(/^(?:₹|INR|RS\.?)?\s*([0-9]{2,7}(?:[.,][0-9]{1,2})?)$/);
      if (direct?.[1]) {
        const parsed = this.toNumber(direct[1]);
        if (parsed !== undefined && parsed >= 20 && parsed <= 200000) {
          return parsed;
        }
      }

      const embedded = line.match(/(?:₹|INR|RS\.?)\s*([0-9]{2,7}(?:[.,][0-9]{1,2})?)/);
      if (embedded?.[1]) {
        const parsed = this.toNumber(embedded[1]);
        if (parsed !== undefined && parsed >= 20 && parsed <= 200000) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  private extractMerchant(rawText: string): string | undefined {
    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!lines.length) return undefined;

    const firstToLine = lines.find((line) => /^TO\s+/i.test(line));
    if (firstToLine) return firstToLine;

    const blocked = [/^TAX INVOICE/i, /^INVOICE/i, /^BILL/i, /^RECEIPT/i, /^DATE/i, /^TIME/i, /^TOTAL/i];
    return lines.find((line) => !blocked.some((pattern) => pattern.test(line)) && !/^[0-9\s\-:/.,]+$/.test(line));
  }

  private extractDate(rawText: string): string | undefined {
    const text = rawText.replace(/\r/g, '\n');

    const explicitDateTime = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s*,\s*(\d{2,4})\s+\d{1,2}:\d{2}(?::\d{2})?\b/);
    if (explicitDateTime) {
      const iso = this.parseDateCandidate(`${explicitDateTime[1]} ${explicitDateTime[2]} ${explicitDateTime[3]}`);
      if (iso) return iso;
    }

    const generalMatches = [
      ...text.matchAll(/\b\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}\b/g),
      ...text.matchAll(/\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/g),
      ...text.matchAll(/\b\d{1,2}[\s\/.\-]+[A-Za-z]{3,9}[\s,\/.\-]+'?\d{2,4}\b/g),
      ...text.matchAll(/\b[A-Za-z]{3,9}[\s\/.\-]+\d{1,2},?[\s,\/.\-]+'?\d{2,4}\b/g),
    ];

    for (const m of generalMatches) {
      const parsed = this.parseDateCandidate(m[0]);
      if (parsed) return parsed;
    }

    return undefined;
  }

  private parseDateCandidate(candidate: string): string | undefined {
    const cleaned = candidate.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();

    const ymd = cleaned.match(/(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);
    if (ymd) return this.toIsoDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));

    const dmy = cleaned.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (dmy) {
      const yy = Number(dmy[3]);
      const year = dmy[3].length === 2 ? 2000 + yy : yy;
      return this.toIsoDate(year, Number(dmy[2]), Number(dmy[1]));
    }

    const months: Record<string, number> = {
      JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
      JUL: 7, AUG: 8, SEP: 9, SEPT: 9, OCT: 10, NOV: 11, DEC: 12,
      JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, JUNE: 6,
      JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
    };

    const dMonY = cleaned.match(/(\d{1,2})[\s\/.\-]+([A-Za-z]{3,9})[\s\/.\-]+'?(\d{2,4})/i);
    if (dMonY) {
      const month = months[dMonY[2].toUpperCase()];
      if (!month) return undefined;
      const yy = Number(dMonY[3]);
      const year = dMonY[3].length === 2 ? 2000 + yy : yy;
      return this.toIsoDate(year, month, Number(dMonY[1]));
    }

    const monDY = cleaned.match(/([A-Za-z]{3,9})[\s\/.\-]+(\d{1,2}),?[\s\/.\-]+'?(\d{2,4})/i);
    if (monDY) {
      const month = months[monDY[1].toUpperCase()];
      if (!month) return undefined;
      const yy = Number(monDY[3]);
      const year = monDY[3].length === 2 ? 2000 + yy : yy;
      return this.toIsoDate(year, month, Number(monDY[2]));
    }

    return undefined;
  }

  private toIsoDate(year: number, month: number, day: number): string | undefined {
    if (year < 2000 || year > 2100) return undefined;
    if (month < 1 || month > 12) return undefined;
    if (day < 1 || day > 31) return undefined;

    const date = new Date(Date.UTC(year, month - 1, day));
    const same = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    if (!same) return undefined;

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private extractCurrency(rawText: string): string {
    const upperText = rawText.toUpperCase();

    if (upperText.includes('INR') || upperText.includes('RS') || rawText.includes('₹')) return 'INR';
    if (upperText.includes('USD') || upperText.includes('$')) return 'USD';
    if (upperText.includes('EUR')) return 'EUR';
    if (upperText.includes('GBP')) return 'GBP';

    return 'INR';
  }

  private extractPaymentMethod(rawText: string): 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CASH' | 'UPI' | undefined {
    const upperText = rawText.toUpperCase();

    if (upperText.includes('AMAZON PAY') || upperText.includes('AMAZONPAY')) {
      return 'UPI';
    }

    if (upperText.includes('UPI') || upperText.includes('GPAY') || upperText.includes('GOOGLE PAY') || upperText.includes('PHONEPE') || upperText.includes('PAYTM')) {
      return 'UPI';
    }

    if (upperText.includes('VISA') || upperText.includes('MASTERCARD') || upperText.includes('CREDIT CARD') || upperText.includes('CARD NO')) {
      return 'CREDIT_CARD';
    }

    if (upperText.includes('CASH')) return 'CASH';
    if (upperText.includes('BANK') || upperText.includes('IMPS') || upperText.includes('NEFT') || upperText.includes('RTGS')) return 'BANK_TRANSFER';

    return undefined;
  }

  private extractDescription(rawText: string): string | undefined {
    const compact = rawText.replace(/\s+/g, ' ').trim();
    if (!compact) return undefined;
    return compact.slice(0, 180);
  }

  private normalizeText(rawText: string): string {
    return rawText
      .toUpperCase()
      .replace(/[_|]/g, ' ')
      .replace(/[\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toNumber(value: string): number | undefined {
    const normalized = value
      .replace(/,/g, '')
      .replace(/[O]/g, '0')
      .replace(/[I|L]/g, '1');

    const parsed = Number.parseFloat(normalized);
    if (Number.isNaN(parsed) || parsed <= 0) return undefined;
    return parsed;
  }
}
