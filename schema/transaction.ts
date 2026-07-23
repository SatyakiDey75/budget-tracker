import { z } from "zod";

export const CreateTransactionSchema = z.object({
    amount: z.coerce.number().positive().multipleOf(0.01),
    description: z.string().optional(),
    date: z.coerce.date(),
    category: z.string(),
    type: z.union([z.literal("income"), z.literal("expense")]),
    bankId: z.string().optional(),
    merchantName: z.string().optional(),
})

export type CreateTransactionSchemaType = z.infer<typeof CreateTransactionSchema>;

export const CreateInvestmentSchema = z.object({
    amount: z.coerce.number().positive().multipleOf(0.01),
    description: z.string().optional(),
    date: z.coerce.date(),
    type: z.literal("investment"),
    bankId: z.string().optional(),
    investmentApp: z.string().optional(),
});

export type CreateInvestmentSchemaType = z.infer<typeof CreateInvestmentSchema>;

export const UpdateTransactionSchema = z.object({
    transactionId: z.string(),
    amount: z.coerce.number().positive().multipleOf(0.01),
    description: z.string().optional(),
    date: z.coerce.date(),
    category: z.string().optional(),
    type: z.union([z.literal("income"), z.literal("expense"), z.literal("investment")]),
    bankId: z.string().optional(),
    merchantName: z.string().optional(),
    investmentApp: z.string().optional(),
});

export type UpdateTransactionSchemaType = z.infer<typeof UpdateTransactionSchema>;
