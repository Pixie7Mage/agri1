import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor, Plus, X, Users, Sprout, TrendingUp, Sun, Cloud, BarChart3 } from 'lucide-react';
import { auth, User } from '../lib/auth';
import toast from 'react-hot-toast';
import { crops } from '../data/crops';
import ChatBot from '../components/ChatBot';

interface CropData {
  cropId: number;
  quantity: number;
}

interface Notification {
  id: string;
  type: 'order_request' | 'order_accepted' | 'order_rejected' | 'message' | 'crop_inquiry';
  message: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected' | 'unread' | 'read';
  data?: {
    merchantUsername?: string;
    cropId?: number;
    quantity?: string;
  };
}

interface FarmerData {
  name: string;
  phoneNumber: string;
  location: string;
  currentCrops: CropData[];
  futureCrops: number[];
  notifications: Notification[];
}

interface MerchantData {
  name: string;
  businessName: string;
  username: string;
  phoneNumber: string;
  location: string;
}

interface MarketInsight {
  id: number;
  message: string;
  category: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [merchants, setMerchants] = useState<MerchantData[]>([]);
  const [farmers, setFarmers] = useState<FarmerData[]>([]);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<number>(0);
  const [cropQuantity, setCropQuantity] = useState<string>('');
  const [selectedFutureCrops, setSelectedFutureCrops] = useState<number[]>([]);
  const [weatherData, setWeatherData] = useState({ temp: '28°C', condition: 'Sunny' });
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerData | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<string>('');
  const [orderCropId, setOrderCropId] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedMessageCrop, setSelectedMessageCrop] = useState<number | null>(null);
  const [messageQuantity, setMessageQuantity] = useState<string>('');
  const [message, setMessage] = useState('');
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([]);

  useEffect(() => {
    const currentUser = auth.getUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchUserData(currentUser);
        if (currentUser.type === 'farmer') {
          await Promise.all([
            fetchMerchants(),
            fetchNotifications(currentUser),
            fetchMarketInsights(),
          ]);
        } else {
          await Promise.all([
            fetchFarmers(),
            fetchMerchantNotifications(currentUser),
            fetchMarketInsights(),
          ]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('సర్వర్‌తో కనెక్ట్ చేయడం సాధ్యం కాలేదు. మళ్ళీ ప్రయత్నించండి.');
        // Retry after 5 seconds, up to 3 times
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 5000);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, retryCount]);

  const fetchUserData = async (user: User) => {
    try {
      const response = await fetch(`http://localhost:5000/user/${user.type}/${user.type === 'farmer' ? user.phoneNumber : user.username}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const data = await response.json();
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  };

  const fetchNotifications = async (user: User) => {
    if (user.type !== 'farmer') return;
    
    try {
      const response = await fetch(`http://localhost:5000/farmer/${user.phoneNumber}/notifications`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchMerchantNotifications = async (user: User) => {
    if (user.type !== 'merchant') return;
    
    try {
      const response = await fetch(`http://localhost:5000/merchant/${user.username}/notifications`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching merchant notifications:', error);
      toast.error('Failed to load notifications');
    }
  };

  const handleOrder = async () => {
    if (!selectedFarmer || !orderCropId || !orderQuantity) {
      toast.error('Please select all required fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantUsername: user?.username,
          farmerPhone: selectedFarmer.phoneNumber,
          cropId: orderCropId,
          quantity: parseFloat(orderQuantity),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      toast.success('Order placed successfully');
      setShowOrderModal(false);
      setSelectedFarmer(null);
      setOrderCropId(0);
      setOrderQuantity('');
      fetchFarmers();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to place order');
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/order/${orderId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to accept order');
      }

      toast.success('Order accepted successfully');
      fetchNotifications(user!);
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/order/${orderId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reject order');
      }

      toast.success('Order rejected successfully');
      fetchNotifications(user!);
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Failed to reject order');
    }
  };

  const handleAcceptInquiry = async (notification: Notification) => {
    if (!notification.data?.merchantUsername || !notification.data?.cropId || !notification.data?.quantity) {
      toast.error('Invalid inquiry data');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantUsername: notification.data.merchantUsername,
          farmerPhone: user?.phoneNumber,
          cropId: notification.data.cropId,
          quantity: notification.data.quantity,
        }),
      });

      if (response.ok) {
        toast.success('Inquiry accepted and order created');
        // Refresh notifications
        if (user) {
          fetchNotifications(user);
        }
      } else {
        toast.error('Failed to accept inquiry');
      }
    } catch (error) {
      console.error('Error accepting inquiry:', error);
      toast.error('Failed to accept inquiry');
    }
  };

  const handleRejectInquiry = async (notification: Notification) => {
    if (!notification.data?.merchantUsername) {
      toast.error('Invalid inquiry data');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: user?.phoneNumber,
          to: notification.data.merchantUsername,
          message: 'పంట ఇంక్వైరీ తిరస్కరించబడింది',
          senderType: 'farmer',
          isRejection: true,
        }),
      });

      if (response.ok) {
        toast.success('Inquiry rejected');
        // Refresh notifications
        if (user) {
          fetchNotifications(user);
        }
      } else {
        toast.error('Failed to reject inquiry');
      }
    } catch (error) {
      console.error('Error rejecting inquiry:', error);
      toast.error('Failed to reject inquiry');
    }
  };

  const fetchMerchants = async () => {
    try {
      const response = await fetch('http://localhost:5000/merchants', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch merchants');
      }

      const data = await response.json();
      setMerchants(data);
    } catch (error) {
      console.error('Error fetching merchants:', error);
      toast.error('Failed to load merchants');
    }
  };

  const fetchFarmers = async () => {
    try {
      const response = await fetch('http://localhost:5000/farmers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch farmers');
      }

      const data = await response.json();
      setFarmers(data);
    } catch (error) {
      console.error('Error fetching farmers:', error);
      toast.error('Failed to load farmers');
    }
  };

  const fetchMarketInsights = async () => {
    try {
      const response = await fetch('http://localhost:5000/market-insights');
      if (response.ok) {
        const data = await response.json();
        setMarketInsights(data.insights);
      }
    } catch (error) {
      console.error('Error fetching market insights:', error);
    }
  };

  const handleAddCrop = async () => {
    if (!selectedCrop || !cropQuantity) {
      toast.error('Please select a crop and enter quantity');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/farmer/${userData.phoneNumber}/crops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cropId: selectedCrop,
          quantity: parseFloat(cropQuantity),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add crop');
      }

      toast.success('Crop added successfully');
      setShowCropModal(false);
      setSelectedCrop(0);
      setCropQuantity('');
      fetchUserData(user!);
    } catch (error) {
      console.error('Error adding crop:', error);
      toast.error('Failed to add crop');
    }
  };

  const handleUpdateFutureCrops = async () => {
    try {
      const response = await fetch(`http://localhost:5000/farmer/${userData.phoneNumber}/future-crops`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          futureCrops: selectedFutureCrops,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update future crops');
      }

      toast.success('Future crops updated successfully');
      fetchUserData(user!);
    } catch (error) {
      console.error('Error updating future crops:', error);
      toast.error('Failed to update future crops');
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact) {
      toast.error('Please select a contact');
      return;
    }

    if (user?.type === 'merchant') {
      if (!selectedMessageCrop || !messageQuantity) {
        toast.error('Please select crop and quantity');
        return;
      }

      const selectedCropData = crops.find(c => c.id === selectedMessageCrop);
      if (!selectedCropData) {
        toast.error('Invalid crop selected');
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/messages/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: user.username,
            to: selectedContact.phoneNumber,
            cropId: selectedMessageCrop,
            quantity: messageQuantity,
            senderType: 'merchant',
          }),
        });

        if (response.ok) {
          toast.success('Inquiry sent successfully');
          setMessageQuantity('');
          setSelectedMessageCrop(null);
          setShowMessageModal(false);
        } else {
          toast.error('Failed to send inquiry');
        }
      } catch (error) {
        console.error('Error sending inquiry:', error);
        toast.error('Failed to send inquiry');
      }
    } else {
      // Farmer's message sending logic
      if (!message.trim()) {
        toast.error('Please enter a message');
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/messages/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: user?.phoneNumber,
            to: selectedContact.username,
            message,
            senderType: 'farmer',
          }),
        });

        if (response.ok) {
          toast.success('Message sent successfully');
          setMessage('');
          setShowMessageModal(false);
        } else {
          toast.error('Failed to send message');
        }
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-[#4a8c3f] text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Tractor className="h-8 w-8" />
              <span className="text-xl font-bold">e-NAM Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">{user?.type === 'farmer' ? 'రైతు' : 'వ్యాపారి'}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-white text-[#4a8c3f] rounded-lg hover:bg-gray-100 transition-colors"
              >
                లాగ్అవుట్
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Market Insights Banner */}
      <div className="bg-[#3f7835] text-white py-2 overflow-hidden shadow-md">
        <div className="animate-marquee whitespace-nowrap flex">
          {marketInsights.map((insight, index) => (
            <React.Fragment key={insight.id}>
              <span className="mx-4 text-sm font-medium">
                {insight.category === 'price' && '💰'}
                {insight.category === 'demand' && '📈'}
                {insight.category === 'weather' && '🌤️'}
                {insight.message}
              </span>
              {index < marketInsights.length - 1 && (
                <span className="mx-4">•</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-8">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    onClick={() => setRetryCount(prev => prev + 1)}
                    className="mt-2 text-sm text-red-700 hover:text-red-600 font-medium"
                  >
                    మళ్ళీ ప్రయత్నించండి →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p className="text-gray-600">లోడ్ అవుతోంది...</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">సూచనలు</h2>
                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((notification: Notification) => (
                      <div 
                        key={notification.id} 
                        className={`border-l-4 p-4 rounded ${
                          notification.type === 'order_accepted' || notification.status === 'accepted'
                            ? 'bg-green-50 border-green-400'
                            : notification.type === 'order_rejected' || notification.status === 'rejected'
                            ? 'bg-red-50 border-red-400'
                            : 'bg-yellow-50 border-yellow-400'
                        }`}
                      >
                        <p className="text-sm text-gray-800">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                        
                        {/* Order Request Buttons */}
                        {notification.type === 'order_request' && notification.status === 'pending' && user?.type === 'farmer' && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleAcceptOrder(notification.id)}
                              className="bg-[#4a8c3f] text-white px-4 py-1 rounded hover:bg-[#3f7835] text-sm"
                            >
                              అంగీకరించు
                            </button>
                            <button
                              onClick={() => handleRejectOrder(notification.id)}
                              className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 text-sm"
                            >
                              తిరస్కరించు
                            </button>
                          </div>
                        )}

                        {/* Crop Inquiry Buttons */}
                        {notification.type === 'crop_inquiry' && notification.status === 'unread' && user?.type === 'farmer' && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleAcceptInquiry(notification)}
                              className="bg-[#4a8c3f] text-white px-4 py-1 rounded hover:bg-[#3f7835] text-sm"
                            >
                              అంగీకరించు
                            </button>
                            <button
                              onClick={() => handleRejectInquiry(notification)}
                              className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 text-sm"
                            >
                              తిరస్కరించు
                            </button>
                          </div>
                        )}

                        {notification.status === 'accepted' && (
                          <p className="text-green-600 text-sm mt-2">✓ అంగీకరించబడింది</p>
                        )}
                        {notification.status === 'rejected' && (
                          <p className="text-red-600 text-sm mt-2">✕ తిరస్కరించబడింది</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No notifications yet</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Total {user?.type === 'farmer' ? 'Crops' : 'Transactions'}</p>
                    <h3 className="text-2xl font-bold">{user?.type === 'farmer' ? userData?.currentCrops?.length || 0 : '157'}</h3>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <BarChart3 className="h-6 w-6 text-[#4a8c3f]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">{user?.type === 'farmer' ? 'Active Merchants' : 'Connected Farmers'}</p>
                    <h3 className="text-2xl font-bold">{user?.type === 'farmer' ? merchants.length : farmers.length}</h3>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Market Trend</p>
                    <h3 className="text-2xl font-bold text-green-600">+12.5%</h3>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <TrendingUp className="h-6 w-6 text-[#4a8c3f]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Weather</p>
                    <h3 className="text-2xl font-bold">{weatherData.temp}</h3>
                    <p className="text-sm text-gray-500">{weatherData.condition}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    {weatherData.condition === 'Sunny' ? (
                      <Sun className="h-6 w-6 text-yellow-600" />
                    ) : (
                      <Cloud className="h-6 w-6 text-gray-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {user?.type === 'farmer' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold">Current Crops</h2>
                      <button
                        onClick={() => setShowCropModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#4a8c3f] text-white rounded-lg hover:bg-[#3f7835] transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                        <span>Add Crop</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userData?.currentCrops?.map((crop: CropData) => (
                        <div key={crop.cropId} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{crops.find(c => c.id === crop.cropId)?.englishName}</h3>
                              <p className="text-sm text-gray-500">{crop.quantity} kg</p>
                            </div>
                            <Sprout className="h-5 w-5 text-[#4a8c3f]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-6">Connected Merchants</h2>
                  <div className="space-y-4">
                    {merchants.map((merchant, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{merchant.businessName}</h3>
                            <p className="text-sm text-gray-500">{merchant.location}</p>
                            <p className="text-sm text-[#4a8c3f]">{merchant.phoneNumber}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedContact(merchant);
                              setShowMessageModal(true);
                            }}
                            className="bg-[#4a8c3f] text-white px-4 py-2 rounded hover:bg-[#3f7835]"
                          >
                            సందేశం పంపండి
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-6">Available Crops</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {farmers.map((farmer, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-medium">{farmer.name}</h3>
                          <p className="text-sm text-gray-500">{farmer.location}</p>
                          <div className="mt-2">
                            {farmer.currentCrops.map((crop: CropData) => (
                              <span key={crop.cropId} className="inline-block bg-green-100 text-[#4a8c3f] text-sm px-2 py-1 rounded mr-2 mb-2">
                                {crops.find(c => c.id === crop.cropId)?.englishName} ({crop.quantity} kg)
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-6">Market Insights</h2>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium">Price Trends</h3>
                      <p className="text-sm text-gray-500">Wheat prices up by 5%</p>
                      <p className="text-sm text-gray-500">Rice demand increased</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium">Trading Volume</h3>
                      <p className="text-sm text-gray-500">Weekly volume: 1,200 tons</p>
                      <p className="text-sm text-green-600">+15% from last week</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Crop</h2>
              <button onClick={() => setShowCropModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddCrop} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Crop</label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                >
                  {crops.map((crop, index) => (
                    <option key={index} value={index}>
                      {crop.englishName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity (kg)</label>
                <input
                  type="number"
                  value={cropQuantity}
                  onChange={(e) => setCropQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                  min="1"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCropModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4a8c3f] text-white rounded-lg hover:bg-[#3f7835]"
                >
                  Add Crop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && selectedFarmer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Order Crops from {selectedFarmer.name}</h3>
              <button onClick={() => setShowOrderModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Crop</label>
                <select
                  value={orderCropId}
                  onChange={(e) => setOrderCropId(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value={0}>Select a crop</option>
                  {selectedFarmer.currentCrops.map((crop) => (
                    <option key={crop.cropId} value={crop.cropId}>
                      {crops.find(c => c.id === crop.cropId)?.englishName} (Available: {crop.quantity} kg)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
                <input
                  type="number"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter quantity in kg"
                  min="1"
                />
              </div>
              <button
                onClick={handleOrder}
                className="w-full bg-[#4a8c3f] text-white py-2 rounded-lg hover:bg-[#3f7835] transition-colors"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {user?.type === 'merchant' ? 'Send Crop Inquiry' : 'Send Message'}
            </h2>
            
            {user?.type === 'merchant' ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Crop
                  </label>
                  <select
                    value={selectedMessageCrop || ''}
                    onChange={(e) => setSelectedMessageCrop(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">Select a crop</option>
                    {selectedContact?.currentCrops.map((crop: CropData) => (
                      <option key={crop.cropId} value={crop.cropId}>
                        {crops.find(c => c.id === crop.cropId)?.englishName} (Available: {crop.quantity} kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity (kg)
                  </label>
                  <input
                    type="number"
                    value={messageQuantity}
                    onChange={(e) => setMessageQuantity(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Enter quantity in kg"
                    min="1"
                  />
                </div>
              </>
            ) : (
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 border rounded-lg mb-4 h-32"
                placeholder="Type your message here..."
              />
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedMessageCrop(null);
                  setMessageQuantity('');
                  setMessage('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-[#4a8c3f] text-white rounded hover:bg-[#3f7835]"
              >
                {user?.type === 'merchant' ? 'Send Inquiry' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Message Button in Connected Users Section */}
      {user?.type === 'farmer' ? (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Connected Merchants</h2>
          <div className="space-y-4">
            {merchants.map((merchant, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{merchant.businessName}</h3>
                    <p className="text-sm text-gray-500">{merchant.location}</p>
                    <p className="text-sm text-[#4a8c3f]">{merchant.phoneNumber}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedContact(merchant);
                      setShowMessageModal(true);
                    }}
                    className="bg-[#4a8c3f] text-white px-4 py-2 rounded hover:bg-[#3f7835]"
                  >
                    సందేశం పంపండి
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Connected Farmers</h2>
          <div className="space-y-4">
            {farmers.map((farmer, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{farmer.name}</h3>
                    <p className="text-sm text-gray-500">{farmer.location}</p>
                    <div className="mt-2">
                      {farmer.currentCrops.map((crop: CropData) => (
                        <span key={crop.cropId} className="inline-block bg-green-100 text-[#4a8c3f] text-sm px-2 py-1 rounded mr-2 mb-2">
                          {crops.find(c => c.id === crop.cropId)?.englishName} ({crop.quantity} kg)
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedContact(farmer);
                      setShowMessageModal(true);
                    }}
                    className="bg-[#4a8c3f] text-white px-4 py-2 rounded hover:bg-[#3f7835]"
                  >
                    సందేశం పంపండి
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Chatbot */}
      <ChatBot />
    </div>
  );
}