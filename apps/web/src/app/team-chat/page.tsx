'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { MessagesSquare, Hash, Users, Plus, Send, AtSign, Mail, Inbox, Check, Loader2, RefreshCw, X, Star, Paperclip, Reply, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  const { token } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState(channels[0]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'email'>('chat');
  
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
        setEmails(data.messages || []);
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

  // Mock emails for demo (when not connected)
  const mockEmails: Email[] = [
    { id: '1', from: 'Margaret Thompson', fromEmail: 'margaret@email.com', subject: 'Re: Care Plan Update', snippet: 'Thank you for the detailed care plan. I have reviewed it with my family and we are happy with...', date: '10:30 AM', unread: true, starred: false, hasAttachment: false },
    { id: '2', from: 'Insurance Co.', fromEmail: 'claims@insurance.com', subject: 'Claim #12345 Approved', snippet: 'Your claim has been approved. Please find the details attached...', date: '9:15 AM', unread: true, starred: true, hasAttachment: true },
    { id: '3', from: 'Robert Williams', fromEmail: 'rwilliams@email.com', subject: 'Schedule Change Request', snippet: 'I need to reschedule my appointment from Thursday to Friday if possible...', date: 'Yesterday', unread: false, starred: false, hasAttachment: false },
    { id: '4', from: 'State Health Dept.', fromEmail: 'compliance@state.gov', subject: 'Annual Compliance Review', snippet: 'This is a reminder that your annual compliance review is due next month...', date: 'Yesterday', unread: false, starred: true, hasAttachment: true },
    { id: '5', from: 'Eleanor Davis', fromEmail: 'edavis@email.com', subject: 'Thank You!', snippet: 'I wanted to thank Sarah for her wonderful care this week. She has been...', date: 'Jan 27', unread: false, starred: false, hasAttachment: false },
  ];

  const displayEmails = gmailConnected ? emails : mockEmails;

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
            <>
              {/* Chat Header */}
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
                    placeholder={`Message #${selectedChannel.name}`}
                    className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
                  />
                  <button className="p-2.5 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors">
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Email Header */}
              <div className="p-4 border-b border-dark-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Inbox className="w-5 h-5 text-dark-400" />
                  <h2 className="font-medium text-white">Inbox</h2>
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
                  <button
                    onClick={() => setShowComposeModal(true)}
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
                  <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/20">
                    <p className="text-sm text-yellow-400">
                      Connect your Gmail account to sync your emails. Showing demo data below.
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
                <h2 className="font-bold text-white">New Message</h2>
                <button onClick={() => setShowComposeModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
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
                      {selectedEmail.from.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{selectedEmail.from}</p>
                    <p className="text-sm text-dark-400">{selectedEmail.fromEmail}</p>
                  </div>
                  <span className="text-sm text-dark-500">{selectedEmail.date}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-dark-300 whitespace-pre-wrap">{selectedEmail.snippet}</p>
              </div>
              <div className="flex items-center gap-3 p-4 border-t border-dark-700">
                <button className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors">
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
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
      </main>
    </div>
  );
}
