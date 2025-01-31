export const Currencies = [
    { value: "INR", label: "₹ Rupee", locale: "en-IN" },
    { value: "EUR", label: "€ Euro", locale: "de-DE" },
    { value: "GBP", label: "£ Pound", locale: "en-GB" },
    { value: "USD", label: "$ Dollar", locale: "en-US" },
    { value: "JPY", label: "¥ Yen", locale: "ja-JP" }
];

export type Currency = (typeof Currencies[0]);