'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, Send, MessageSquare, User as UserIcon, Building2, Calendar, Plus } from 'lucide-react'

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  message: string
  is_read: boolean
  created_at: string
  sender: {
    first_name: string
    last_name: string
    email: string
    role: string
  }
  recipient: {
    first_name: string
    last_name: string
    email: string
    role: string
  }
}

interface Sponsorship {
  id: string
  case_id: string
  amount: number
  status: string
  case: {
    title: string
    description: string
  }
}

interface MessageQueryResult {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  message: string
  is_read: boolean
  created_at: string
  sender?: {
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
  } | null | Array<{
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
  }>
  recipient?: {
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
  } | null | Array<{
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
  }>
}

interface SponsorshipQueryResult {
  id: string
  case_id: string
  amount: string | number
  status: string
  case?: {
    title: string | null
    description: string | null
  } | null | Array<{
    title: string | null
    description: string | null
  }>
}

export default function SponsorCommunicationsPage() {
  const t = useTranslations('sponsorships')
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [newMessage, setNewMessage] = useState({
    recipient_id: '',
    subject: '',
    message: ''
  })
  const [sending, setSending] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/auth/login')
        return
      }

      setUser(user)
      fetchData()
    } catch (err) {
      console.error('Error checking authentication:', err)
      router.push('/auth/login')
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch user's messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('communications')
        .select(`
          id,
          sender_id,
          recipient_id,
          subject,
          message,
          is_read,
          created_at,
          sender:users!communications_sender_id_fkey(
            first_name,
            last_name,
            email,
            role
          ),
          recipient:users!communications_recipient_id_fkey(
            first_name,
            last_name,
            email,
            role
          )
        `)
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })

      if (messagesError) throw messagesError

      // Fetch user's sponsorships
      const { data: sponsorshipsData, error: sponsorshipsError } = await supabase
        .from('sponsorships')
        .select(`
          id,
          case_id,
          amount,
          status,
          case:cases(
            title,
            description
          )
        `)
        .eq('sponsor_id', user?.id)
        .eq('status', 'approved')

      if (sponsorshipsError) throw sponsorshipsError

      // Transform the data to match the interfaces
      const transformedMessages = (messagesData || []).map((item: MessageQueryResult) => {
        // Normalize sender - handle both array and single object cases
        const senderData = Array.isArray(item.sender) 
          ? item.sender[0] 
          : item.sender
        
        // Normalize recipient - handle both array and single object cases
        const recipientData = Array.isArray(item.recipient)
          ? item.recipient[0]
          : item.recipient

        return {
          id: item.id,
          sender_id: item.sender_id,
          recipient_id: item.recipient_id,
          subject: item.subject,
          message: item.message,
          is_read: item.is_read,
          created_at: item.created_at,
          sender: {
            first_name: senderData?.first_name || '',
            last_name: senderData?.last_name || '',
            email: senderData?.email || '',
            role: senderData?.role || ''
          },
          recipient: {
            first_name: recipientData?.first_name || '',
            last_name: recipientData?.last_name || '',
            email: recipientData?.email || '',
            role: recipientData?.role || ''
          }
        }
      })

      const transformedSponsorships = (sponsorshipsData || []).map((item: SponsorshipQueryResult) => {
        // Normalize case - handle both array and single object cases
        const caseData = Array.isArray(item.case)
          ? item.case[0]
          : item.case

        return {
          id: item.id,
          case_id: item.case_id,
          amount: parseFloat(String(item.amount)),
          status: item.status,
          case: {
            title: caseData?.title || '',
            description: caseData?.description || ''
          }
        }
      })

      setMessages(transformedMessages)
      setSponsorships(transformedSponsorships)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.recipient_id || !newMessage.subject || !newMessage.message) {
      setError('Please fill in all fields')
      return
    }

    try {
      setSending(true)
      
      const { error } = await supabase
        .from('communications')
        .insert({
          sender_id: user?.id,
          recipient_id: newMessage.recipient_id,
          subject: newMessage.subject,
          message: newMessage.message
        })

      if (error) throw error

      // Create notification for recipient
      await supabase
        .from('notifications')
        .insert({
          type: 'new_message',
          recipient_id: newMessage.recipient_id,
          title: 'New Message',
          message: `You have received a new message: ${newMessage.subject}`,
          data: {
            messageId: 'new',
            subject: newMessage.subject
          }
        })

      setNewMessage({ recipient_id: '', subject: '', message: '' })
      setShowNewMessage(false)
      await fetchData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('communications')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('recipient_id', user?.id)

      await fetchData()
    } catch (err) {
      console.error('Error marking message as read:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const receivedMessages = messages.filter(m => m.recipient_id === user?.id)
  const sentMessages = messages.filter(m => m.sender_id === user?.id)
  const unreadCount = receivedMessages.filter(m => !m.is_read).length

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading communications...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold">Communications</h1>
            <p className="text-gray-600">Communicate with beneficiaries and administrators</p>
          </div>
          <Button onClick={() => setShowNewMessage(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">
              Received ({receivedMessages.length})
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">Sent ({sentMessages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="mt-6">
            <MessageList 
              messages={receivedMessages}
              onMessageClick={(message) => markAsRead(message.id)}
              showSender={true}
            />
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            <MessageList 
              messages={sentMessages}
              onMessageClick={() => {}}
              showSender={false}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send New Message</DialogTitle>
            <DialogDescription>
              Send a message to administrators or beneficiaries.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Recipient</label>
              <select
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                value={newMessage.recipient_id}
                onChange={(e) => setNewMessage(prev => ({ ...prev, recipient_id: e.target.value }))}
              >
                <option value="">Select recipient...</option>
                <option value="admin">Administrator</option>
                {/* Add more recipients based on sponsorships */}
                {sponsorships.map((sponsorship) => (
                  <option key={sponsorship.id} value={`case_${sponsorship.case_id}`}>
                    Case: {sponsorship.case.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={newMessage.subject}
                onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter message subject..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newMessage.message}
                onChange={(e) => setNewMessage(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter your message..."
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewMessage(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sending}
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MessageList({ 
  messages, 
  onMessageClick, 
  showSender 
}: { 
  messages: Message[]
  onMessageClick: (message: Message) => void
  showSender: boolean
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No messages found</h3>
            <p className="text-gray-600">
              {showSender ? 'You have no received messages.' : 'You have no sent messages.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {messages.map((message) => (
        <Card 
          key={message.id} 
          className={`cursor-pointer hover:shadow-md transition-shadow ${
            !message.is_read && showSender ? 'border-blue-200 bg-blue-50' : ''
          }`}
          onClick={() => onMessageClick(message)}
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{message.subject}</CardTitle>
                <CardDescription className="mt-2">
                  {message.message.length > 100 
                    ? `${message.message.substring(0, 100)}...` 
                    : message.message
                  }
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                {!message.is_read && showSender && (
                  <Badge variant="default">New</Badge>
                )}
                <span className="text-sm text-gray-500">
                  {formatDate(message.created_at)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">
                  {showSender 
                    ? `${message.sender.first_name} ${message.sender.last_name} (${message.sender.role})`
                    : `To: ${message.recipient.first_name} ${message.recipient.last_name} (${message.recipient.role})`
                  }
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {formatDate(message.created_at)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 