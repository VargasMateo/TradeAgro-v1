import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, Download, X, GripVertical } from 'lucide-react';
import { cn } from '../lib/utils';

interface SortableAttachmentProps {
  file: any;
  userRole: string;
  currentUser: any;
  onView: (file: any, e: React.MouseEvent) => void;
  onDownload: (file: any, e: React.MouseEvent) => void;
  onDelete: (id: number) => void;
  onUpdateDescription: (id: number, description: string) => void;
  isDownloading?: boolean;
}

export const SortableAttachment: React.FC<SortableAttachmentProps> = ({
  file,
  userRole,
  currentUser,
  onView,
  onDownload,
  onDelete,
  onUpdateDescription,
  isDownloading
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  const [description, setDescription] = useState(file.description || '');

  const handleBlur = () => {
    if (description !== (file.description || '')) {
      onUpdateDescription(file.id, description);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-slate-100 p-3 transition-colors bg-white group",
        isDragging ? "shadow-lg border-emerald-200 ring-1 ring-emerald-500/20" : "hover:bg-slate-50"
      )}
    >
      <div className="flex items-center justify-between" onClick={(e) => onView(file, e)}>
        <div className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-300 hover:text-slate-500 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            (file.fileType.includes('pdf')) && "bg-red-50 text-red-500",
            (file.fileType.includes('image')) && "bg-blue-50 text-blue-500",
            (!file.fileType.includes('pdf') && !file.fileType.includes('image')) && "bg-slate-50 text-slate-500",
          )}>
            <FileText className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-semibold text-slate-900" title={file.fileName}>{file.fileName}</p>
            <p className="text-[10px] text-slate-400">
              {file.fileName.includes('.') ? file.fileName.split('.').pop()?.toUpperCase() : 'ARCHIVO'} • {(file.fileSize / 1024 / 1024).toFixed(2)} MB • {file.uploaderName || 'Sistema'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-[#2e7d32] transition-colors cursor-pointer relative"
            onClick={(e) => onDownload(file, e)}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500"></div>
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
          {(userRole === 'admin' || (currentUser && currentUser.id === file.uploadedBy)) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file.id);
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Description Input */}
      <div className="pl-8 w-full mt-1">
        <input
          type="text"
          placeholder="Añadir descripción..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          className="w-full text-xs text-slate-600 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg px-2 py-1.5 outline-none transition-colors"
        />
      </div>
    </div>
  );
}
