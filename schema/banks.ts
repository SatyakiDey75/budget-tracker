import { z } from "zod";

export const CreateBankSchema = z.object({
    bankName: z.string().min(1),
    branch: z.string().min(1),
    accountName: z.string().min(1),
    balance: z.coerce.number(),
});
export type CreateBankSchemaType = z.infer<typeof CreateBankSchema>;

export const UpdateBankSchema = z.object({
    id: z.string(),
    branch: z.string().min(1),
    accountName: z.string().min(1),
    balance: z.coerce.number(),
});
export type UpdateBankSchemaType = z.infer<typeof UpdateBankSchema>;

export const CreateCardSchema = z.object({
    bankName: z.string().min(1),
    accountName: z.string().min(1),
    limit: z.coerce.number().min(0),
});
export type CreateCardSchemaType = z.infer<typeof CreateCardSchema>;

export const UpdateCardSchema = z.object({
    id: z.string(),
    accountName: z.string().min(1),
    balance: z.coerce.number(),
    limit: z.coerce.number().min(0),
});
export type UpdateCardSchemaType = z.infer<typeof UpdateCardSchema>;

export const CreateCCBillPaymentSchema = z.object({
    creditCardId: z.string().min(1),
    bankId: z.string().min(1),
    amount: z.coerce.number().positive(),
    date: z.coerce.date(),
});
export type CreateCCBillPaymentSchemaType = z.infer<typeof CreateCCBillPaymentSchema>;
