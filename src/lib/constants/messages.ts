// Error constants for consistent error messaging
export const ERRORS = {
    // Authentication
    UNAUTHORIZED: "Unauthorized access",
    SESSION_EXPIRED: "Session expired. Please log in again",

    // Company
    COMPANY_NOT_FOUND: "Company not found",
    COMPANY_ACCESS_DENIED: "Access denied to company resources",

    // File Upload
    FILE_TOO_LARGE: "File exceeds maximum size of 10MB",
    INVALID_FILE_TYPE: "Invalid file type. Only PDF and images (JPG, PNG) allowed",
    INVALID_MIME_TYPE: "Invalid MIME type",
    FILE_UPLOAD_FAILED: "File upload failed. Please try again",

    // Document
    DOCUMENT_NOT_FOUND: "Document not found",
    DOCUMENT_GENERATION_FAILED: "Failed to generate document. Please try again",

    // Validation
    MISSING_REQUIRED_FIELDS: "Missing required fields",
    INVALID_INPUT: "Invalid input provided",
    NO_VALID_FIELDS: "No valid fields to update",

    // Database
    DATABASE_ERROR: "Database operation failed",
    RECORD_NOT_FOUND: "Record not found",

    // Generic
    INTERNAL_ERROR: "Internal server error. Please try again",
    OPERATION_FAILED: "Operation failed. Please try again",
} as const;

// Success messages
export const SUCCESS = {
    CREATED: "Created successfully",
    UPDATED: "Updated successfully",
    DELETED: "Deleted successfully",
    UPLOADED: "Uploaded successfully",
} as const;
