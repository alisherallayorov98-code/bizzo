import 'reflect-metadata'

jest.setTimeout(30000)

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_minimum_32_chars_long_ok'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_minimum_32_chars_ok'
process.env.JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m'
process.env.JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d'

afterEach(() => jest.clearAllMocks())
