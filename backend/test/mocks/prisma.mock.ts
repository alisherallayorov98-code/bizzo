export const createPrismaMock = () => ({
  $transaction: jest.fn(async (arg: any) => {
    if (typeof arg === 'function') return arg(createPrismaMock())
    return Promise.all(arg)
  }),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  user: makeModelMock(),
  company: makeModelMock(),
  contact: makeModelMock(),
  product: makeModelMock(),
  category: makeModelMock(),
  debt: makeModelMock(),
  debtPayment: makeModelMock(),
  billingPlan: makeModelMock(),
  subscription: makeModelMock(),
  billingInvoice: makeModelMock(),
  billingPayment: makeModelMock(),
  promoCode: makeModelMock(),
  refreshToken: makeModelMock(),
  stockMovement: makeModelMock(),
  auditLog: makeModelMock(),
  emailVerification: makeModelMock(),
  passwordReset: makeModelMock(),
  emailLog: makeModelMock(),
  notification: makeModelMock(),
  debtRecord: makeModelMock(),
  salaryRecord: makeModelMock(),
  contract: makeModelMock(),
  stockItem: makeModelMock(),
  employee: makeModelMock(),
  warehouse: makeModelMock(),
  deal: makeModelMock(),
})

function makeModelMock() {
  return {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  }
}

export type PrismaMock = ReturnType<typeof createPrismaMock>
