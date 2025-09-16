import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  text: string;
  isUser: boolean;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get 3 random suggestions
  const getRandomSuggestions = (allSuggestions: string[]) => {
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { text: data.response, isUser: false }]);
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      } else {
        toast.error('Failed to get response');
        setMessages(prev => [...prev, { text: 'క్షమించండి, ప్రస్తుతం సమాధానం ఇవ్వలేకపోతున్నాను.', isUser: false }]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send message');
      setMessages(prev => [...prev, { text: 'క్షమించండి, ప్రస్తుతం సమాధానం ఇవ్వలేకపోతున్నాను.', isUser: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#4a8c3f] text-white rounded-full p-3 shadow-lg hover:bg-[#3f7835] transition-colors"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl w-80 max-w-full">
          <div className="bg-[#4a8c3f] text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-medium">e-NAM సహాయకుడు</h3>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="h-96 overflow-y-auto p-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  msg.isUser ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
                    msg.isUser
                      ? 'bg-[#4a8c3f] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-center">
                <div className="animate-pulse text-gray-500">...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            <div className="mb-2 flex flex-wrap gap-2">
              {getRandomSuggestions(suggestions).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-sm bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 text-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="మీ ప్రశ్న ఇక్కడ టైప్ చేయండి..."
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:border-[#4a8c3f]"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#4a8c3f] text-white rounded-lg px-4 py-2 hover:bg-[#3f7835] transition-colors disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
