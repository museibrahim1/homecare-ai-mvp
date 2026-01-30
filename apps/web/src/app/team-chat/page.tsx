'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { MessagesSquare, Hash, Users, Plus, Send, AtSign } from 'lucide-react';

const channels = [
  { id: 1, name: 'general', unread: 3 },
  { id: 2, name: 'care-team', unread: 0 },
  { id: 3, name: 'scheduling', unread: 1 },
  { id: 4, name: 'urgent', unread: 5 },
];

const teamMembers = [
  { id: 1, name: 'Sarah Johnson', status: 'online', role: 'Care Coordinator' },
  { id: 2, name: 'Mike Chen', status: 'online', role: 'RN Supervisor' },
  { id: 3, name: 'Emily Rodriguez', status: 'away', role: 'Caregiver' },
  { id: 4, name: 'David Kim', status: 'offline', role: 'Caregiver' },
];

const mockMessages = [
  { id: 1, user: 'Sarah Johnson', avatar: 'SJ', text: 'Good morning team! Just a reminder about the staff meeting at 10 AM.', time: '9:15 AM' },
  { id: 2, user: 'Mike Chen', avatar: 'MC', text: 'Thanks Sarah. I\'ll be there. Also, we have a new client assessment scheduled for this afternoon.', time: '9:20 AM' },
  { id: 3, user: 'Emily Rodriguez', avatar: 'ER', text: 'I can cover the afternoon shift if anyone needs. Just let me know!', time: '9:25 AM' },
  { id: 4, user: 'Sarah Johnson', avatar: 'SJ', text: '@Emily that would be great! Can you handle the Thompson visit at 2 PM?', time: '9:30 AM' },
];

export default function TeamChatPage() {
  const [selectedChannel, setSelectedChannel] = useState(channels[0]);
  const [newMessage, setNewMessage] = useState('');

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 flex">
        {/* Channels & Team */}
        <div className="w-64 border-r border-dark-700/50 flex flex-col">
          <div className="p-4 border-b border-dark-700/50">
            <h1 className="text-xl font-bold text-white">Team Chat</h1>
          </div>
          
          {/* Channels */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-dark-500 uppercase">Channels</span>
              <button className="p-1 hover:bg-dark-800 rounded transition-colors">
                <Plus className="w-4 h-4 text-dark-400" />
              </button>
            </div>
            <div className="space-y-1">
              {channels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    selectedChannel.id === channel.id
                      ? 'bg-primary-500/20 text-white'
                      : 'text-dark-400 hover:bg-dark-800 hover:text-white'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span className="flex-1 text-left text-sm">{channel.name}</span>
                  {channel.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-xs text-white">
                      {channel.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Team Members */}
          <div className="p-4 border-t border-dark-700/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-dark-500 uppercase">Team</span>
              <span className="text-xs text-dark-500">{teamMembers.filter(m => m.status === 'online').length} online</span>
            </div>
            <div className="space-y-2">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center gap-2 px-2 py-1.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                      <span className="text-xs text-white">{member.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-900 ${
                      member.status === 'online' ? 'bg-green-500' :
                      member.status === 'away' ? 'bg-yellow-500' : 'bg-dark-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{member.name}</p>
                    <p className="text-xs text-dark-500 truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-dark-700/50 flex items-center gap-3">
            <Hash className="w-5 h-5 text-dark-400" />
            <h2 className="font-medium text-white">{selectedChannel.name}</h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {mockMessages.map(msg => (
              <div key={msg.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-400 text-sm font-medium">{msg.avatar}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{msg.user}</span>
                    <span className="text-xs text-dark-500">{msg.time}</span>
                  </div>
                  <p className="text-dark-300">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-dark-700/50">
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
                <AtSign className="w-5 h-5 text-dark-400" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message #${selectedChannel.name}`}
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
