'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { MessagesSquare, Hash, Users, Plus, Send, AtSign, Mail, Inbox, Check, Loader2, RefreshCw, X, Star, Paperclip, Reply, Trash2, Forward, UserCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Empty defaults - no demo data for new users
const defaultChannels: { id: string; name: string; unread: number }[] = [];
const defaultTeamMembers: { id: string; name: string; status: string; role: string }[] = [];

type Email = {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
};

export default function TeamChatPage() {
  const { token, user } = useAuth();
  const [channels, setChannels] = useState<{ id: string; name: string; unread: number }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; status: string; role: string }[]>([]);
  const [chatMessages, setChatMessages] = useState<{ id: string; user: string; avatar: string; text: string; time: string; channelId: string }[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<{ id: string; name: string; unread: number } | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'email'>('email'); // Default to email since chat is empty for new users
  const [chatLoading, setChatLoading] = useState(true);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  // Get user-specific storage key for chat data
  const getChatStorageKey = useCallback(() => {
    return user?.id ? `palmcare_teamchat_${user.id}` : null;
  }, [user?.id]);

  // Load chat data from localStorage (user-specific)
  useEffect(() => {
    const storageKey = getChatStorageKey();
    if (!storageKey) {
      setChatLoading(false);
      return;
    }
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const { channels: savedChannels, teamMembers: savedMembers, messages: savedMessages } = JSON.parse(savedData);
        setChannels(savedChannels || []);
        setTeamMembers(savedMembers || []);
        setChatMessages(savedMessages || []);
        if (savedChannels?.length > 0) {
          setSelectedChannel(savedChannels[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load chat data:', error);
    }
    setChatLoading(false);
  }, [getChatStorageKey]);

  // Save chat data to localStorage when it changes
  useEffect(() => {
    const storageKey = getChatStorageKey();
    if (!storageKey || chatLoading) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify({ 
        channels, 
        teamMembers, 
        messages: chatMessages 
      }));
    } catch (error) {
      console.error('Failed to save chat data:', error);
    }
  }, [channels, teamMembers, chatMessages, getChatStorageKey, chatLoading]);

  const handleAddChannel = () => {
    if (!newChannelName.trim()) return;
    const newChannel = {
      id: `channel_${Date.now()}`,
      name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
      unread: 0,
    };
    setChannels([...channels, newChannel]);
    setSelectedChannel(newChannel);
    setNewChannelName('');
    setShowAddChannelModal(false);
  };

  const handleSendChatMessage = () => {
    if (!newMessage.trim() || !selectedChannel || !user) return;
    
    const newMsg = {
      id: `msg_${Date.now()}`,
      user: user.name || user.email || 'You',
      avatar: (user.name || user.email || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2),
      text: newMessage,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      channelId: selectedChannel.id,
    };
    
    setChatMessages([...chatMessages, newMsg]);
    setNewMessage('');
  };

  const getChannelMessages = () => {
    if (!selectedChannel) return [];
    return chatMessages.filter(m => m.channelId === selectedChannel.id);
  };
  
  // Gmail state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [checkingGmail, setCheckingGmail] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
  const [emailFolder, setEmailFolder] = useState<'INBOX' | 'SENT' | 'STARRED'>('INBOX');
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'forward'>('new');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState<{ id: number; name: string; email: string; type: 'client' | 'caregiver' }[]>([]);

  // Check Gmail connection status
  useEffect(() => {
    const checkGmailStatus = async () => {
      if (!token) {
        setCheckingGmail(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_URL}/gmail/status`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          setGmailConnected(data.connected);
          if (data.connected) {
            fetchEmails();
          }
        }
      } catch (error) {
        console.error('Failed to check Gmail status:', error);
      }
      setCheckingGmail(false);
    };

    checkGmailStatus();
  }, [token]);

  // Fetch clients and caregivers for quick email
  useEffect(() => {
    const fetchContacts = async () => {
      if (!token) return;
      
      try {
        // Fetch clients
        const clientsRes = await fetch(`${API_URL}/clients`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          const clientContacts = (clientsData || [])
            .filter((c: any) => c.email)
            .map((c: any) => ({
              id: c.id,
              name: c.full_name,
              email: c.email,
              type: 'client' as const,
            }));
          
          // Fetch caregivers from API instead of mock data
          try {
            const caregiversRes = await fetch(`${API_URL}/caregivers`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (caregiversRes.ok) {
              const caregiversData = await caregiversRes.json();
              const caregiverContacts = (caregiversData || [])
                .filter((c: any) => c.email)
                .map((c: any) => ({
                  id: c.id,
                  name: c.full_name,
                  email: c.email,
                  type: 'caregiver' as const,
                }));
              
              setContacts([...clientContacts, ...caregiverContacts]);
            } else {
              setContacts(clientContacts);
            }
          } catch {
            setContacts(clientContacts);
          }
        }
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      }
    };
    
    fetchContacts();
  }, [token]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
      alert('Failed to connect Gmail: ' + error);
      window.history.replaceState({}, '', '/team-chat');
      return;
    }
    
    if (code && token) {
      const connectGmail = async () => {
        setGmailLoading(true);
        try {
          const response = await fetch(`${API_URL}/gmail/connect`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              redirect_uri: `${window.location.origin}/team-chat`,
            }),
          });
          
          if (response.ok) {
            setGmailConnected(true);
            fetchEmails();
          } else {
            const data = await response.json();
            alert('Failed to connect: ' + (data.detail || 'Unknown error'));
          }
        } catch (error) {
          console.error('Failed to connect Gmail:', error);
          alert('Failed to connect Gmail');
        }
        window.history.replaceState({}, '', '/team-chat');
        setGmailLoading(false);
      };
      
      connectGmail();
    }
  }, [token]);

  const fetchEmails = async (folder: string = emailFolder) => {
    if (!token) return;
    
    setGmailLoading(true);
    setGmailError(null);
    try {
      const response = await fetch(`${API_URL}/gmail/messages?label=${folder}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Map API response to Email type
        const mappedEmails = (data.messages || []).map((msg: any) => ({
          id: msg.id,
          from: msg.from_name || msg.from || 'Unknown',
          fromEmail: msg.from_email || msg.fromEmail || '',
          subject: msg.subject || '(No Subject)',
          snippet: msg.snippet || '',
          date: msg.date || '',
          unread: msg.unread || false,
          starred: msg.starred || false,
          hasAttachment: msg.hasAttachment || msg.has_attachment || false,
        }));
        setEmails(mappedEmails);
      } else {
        const errorData = await response.json();
        console.error('Gmail API error:', response.status, errorData);
        setGmailError(errorData.detail || `Failed to fetch emails (${response.status})`);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      setGmailError('Network error fetching emails');
    }
    setGmailLoading(false);
  };
  
  // Fetch emails when folder changes
  useEffect(() => {
    if (gmailConnected && token) {
      fetchEmails(emailFolder);
    }
  }, [emailFolder, gmailConnected]);
  
  // Toggle star on an email
  const handleToggleStar = async (emailId: string, currentlyStarred: boolean) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/gmail/messages/${emailId}/star?starred=${!currentlyStarred}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        // Update local state
        setEmails(emails.map(e => 
          e.id === emailId ? { ...e, starred: !currentlyStarred } : e
        ));
        // Update selected email if viewing
        if (selectedEmail?.id === emailId) {
          setSelectedEmail({ ...selectedEmail, starred: !currentlyStarred });
        }
      }
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleConnectGmail = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      alert('Gmail is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to environment variables.');
      return;
    }

    const redirectUri = `${window.location.origin}/team-chat`;
    // Request all Google scopes so the token works for Calendar, Drive, and Gmail
    const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    
    window.location.href = authUrl;
  };

  const handleDisconnectGmail = async () => {
    if (!token) return;
    
    try {
      await fetch(`${API_URL}/gmail/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setGmailConnected(false);
      setEmails([]);
    } catch (error) {
      console.error('Failed to disconnect Gmail:', error);
    }
  };

  const handleSendEmail = async () => {
    if (!token || !composeData.to || !composeData.subject) return;
    
    setGmailLoading(true);
    try {
      const response = await fetch(`${API_URL}/gmail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(composeData),
      });
      
      if (response.ok) {
        setShowComposeModal(false);
        setComposeData({ to: '', subject: '', body: '' });
        setComposeMode('new');
        fetchEmails();
      } else {
        const data = await response.json();
        alert('Failed to send: ' + (data.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email');
    }
    setGmailLoading(false);
  };

  const handleReply = (email: Email) => {
    setComposeMode('reply');
    setComposeData({
      to: email.fromEmail || '',
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: `\n\n--- Original Message ---\nFrom: ${email.from} <${email.fromEmail}>\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.snippet}`,
    });
    setShowEmailModal(false);
    setShowComposeModal(true);
  };

  const handleForward = (email: Email) => {
    setComposeMode('forward');
    setComposeData({
      to: '',
      subject: email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
      body: `\n\n--- Forwarded Message ---\nFrom: ${email.from} <${email.fromEmail}>\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.snippet}`,
    });
    setShowEmailModal(false);
    setShowComposeModal(true);
  };

  const handleQuickEmail = (contact: { name: string; email: string }) => {
    setComposeMode('new');
    setComposeData({
      to: contact.email,
      subject: '',
      body: `Hi ${contact.name.split(' ')[0]},\n\n`,
    });
    setShowContactPicker(false);
    setShowComposeModal(true);
  };

  // No mock emails - only show real emails when connected
  const displayEmails = gmailConnected ? emails : [];

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 flex">
        {/* Channels & Team */}
        <div className="w-64 border-r border-dark-700/50 flex flex-col">
          <div className="p-4 border-b border-dark-700/50">
            <h1 className="text-xl font-bold text-white">Communication</h1>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-dark-700/50">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <MessagesSquare className="w-4 h-4 inline mr-1.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'email'
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4 inline mr-1.5" />
              Email
            </button>
          </div>
          
          {activeTab === 'chat' ? (
            <>
              {/* Channels */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-dark-500 uppercase">Channels</span>
                  <button 
                    onClick={() => setShowAddChannelModal(true)}
                    className="p-1 hover:bg-dark-800 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4 text-dark-400" />
                  </button>
                </div>
                {channels.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-dark-500 text-xs">No channels yet</p>
                    <button 
                      onClick={() => setShowAddChannelModal(true)}
                      className="text-primary-400 text-xs mt-1 hover:underline"
                    >
                      Create one
                    </button>
                  </div>
                ) : (
                <div className="space-y-1">
                  {channels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        selectedChannel?.id === channel.id
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
                )}
              </div>

              {/* Team Members */}
              <div className="p-4 border-t border-dark-700/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-dark-500 uppercase">Team</span>
                  <span className="text-xs text-dark-500">{teamMembers.filter(m => m.status === 'online').length} online</span>
                </div>
                {teamMembers.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-dark-500 text-xs">No team members yet</p>
                  </div>
                ) : (
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
                )}
              </div>
            </>
          ) : (
            <>
              {/* Gmail Connection */}
              <div className="p-4">
                {gmailConnected ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Gmail Connected</span>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectGmail}
                    disabled={checkingGmail}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium mb-4"
                  >
                    {checkingGmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Connect Gmail
                      </>
                    )}
                  </button>
                )}

                <div className="space-y-1">
                  <button 
                    onClick={() => setEmailFolder('INBOX')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      emailFolder === 'INBOX' ? 'bg-primary-500/20 text-white' : 'text-dark-400 hover:bg-dark-800 hover:text-white'
                    }`}
                  >
                    <Inbox className="w-4 h-4" />
                    <span className="flex-1 text-left text-sm">Inbox</span>
                    {displayEmails.filter(e => e.unread).length > 0 && emailFolder === 'INBOX' && (
                      <span className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-xs">
                        {displayEmails.filter(e => e.unread).length}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => setEmailFolder('STARRED')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      emailFolder === 'STARRED' ? 'bg-primary-500/20 text-white' : 'text-dark-400 hover:bg-dark-800 hover:text-white'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                    <span className="flex-1 text-left text-sm">Starred</span>
                  </button>
                  <button 
                    onClick={() => setEmailFolder('SENT')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      emailFolder === 'SENT' ? 'bg-primary-500/20 text-white' : 'text-dark-400 hover:bg-dark-800 hover:text-white'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span className="flex-1 text-left text-sm">Sent</span>
                  </button>
                </div>
              </div>

              {gmailConnected && (
                <div className="p-4 border-t border-dark-700/50">
                  <button
                    onClick={handleDisconnectGmail}
                    className="w-full text-xs text-dark-500 hover:text-red-400 transition-colors"
                  >
                    Disconnect Gmail
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {activeTab === 'chat' ? (
            selectedChannel ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-dark-700/50 flex items-center gap-3">
                  <Hash className="w-5 h-5 text-dark-400" />
                  <h2 className="font-medium text-white">{selectedChannel.name}</h2>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {getChannelMessages().length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-dark-400">
                      <MessagesSquare className="w-12 h-12 mb-3 opacity-50" />
                      <p>No messages in #{selectedChannel.name} yet</p>
                      <p className="text-sm">Be the first to say something!</p>
                    </div>
                  ) : (
                    getChannelMessages().map(msg => (
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
                    ))
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-dark-700/50">
                  <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
                      <AtSign className="w-5 h-5 text-dark-400" />
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                      placeholder={`Message #${selectedChannel.name}`}
                      className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
                    />
                    <button 
                      onClick={handleSendChatMessage}
                      className="p-2.5 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                    >
                      <Send className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-dark-400">
                <MessagesSquare className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg mb-2">No channel selected</p>
                <p className="text-sm mb-4">Create a channel to start chatting</p>
                <button 
                  onClick={() => setShowAddChannelModal(true)}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Create Channel
                </button>
              </div>
            )
          ) : (
            <>
              {/* Email Header */}
              <div className="p-4 border-b border-dark-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Inbox className="w-5 h-5 text-dark-400" />
                  <h2 className="font-medium text-white">
                    {emailFolder === 'INBOX' ? 'Inbox' : emailFolder === 'SENT' ? 'Sent' : 'Starred'}
                  </h2>
                  <span className="text-sm text-dark-500">{displayEmails.length} messages</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchEmails()}
                    disabled={gmailLoading || !gmailConnected}
                    className="p-2 hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-5 h-5 text-dark-400 ${gmailLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowContactPicker(!showContactPicker)}
                      className="flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <UserCircle className="w-4 h-4" />
                      Quick Email
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showContactPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowContactPicker(false)} />
                        <div className="absolute right-0 mt-2 w-72 bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                        <div className="p-3 border-b border-dark-700">
                          <p className="text-xs font-semibold text-dark-400 uppercase">Clients</p>
                        </div>
                        {contacts.filter(c => c.type === 'client').length === 0 ? (
                          <div className="p-3 text-sm text-dark-500">No clients with emails</div>
                        ) : (
                          contacts.filter(c => c.type === 'client').map(contact => (
                            <button
                              key={contact.id}
                              onClick={() => handleQuickEmail(contact)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-dark-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <span className="text-blue-400 text-xs font-medium">
                                  {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{contact.name}</p>
                                <p className="text-xs text-dark-500 truncate">{contact.email}</p>
                              </div>
                            </button>
                          ))
                        )}
                        <div className="p-3 border-t border-b border-dark-700">
                          <p className="text-xs font-semibold text-dark-400 uppercase">Caregivers</p>
                        </div>
                        {contacts.filter(c => c.type === 'caregiver').map(contact => (
                          <button
                            key={contact.id}
                            onClick={() => handleQuickEmail(contact)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-dark-700 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                              <span className="text-green-400 text-xs font-medium">
                                {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{contact.name}</p>
                              <p className="text-xs text-dark-500 truncate">{contact.email}</p>
                            </div>
                          </button>
                        ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => { setComposeMode('new'); setComposeData({ to: '', subject: '', body: '' }); setShowComposeModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Compose
                  </button>
                </div>
              </div>

              {/* Email List */}
              <div className="flex-1 overflow-y-auto">
                {!gmailConnected && (
                  <div className="p-4 bg-dark-800/50 border-b border-dark-700/50">
                    <p className="text-sm text-dark-400">
                      Connect your Gmail account above to sync your emails.
                    </p>
                  </div>
                )}
                
                {gmailError && gmailConnected && (
                  <div className="p-4 bg-red-500/10 border-b border-red-500/20">
                    <p className="text-sm text-red-400">{gmailError}</p>
                    <button 
                      onClick={() => fetchEmails()}
                      className="mt-2 text-xs text-red-300 underline hover:text-red-200"
                    >
                      Try again
                    </button>
                  </div>
                )}
                
                {displayEmails.length === 0 && !gmailError ? (
                  <div className="flex flex-col items-center justify-center h-64 text-dark-400">
                    <Mail className="w-12 h-12 mb-4 opacity-50" />
                    <p>No emails to display</p>
                  </div>
                ) : displayEmails.length === 0 ? null : (
                  displayEmails.map(email => (
                    <div
                      key={email.id}
                      className={`w-full flex items-start gap-4 p-4 border-b border-dark-700/30 hover:bg-dark-800/50 transition-colors text-left ${
                        email.unread ? 'bg-dark-800/30' : ''
                      }`}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleStar(email.id, email.starred); }}
                        className="flex-shrink-0 pt-1 hover:scale-110 transition-transform"
                      >
                        {email.starred ? (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        ) : (
                          <Star className="w-4 h-4 text-dark-600 hover:text-yellow-400" />
                        )}
                      </button>
                      <button 
                        onClick={() => { setSelectedEmail(email); setShowEmailModal(true); }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium ${email.unread ? 'text-white' : 'text-dark-300'}`}>
                            {email.from}
                          </span>
                          {email.hasAttachment && <Paperclip className="w-3 h-3 text-dark-500" />}
                          <span className="text-xs text-dark-500 ml-auto">{email.date}</span>
                        </div>
                        <p className={`text-sm mb-1 ${email.unread ? 'text-white font-medium' : 'text-dark-400'}`}>
                          {email.subject}
                        </p>
                        <p className="text-sm text-dark-500 truncate">{email.snippet}</p>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Compose Email Modal */}
        {showComposeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-2xl">
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <div className="flex items-center gap-2">
                  {composeMode === 'reply' && <Reply className="w-5 h-5 text-primary-400" />}
                  {composeMode === 'forward' && <Forward className="w-5 h-5 text-primary-400" />}
                  <h2 className="font-bold text-white">
                    {composeMode === 'reply' ? 'Reply' : composeMode === 'forward' ? 'Forward' : 'New Message'}
                  </h2>
                </div>
                <button onClick={() => { setShowComposeModal(false); setComposeMode('new'); }} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <input
                    type="email"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    placeholder="To"
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Subject"
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <textarea
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    placeholder="Write your message..."
                    rows={10}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border-t border-dark-700">
                <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                  <Paperclip className="w-5 h-5 text-dark-400" />
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowComposeModal(false)}
                    className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={gmailLoading || !composeData.to || !composeData.subject}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {gmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email View Modal */}
        {showEmailModal && selectedEmail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <h2 className="font-bold text-white truncate flex-1">{selectedEmail.subject}</h2>
                <button onClick={() => setShowEmailModal(false)} className="p-2 hover:bg-dark-700 rounded-lg ml-2">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="p-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <span className="text-primary-400 text-sm font-medium">
                      {(selectedEmail.from || 'U').split(' ').map(n => n?.[0] || '').join('').slice(0, 2) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{selectedEmail.from || 'Unknown Sender'}</p>
                    <p className="text-sm text-dark-400">{selectedEmail.fromEmail || ''}</p>
                  </div>
                  <span className="text-sm text-dark-500">{selectedEmail.date || ''}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-dark-300 whitespace-pre-wrap">{selectedEmail.snippet}</p>
              </div>
              <div className="flex items-center gap-3 p-4 border-t border-dark-700">
                <button 
                  onClick={() => handleReply(selectedEmail)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
                <button 
                  onClick={() => handleForward(selectedEmail)}
                  className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                >
                  <Forward className="w-4 h-4" />
                  Forward
                </button>
                <div className="flex-1" />
                <button 
                  onClick={() => handleToggleStar(selectedEmail.id, selectedEmail.starred)}
                  className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <Star className={`w-5 h-5 ${selectedEmail.starred ? 'text-yellow-400 fill-yellow-400' : 'text-dark-400 hover:text-yellow-400'}`} />
                </button>
                <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5 text-dark-400 hover:text-red-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Channel Modal */}
        {showAddChannelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Create Channel</h2>
                <button onClick={() => setShowAddChannelModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-300 mb-2">Channel Name</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. general"
                    className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddChannelModal(false)}
                  className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddChannel}
                  className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Create Channel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
