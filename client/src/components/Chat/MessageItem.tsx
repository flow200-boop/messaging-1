import React, { useState } from 'react';
import {
  Smile,
  Reply,
  Pin,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
  FileText,
  Download,
  MoreHorizontal,
  CornerDownRight
} from 'lucide-react';
import { Message } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';

interface MessageItemProps {
  message: Message;
  isFirstInGroup?: boolean;
  onScrollToMessage?: (id: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀', '👀'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isFirstInGroup = true,
  onScrollToMessage
}) => {
  const { user } = useAuth();
  const {
    setReplyingTo,
    togglePin,
    toggleReaction,
    editMessage,
    deleteMessage,
    setActiveLightboxImage
  } = useChat();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isOwn = message.senderId === user?.id;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await editMessage(message.id, editContent);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Simple Markdown & Code Snippet formatter
  const renderFormattedContent = (text: string) => {
    if (!text) return null;

    // Check for code blocks ```
    if (text.includes('```')) {
      const parts = text.split(/(```[\s\S]*?```)/g);
      return parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0].trim();
          const isLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const lang = isLang ? firstLine : '';
          const code = (isLang ? lines.slice(1) : lines).join('\n');

          return (
            <div key={i} className="my-2 rounded-xl bg-slate-950/90 border border-slate-800/80 p-3 font-mono text-xs overflow-x-auto text-emerald-300">
              {lang && <div className="text-[10px] text-slate-500 uppercase mb-1 font-semibold">{lang}</div>}
              <pre className="leading-relaxed"><code>{code}</code></pre>
            </div>
          );
        }
        return <span key={i}>{formatInlineStyles(part)}</span>;
      });
    }

    return formatInlineStyles(text);
  };

  const formatInlineStyles = (text: string) => {
    // Bold **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex items-start space-x-3 px-5 py-1.5 hover:bg-slate-800/30 transition-colors ${
        message.isPinned ? 'bg-amber-500/5 border-l-2 border-amber-500/60' : ''
      }`}
    >
      {/* Sender Avatar (shown on first in group) */}
      <div className="w-10 flex-shrink-0 pt-0.5">
        {isFirstInGroup ? (
          <img
            src={message.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${message.senderUsername || 'user'}`}
            alt={message.senderDisplayName || 'User'}
            className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10 shadow-sm"
          />
        ) : (
          <div className="w-10 text-[10px] text-slate-600 text-right opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        {isFirstInGroup && (
          <div className="flex items-center space-x-2 mb-0.5">
            <span className="text-xs font-bold text-slate-200">
              {message.senderDisplayName || 'User'}
            </span>
            <span className="text-[10px] text-slate-500">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {message.isPinned ? (
              <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                <Pin className="w-2.5 h-2.5" /> Pinned
              </span>
            ) : null}
          </div>
        )}

        {/* Quoted Reply Preview */}
        {message.replyTo && (
          <div
            onClick={() => onScrollToMessage && onScrollToMessage(message.replyTo!.id)}
            className="mb-1.5 flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/60 border-l-2 border-brand-500 rounded-r-lg px-2.5 py-1 cursor-pointer hover:bg-slate-800/60 transition-colors max-w-lg truncate"
          >
            <CornerDownRight className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <span className="font-semibold text-brand-300">{message.replyTo.senderDisplayName}:</span>
            <span className="truncate">{message.replyTo.content || 'Attachment'}</span>
          </div>
        )}

        {/* Editing Mode */}
        {isEditing ? (
          <div className="space-y-2 mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-950 border border-brand-500/50 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={2}
              autoFocus
            />
            <div className="flex items-center space-x-2 text-[11px]">
              <button
                onClick={handleSaveEdit}
                className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <span className="text-slate-500">escape to cancel • enter to save</span>
            </div>
          </div>
        ) : (
          <div>
            {/* Text Content */}
            {message.content && (
              <div className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-wrap selection:bg-brand-500 selection:text-white">
                {renderFormattedContent(message.content)}
                {message.isEdited ? (
                  <span className="text-[10px] text-slate-500 ml-1.5 italic">(edited)</span>
                ) : null}
              </div>
            )}

            {/* Image Attachment */}
            {message.messageType === 'image' && message.fileUrl && (
              <div className="mt-2 max-w-sm">
                <img
                  src={message.fileUrl}
                  alt={message.fileName || 'Attachment'}
                  onClick={() => setActiveLightboxImage(message.fileUrl!)}
                  className="rounded-2xl max-h-72 object-cover cursor-pointer hover:opacity-95 transition-all ring-1 ring-white/10 shadow-lg"
                />
              </div>
            )}

            {/* Audio Voice Note */}
            {message.messageType === 'audio' && message.fileUrl && (
              <AudioWaveformPlayer src={message.fileUrl} />
            )}

            {/* Generic File Attachment */}
            {message.messageType === 'file' && message.fileUrl && (
              <div className="mt-2 flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3 max-w-sm shadow-sm group/file">
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate text-left">
                    <div className="text-xs font-semibold text-slate-200 truncate">{message.fileName || 'Document'}</div>
                    <div className="text-[10px] text-slate-500">{formatFileSize(message.fileSize)}</div>
                  </div>
                </div>

                <a
                  href={message.fileUrl}
                  download={message.fileName || 'download'}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Reactions Pill Badges */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(message.id, r.emoji)}
                title={r.users.map((u) => u.name).join(', ')}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                  r.hasReacted
                    ? 'bg-brand-500/20 border-brand-500/40 text-brand-300 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span>{r.emoji}</span>
                <span className="text-[11px] font-bold">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Own message read status indicator */}
      {isOwn && (
        <div className="pt-1 flex-shrink-0 text-brand-400" title="Delivered & Read">
          <CheckCheck className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Hover Action Toolbar */}
      <div className="absolute right-4 -top-3 hidden group-hover:flex items-center space-x-0.5 bg-slate-900 border border-slate-700/80 rounded-xl p-1 shadow-2xl z-20 backdrop-blur-xl animate-fade-in">
        {/* Quick Emoji Reaction Pill */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="React with Emoji"
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {showEmojiPicker && (
            <div className="absolute right-0 bottom-full mb-1 flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-2xl z-50">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    toggleReaction(message.id, emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-sm transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reply */}
        <button
          onClick={() => setReplyingTo(message)}
          title="Reply"
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        {/* Pin */}
        <button
          onClick={() => togglePin(message.id)}
          title={message.isPinned ? 'Unpin' : 'Pin'}
          className={`p-1.5 rounded-lg transition-colors ${
            message.isPinned ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>

        {/* Edit (Own message only) */}
        {isOwn && (
          <button
            onClick={() => setIsEditing(true)}
            title="Edit"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete (Own message only) */}
        {isOwn && (
          <button
            onClick={() => deleteMessage(message.id)}
            title="Delete"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
