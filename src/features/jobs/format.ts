export const money = (value: number | null) =>
  value === null
    ? "Not set"
    : new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value / 100);
export const jobTime = (value: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value)) + " SAST";
export const toSastInput = (value: string) =>
  new Date(Date.parse(value) + 7200000).toISOString().slice(0, 16);
export const fromSastInput = (value: string) => new Date(value + ":00+02:00").toISOString();
export const budgetInput = (value: number | null) =>
  value === null ? "" : (value / 100).toFixed(2);
