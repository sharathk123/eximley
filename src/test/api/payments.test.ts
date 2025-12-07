import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase
const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn(),
    storage: {
        from: vi.fn(),
    },
}

vi.mock('@/lib/supabase/server', () => ({
    createSessionClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/helpers/api', () => ({
    getUserAndCompany: vi.fn(() => Promise.resolve({
        user: { id: 'user-123' },
        companyId: 'company-123',
    })),
    compareAmounts: vi.fn((a, b) => {
        const diff = Math.round(a * 100) - Math.round(b * 100)
        return diff === 0 ? 0 : diff > 0 ? 1 : -1
    }),
}))

describe('Payments API', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('GET /api/payments', () => {
        it('should return payments for a company', async () => {
            const mockPayments = [
                {
                    id: '1',
                    amount: 1000,
                    payment_date: '2024-01-01',
                    payment_method: 'wire',
                },
            ]

            const mockQuery = {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockPayments,
                    error: null,
                }),
            }

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue(mockQuery),
            })

            const { GET } = await import('@/app/api/payments/route')
            const request = new NextRequest('http://localhost/api/payments')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.payments).toEqual(mockPayments)
        })

        it('should filter payments by order_id', async () => {
            const mockQuery = {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            }

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue(mockQuery),
            })

            const { GET } = await import('@/app/api/payments/route')
            const request = new NextRequest('http://localhost/api/payments?order_id=order-123')
            await GET(request)

            expect(mockQuery.eq).toHaveBeenCalledWith('order_id', 'order-123')
        })
    })

    describe('POST /api/payments', () => {
        it('should create a payment and update order status', async () => {
            const mockPayment = {
                id: 'payment-1',
                amount: 500,
                order_id: 'order-1',
            }

            const mockAllPayments = [{ amount: 500 }]
            const mockOrder = { total_amount: 1000 }

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'order_payments') {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockPayment,
                                    error: null,
                                }),
                            }),
                        }),
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                data: mockAllPayments,
                                error: null,
                            }),
                        }),
                    }
                }
                if (table === 'export_orders') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockOrder,
                                    error: null,
                                }),
                            }),
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({ error: null }),
                        }),
                    }
                }
            })

            const { POST } = await import('@/app/api/payments/route')
            const request = new NextRequest('http://localhost/api/payments', {
                method: 'POST',
                body: JSON.stringify({
                    order_id: 'order-1',
                    amount: 500,
                    payment_date: '2024-01-01',
                    currency_code: 'USD',
                    payment_method: 'wire',
                }),
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.payment).toEqual(mockPayment)
        })

        it('should set status to partial when partially paid', async () => {
            const mockAllPayments = [{ amount: 300 }, { amount: 200 }]
            const mockOrder = { total_amount: 1000 }

            let capturedStatus = ''

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'order_payments') {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: '1', amount: 200 },
                                    error: null,
                                }),
                            }),
                        }),
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                data: mockAllPayments,
                                error: null,
                            }),
                        }),
                    }
                }
                if (table === 'export_orders') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockOrder,
                                    error: null,
                                }),
                            }),
                        }),
                        update: vi.fn((updates) => {
                            capturedStatus = updates.payment_status
                            return {
                                eq: vi.fn().mockResolvedValue({ error: null }),
                            }
                        }),
                    }
                }
            })

            const { POST } = await import('@/app/api/payments/route')
            const request = new NextRequest('http://localhost/api/payments', {
                method: 'POST',
                body: JSON.stringify({
                    order_id: 'order-1',
                    amount: 200,
                    payment_date: '2024-01-01',
                    currency_code: 'USD',
                    payment_method: 'wire',
                }),
            })

            await POST(request)
            expect(capturedStatus).toBe('partial')
        })
    })
})
