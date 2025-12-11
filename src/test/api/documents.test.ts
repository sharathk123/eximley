import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSupabase = {
    auth: {
        getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
        }),
    },
    from: vi.fn((table) => {
        if (table === 'company_users') {
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { company_id: 'company-123' },
                            error: null,
                        }),
                    }),
                }),
            }
        }
        return {
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
                }),
            }),
            select: vi.fn().mockReturnThis(),
        }
    }),
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
}))

describe('Documents Upload API', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('POST /api/documents/upload', () => {
        it('should reject files larger than 10MB', async () => {
            const { POST } = await import('@/app/api/documents/upload/route')

            const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
                type: 'application/pdf',
            })

            const formData = new FormData()
            formData.append('file', largeFile)
            formData.append('document_type', 'invoice')

            const request = new NextRequest('http://localhost/api/documents/upload', {
                method: 'POST',
                body: formData,
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toContain('10MB')
        })

        it('should reject invalid file types', async () => {
            const { POST } = await import('@/app/api/documents/upload/route')

            const invalidFile = new File(['content'], 'file.exe', {
                type: 'application/x-msdownload',
            })

            const formData = new FormData()
            formData.append('file', invalidFile)
            formData.append('document_type', 'invoice')

            const request = new NextRequest('http://localhost/api/documents/upload', {
                method: 'POST',
                body: formData,
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toContain('Invalid file type')
        })

        it('should upload valid PDF file', async () => {
            const mockDocument = {
                id: 'doc-1',
                file_name: 'test.pdf',
                file_path: 'company-123/invoice/123_test.pdf',
            }

            mockSupabase.storage.from.mockReturnValue({
                upload: vi.fn().mockResolvedValue({ error: null }),
                remove: vi.fn(),
            })

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'company_users') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { company_id: 'company-123' },
                                    error: null,
                                }),
                            }),
                        }),
                    }
                }
                return {
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockDocument,
                                error: null,
                            }),
                        }),
                    }),
                }
            })

            const { POST } = await import('@/app/api/documents/upload/route')

            const validFile = new File(['PDF content'], 'test.pdf', {
                type: 'application/pdf',
            })

            const formData = new FormData()
            formData.append('file', validFile)
            formData.append('document_type', 'invoice')

            const request = new NextRequest('http://localhost/api/documents/upload', {
                method: 'POST',
                body: formData,
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.document).toEqual(mockDocument)
        })

        it('should rollback storage upload on database error', async () => {
            const removeMock = vi.fn()

            mockSupabase.storage.from.mockReturnValue({
                upload: vi.fn().mockResolvedValue({ error: null }),
                remove: removeMock,
            })

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'company_users') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { company_id: 'company-123' },
                                    error: null,
                                }),
                            }),
                        }),
                    }
                }
                return {
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: null,
                                error: new Error('Database error'),
                            }),
                        }),
                    }),
                }
            })

            const { POST } = await import('@/app/api/documents/upload/route')

            const file = new File(['content'], 'test.pdf', {
                type: 'application/pdf',
            })

            const formData = new FormData()
            formData.append('file', file)
            formData.append('document_type', 'invoice')

            const request = new NextRequest('http://localhost/api/documents/upload', {
                method: 'POST',
                body: formData,
            })

            const response = await POST(request)

            expect(response.status).toBe(500)
            expect(removeMock).toHaveBeenCalled()
        })
    })

    describe('GET /api/documents/upload', () => {
        it('should list documents with filters', async () => {
            const mockDocuments = [
                { id: '1', document_type: 'invoice' },
                { id: '2', document_type: 'invoice' },
            ]

            const mockQuery = {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                then: (resolve: any) => resolve({ data: mockDocuments, error: null }),
            }

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'company_users') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { company_id: 'company-123' },
                                    error: null,
                                }),
                            }),
                        }),
                    }
                }
                return {
                    select: vi.fn().mockReturnValue(mockQuery),
                }
            })

            const { GET } = await import('@/app/api/documents/upload/route')
            const request = new NextRequest('http://localhost/api/documents/upload?document_type=invoice')

            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.documents).toEqual(mockDocuments)
            expect(mockQuery.eq).toHaveBeenCalledWith('document_type', 'invoice')
        })
    })
})
