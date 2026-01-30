'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { MessageSquare, Search, Send, Paperclip, Phone, Video } from 'lucide-react';

const mockConversations = [
  { id: 1, name: 'Margaret Thompson', lastMessage: 'Thank you for the care plan update', time: '2m ago', unread: 2, avatar: 'MT' },
  { id: 2, name: 'Robert Williams (Family)', lastMessage: 'When is the next assessment?', time: '1h ago', unread: 0, avatar: 'RW' },
  { id: 3, name: 'Eleanor Davis', lastMessage: 'The caregiver was wonderful today', time: '3h ago', unread: 1, avatar: 'ED' },
  { id: 4, name: 'James Wilson (Son)', lastMessage: 'Can we schedule a call?', time: 'Yesterday', unread: 0, avatar: 'JW' },
];

const mockMessages = [
  { id: 1, sender: 'client', text: 'Hi, I wanted to check on the care plan for my mother.', time: '10:30 AM' },
  { id: 2, sender: 'me', text: 'Of course! I just updated the care plan based on the latest assessment. Would you like me to walk you through the changes?', time: '10:32 AM' },
  { id: 3, sender: 'client', text: 'Yes please, that would be helpful.', time: '10:33 AM' },
  { id: 4, sender: 'me', text: 'The main updates include increased daily visits from 4 to 6 hours, addition of physical therapy support twice a week, and updated medication management protocols.', time: '10:35 AM' },
  { id: 5, sender: 'client', text: 'Thank you for the care plan update', time: '10:38 AM' },
];

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [newMessage, setNewMessage] = useState('');

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-dark-700/50 flex flex-col">
          <div className="p-4 border-b border-dark-700/50">
            <h1 className="text-xl font-bold text-white mb-4">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-9 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {mockConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-dark-800/50 transition-colors border-b border-dark-700/30 ${
                  selectedConversation.id === conv.id ? 'bg-dark-800/50' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-400 font-medium">{conv.avatar}</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white truncate">{conv.name}</span>
                    <span className="text-xs text-dark-500">{conv.time}</span>
                  </div>
                  <p className="text-sm text-dark-400 truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                    <span className="text-xs text-white font-medium">{conv.unread}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-dark-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                <span className="text-primary-400 font-medium">{selectedConversation.avatar}</span>
              </div>
              <div>
                <h2 className="font-medium text-white">{selectedConversation.name}</h2>
                <span className="text-xs text-green-400">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
                <Phone className="w-5 h-5 text-dark-400" />
              </button>
              <button className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
                <Video className="w-5 h-5 text-dark-400" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mockMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-4 py-3 rounded-2xl ${
                    msg.sender === 'me'
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : 'bg-dark-800 text-white rounded-bl-md'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <span className={`text-xs mt-1 block ${msg.sender === 'me' ? 'text-primary-200' : 'text-dark-500'}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-dark-700/50">
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
                <Paperclip className="w-5 h-5 text-dark-400" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
              />
              <button className="p-2.5 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors">
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
