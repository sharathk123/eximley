import { describe, it, expect } from 'vitest'
import {
    getUserCompanyId,
    sanitizeInput,
    compareAmounts,
    toCents,
    fromCents
} from '@/lib/helpers/api'

describe('API Helpers', () => {
    describe('sanitizeInput', () => {
        it('should only include whitelisted fields', () => {
            const input = {
                name: 'Test',
                email: 'test@example.com',
                malicious: 'DROP TABLE users',
                id: '123',
            }
            const allowedFields = ['name', 'email']

            const result = sanitizeInput(input, allowedFields)

            expect(result).toEqual({
                name: 'Test',
                email: 'test@example.com',
            })
            expect(result).not.toHaveProperty('malicious')
            expect(result).not.toHaveProperty('id')
        })

        it('should return empty object if no valid fields', () => {
            const input = { malicious: 'data' }
            const allowedFields = ['name', 'email']

            const result = sanitizeInput(input, allowedFields)

            expect(result).toEqual({})
        })
    })

    describe('Currency Helpers', () => {
        it('should convert to cents correctly', () => {
            expect(toCents(10.50)).toBe(1050)
            expect(toCents(0.01)).toBe(1)
            expect(toCents(100)).toBe(10000)
        })

        it('should convert from cents correctly', () => {
            expect(fromCents(1050)).toBe(10.50)
            expect(fromCents(1)).toBe(0.01)
            expect(fromCents(10000)).toBe(100)
        })

        it('should handle floating point precision', () => {
            // Classic floating point issue: 0.1 + 0.2 !== 0.3
            const amount1 = 0.1
            const amount2 = 0.2

            // Using our helper
            const cents1 = toCents(amount1)
            const cents2 = toCents(amount2)
            const totalCents = cents1 + cents2

            expect(totalCents).toBe(30) // Exact!
            expect(fromCents(totalCents)).toBe(0.3)
        })

        it('should compare amounts correctly', () => {
            expect(compareAmounts(10.50, 10.50)).toBe(0)
            expect(compareAmounts(10.51, 10.50)).toBe(1)
            expect(compareAmounts(10.49, 10.50)).toBe(-1)

            // Floating point edge case
            expect(compareAmounts(0.1 + 0.2, 0.3)).toBe(0) // Would fail with direct comparison
        })
    })
})
