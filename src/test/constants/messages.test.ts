import { describe, it, expect } from 'vitest'
import { ERRORS, SUCCESS } from '@/lib/constants/messages'

describe('Message Constants', () => {
    describe('ERRORS', () => {
        it('should have all required error messages', () => {
            expect(ERRORS.UNAUTHORIZED).toBeDefined()
            expect(ERRORS.COMPANY_NOT_FOUND).toBeDefined()
            expect(ERRORS.FILE_TOO_LARGE).toBeDefined()
            expect(ERRORS.INVALID_FILE_TYPE).toBeDefined()
            expect(ERRORS.DOCUMENT_NOT_FOUND).toBeDefined()
        })

        it('should have consistent error message format', () => {
            // All error messages should be strings
            Object.values(ERRORS).forEach(message => {
                expect(typeof message).toBe('string')
                expect(message.length).toBeGreaterThan(0)
            })
        })
    })

    describe('SUCCESS', () => {
        it('should have all required success messages', () => {
            expect(SUCCESS.CREATED).toBeDefined()
            expect(SUCCESS.UPDATED).toBeDefined()
            expect(SUCCESS.DELETED).toBeDefined()
            expect(SUCCESS.UPLOADED).toBeDefined()
        })
    })
})
