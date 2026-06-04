import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUserStore } from '../features/user/store/useUserStore';
// 🚀 Nhớ import 2 hook vừa tạo vào đây nhé sếp:
import { useWorkspaces, useDeleteBoard, useUpdateBoard } from '../features/workspaces/hooks/useWorkspaceQueries';
import CreateProjectModal from '../features/workspaces/components/CreateProjectModal';
import CreateBoardModal from '../features/workspaces/components/CreateBoardModal';
import {
  Briefcase, Plus, MoreVertical, KanbanSquare, Users,
  Search, LayoutGrid, Loader2, Pencil, Trash2, X
} from 'lucide-react';

// ------- Component Skeleton khi tải -------
const WorkspaceSkeleton = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg p-4 md:p-5 lg:p-6 animate-pulse">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-5 pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3 md:gap-4 w-full">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-200 shrink-0" />
        <div className="space-y-2 md:space-y-2.5 flex-1 min-w-0">
          <div className="h-4 md:h-5 w-3/4 sm:w-36 bg-slate-200 rounded-md" />
          <div className="flex gap-2 md:gap-3">
            <div className="h-3 md:h-4 w-12 md:w-14 bg-slate-200 rounded-full" />
            <div className="h-3 md:h-4 w-16 md:w-20 bg-slate-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 md:h-[104px] bg-slate-100 rounded-xl" />
      ))}
    </div>
  </div>
);

// ------- Component Chính -------
const WorkspacesPage = () => {
  const getUser = useUserStore((state) => state.getUser);

  // 🚀 GỌI HOOKS API
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useWorkspaces();
  const deleteBoardMutation = useDeleteBoard();
  const updateBoardMutation = useUpdateBoard();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // STATES CHO SỬA & XÓA BẢNG
  const [boardMenuOpenId, setBoardMenuOpenId] = useState<string | null>(null);
  const [editBoardData, setEditBoardData] = useState<{ id: string; name: string } | null>(null);

  // Làm phẳng & loại trùng lặp dữ liệu từ các trang
  const allProjects = useMemo(() => {
    if (!data?.pages) return [];
    const flatData = data.pages.flatMap(page => page.data);
    const uniqueData = Array.from(
      new Map(flatData.map(item => {
        const projectId = item.project?.id || item.project?._id;
        return [projectId, item];
      })).values()
    );
    return uniqueData;
  }, [data]);

  const filteredProjects = useMemo(() => {
    return allProjects.filter(item =>
      item.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProjects, searchTerm]);

  // Intersection Observer cho infinite scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const triggerRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isFetchingNextPage) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  // 🚀 HÀM XỬ LÝ XÓA
  const handleDeleteBoard = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa bảng "${name}"? Thao tác này sẽ xóa toàn bộ cột và công việc bên trong.`)) {
      deleteBoardMutation.mutate(id, {
        onError: (err: any) => alert('Lỗi khi xóa bảng: ' + (err.response?.data?.message || err.message))
      });
    }
  };

  // 🚀 HÀM XỬ LÝ SỬA
  const handleUpdateBoardSubmit = () => {
    if (!editBoardData || !editBoardData.name.trim()) return;
    updateBoardMutation.mutate(
      { id: editBoardData.id, name: editBoardData.name.trim() },
      {
        onSuccess: () => setEditBoardData(null),
        onError: (err: any) => alert('Lỗi khi đổi tên bảng: ' + (err.response?.data?.message || err.message))
      }
    );
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-3 md:p-6 lg:p-8 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 md:gap-3 text-slate-800">
              <div className="p-1.5 md:p-2 bg-white/80 backdrop-blur-sm rounded-lg md:rounded-xl shadow-sm border border-indigo-100">
                <Briefcase className="text-indigo-600 w-5 h-5 md:w-6 md:h-6" />
              </div>
              Không gian làm việc
            </h1>
            <p className="text-[11px] md:text-sm font-medium text-slate-500 pl-10 md:pl-12 leading-relaxed">
              Quản lý không gian làm việc, nhóm và bảng Kanban của bạn.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="relative group w-full sm:w-auto">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-indigo-500" />
              <input
                type="text"
                placeholder="Tìm không gian làm việc..."
                className="pl-9 pr-4 py-2.5 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl text-[13px] md:text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all w-full sm:w-64 font-medium shadow-sm placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl text-[13px] md:text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95 hover:shadow-indigo-300/40 border border-indigo-500/20 shrink-0"
            >
              <Plus size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
              <span>Tạo không gian mới</span>
            </button>
          </div>
        </div>

        {/* KHUNG TẢI (SKELETON) */}
        {isLoading && (
          <div className="space-y-4 md:space-y-6">
            {[...Array(2)].map((_, i) => (
              <WorkspaceSkeleton key={i} />
            ))}
          </div>
        )}

        {/* TRẠNG THÁI TRỐNG */}
        {!isLoading && filteredProjects.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-2xl p-8 md:p-16 flex flex-col items-center justify-center text-center shadow-sm transition-all mt-4 md:mt-0">
            <div className="p-4 md:p-5 bg-indigo-50 rounded-full mb-4 md:mb-5 animate-bounce-slow">
              <Briefcase className="text-indigo-400 w-10 h-10 md:w-14 md:h-14" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1.5 md:mb-2 px-2">
              {searchTerm ? 'Không tìm thấy không gian phù hợp' : 'Chưa có không gian làm việc'}
            </h3>
            <p className="text-slate-500 text-xs md:text-sm mb-5 md:mb-6 max-w-md px-4 leading-relaxed">
              {searchTerm
                ? "Hãy thử điều chỉnh từ khóa tìm kiếm."
                : "Tạo không gian làm việc đầu tiên để bắt đầu cộng tác."}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-[calc(100%-2rem)] sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-2.5 md:py-3 rounded-xl font-bold shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/40 transition-all active:scale-95 text-[13px] md:text-sm"
              >
                <span className="flex items-center justify-center gap-2">
                  <Plus size={16} className="md:w-[18px] md:h-[18px]" /> Tạo không gian mới
                </span>
              </button>
            )}
          </div>
        )}

        {/* DANH SÁCH KHÔNG GIAN LÀM VIỆC */}
        {!isLoading && filteredProjects.length > 0 && (
          <div className="space-y-5 md:space-y-8">
            {filteredProjects.map((item, index) => {
              const workspace = item.project;
              const boardsData = item.boards || [];
              const membersData = item.members || [];

              if (!workspace) return null;

              const isLastElement = index === filteredProjects.length - 1;

              return (
                <section
                  ref={isLastElement ? triggerRef : null}
                  key={workspace.id || workspace._id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm md:shadow-lg md:shadow-slate-200/20 p-4 md:p-5 lg:p-6 transition-all duration-300 hover:shadow-md md:hover:shadow-xl hover:shadow-indigo-100/20 hover:border-indigo-200/60 md:hover:-translate-y-0.5"
                >
                  {/* Đầu mục không gian làm việc */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 md:mb-5 pb-3 md:pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm md:shadow-md shadow-indigo-200/50 shrink-0 transition-transform duration-200 group-hover:scale-105">
                        <span className="text-base md:text-lg font-black text-white uppercase">
                          {workspace.name?.charAt(0) || 'W'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/projects/${workspace.id || workspace._id}?tab=boards`}
                          className="transition-colors block"
                        >
                          <h2 className="text-[15px] md:text-lg font-bold text-slate-800 tracking-tight hover:text-indigo-600 transition-colors truncate w-full" title={workspace.name}>
                            {workspace.name}
                          </h2>
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-xs font-semibold text-slate-500 mt-1 md:mt-1.5">
                          <span className="flex items-center gap-1 md:gap-1.5 bg-slate-100/80 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-full shrink-0">
                            <LayoutGrid size={10} className="md:w-3 md:h-3" /> {boardsData.length} bảng
                          </span>

                          <Link
                            to={`/projects/${workspace.id || workspace._id}?tab=members`}
                            title="Quản lý thành viên"
                            className="flex items-center gap-1.5 md:gap-2 bg-slate-100/80 hover:bg-indigo-50 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-full cursor-pointer transition-all group shrink-0"
                          >
                            <Users size={10} className="md:w-3 md:h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            {membersData.length > 0 ? (
                              <div className="flex items-center -space-x-1 md:-space-x-1.5">
                                {membersData.slice(0, 4).map((rawMember: any, idx: number) => {
                                  const memberId = rawMember.user_id || rawMember.id || rawMember._id;
                                  const member = getUser(memberId, workspace.id || workspace._id) || rawMember;
                                  const displayName = member.full_name || member.name || 'Thành viên';
                                  const avatarUrl = member.avatar_url || member.avatarUrl;
                                  const initial = displayName.charAt(0).toUpperCase();

                                  return (
                                    <div
                                      key={`stack-${memberId || idx}`}
                                      title={displayName}
                                      className="w-4 h-4 md:w-5 md:h-5 rounded-full ring-1 md:ring-2 ring-slate-100 bg-indigo-100 flex items-center justify-center overflow-hidden transition-transform hover:scale-125 hover:z-20 shrink-0"
                                      style={{ zIndex: 10 - idx }}
                                    >
                                      {avatarUrl ? (
                                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[7px] md:text-[9px] font-bold text-indigo-700">{initial}</span>
                                      )}
                                    </div>
                                  );
                                })}
                                {membersData.length > 4 && (
                                  <div className="w-4 h-4 md:w-5 md:h-5 rounded-full ring-1 md:ring-2 ring-slate-100 bg-slate-200 flex items-center justify-center z-0 shrink-0">
                                    <span className="text-[6px] md:text-[8px] font-bold text-slate-600">+{membersData.length - 4}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 group-hover:text-indigo-600 font-medium transition-colors text-[10px] md:text-[11px]">0 TV</span>
                            )}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lưới bảng Kanban: 1 cột (Mobile), 2 cột (Tablet), 4 cột (PC) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {boardsData.map((boardItem: any) => {
                      const b = boardItem.board || boardItem;
                      const bId = String(b.id || b._id);
                      const isMenuOpen = boardMenuOpenId === bId;

                      return (
                        <div key={bId} className="relative block group">
                          {/* 🚀 BẢNG KANBAN (DÙNG THẺ LINK) */}
                          <Link
                            to={`/board/${bId}`}
                            className="bg-gradient-to-br from-white to-slate-50/80 border border-slate-200 rounded-xl p-4 md:p-5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/30 transition-all duration-200 flex flex-col overflow-hidden sm:hover:-translate-y-0.5 h-full min-h-[90px] md:min-h-[104px]"
                          >
                            <div className="absolute -right-4 -top-4 w-12 h-12 md:w-16 md:h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
                            <div className="relative z-10 pr-6 flex-1 flex flex-col justify-center">
                              <div className="flex items-center gap-2.5 md:gap-3 mb-2 md:mb-3">
                                <div className="bg-white border border-indigo-100 text-indigo-600 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-200 shrink-0">
                                  <KanbanSquare size={16} className="md:w-[18px] md:h-[18px]" />
                                </div>
                                <h3 className="font-bold text-[13px] md:text-sm text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-2 leading-snug">
                                  {b.name}
                                </h3>
                              </div>
                              <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] text-slate-400 font-medium mt-auto">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <span>Hoạt động</span>
                              </div>
                            </div>
                          </Link>

                          {/* 🚀 NÚT 3 CHẤM SETTING BẢNG */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setBoardMenuOpenId(isMenuOpen ? null : bId);
                            }}
                            className="absolute top-2 right-2 md:top-3 md:right-3 p-2 md:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors z-20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                          >
                            <MoreVertical size={16} className="md:w-[16px] md:h-[16px]" />
                          </button>

                          {/* 🚀 MENU SỬA/XÓA BẢNG */}
                          {isMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setBoardMenuOpenId(null); }} />
                              <div className="absolute top-10 right-2 w-36 md:w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 md:py-2 z-30 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditBoardData({ id: bId, name: b.name });
                                    setBoardMenuOpenId(null);
                                  }}
                                  className="w-full text-left px-3 md:px-4 py-2 text-[11px] md:text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Pencil size={14} className="md:w-3.5 md:h-3.5" /> Đổi tên bảng
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteBoard(bId, b.name);
                                    setBoardMenuOpenId(null);
                                  }}
                                  disabled={deleteBoardMutation.isPending}
                                  className="w-full text-left px-3 md:px-4 py-2 text-[11px] md:text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-50 mt-1 pt-1"
                                >
                                  {deleteBoardMutation.isPending && deleteBoardMutation.variables === bId ? <Loader2 size={14} className="animate-spin md:w-3.5 md:h-3.5" /> : <Trash2 size={14} className="md:w-3.5 md:h-3.5" />}
                                  Xóa bảng
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Nút thêm bảng */}
                    <button
                      onClick={() => {
                        setSelectedProjectId(workspace.id || workspace._id);
                        setIsBoardModalOpen(true);
                      }}
                      className="group border-2 border-dashed border-slate-300 rounded-xl p-4 md:p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200 min-h-[90px] md:min-h-[104px] backdrop-blur-sm active:scale-95 hover:shadow-sm"
                    >
                      <div className="p-1 md:p-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                        <Plus size={18} className="md:w-5 md:h-5" strokeWidth={2.5} />
                      </div>
                      <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-center">Tạo bảng</span>
                    </button>
                  </div>
                </section>
              );
            })}

            {/* Chỉ báo tải trang tiếp theo */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200 text-xs md:text-sm text-slate-500 animate-pulse">
                  <Loader2 size={14} className="md:w-4 md:h-4 animate-spin text-indigo-600" />
                  <span>Đang tải thêm không gian...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Các Modal Tạo mới */}
        <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        <CreateBoardModal
          isOpen={isBoardModalOpen}
          onClose={() => setIsBoardModalOpen(false)}
          projectId={selectedProjectId}
          onSuccess={() => setIsBoardModalOpen(false)}
        />

        {/* 🚀 MODAL ĐỔI TÊN BẢNG CHUẨN RESPONSIVE */}
        {editBoardData && (
          <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="absolute inset-0" onClick={() => setEditBoardData(null)} />
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-5 md:p-6 animate-in zoom-in-95 duration-200 relative z-10">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-base md:text-lg font-bold text-slate-800">Đổi tên Bảng</h3>
                <button onClick={() => setEditBoardData(null)} className="text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"><X size={18} className="md:w-5 md:h-5" /></button>
              </div>
              <input
                type="text"
                value={editBoardData.name}
                onChange={(e) => setEditBoardData({ ...editBoardData, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateBoardSubmit(); }}
                className="w-full px-3.5 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] md:text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 mb-5 md:mb-6 transition-all"
                autoFocus
              />
              <div className="flex flex-col sm:flex-row justify-end gap-2.5 md:gap-3">
                <button 
                  onClick={() => setEditBoardData(null)} 
                  disabled={updateBoardMutation.isPending}
                  className="w-full sm:w-auto px-4 py-2.5 text-[12px] md:text-[13px] font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-center"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleUpdateBoardSubmit} 
                  disabled={updateBoardMutation.isPending || !editBoardData.name.trim()} 
                  className="w-full sm:w-auto px-4 py-2.5 text-[12px] md:text-[13px] font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  {updateBoardMutation.isPending && <Loader2 size={14} className="animate-spin md:w-[16px] md:h-[16px]" />}
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {/* Ẩn thanh cuộn thừa trên các danh sách */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default WorkspacesPage;