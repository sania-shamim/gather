import fs from "fs";

const expenses = JSON.parse(fs.readFileSync("extraction-test.json", "utf8"));

// 1. Work out each person's balance: paid minus their share
const balance = {};
for (const e of expenses) {
  const share = e.amount / e.split_between.length;
  balance[e.payer] = (balance[e.payer] || 0) + e.amount;
  for (const p of e.split_between) {
    balance[p] = (balance[p] || 0) - share;
  }
}

// Round to avoid floating-point noise
for (const p in balance) balance[p] = Math.round(balance[p]);

console.log("Balances:", balance);

// 2. Match the biggest debtor with the biggest creditor until everyone is zero
const payments = [];
while (true) {
  const names = Object.keys(balance);
  const creditor = names.reduce((a, b) => (balance[b] > balance[a] ? b : a));
  const debtor = names.reduce((a, b) => (balance[b] < balance[a] ? b : a));
  const amount = Math.min(balance[creditor], -balance[debtor]);
  if (amount <= 0) break;

  payments.push({ from: debtor, to: creditor, amount });
  balance[creditor] -= amount;
  balance[debtor] += amount;
}

console.log("Payments:");
for (const p of payments) console.log(`${p.from} pays ${p.to} ${p.amount}`);
