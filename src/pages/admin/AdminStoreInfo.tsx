import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';

interface StoreInfo {
  name: string;
  address: { en: string; ja: string };
  phone: string;
  email: string;
  hours: { en: string; ja: string };
  website: string;
  googleMapsUrl: string;
  imageUrl?: string;
}

const AdminStoreInfo: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [documentExists, setDocumentExists] = useState(false);

  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: '',
    address: { en: '', ja: '' },
    phone: '',
    email: '',
    hours: { en: '', ja: '' },
    website: '',
    googleMapsUrl: '',
    imageUrl: ''
  });

  useEffect(() => {
    const fetchStoreInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use Cloud Function instead of direct Firestore access
        const getStoreInfo = httpsCallable(functions, 'getStoreInfo');
        const result = await getStoreInfo();

        // Parse the result data
        const data = result.data as {
          success: boolean;
          exists: boolean;
          storeInfo: StoreInfo | null;
        };

        if (data.success) {
          if (data.exists && data.storeInfo) {
            setStoreInfo(data.storeInfo);
            if (data.storeInfo.imageUrl) {
              setImagePreview(data.storeInfo.imageUrl);
            }
            setDocumentExists(true);
          } else {
            console.log('No store info document found. Will create on save.');
            setDocumentExists(false);
          }
        } else {
          throw new Error('Failed to fetch store information');
        }
      } catch (err: any) {
        console.error('Error fetching store information:', err);
        setError(err.message || 'Failed to load store information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchStoreInfo();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setStoreInfo(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof StoreInfo] as object,
          [child]: value
        }
      }));
    } else {
      setStoreInfo(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return storeInfo.imageUrl || null;

    try {
      const storageRef = ref(storage, `public/store/${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      return getDownloadURL(storageRef);
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload image. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Upload image if selected
      let imageUrl = storeInfo.imageUrl;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const updatedStoreInfo = {
        ...storeInfo,
        imageUrl
      };

      // Instead of direct Firestore write, use a Cloud Function
      const updateStoreInfo = httpsCallable(functions, 'updateStoreInfo');

      const result = await updateStoreInfo({
        storeInfo: updatedStoreInfo,
        create: !documentExists
      });

      // Access the result data
      const data = result.data as { success: boolean; message: string };

      if (data.success) {
        setSuccess('Store information updated successfully!');
        setDocumentExists(true);
        setImageFile(null);
      } else {
        throw new Error(data.message || 'Operation failed');
      }
    } catch (err: any) {
      console.error('Error updating store information:', err);
      setError(err.message || 'Failed to update store information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Store Information</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {!documentExists && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          No store information has been set up yet. Complete the form below to create it.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Restaurant Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={storeInfo.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="address.en" className="block text-sm font-medium text-gray-700 mb-1">
              Address (English)
            </label>
            <textarea
              id="address.en"
              name="address.en"
              value={storeInfo.address.en}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label htmlFor="address.ja" className="block text-sm font-medium text-gray-700 mb-1">
              Address (Japanese)
            </label>
            <textarea
              id="address.ja"
              name="address.ja"
              value={storeInfo.address.ja}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={storeInfo.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={storeInfo.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="hours.en" className="block text-sm font-medium text-gray-700 mb-1">
              Opening Hours (English)
            </label>
            <textarea
              id="hours.en"
              name="hours.en"
              value={storeInfo.hours.en}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label htmlFor="hours.ja" className="block text-sm font-medium text-gray-700 mb-1">
              Opening Hours (Japanese)
            </label>
            <textarea
              id="hours.ja"
              name="hours.ja"
              value={storeInfo.hours.ja}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={storeInfo.website}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label htmlFor="googleMapsUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Google Maps URL
            </label>
            <input
              type="url"
              id="googleMapsUrl"
              name="googleMapsUrl"
              value={storeInfo.googleMapsUrl}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Restaurant Image
          </label>
          <div className="flex items-center space-x-4">
            <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
              {imagePreview ? (
                <img src={imagePreview} alt="Restaurant preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">No image</span>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label
                htmlFor="imageUpload"
                className="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer"
              >
                Choose Image
              </label>
              {imageFile && (
                <p className="mt-2 text-sm text-gray-600">{imageFile.name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {saving ? 'Saving...' : documentExists ? 'Update Information' : 'Create Information'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminStoreInfo;
