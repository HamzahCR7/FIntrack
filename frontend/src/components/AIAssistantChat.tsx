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
      text: 'Welcome to Ask My Money — your central AI financial hub! I am connected to your Financial Calculator Hub, "Can I Afford This?" Affordability Engine, and Financial Time Machine. Ask me any question or test scenarios!',
      suggestedFollowUps: [
        'Can I afford a new laptop for ₹65,000?',
        'Time Machine: What if I reduce food spending by 20% for 1 year?',
        'Calculate my EMI for 1 Lakh at 12% interest for 2 years',
        'Why did I spend more this month?',
        'How can I save more?',
        'How much money do people owe me?',
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
    <div className="relative overflow-hidden bg-slate-900 border border-slate-700/80 rounded-2xl shadow-xl flex flex-col h-[650px]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Ask My Money — Central AI Experience</h2>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                Intelligence Hub
              </span>
            </div>
            <p className="text-xs text-slate-400">Connected to Calculator Hub, Affordability Engine & Time Machine</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Strict Controlled Tool Execution</span>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
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
                        <span>"{chip}"</span>
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
      <div className="p-4 border-t border-slate-800 bg-slate-900/90">
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
            placeholder="Ask FinTrack AI (e.g. 'How much did I spend on food using my credit card?')..."
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
