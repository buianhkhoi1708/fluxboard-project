import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useProjectStore from '../features/workspaces/store/useProjectStore';
import { useAllUsers, useGenerateAiBoard } from '../features/ai/hooks/useAiQueries';
import { useRbacStore } from '../features/rbac/store/useRbacStore';
import axiosClient from '../lib/axiosClient';

import {
  Sparkles, ArrowRight, ArrowLeft,
  Loader2, CheckCircle2, Wand2,
  AlertCircle, Layout, Layers, Calendar, Plus,
  UserPlus, Fingerprint, XCircle, KeyRound, ShieldCheck
} from 'lucide-react'; 

// ===================== SUB-COMPONENTS =====================
const StepIndicator = ({ currentStep }) => (
  <div className="flex gap-1.5" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={3}>
    {[1, 2, 3].map(step => (
      <div key={step} className={`h-1.5 rounded-full transition-all duration-500 ${currentStep >= step ? 'w-6 bg-indigo-500 shadow-sm' : 'w-2 bg-slate-200'}`} />
    ))}
  </div>
);

const UserListSkeleton = () => (
  <div className="p-2 space-y-1 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-lg bg-slate-200" />
        <div className="flex-1 h-3 bg-slate-200 rounded w-20" />
      </div>
    ))}
  </div>
);

const WorkspaceSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[1,2,3].map(i => (
      <div key={i} className="p-5 rounded-2xl bg-white border border-slate-100 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
    ))}
  </div>
);

const ErrorAlert = ({ message }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 text-red-500 text-[11px] font-bold bg-red-50 p-3 rounded-xl border border-red-100 animate-in fade-in mt-2 shrink-0">
      <AlertCircle size={14} /> {message}
    </div>
  );
};

// ===================== MAIN COMPONENT =====================
const AiBoardGeneratorPage = () => {
  const navigate = useNavigate();
  
  // --- 1. GLOBAL STORES ---
  const { projects, fetchProjects } = useProjectStore();
  const { data: dbUsers = [], isLoading: isUsersLoading } = useAllUsers();
  const { mutateAsync: generateAiBoard, isPending: isGeneratingAi } = useGenerateAiBoard();
  
  const { roles: systemRoles, fetchInitialData: fetchRbacData } = useRbacStore();
  
  // 🚀 LỌC QUYỀN AN TOÀN (WHITELIST)
  const ALLOWED_ROLES = ['PROJECT_ADMIN', 'PM', 'LEAD', 'MEMBER', 'VIEWER'];
  const projectRoles = systemRoles.filter(r => ALLOWED_ROLES.includes(r.name));
  
  const defaultRoleId = projectRoles.find(r => r.name === 'MEMBER')?.id || projectRoles[0]?.id;
  const viewerRoleId = projectRoles.find(r => r.name === 'VIEWER')?.id;

  // --- 2. LOCAL STATE ---
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [generationMode, setGenerationMode] = useState('ADVANCED');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState({});
  const [loadingText, setLoadingText] = useState('Đang khởi tạo...');
  const [isSyncingRbac, setIsSyncingRbac] = useState(false);

  useEffect(() => {
    if (projects.length === 0) fetchProjects();
    if (systemRoles.length === 0) fetchRbacData();
  }, [fetchProjects, fetchRbacData, projects.length, systemRoles.length]);

  // --- 3. HANDLERS ---
  const toggleMember = (userId) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.userId === userId);
      if (exists) return prev.filter(m => m.userId !== userId);
      return [...prev, { userId, roleId: defaultRoleId }]; 
    });
    setErrors({});
  };

  const updateMemberRole = (userId, roleId) => {
    setSelectedMembers(prev => prev.map(m => m.userId === userId ? { ...m, roleId } : m));
  };

  const nextStep = () => {
    if (currentStep === 1 && !selectedProjectId) return setErrors({ project: "Sếp chọn 1 Workspace để tiếp tục nhé!" });
    if (currentStep === 2 && selectedMembers.length === 0) return setErrors({ members: "Dự án cần ít nhất 1 nhân sự tham gia!" });
    setErrors({});
    setCurrentStep(prev => prev + 1);
  };

const handleFinalGenerate = async () => {
    // 1. Kiểm tra đầu vào
    if (!prompt.trim()) { 
      setErrors({ prompt: "Nhập mô tả để AI làm việc sếp ơi!" }); 
      return; 
    }
    
    // 2. Bật trạng thái loading (Sử dụng đúng biến sếp đang khai báo ở useState)
    setIsSyncingRbac(true);
    setLoadingText("Đang đồng bộ nhân sự & tạo Board...");
    
    try {
      // 3. Bước 1: Gán nhân sự vào Workspace
      // Chạy Promise.all để tối ưu tốc độ
      await Promise.all(selectedMembers.map(m => 
        axiosClient.post(`/projects/${selectedProjectId}/members`, { 
          user_id: m.userId, 
          role_ids: [m.roleId] 
        }).catch((err) => {
          console.warn(`User ${m.userId} có thể đã tồn tại trong project:`, err);
        }) 
      ));

      setLoadingText("AI đang phân rã task & tính Deadline (khoảng 1 phút)...");
      
      // 4. Bước 2: Lọc danh sách nhân sự thực thi (loại Viewer)
      const validAssignees = selectedMembers
        .filter(m => m.roleId !== viewerRoleId)
        .map(m => m.userId);

      // 5. Bước 3: Gọi Hook tạo Board qua AI (ÉP ĐÚNG SNAKE_CASE CHO JAVA V6)
      // Lưu ý: Tui đổi 'user_prompt' thành 'prompt' để khớp với record AiPromptRequest.java
      const newBoardId = await generateAiBoard({
        project_id: selectedProjectId,
        prompt: prompt,
        member_ids: validAssignees,
        generation_mode: generationMode,
        project_start_date: new Date(startDate).toISOString()
      });

      // 6. Thành công: Chuyển hướng sang Board mới
      navigate(`/board/${newBoardId}`);

    } catch (e) { 
      // 7. Bắt lỗi chi tiết thay vì thông báo chung chung
      console.error("🚨 LỖI QUY TRÌNH TẠO BOARD:", e);
      const errorMsg = e.response?.data?.message || e.message || "Hệ thống quá tải hoặc hết Token";
      alert(`Thất bại: ${errorMsg}\nSếp F12 tab Console để xem lỗi chi tiết từ Google nhé!`); 
    } finally {
      // 8. Tắt trạng thái loading
      setIsSyncingRbac(false);
    }
  };

  const isProcessing = isGeneratingAi || isSyncingRbac;

  return (
    <div className="flex flex-col h-full absolute inset-0 bg-[#F8FAFC] overflow-hidden">
      {/* ========== HEADER ========== */}
      <header className="h-14 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Wand2 size={16} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight">AI Board Constructor</h1>
            <StepIndicator currentStep={currentStep} />
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded-full border border-indigo-100">
            <Sparkles size={12} className="text-indigo-600" />
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Gemini 3.1 Pro</span>
          </div>
          <button onClick={() => navigate(-1)} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Thoát</button>
        </div>
      </header>

      {/* 🚀 THE BULLETPROOF LOCK: Dùng thẻ absolute bọc toàn bộ nội dung Main */}
      <main className="flex-1 relative bg-[#F8FAFC]">
        <div className="absolute inset-0 p-4 md:p-6 flex flex-col">
          <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col min-h-0">
            
            {/* ---------- STEP 1: WORKSPACE ---------- */}
            {currentStep === 1 && (
              <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="shrink-0">
                  <h2 className="text-xl font-black text-slate-900 leading-tight">Cấu hình Workspace</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Chọn không gian làm việc để AI đồng bộ hóa dữ liệu.</p>
                </div>

                {projects.length === 0 ? <WorkspaceSkeleton /> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar content-start pb-4">
                    <button className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-white transition-all group">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                        <Plus className="text-slate-400 group-hover:text-indigo-600" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Tạo mới</span>
                    </button>
                    {projects.map(item => {
                      const p = item.project || item;
                      const isSelected = selectedProjectId === p.id;
                      return (
                        <button key={p.id} onClick={() => { setSelectedProjectId(p.id); setErrors({}); }} className={`p-5 rounded-2xl border-2 text-left transition-all relative ${isSelected ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100/50' : 'border-white bg-white shadow-sm hover:border-slate-200 hover:shadow-md'}`}>
                          {isSelected && <div className="absolute top-3 right-3 text-indigo-600"><CheckCircle2 size={18}/></div>}
                          <h3 className="font-bold text-slate-800 text-sm truncate pr-6">{p.name}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">{p.departmentId || 'System'}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
                <ErrorAlert message={errors.project} />
              </div>
            )}

            {/* ---------- STEP 2: RBAC BLOCK (ĐÃ KHÓA CỨNG FLEX & CHIỀU CAO) ---------- */}
            {currentStep === 2 && (
              <div className="flex-1 flex flex-col min-h-0 h-full animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 min-h-0 h-full">
                  
                  {/* CỘT TRÁI (Danh sách User) */}
                  <div className="flex flex-col shrink-0 lg:w-4/12 xl:w-3/12 h-1/3 lg:h-full bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ thống Nhân sự</span>
                      <UserPlus size={14} className="text-slate-400"/>
                    </div>
                    {isUsersLoading ? <UserListSkeleton /> : (
                      <div className="p-2 space-y-1 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                        {dbUsers.map((user) => {
                          const isSelected = selectedMembers.find(m => m.userId === user.id);
                          return (
                            <button key={user.id} onClick={() => toggleMember(user.id)} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'hover:bg-slate-50'}`}>
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                {(user.username || user.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{user.username || user.email}</p>
                              </div>
                              {isSelected && <CheckCircle2 size={14} className="ml-auto shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* CỘT PHẢI (Cấu hình Role) */}
                  <section className="flex flex-col flex-1 min-h-0 bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden h-2/3 lg:h-full">
                    <div className="px-6 py-4 lg:py-5 border-b border-slate-100 shrink-0 bg-gradient-to-r from-white to-slate-50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl hidden lg:flex items-center justify-center text-indigo-600 shrink-0">
                            <KeyRound size={20} />
                        </div>
                        <div>
                            <h2 className="text-base lg:text-lg font-black text-slate-900 flex items-center gap-2">
                              Phân quyền Dự án
                            </h2>
                            <p className="text-[10px] lg:text-xs text-slate-500 font-medium">
                              Vai trò cho {selectedMembers.length} nhân sự.
                            </p>
                        </div>
                      </div>
                    </div>

                    {/* Vùng Scroll Nội Bộ của Cột Phải */}
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 lg:p-6 bg-slate-50/30">
                      {selectedMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <Fingerprint size={48} lg:size={64} className="mb-4 opacity-20" />
                          <span className="text-xs font-black uppercase tracking-widest opacity-40">Chưa chọn nhân sự</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-6 max-w-5xl">
                          {selectedMembers.map(member => {
                            const user = dbUsers.find(u => u.id === member.userId);
                            return (
                              <div key={member.userId} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-1.5 bg-slate-200/50 rounded-lg text-slate-600 shrink-0">
                                    <ShieldCheck size={16} />
                                  </div>
                                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest truncate">
                                    User: {user?.username || user?.email}
                                  </h3>
                                  <div className="h-px flex-1 bg-slate-200" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                  {projectRoles.map((role) => {
                                    const isChecked = member.roleId === role.id;
                                    return (
                                      <label
                                        key={role.id}
                                        className={`group relative flex items-start justify-between p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                                          isChecked 
                                            ? 'bg-white border-indigo-200 shadow-md shadow-indigo-50' 
                                            : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                      >
                                        <div className="pr-3 flex-1">
                                          <div className={`font-bold text-xs mb-1 font-mono tracking-tight transition-colors ${isChecked ? 'text-indigo-900' : 'text-slate-800'}`}>
                                            {role.name}
                                          </div>
                                          <div className="text-[9px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                                            {role.description || 'Quyền hạn trong hệ thống.'}
                                          </div>
                                        </div>

                                        <div className="relative inline-flex items-center shrink-0 mt-0.5">
                                           <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isChecked ? 'border-indigo-600 bg-indigo-600 shadow-sm' : 'border-slate-300 bg-white'}`}>
                                              {isChecked && <div className="w-1.5 h-1.5 bg-white rounded-full animate-in zoom-in" />}
                                           </div>
                                           <input type="radio" className="hidden" checked={isChecked} onChange={() => updateMemberRole(member.userId, role.id)} />
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
                <div className="shrink-0 pt-2">
                   <ErrorAlert message={errors.members} />
                </div>
              </div>
            )}

            {/* ---------- STEP 3: AI PROMPT ---------- */}
            {currentStep === 3 && (
              <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="shrink-0">
                  <h2 className="text-xl font-black text-slate-900 leading-tight">Yêu cầu nghiệp vụ</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Mô tả quy trình để AI tự động phân rã task và tính toán Story Points.</p>
                </div>

                <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-4 min-h-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                    <button onClick={() => setGenerationMode('SIMPLE')} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${generationMode === 'SIMPLE' ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 opacity-70 hover:opacity-100'}`}>
                      <div className={`p-2.5 rounded-xl ${generationMode === 'SIMPLE' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}><Layout size={20}/></div>
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Simple</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">1 Phase</p>
                      </div>
                    </button>
                    <button onClick={() => setGenerationMode('ADVANCED')} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${generationMode === 'ADVANCED' ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 opacity-70 hover:opacity-100'}`}>
                      <div className={`p-2.5 rounded-xl ${generationMode === 'ADVANCED' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}><Layers size={20}/></div>
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Advanced</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Multi Phase</p>
                      </div>
                    </button>
                    <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 flex items-center gap-4 shrink-0">
                      <div className="p-2.5 rounded-xl bg-slate-100 text-indigo-600"><Calendar size={20}/></div>
                      <div className="text-left flex-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Start Date</p>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs font-bold text-slate-800 outline-none bg-transparent w-full mt-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative shrink-0 flex flex-col">
                    <div className="flex gap-2 flex-wrap mb-4 shrink-0">
                      <button onClick={() => setPrompt("Xây dựng dự án AI Security: Triển khai ModelGuard bảo vệ mô hình khỏi Model Extraction attacks. Các giai đoạn: Đánh giá lỗ hổng, Thiết kế Defensive Framework, Coding Backend (Java/Quarkus) và Pentest.")} className="text-[9px] font-black px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-900 hover:text-white transition-all">+ AI SECURITY</button>
                      <button onClick={() => setPrompt("Chiến dịch Content Marketing Tết 2026 cho Fluxboard. Gồm các bước: Idea Concept, Thuê KOLs, Video Production và Chạy Ad đa kênh.")} className="text-[9px] font-black px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-900 hover:text-white transition-all">+ MARKETING CAMPAIGN</button>
                    </div>
                    <textarea rows={8} value={prompt} onChange={(e) => { setPrompt(e.target.value); setErrors({}); }} placeholder="Mô tả chi tiết dự án tại đây..." className="w-full text-sm font-medium outline-none resize-none placeholder:text-slate-300 custom-scrollbar leading-relaxed pr-8" />
                    {prompt && <button onClick={() => setPrompt('')} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"><XCircle size={18} /></button>}
                  </div>
                  <ErrorAlert message={errors.prompt} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="h-20 bg-white/80 backdrop-blur-sm border-t border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 z-20">
        {currentStep > 1 ? (
          <button onClick={() => setCurrentStep(prev => prev - 1)} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-800 transition-all uppercase tracking-widest">
            <ArrowLeft size={16} /> Quay lại
          </button>
        ) : <div />}

        {currentStep < 3 ? (
          <button onClick={nextStep} className={`flex items-center gap-2 px-8 md:px-10 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${((currentStep === 1 && !selectedProjectId) || (currentStep === 2 && selectedMembers.length === 0)) ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
            Tiếp theo <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handleFinalGenerate} disabled={isProcessing} className={`flex items-center gap-2 px-10 md:px-12 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${isProcessing ? 'bg-indigo-300 text-white cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-200'}`}>
            {isProcessing ? 'Đang xử lý...' : 'Khởi tạo Board'}
            {!isProcessing && <Sparkles size={16} />}
          </button>
        )}
      </footer>

      {/* ========== GENERATING OVERLAY ========== */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
          <h2 className="text-lg font-black tracking-tight">{loadingText}</h2>
          <div className="w-48 md:w-64 mt-4 bg-white/20 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-indigo-400 rounded-full w-2/3 animate-pulse" />
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default AiBoardGeneratorPage;