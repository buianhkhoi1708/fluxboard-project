// Cấu hình URL mặc định của Backend
const BASE_URL = 'http://localhost:8080/api';

/**
 * Hàm kiểm tra sức khỏe của Backend
 * Trả về một Object chứa trạng thái thành công và dữ liệu
 */
export const checkHealthAPI = async () => {
  try {
    // Gọi phương thức GET tới endpoint /health-check
    const response = await fetch(`${BASE_URL}/health-check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    // Chuyển đổi dữ liệu trả về sang dạng JSON
    const data = await response.json();
    return { success: true, data: data };

  } catch (error) {
    console.error("Lỗi khi kết nối BE:", error.message);
    return { success: false, error: error.message };
  }
};