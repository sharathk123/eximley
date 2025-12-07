import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withTransaction, generateAndStoreDocument } from '@/lib/helpers/transactions'

describe('Transaction Helpers', () => {
    describe('withTransaction', () => {
        it('should execute all operations successfully', async () => {
            const mockSupabase = {} as any

            const operations = [
                async () => ({ data: { step: 1 }, error: null }),
                async () => ({ data: { step: 2 }, error: null }),
                async () => ({ data: { step: 3 }, error: null }),
            ]

            const result = await withTransaction(mockSupabase, operations)

            expect(result.error).toBeNull()
            expect(result.data).toEqual({ step: 3 })
        })

        it('should rollback on error', async () => {
            const mockSupabase = {} as any
            const rollbackFn = vi.fn()

            const operations = [
                async () => ({
                    data: { step: 1 },
                    error: null,
                    rollback: rollbackFn
                }),
                async () => ({
                    data: null,
                    error: new Error('Operation failed')
                }),
            ]

            const result = await withTransaction(mockSupabase, operations)

            expect(result.error).toBeDefined()
            expect(result.data).toBeNull()
            expect(rollbackFn).toHaveBeenCalled()
        })

        it('should rollback all previous operations on failure', async () => {
            const mockSupabase = {} as any
            const rollback1 = vi.fn()
            const rollback2 = vi.fn()

            const operations = [
                async () => ({ data: 1, error: null, rollback: rollback1 }),
                async () => ({ data: 2, error: null, rollback: rollback2 }),
                async () => ({ data: null, error: new Error('Failed') }),
            ]

            await withTransaction(mockSupabase, operations)

            expect(rollback1).toHaveBeenCalled()
            expect(rollback2).toHaveBeenCalled()
        })
    })
})
