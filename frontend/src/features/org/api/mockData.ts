export const mockOrgTreeResponse = {
  success: true,
  data: [
    {
      id: "69e5d1fb6d992e2f09ed322e",
      name: "Information Technology Department",
      code: "IT",
      manager_id: "user_admin_01",
      manager_name: "Bùi Anh Khôi",
      teams: [
        {
          id: "69e5d3136d992e2f09ed322f",
          name: "Backend Team",
          code: "IT-BE",
          lead_id: "user_456",
          lead_name: "Nguyễn Văn Mạnh",
          members: [
            { id: "user_456", full_name: "Nguyễn Văn Mạnh", email: "manh@fluxboard.com", status: "ACTIVE" },
            { id: "user_457", full_name: "Lê Hồng Quang", email: "quanglh@fluxboard.com", status: "ACTIVE" }
          ]
        },
        {
          id: "team_fe_001",
          name: "Frontend Team",
          code: "IT-FE",
          lead_id: "user_123",
          lead_name: "Long Hán Dương",
          members: [
            { id: "user_123", full_name: "Long Hán Dương", email: "longhd@fluxboard.com", status: "ACTIVE" },
            { id: "user_124", full_name: "Trần Bảo Ngọc", email: "ngoctb@fluxboard.com", status: "INACTIVE" }
          ]
        }
      ]
    },
    {
      id: "dept_mkt_001",
      name: "Marketing & Growth",
      code: "MKT",
      manager_id: "user_admin_02",
      manager_name: "Hoàng Thanh Mai",
      teams: []
    }
  ]
};

export const mockUnassignedUsersResponse = {
  success: true,
  data: [
    { id: "user_new_999", full_name: "Nhân sự mới tinh", email: "newbie@fluxboard.com", role_id: "role_member", status: "ACTIVE" },
    { id: "user_new_888", full_name: "Nguyễn Trần Tester", email: "tester@fluxboard.com", role_id: "role_member", status: "ACTIVE" },
    { id: "user_new_777", full_name: "Lê Minh Thực Tập Sinh", email: "intern_lm@fluxboard.com", role_id: "role_member", status: "ACTIVE" }
  ]
};