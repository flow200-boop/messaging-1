import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  CornerDownRight,
  Code
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { VoiceRecorder } from './VoiceRecorder';

const EMOJI_PALETTE = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜',
  '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞',
  '👍', '👎', '👏', '🙌', '🤝', '👊', '✌️', '🤟', '🤘', '👌',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '✨', '⚡', '💥', '🎉', '🚀', '⭐', '🌟', '🎯', '💯'
];

export const MessageInput: React.FC = () => {
  const { sendMessage, replyingTo, setReplyingTo, sendTyping } = useChat();
  const { token } = useAuth();

  const [text, setText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<number | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    sendTyping(true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const removeSelectedFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!text.trim() && !selectedFile) || isUploading) return;

    try {
      setIsUploading(true);
      let uploadedFileUrl: string | undefined = undefined;
      let uploadedFileName: string | undefined = undefined;
      let uploadedFileSize: number | undefined = undefined;
      let messageType: 'text' | 'image' | 'audio' | 'file' = 'text';

      if (selectedFile && token) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (!res.ok) throw new Error('File upload failed');
        const uploadData = await res.json();

        uploadedFileUrl = uploadData.fileUrl;
        uploadedFileName = uploadData.fileName;
        uploadedFileSize = uploadData.fileSize;
        messageType = uploadData.messageType;
      }

      await sendMessage(text, messageType, uploadedFileUrl, uploadedFileName, uploadedFileSize);

      setText('');
      removeSelectedFile();
      setShowEmojiPicker(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleSendVoiceNote = async (fileUrl: string, durationSeconds: number) => {
    setIsRecordingVoice(false);
    await sendMessage('', 'audio', fileUrl, `Voice Note (${durationSeconds}s)`, durationSeconds);
  };

  if (isRecordingVoice) {
    return (
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <VoiceRecorder
          onSendAudio={handleSendVoiceNote}
          onCancel={() => setIsRecordingVoice(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md relative">
      {/* Quoted Reply Banner */}
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs animate-slide-up">
          <div className="flex items-center space-x-2 truncate">
            <CornerDownRight className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <span className="text-slate-400">Replying to</span>
            <span className="font-semibold text-brand-300 truncate">
              {replyingTo.senderDisplayName}:
            </span>
            <span className="text-slate-300 truncate">{replyingTo.content || 'Attachment'}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-slate-500 hover:text-slate-300 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selected File Attachment Chip */}
      {selectedFile && (
        <div className="mb-2 flex items-center justify-between bg-slate-900 border border-brand-500/30 rounded-xl p-2 max-w-sm animate-slide-up">
          <div className="flex items-center space-x-2.5 truncate">
            {filePreviewUrl ? (
              <img
                src={filePreviewUrl}
                alt="Preview"
                className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="truncate text-left text-xs">
              <div className="font-medium text-slate-200 truncate">{selectedFile.name}</div>
              <div className="text-[10px] text-slate-400">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
          <button
            onClick={removeSelectedFile}
            className="text-slate-400 hover:text-rose-400 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-4 mb-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 max-w-xs animate-slide-up backdrop-blur-2xl">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Quick Emojis
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto custom-scrollbar">
            {EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-lg transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form Bar */}
      <div className="flex items-end space-x-2 bg-slate-900/90 border border-slate-800 focus-within:border-brand-500/70 focus-within:ring-1 focus-within:ring-brand-500/30 rounded-2xl p-1.5 transition-all shadow-inner">
        {/* Attachment Upload Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.js,.ts,.json"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach Image or File"
          className="p-2 rounded-xl text-slate-400 hover:text-brand-400 hover:bg-slate-800/80 transition-colors flex-shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Insert Emoji"
          className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
            showEmojiPicker ? 'text-amber-400 bg-slate-800' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/80'
          }`}
        >
          <Smile className="w-4 h-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Message #channel (Enter to send, Shift+Enter for new line)..."
          rows={1}
          className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 py-2 px-1 focus:outline-none resize-none max-h-36 custom-scrollbar leading-relaxed"
        />

        {/* Voice Note Record Button */}
        <button
          type="button"
          onClick={() => setIsRecordingVoice(true)}
          title="Record Voice Note"
          className="p-2 rounded-xl text-slate-400 hover:text-brand-400 hover:bg-slate-800/80 transition-colors flex-shrink-0"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && !selectedFile) || isUploading}
          title="Send Message"
          className={`p-2 rounded-xl transition-all flex-shrink-0 ${
            text.trim() || selectedFile
              ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
