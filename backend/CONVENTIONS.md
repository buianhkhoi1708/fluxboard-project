# Fluxboard Project Conventions (Bản đơn giản - Tiếng Việt)

## 1. Nguyên tắc chung

- Code đơn giản, rõ ràng, dễ test.
- Không trả về `Map` hoặc `Object` từ controller.
- Logic nghiệp vụ nằm ở service, không viết trong controller.
- API dùng prefix `/api/v1`.
- Sử dụng Java 17.

---

## 2. Cấu trúc package

### Common (dùng chung)

- `common.config`: cấu hình chung
- `common.controller`: API chung (health-check, ...)
- `common.dto`: request/response chuẩn
- `common.entity`: base entity (BaseDocument)
- `common.exception`: xử lý lỗi global
- `common.filter`: filter (RequestIdFilter)
- `common.service`: interface dùng chung (CrudService)

### Feature module

- `com.fluxboard.<feature>.controller`
- `com.fluxboard.<feature>.service`
- `com.fluxboard.<feature>.repository`
- `com.fluxboard.<feature>.dto`
- `com.fluxboard.<feature>.entity`

---

## 3. Chuẩn API response

### Success

````json
{
  "success": true,
  "code": "SUCCESS",
  "message": "Message dễ hiểu",
  "data": {},
  "meta": null,
  "timestamp": "ISO time"
}

### Error
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Mô tả lỗi",
  "path": "/api/v1/xxx",
  "errors": [],
  "traceId": "request-id",
  "timestamp": "ISO time"
}
````

## Pagination

- API dạng list phải trả `meta` (PageMeta)
- Tối thiểu gồm:
  - page
  - size
  - totalElements
  - totalPages
  - hasNext
  - hasPrevious

---

## 4. Xử lý lỗi (Error Handling)

- Dùng `AppException` + `ErrorCode` cho lỗi nghiệp vụ
- Không trả stack trace ra client
- Tất cả lỗi xử lý tại `GlobalExceptionHandler`

### Quy ước lỗi:

- VALIDATION_ERROR → lỗi validate
- MALFORMED_JSON → JSON sai format
- METHOD_NOT_ALLOWED → sai HTTP method
- DATABASE_ERROR → lỗi database

---

## 5. HTTP Status

- SUCCESS → 200 / 201
- BAD_REQUEST, VALIDATION_ERROR → 400
- MALFORMED_JSON → 400
- METHOD_NOT_ALLOWED → 405
- UNAUTHORIZED → 401
- FORBIDDEN → 403
- NOT_FOUND → 404
- CONFLICT → 409
- DATABASE_ERROR, INTERNAL_ERROR → 500

---

## 6. Validation

- Dùng `jakarta.validation` (@NotNull, @NotBlank, ...)
- Dùng `@Valid` trong controller
- Không validate thủ công nếu có thể dùng annotation

---

## 7. Logging

- INFO → flow bình thường
- WARN → lỗi nhẹ, có thể xử lý
- ERROR → lỗi nghiêm trọng
- Không log:
  - password
  - token
  - API key
  - connection string chứa credentials

---

## 8. Configuration

- Dùng `.env` cho môi trường local
- Không commit file `.env`
- Cấu hình mặc định trong `application.yml`

### Biến bắt buộc:

- MONGODB_URI
- SERVER_PORT (mặc định: 8080)

---

## 9. Controller

- Luôn trả:
  ResponseEntity<ApiResponse<T>>

- Controller chỉ:
  - nhận request
  - validate
  - gọi service
  - trả response

- Không gọi repository trực tiếp

- API phân trang dùng:
  ResponseFactory.paged(...)

---

## 10. Entity & Service

- Entity Mongo phải extend `BaseDocument`
- Mặc định dùng soft delete:
  - isDeleted
  - deletedAt

- Service nên implement:
  CrudService<...>

---

## 11. Code Review Checklist

- API đúng format success/error
- Đúng HTTP status + error code
- Không hardcode secret
- Không lộ exception ra client
- Có `traceId` trong error response
- Đúng naming + package structure
