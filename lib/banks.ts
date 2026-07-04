export const SUPPORTED_BANKS = [
    { label: "HDFC Bank", value: "HDFC Bank", logo: "/banks/hdfc.jpg" },
    { label: "Punjab National Bank (PNB)", value: "Punjab National Bank", logo: "/banks/pnb.jpg" },
    { label: "State Bank of India (SBI)", value: "State Bank of India", logo: "/banks/sbi.jpg" },
] as const;

export function getBankLogo(bankName: string): string {
    const upper = bankName.toUpperCase();
    if (upper.includes("HDFC")) return "/banks/hdfc.jpg";
    if (upper.includes("PNB") || upper.includes("PUNJAB")) return "/banks/pnb.jpg";
    if (upper.includes("SBI") || upper.includes("STATE BANK")) return "/banks/sbi.jpg";
    return "/banks/default.jpg";
}
