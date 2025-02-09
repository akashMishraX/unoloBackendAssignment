export default class ApiResponse {
    // Class constants for status codes
    static STATUS_SUCCESS = 200;
    static STATUS_CREATED = 201;
    static STATUS_BAD_REQUEST = 400;
    static STATUS_UNAUTHORIZED = 401;
    static STATUS_FORBIDDEN = 403;
    static STATUS_NOT_FOUND = 404;
    static STATUS_VALIDATION_ERROR = 422;
    static STATUS_SERVER_ERROR = 500;

    constructor() {
        this.success = false;
        this.message = '';
        this.data = null;
        this.statusCode = ApiResponse.STATUS_SUCCESS;
        this.error = null;
    }

    // Getters
    getSuccess() {
        return this.success;
    }

    getMessage() {
        return this.message;
    }

    getData() {
        return this.data;
    }

    getStatusCode() {
        return this.statusCode;
    }

    getError() {
        return this.error;
    }

    // Setters
    setSuccess(success) {
        this.success = success;
        return this;
    }

    setMessage(message) {
        this.message = message;
        return this;
    }

    setData(data) {
        this.data = data;
        return this;
    }

    setStatusCode(statusCode) {
        this.statusCode = statusCode;
        return this;
    }

    setError(error) {
        this.error = error;
        return this;
    }

    // Static methods for common responses
    static success(data = null, message = 'Operation successful') {
        const response = new ApiResponse();
        response.setSuccess(true)
               .setData(data)
               .setMessage(message)
               .setStatusCode(ApiResponse.STATUS_SUCCESS);
        return response;
    }

    static error(message = 'Operation failed', statusCode = ApiResponse.STATUS_BAD_REQUEST, error = null) {
        const response = new ApiResponse();
        response.setSuccess(false)
               .setMessage(message)
               .setStatusCode(statusCode)
               .setError(error);
        return response;
    }

    static notFound(message = 'Resource not found') {
        return ApiResponse.error(message, ApiResponse.STATUS_NOT_FOUND);
    }

    static unauthorized(message = 'Unauthorized access') {
        return ApiResponse.error(message, ApiResponse.STATUS_UNAUTHORIZED);
    }

    static forbidden(message = 'Access forbidden') {
        return ApiResponse.error(message, ApiResponse.STATUS_FORBIDDEN);
    }

    static validationError(errors) {
        return ApiResponse.error('Validation failed', ApiResponse.STATUS_VALIDATION_ERROR, errors);
    }

    static serverError(message = 'Internal server error') {
        return ApiResponse.error(message, ApiResponse.STATUS_SERVER_ERROR);
    }

    // Convert to plain object
    toJSON() {
        return {
            success: this.success,
            message: this.message,
            data: this.data,
            statusCode: this.statusCode,
            error: this.error
        };
    }
}