// ================================================
// BIZNES HISOB-KITOBLAR
// ================================================

export function calcVAT(amount: number, rate: number = 12): number {
  return amount * (rate / 100)
}

export function calcWithVAT(amount: number, rate: number = 12): number {
  return amount * (1 + rate / 100)
}

export function calcMargin(buyPrice: number, sellPrice: number): number {
  if (buyPrice <= 0) return 0
  return ((sellPrice - buyPrice) / sellPrice) * 100
}

export function calcMarkup(buyPrice: number, sellPrice: number): number {
  if (buyPrice <= 0) return 0
  return ((sellPrice - buyPrice) / buyPrice) * 100
}

export function calcProfit(buyPrice: number, sellPrice: number, quantity: number): number {
  return (sellPrice - buyPrice) * quantity
}

export function calcDiscount(price: number, discountPercent: number): number {
  return price * (1 - discountPercent / 100)
}

export function calcTotalWithDiscount(
  items: Array<{ price: number; quantity: number; discount?: number }>
): number {
  return items.reduce((total, item) => {
    const discounted = item.discount
      ? calcDiscount(item.price, item.discount)
      : item.price
    return total + discounted * item.quantity
  }, 0)
}

// Ish haqi hisoblash
export function calcMonthlySalary(
  baseSalary: number,
  bonus: number = 0,
  deduction: number = 0,
  advance: number = 0
): number {
  return baseSalary + bonus - deduction - advance
}

export function calcDailyAmount(dailyRate: number, hoursWorked: number): number {
  return (hoursWorked / 8) * dailyRate
}

// Foiz o'zgarish
export function calcChangePercent(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100
}

// Weighted average price (o'rtacha tortilgan narx)
export function calcWeightedAvgPrice(
  currentQty: number,
  currentPrice: number,
  newQty: number,
  newPrice: number
): number {
  const totalQty = currentQty + newQty
  if (totalQty === 0) return 0
  return (currentQty * currentPrice + newQty * newPrice) / totalQty
}
