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
