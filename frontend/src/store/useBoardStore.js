import { create } from 'zustand';

export const useBoardStore = create((set) => ({
  // 1. DỮ LIỆU MẶC ĐỊNH LÚC MỚI VÀO
  columns: [
    {
      id: 'backlog', 
      title: 'Backlog', 
      icon: '📋',
      tasks: [
        { id: 't1', title: 'Nghiên cứu UX/UI mới', description: 'Tìm hiểu xu hướng 2025' },
        { id: 't2', title: 'Viết tài liệu kỹ thuật', description: 'API documentation' }
      ]
    },
    { 
      id: 'todo', 
      title: 'To Do', 
      icon: '✅', 
      tasks: [{ id: 't3', title: 'Thiết kế component', description: 'React + Tailwind' }] 
    },
    { id: 'inprogress', title: 'In Progress', icon: '⚙️', tasks: [] },
    { id: 'done', title: 'Done', icon: '✔️', tasks: [] }
  ],

  // 2. CẬP NHẬT TOÀN BỘ (Dùng để lưu vị trí khi kéo thả)
  setColumns: (newColumns) => set({ columns: newColumns }),

  // 3. THÊM DANH SÁCH (CỘT) MỚI
  addColumn: (title) => set((state) => {
    const newColumn = {
      id: `col-${Date.now()}`,
      title: title.trim(),
      icon: '📌', // Icon mặc định cho danh sách mới
      tasks: []
    };
    return { columns: [...state.columns, newColumn] };
  }),

  // 4. XÓA DANH SÁCH
  deleteColumn: (columnId) => set((state) => ({
    columns: state.columns.filter(col => col.id !== columnId)
  })),

  // 5. THÊM THẺ CÔNG VIỆC MỚI
  addTask: (columnId, title, description = '') => set((state) => {
    const newTask = { id: `task-${Date.now()}`, title, description };
    return {
      columns: state.columns.map(col =>
        col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col
      )
    };
  }),

  // 6. XÓA THẺ CÔNG VIỆC
  deleteTask: (columnId, taskId) => set((state) => ({
    columns: state.columns.map(col =>
      col.id === columnId ? { ...col, tasks: col.tasks.filter(t => t.id !== taskId) } : col
    )
  })),

  // 7. CẬP NHẬT THẺ (Sửa tiêu đề hoặc mô tả)
  updateTask: (columnId, taskId, updates) => set((state) => ({
    columns: state.columns.map(col =>
      col.id === columnId ? {
        ...col, tasks: col.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      } : col
    )
  }))
}));