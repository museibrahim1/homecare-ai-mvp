'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { MessageSquare, Search, Send, Paperclip, Phone, Video, MessagesSquare, Plus, Loader2, Users, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Conversation = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
};

type Message = {
  id: string;
  sender: 'client' | 'me';
  text: string;
  time: string;
};

export default function MessagesPage() {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewConvoModal, setShowNewConvoModal] = useState(false);
  const [clients, setClients] = useState<any[]>([]);

  // Get user-specific storage key
  const getStorageKey = useCallback(() => {
    return user?.id ? `palmcare_messages_${user.id}` : null;
  }, [user?.id]);

  // Load conversations from localStorage (user-specific)
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) {
      setLoading(false);
      return;
    }
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const { conversations: savedConvos, messages: savedMessages } = JSON.parse(savedData);
        setConversations(savedConvos || []);
        setMessages(savedMessages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
    setLoading(false);
  }, [getStorageKey]);

  // Save messages to localStorage when they change
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey || loading) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify({ conversations, messages }));
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  }, [conversations, messages, getStorageKey, loading]);

  // Fetch clients for new conversation modal
  useEffect(() => {
    const fetchClients = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/clients`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setClients(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    };
    fetchClients();
  }, [token]);

  const handleSelectConversation = (convo: Conversation) => {
    setSelectedConversation(convo);
  };

  const handleStartConversation = (client: any) => {
    const avatar = (client.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2);
    const newConvo: Conversation = {
      id: `convo_${Date.now()}`,
      name: client.full_name,
      lastMessage: '',
      time: 'Just now',
      unread: 0,
      avatar,
    };
    setConversations([newConvo, ...conversations]);
    setSelectedConversation(newConvo);
    setShowNewConvoModal(false);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'me',
      text: newMessage,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
    
    setMessages([...messages, { ...newMsg, conversationId: selectedConversation.id } as any]);
    
    // Update conversation's last message
    setConversations(conversations.map(c => 
      c.id === selectedConversation.id 
        ? { ...c, lastMessage: newMessage, time: 'Just now' }
        : c
    ));
    
    setNewMessage('');
  };

  const getConversationMessages = () => {
    if (!selectedConversation) return [];
    return (messages as any[]).filter((m: any) => m.conversationId === selectedConversation.id);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-900">Messages</h1>
              <button 
                onClick={() => setShowNewConvoModal(true)}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 text-primary-400" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessagesSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No conversations yet</p>
                <button 
                  onClick={() => setShowNewConvoModal(true)}
                  className="mt-3 text-primary-400 text-sm hover:underline"
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-white transition-colors border-b border-slate-200/30 ${
                    selectedConversation?.id === conv.id ? 'bg-white' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-400 font-medium">{conv.avatar}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800 truncate">{conv.name}</span>
                      <span className="text-xs text-slate-400">{conv.time}</span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{conv.lastMessage || 'No messages yet'}</p>
                  </div>
                  {conv.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                      <span className="text-xs text-slate-900 font-medium">{conv.unread}</span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                    <span className="text-primary-400 font-medium">{selectedConversation.avatar}</span>
                  </div>
                  <div>
                    <h2 className="font-medium text-slate-800">{selectedConversation.name}</h2>
                    <span className="text-xs text-emerald-600">Online</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white rounded-lg transition-colors">
                    <Phone className="w-5 h-5 text-slate-500" />
                  </button>
                  <button className="p-2 hover:bg-white rounded-lg transition-colors">
                    <Video className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {getConversationMessages().length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                    <p>No messages yet. Say hello!</p>
                  </div>
                ) : (
                  getConversationMessages().map((msg: Message) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-3 rounded-2xl ${
                          msg.sender === 'me'
                            ? 'bg-primary-500 text-white rounded-br-md'
                            : 'bg-white text-slate-800 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <span className={`text-xs mt-1 block ${msg.sender === 'me' ? 'text-primary-200' : 'text-slate-400'}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <button className="p-2 hover:bg-white rounded-lg transition-colors">
                    <Paperclip className="w-5 h-5 text-slate-500" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="p-2.5 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <MessagesSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg mb-2">Select a conversation</p>
              <p className="text-sm">or start a new one</p>
              <button 
                onClick={() => setShowNewConvoModal(true)}
                className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                New Conversation
              </button>
            </div>
          )}
        </div>

        {/* New Conversation Modal */}
        {showNewConvoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">New Conversation</h2>
                <button onClick={() => setShowNewConvoModal(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              {clients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-2">No clients found</p>
                  <p className="text-sm text-slate-400">Add clients to start conversations</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500 mb-3">Select a client to message:</p>
                  {clients.map((client: any) => (
                    <button
                      key={client.id}
                      onClick={() => handleStartConversation(client)}
                      className="w-full flex items-center gap-3 p-3 bg-slate-100 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                        <span className="text-primary-400 font-medium">
                          {client.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-slate-800">{client.full_name}</p>
                        <p className="text-sm text-slate-500">{client.email || 'No email'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
