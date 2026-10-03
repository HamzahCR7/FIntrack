import React, { useState } from 'react';
import { Sparkles, Bot, Send, ShieldCheck, Zap, User, RefreshCw, MessageSquare } from 'lucide-react';
import axios from 'axios';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  intent?: string;
  toolUsed?: string;
  data?: any;
  suggestedFollowUps?: string[];
}

export const AIAssistantChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Hi! Ask me anything about your spending, savings, balances, or financial plans.',
      suggestedFollowUps: [
        'Why did I spend more this month?',
        'How can I save more?',
        'How much money do people owe me?',
        'Can I afford a new laptop for ₹65,000?',
      ],
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendQuery = async (queryText?: string) => {
    const textToSubmit = queryText || inputQuery;
    if (!textToSubmit || textToSubmit.trim().length === 0 || isLoading) return;

    const userMsg: Message = { sender: 'user', text: textToSubmit };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/v1/ai/query', {
        query: textToSubmit,
        contextHistory: messages.map((m) => ({ sender: m.sender, text: m.text })),
      });

      const responseData = res.data.data;

      const aiMsg: Message = {
        sender: 'assistant',
        text: responseData.answer,
        intent: responseData.intent,
        toolUsed: responseData.toolUsed,
        data: responseData.data,
        suggestedFollowUps: responseData.suggestedFollowUps,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      const errorMsg: Message = {
        sender: 'assistant',
        text: err.response?.data?.message || err.message || 'Sorry, I encountered an error processing your query.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  return (
    <div className="relative flex h-[calc(100dvh-13rem)] min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-xl md:h-[650px]">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 p-3.5 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Ask FinTrack</h2>
              <span className="hidden rounded-full border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 sm:inline">AI guide</span>
            </div>
            <p className="text-xs text-slate-400">Answers based on your financial data</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-300 sm:flex">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Private & secure</span>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-3.5 sm:p-5">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-indigo-300" />
              </div>
            )}

            <div
              className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed space-y-2.5 sm:max-w-[75%] sm:p-4 ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Tool Execution Badge */}
              {msg.toolUsed && (
                <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 text-[10px] text-slate-400">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>
                    Executed: <code className="text-indigo-300 font-mono">{msg.toolUsed}()</code>
                  </span>
                </div>
              )}

              {/* Suggested Follow Up Chips */}
              {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Suggested Questions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestedFollowUps.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleSendQuery(chip)}
                        className="text-[11px] bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-indigo-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>{chip}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-blue-300" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-indigo-300 animate-pulse" />
            </div>
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Analyzing intent & querying verified financial tools...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form Bar */}
      <div className="border-t border-slate-800 bg-slate-900/90 p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="relative flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about your money..."
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl pl-4 pr-12 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
