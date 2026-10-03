import { z } from 'zod';

export const EmailReportSchema = z.object({
  email: z.string().trim().email(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  periodLabel: z.string().trim().min(1).max(100),
  enableMonthly: z.boolean().optional(),
}).refine((value) => new Date(value.startDate) <= new Date(value.endDate), {
  message: 'startDate must be on or before endDate',
  path: ['startDate'],
});

export type EmailReportDto = z.infer<typeof EmailReportSchema>;
