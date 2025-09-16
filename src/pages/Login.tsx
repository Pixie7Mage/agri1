import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Tractor } from 'lucide-react';
import loginBg from '../assets/login-bg.jpg';

export default function Login() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'farmer' | 'merchant'>('farmer');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    phoneNumber: '',
    otp: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const sendOtp = async () => {
    if (!formData.phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      toast.success('OTP sent successfully!');
      setOtpSent(true);
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send OTP. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userType,
          ...(userType === 'merchant' 
            ? { 
                username: formData.username,
                password: formData.password
              }
            : {
                phoneNumber: formData.phoneNumber,
                otp: formData.otp
              }
          )
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
         style={{
           backgroundImage: `url(${loginBg})`,
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundRepeat: 'no-repeat'
         }}>
      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl">
        <div>
          <div className="flex justify-center">
            <Tractor className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to E-NAM
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Login to access your account
          </p>
        </div>
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setUserType('farmer')}
              className={`px-4 py-2 rounded-md ${
                userType === 'farmer'
                  ? 'bg-[#4a8c3f] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Farmer
            </button>
            <button
              type="button"
              onClick={() => setUserType('merchant')}
              className={`px-4 py-2 rounded-md ${
                userType === 'merchant'
                  ? 'bg-[#4a8c3f] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Merchant
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {userType === 'merchant' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                    required
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit phone number"
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={sendOtp}
                      className="mt-1 px-4 py-2 bg-[#4a8c3f] text-white rounded-md hover:bg-[#3f7835]"
                    >
                      Send OTP
                    </button>
                  )}
                </div>
              </div>

              {otpSent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      name="otp"
                      value={formData.otp}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                      required
                      pattern="[0-9]{6}"
                      title="Please enter the 6-digit OTP"
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendOtp}
                    className="mt-2 text-sm text-[#4a8c3f] hover:text-[#3f7835]"
                  >
                    Resend OTP
                  </button>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end space-x-4">
            <Link
              to="/register"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Register
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#4a8c3f] text-white rounded-md hover:bg-[#3f7835] disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}