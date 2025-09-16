import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tractor } from 'lucide-react';
import toast from 'react-hot-toast';

type UserType = 'farmer' | 'merchant';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>('farmer');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    pinCode: '',
    aadharNumber: '',
    vid: '',
    phoneNumber: '',
    businessName: '',
    gstNumber: '',
    businessAddress: '',
  });

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState('');

  const [generatedUsername, setGeneratedUsername] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PNG or JPEG image');
      return;
    }

    // Validate file size (max 16MB)
    const maxSize = 16 * 1024 * 1024; // 16MB in bytes
    if (file.size > maxSize) {
      toast.error('File size must be less than 16MB');
      return;
    }

    setIsProcessingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process image');
      }

      console.log('Received data from backend:', data);

      setFormData(prev => {
        if (userType === 'farmer') { // Only update for farmers
          return {
            ...prev,
            name: data.name || prev.name,
            dateOfBirth: data.dob || prev.dateOfBirth,
            gender: data.gender || prev.gender,
            address: data.address || prev.address,
            pinCode: data.pincode || prev.pinCode,
            aadharNumber: data.aadhaar || prev.aadharNumber,
            vid: data.vid || prev.vid,
            phoneNumber: data.mobile || prev.phoneNumber,
          };
        }
        return prev; // Don't update merchant name
      });
      

      toast.success('Information extracted successfully!');
    } catch (error: any) {
      console.error('Error processing image:', error);
      toast.error(error.message || 'Failed to process image. Please fill in the details manually.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const sendOtp = async () => {
    if (!formData.phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: formData.phoneNumber 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      toast.success('OTP sent successfully!');
      setOtpSent(true);
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send OTP. Please try again.');
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: formData.phoneNumber,
          otp: otp 
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid OTP');
      }

      toast.success('OTP verified successfully!');
      setOtpVerified(true);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Invalid OTP. Please try again.');
    }
  };

  const generateMerchantUsername = (businessName: string) => {
    // Generate a unique username based on business name and random numbers
    const cleanBusinessName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${cleanBusinessName.slice(0, 12)}${randomNum}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (userType === 'farmer' && !otpVerified) {
        toast.error('Please verify your phone number with OTP');
        setLoading(false);
        return;
      }

      console.log('Starting registration process...');
      
      // Prepare registration data
      const registrationData = {
        ...formData,
        ...(userType === 'merchant' ? {
          businessAddress: formData.businessAddress || formData.address
        } : {})
      };

      // Remove phone number if it's empty for merchant
      if (userType === 'merchant' && !formData.phoneNumber) {
        formData.phoneNumber = null;
      }
      
      const response = await fetch(`http://localhost:5000/register/${userType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (userType === 'merchant' && data.username) {
        setGeneratedUsername(data.username);
        setShowUsernameModal(true);
      } else {
        toast.success('Registration successful!');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f2]">
      <nav className="bg-[#4a8c3f] text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Tractor className="h-8 w-8" />
            <span className="text-xl font-semibold">e-NAM Registration</span>
          </div>
          <Link to="/" className="hover:text-green-200">Back to Login</Link>
        </div>
      </nav>

      <div className="container mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-[#4a8c3f] mb-6">e-NAM Registration Form</h2>

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
            {userType === 'merchant' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {userType === 'farmer' && (
              <>
                <div className="bg-[#f8faf5] p-4 rounded-md border border-[#4a8c3f] mb-6">
                  <div className="mb-4">
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
                        disabled={otpVerified}
                      />
                      {!otpSent && !otpVerified && (
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

                  {otpSent && !otpVerified && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                          required
                          pattern="[0-9]{6}"
                          title="Please enter the 6-digit OTP"
                          maxLength={6}
                        />
                        <button
                          type="button"
                          onClick={verifyOtp}
                          className="mt-1 px-4 py-2 bg-[#4a8c3f] text-white rounded-md hover:bg-[#3f7835]"
                        >
                          Verify OTP
                        </button>
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

                  {otpVerified && (
                    <div className="text-green-600 font-medium">
                      ✓ Phone number verified successfully
                    </div>
                  )}
                </div>

                <div className="bg-[#f8faf5] p-4 rounded-md border border-[#4a8c3f] mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ఆధార్ కార్డ్‌లో డాక్యుమెంట్‌ను అప్‌లోడ్ ఆకుపచ్చ బటన్‌ను క్లిక్ చేయండి</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-[#4a8c3f] file:text-white
                      hover:file:bg-[#3f7835]"
                  />
                  {isProcessingImage && (
                    <div className="mt-2 text-sm text-gray-500">Processing image...</div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                      required
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIN Code</label>
                    <input
                      type="text"
                      name="pinCode"
                      value={formData.pinCode}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                    <input
                      type="text"
                      name="aadharNumber"
                      value={formData.aadharNumber}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">VID</label>
                    <input
                      type="text"
                      name="vid"
                      value={formData.vid}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                    />
                  </div>
                </div>
              </>
            )}

            {userType === 'merchant' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    required
                    value={formData.businessName}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                    minLength={6}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Business Address</label>
                  <textarea
                    name="businessAddress"
                    required
                    value={formData.businessAddress}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4a8c3f] focus:ring-[#4a8c3f]"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#4a8c3f] text-white rounded-md hover:bg-[#3f7835] disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Username Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold text-[#4a8c3f] mb-4">Registration Successful!</h3>
            <p className="mb-4">Your merchant account has been created. Please save your username for future login:</p>
            <div className="bg-gray-100 p-3 rounded-md mb-4">
              <p className="text-lg font-mono text-center">{generatedUsername}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowUsernameModal(false);
                  navigate('/');
                }}
                className="px-4 py-2 bg-[#4a8c3f] text-white rounded-md hover:bg-[#3f7835]"
              >
                Continue to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}