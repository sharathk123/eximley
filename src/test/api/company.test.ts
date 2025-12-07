import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSupabase = {
    from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
    createSessionClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/helpers/api', () => ({
    getUserAndCompany: vi.fn(() => Promise.resolve({
        user: { id: 'user-123' },
        companyId: 'company-123',
    })),
    sanitizeInput: vi.fn((data, fields) => {
        return Object.keys(data)
            .filter(key => fields.includes(key))
            .reduce((obj, key) => ({ ...obj, [key]: data[key] }), {})
    }),
}))

describe('Company Profile API', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('GET /api/company/profile', () => {
        it('should return company profile', async () => {
            const mockCompany = {
                id: 'company-123',
                legal_name: 'Test Company',
                email: 'test@company.com',
            }

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockCompany,
                            error: null,
                        }),
                    }),
                }),
            })

            const { GET } = await import('@/app/api/company/profile/route')
            const request = new NextRequest('http://localhost/api/company/profile')

            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.company).toEqual(mockCompany)
        })
    })

    describe('PUT /api/company/profile', () => {
        it('should update company profile with sanitized input', async () => {
            const mockCompany = {
                id: 'company-123',
                legal_name: 'Updated Company',
            }

            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockCompany,
                                error: null,
                            }),
                        }),
                    }),
                }),
            })

            const { PUT } = await import('@/app/api/company/profile/route')
            const request = new NextRequest('http://localhost/api/company/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    legal_name: 'Updated Company',
                    malicious_field: 'DROP TABLE',
                }),
            })

            const response = await PUT(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
        })

        it('should reject empty updates', async () => {
            const { PUT } = await import('@/app/api/company/profile/route')
            const request = new NextRequest('http://localhost/api/company/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    invalid_field: 'value',
                }),
            })

            const response = await PUT(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toContain('No valid fields')
        })
    })
})
