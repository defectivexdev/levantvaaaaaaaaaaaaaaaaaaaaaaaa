import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Pencil, Trash2, X, Check, MessageCircle } from 'lucide-react';

const API_BASE = 'https://www.levant-va.com/api/chat/messages';

interface ChatMsg {
  _id: string;
  pilot_id: string;
  pilot_name: string;
  pilot_rank: string;
  content: string;
  edited: boolean;
  created_at: string;
}

interface Props {
  pilotId: string;
  pilotName: string;
}

export default function ChatPanel({ pilotId, pilotName }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}?limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch { /* silent */ }
  }, []);

  // Initial fetch + poll every 5s
  useEffect(() => {
    fetchMessages();
    const iv = setInterval(fetchMessages, 5000);
    return () => clearInterval(iv);
  }, [fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track if user has scrolled up
  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotId, content: text }),
      });
      if (res.ok) {
        autoScrollRef.current = true;
        await fetchMessages();
      }
    } catch { /* silent */ }
    setSending(false);
  };

  const handleEdit = async (id: string) => {
    const text = editContent.trim();
    if (!text) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotId, content: text }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditContent('');
        await fetchMessages();
      }
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotId }),
      });
      if (res.ok) {
        await fetchMessages();
      }
    } catch { /* silent */ }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const rankColor = (rank: string) => {
    const r = rank.toLowerCase();
    if (r.includes('chief') || r.includes('captain')) return 'text-amber-400';
    if (r.includes('senior') || r.includes('first')) return 'text-emerald-400';
    if (r.includes('second') || r.includes('officer')) return 'text-sky-400';
    return 'text-gray-400';
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-[0.15em] border bg-accent-gold/10 border-accent-gold/20 text-accent-gold uppercase">
            <MessageCircle size={10} />
            {messages.length} Messages
          </div>
          <span className="text-xs text-gray-500 font-mono">
            Auto-clears at 00:00Z daily
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto rounded-xl border border-white/5 bg-[#080c14] p-3 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle size={24} className="text-gray-700 mb-2" />
            <p className="text-xs text-gray-600 font-mono uppercase tracking-widest">No messages yet</p>
            <p className="text-xs text-gray-700 font-mono mt-1">Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.pilot_id === pilotId;
            const isEditing = editingId === msg._id;

            return (
              <div
                key={msg._id}
                className={`group flex gap-2 py-1.5 px-2 rounded-lg transition-colors ${isOwn ? 'bg-accent-gold/[0.03]' : 'hover:bg-white/[0.02]'}`}
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-lg bg-dark-800 border border-white/10 flex items-center justify-center text-[9px] font-bold text-accent-gold shrink-0 mt-0.5">
                  {msg.pilot_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${isOwn ? 'text-accent-gold' : 'text-white'}`}>
                      {msg.pilot_name}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${rankColor(msg.pilot_rank)}`}>
                      {msg.pilot_rank}
                    </span>
                    <span className="text-[9px] text-gray-700 font-mono ml-auto shrink-0">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(msg._id); if (e.key === 'Escape') setEditingId(null); }}
                        className="flex-1 bg-dark-950 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono outline-none focus:border-accent-gold/30"
                        autoFocus
                      />
                      <button onClick={() => handleEdit(msg._id)} className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border-none cursor-pointer">
                        <Check size={10} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 transition-colors border-none cursor-pointer">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300 leading-relaxed break-words" style={{ unicodeBidi: 'plaintext', textAlign: 'start', overflowWrap: 'break-word', fontFamily: "'JetBrains Mono', 'Segoe UI Arabic', 'Noto Sans Arabic', sans-serif", lineHeight: 1.6 }}>
                      {msg.content}
                      {msg.edited && (
                        <span className="text-[9px] text-gray-600 ml-1.5 italic">(edited)</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Actions (own messages only) */}
                {isOwn && !isEditing && (
                  <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setEditingId(msg._id); setEditContent(msg.content); }}
                      className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-all bg-transparent border-none cursor-pointer"
                      title="Edit"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      onClick={() => handleDelete(msg._id)}
                      className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all bg-transparent border-none cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={`Message as ${pilotName || 'Pilot'}...`}
          maxLength={500}
          dir="auto"
          className="flex-1 bg-[#080c14] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-accent-gold/30 transition-colors placeholder:text-gray-600"
          style={{ unicodeBidi: 'plaintext', fontFamily: "'JetBrains Mono', 'Segoe UI Arabic', 'Noto Sans Arabic', sans-serif" }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="px-4 py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 cursor-pointer border-none transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #d4af37 0%, #cd7f32 100%)' }}
        >
          <Send size={10} className="text-dark-950" />
          <span className="text-dark-950">Send</span>
        </button>
      </div>
    </div>
  );
}
