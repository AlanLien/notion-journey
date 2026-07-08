'use client';

import React, { useActionState, useState, useOptimistic, useTransition, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CheckSquare, Square, Plus, X, Calendar } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { createTaskAction, toggleTaskDoneAction } from '@/app/actions';
import { TaskItem } from '@/lib/notion';
import { cn } from '@/lib/utils';

function AddTaskSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full py-3.5 rounded-2xl bg-violet-600 text-white font-bold text-base shadow-lg shadow-violet-200 active:scale-95 transition-all disabled:opacity-60"
        >
            {pending ? '新增中...' : '新增任務'}
        </button>
    );
}

interface TasksTabProps {
    tasks: TaskItem[];
    isAuthenticated: boolean;
}

export const TasksTab: React.FC<TasksTabProps> = ({ tasks, isAuthenticated }) => {
    const [optimisticTasks, setOptimisticTasks] = useOptimistic(
        tasks,
        (state, { id, done }: { id: string; done: boolean }) =>
            state.map(t => t.id === id ? { ...t, done } : t)
    );
    const [, startTransition] = useTransition();
    const [showAddForm, setShowAddForm] = useState(false);
    const [state, formAction] = useActionState(createTaskAction, null);

    useEffect(() => {
        if (state?.success) setShowAddForm(false);
    }, [state]);

    const handleToggle = (task: TaskItem) => {
        if (!isAuthenticated) return;
        startTransition(async () => {
            setOptimisticTasks({ id: task.id, done: !task.done });
            await toggleTaskDoneAction(task.id, !task.done);
        });
    };

    const todo = optimisticTasks.filter(t => !t.done);
    const done = optimisticTasks.filter(t => t.done);

    return (
        <div className="pb-32 pt-4 px-4 relative min-h-full">
            {/* Summary */}
            <div className="flex gap-3 mb-6">
                <div className="flex-1 bg-violet-50 border border-violet-100 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-violet-700">{todo.length}</p>
                    <p className="text-xs text-violet-500 font-medium mt-0.5">待辦</p>
                </div>
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{done.length}</p>
                    <p className="text-xs text-emerald-500 font-medium mt-0.5">已完成</p>
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-slate-700">{optimisticTasks.length}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">總計</p>
                </div>
            </div>

            {/* Task List */}
            {optimisticTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                    <CheckSquare size={48} className="text-slate-200" strokeWidth={1.5} />
                    <p className="text-sm">還沒有任務</p>
                    {isAuthenticated && <p className="text-xs text-slate-300">點右下角 + 新增</p>}
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Todo Section */}
                    {todo.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">待辦事項</p>
                            <div className="space-y-2">
                                {todo.map(task => (
                                    <TaskRow key={task.id} task={task} isAuthenticated={isAuthenticated} onToggle={handleToggle} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Done Section */}
                    {done.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">已完成</p>
                            <div className="space-y-2">
                                {done.map(task => (
                                    <TaskRow key={task.id} task={task} isAuthenticated={isAuthenticated} onToggle={handleToggle} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add Task FAB (auth only) - portal to escape motion.div transform */}
            {isAuthenticated && createPortal(
                <button
                    onClick={() => setShowAddForm(true)}
                    className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-violet-600 text-white shadow-xl shadow-violet-300/60 flex items-center justify-center active:scale-95 transition-all hover:bg-violet-700"
                    aria-label="新增任務"
                >
                    <Plus size={28} strokeWidth={2.5} />
                </button>,
                document.body
            )}

            {/* Add Task Modal */}
            {showAddForm && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowAddForm(false); }}
                >
                    <div className="w-full max-w-[768px] bg-white rounded-t-3xl shadow-2xl">
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-slate-200" />
                        </div>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">新增任務</h2>
                            <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <form action={formAction} className="px-5 py-4 space-y-4 pb-8">
                            {state?.message && (
                                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{state.message}</p>
                            )}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">任務名稱</label>
                                <input
                                    name="title"
                                    type="text"
                                    placeholder="例：訂機票"
                                    required
                                    autoFocus
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent text-base"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">日期 <span className="font-normal text-slate-400">（選填）</span></label>
                                <input
                                    name="date"
                                    type="date"
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent text-base"
                                />
                            </div>
                            <AddTaskSubmitButton />
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

interface TaskRowProps {
    task: TaskItem;
    isAuthenticated: boolean;
    onToggle: (task: TaskItem) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, isAuthenticated, onToggle }) => {
    return (
        <div
            className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all",
                task.done
                    ? "bg-slate-50/60 border-slate-100 opacity-60"
                    : "bg-white border-white shadow-sm shadow-slate-100"
            )}
        >
            <button
                onClick={() => onToggle(task)}
                disabled={!isAuthenticated}
                className={cn(
                    "shrink-0 transition-all",
                    task.done ? "text-emerald-500" : "text-slate-300",
                    isAuthenticated && "hover:scale-110 active:scale-95"
                )}
            >
                {task.done
                    ? <CheckSquare size={22} strokeWidth={2} />
                    : <Square size={22} strokeWidth={1.5} />
                }
            </button>

            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm font-medium leading-snug",
                    task.done ? "line-through text-slate-400" : "text-slate-800"
                )}>
                    {task.title}
                </p>
                {task.date && (
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar size={11} />
                        {format(parseISO(task.date), 'MM/dd EEE', { locale: zhTW })}
                    </p>
                )}
            </div>
        </div>
    );
};
