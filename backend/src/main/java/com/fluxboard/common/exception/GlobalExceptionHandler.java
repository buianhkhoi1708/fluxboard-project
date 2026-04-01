package com.fluxboard.common.exception;

import com.fluxboard.common.dto.ApiErrorResponse;
import com.fluxboard.common.dto.FieldErrorDetail;
import com.fluxboard.common.filter.RequestIdFilter;
import com.mongodb.MongoException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiErrorResponse> handleAppException(AppException ex, HttpServletRequest request) {
        ErrorCode errorCode = ex.getErrorCode();
        return buildErrorResponse(errorCode, ex.getMessage(), request.getRequestURI(), List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        List<FieldErrorDetail> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new FieldErrorDetail(error.getField(), error.getDefaultMessage()))
                .collect(Collectors.toList());

        return buildErrorResponse(
                ErrorCode.VALIDATION_ERROR,
                ErrorCode.VALIDATION_ERROR.getDefaultMessage(),
                request.getRequestURI(),
                errors
        );
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<ApiErrorResponse> handleBindException(BindException ex, HttpServletRequest request) {
        List<FieldErrorDetail> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new FieldErrorDetail(error.getField(), error.getDefaultMessage()))
                .collect(Collectors.toList());

        return buildErrorResponse(
                ErrorCode.VALIDATION_ERROR,
                ErrorCode.VALIDATION_ERROR.getDefaultMessage(),
                request.getRequestURI(),
                errors
        );
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex,
            HttpServletRequest request
    ) {
        List<FieldErrorDetail> errors = ex.getConstraintViolations()
                .stream()
                .map(this::toFieldErrorDetail)
                .collect(Collectors.toList());

        return buildErrorResponse(
                ErrorCode.VALIDATION_ERROR,
                ErrorCode.VALIDATION_ERROR.getDefaultMessage(),
                request.getRequestURI(),
                errors
        );
    }

    @ExceptionHandler({
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class,
            IllegalArgumentException.class
    })
    public ResponseEntity<ApiErrorResponse> handleBadRequest(Exception ex, HttpServletRequest request) {
        return buildErrorResponse(ErrorCode.BAD_REQUEST, ex.getMessage(), request.getRequestURI(), List.of());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleMalformedJson(
            HttpMessageNotReadableException ex,
            HttpServletRequest request
    ) {
        return buildErrorResponse(
                ErrorCode.MALFORMED_JSON,
                ErrorCode.MALFORMED_JSON.getDefaultMessage(),
                request.getRequestURI(),
                List.of()
        );
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodNotAllowed(
            HttpRequestMethodNotSupportedException ex,
            HttpServletRequest request
    ) {
        return buildErrorResponse(
                ErrorCode.METHOD_NOT_ALLOWED,
                ErrorCode.METHOD_NOT_ALLOWED.getDefaultMessage(),
                request.getRequestURI(),
                List.of()
        );
    }

    @ExceptionHandler({
            NoHandlerFoundException.class,
            NoResourceFoundException.class
    })
    public ResponseEntity<ApiErrorResponse> handleNotFound(Exception ex, HttpServletRequest request) {
        return buildErrorResponse(
                ErrorCode.NOT_FOUND,
                ErrorCode.NOT_FOUND.getDefaultMessage(),
                request.getRequestURI(),
                List.of()
        );
    }

    @ExceptionHandler({
            DataAccessException.class,
            MongoException.class
    })
    public ResponseEntity<ApiErrorResponse> handleDatabaseException(Exception ex, HttpServletRequest request) {
        log.error("Database error: {}", ex.getMessage(), ex);
        return buildErrorResponse(
                ErrorCode.DATABASE_ERROR,
                ErrorCode.DATABASE_ERROR.getDefaultMessage(),
                request.getRequestURI(),
                List.of()
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnhandledException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return buildErrorResponse(
                ErrorCode.INTERNAL_ERROR,
                ErrorCode.INTERNAL_ERROR.getDefaultMessage(),
                request.getRequestURI(),
                List.of()
        );
    }

    private FieldErrorDetail toFieldErrorDetail(ConstraintViolation<?> violation) {
        String path = violation.getPropertyPath() != null ? violation.getPropertyPath().toString() : "";
        return new FieldErrorDetail(path, violation.getMessage());
    }

    private ResponseEntity<ApiErrorResponse> buildErrorResponse(
            ErrorCode errorCode,
            String message,
            String path,
            List<FieldErrorDetail> errors
    ) {
        String resolvedMessage = StringUtils.hasText(message) ? message : errorCode.getDefaultMessage();
        String traceId = resolveTraceId();
        ApiErrorResponse body = ApiErrorResponse.of(errorCode.getCode(), resolvedMessage, path, errors, traceId);
        return ResponseEntity.status(errorCode.getHttpStatus()).body(body);
    }

    private String resolveTraceId() {
        String traceId = MDC.get(RequestIdFilter.MDC_KEY);
        if (StringUtils.hasText(traceId)) {
            return traceId;
        }

        return UUID.randomUUID().toString();
    }
}
