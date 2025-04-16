import React, { useState, useEffect, useRef } from 'react';


import { getAllRewardsList, createNewReward, updateExistingReward, deleteExistingReward, uploadRewardImage } from '../../firebase/adminServices';
import { Reward } from '../../types';
import ConfirmationModal from '../../components/Admin/ConfirmationModal';

interface RewardFormData {
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  pointsCost: number;
  imageFile: File | null;
  isActive: boolean;
  imageUrl?: string;
}

const AdminRewards: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRewardId, setDeletingRewardId] = useState<string | null>(null);
  const [deletingRewardName, setDeletingRewardName] = useState<string>('');
  const [formData, setFormData] = useState<RewardFormData>({
    name: '',
    nameJa: '',
    description: '',
    descriptionJa: '',
    pointsCost: 10,
    imageFile: null,
    isActive: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedRewards = await getAllRewardsList();
      setRewards(fetchedRewards);
    } catch (err) {
      console.error('Error fetching rewards:', err);
      setError('Failed to load rewards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rewardId: string, isCurrentlyActive: boolean) => {
    try {
      await updateExistingReward(rewardId, { isActive: !isCurrentlyActive });

      // Update local state
      setRewards(prev =>
        prev.map(reward =>
          reward.id === rewardId
            ? { ...reward, isActive: !isCurrentlyActive }
            : reward
        )
      );
    } catch (err) {
      console.error('Error updating reward status:', err);
      setError('Failed to update reward status. Please try again.');
    }
  };

  const openModal = () => {
    setShowModal(true);
    // Reset form data
    setFormData({
      name: '',
      nameJa: '',
      description: '',
      descriptionJa: '',
      pointsCost: 10,
      imageFile: null,
      isActive: true
    });
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const openEditModal = (reward: Reward) => {
    setShowEditModal(true);
    setEditingRewardId(reward.id);
    // Set form data with reward data
    setFormData({
      name: reward.name,
      nameJa: reward.nameJa,
      description: reward.description,
      descriptionJa: reward.descriptionJa,
      pointsCost: reward.pointsCost,
      imageFile: null,
      isActive: reward.isActive,
      imageUrl: reward.imageUrl
    });
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingRewardId(null);
  };

  const openDeleteConfirm = (rewardId: string, rewardName: string) => {
    setDeletingRewardId(rewardId);
    setDeletingRewardName(rewardName);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setDeletingRewardId(null);
    setDeletingRewardName('');
    setShowDeleteConfirm(false);
  };

  const handleDeleteReward = async () => {
    if (!deletingRewardId) return;

    try {
      setFormSubmitting(true);
      setError(null);

      await deleteExistingReward(deletingRewardId);

      // Remove reward from local state
      setRewards(prev => prev.filter(reward => reward.id !== deletingRewardId));

      // Close confirmation modal & reset state
      closeDeleteConfirm();

    } catch (err) {
      console.error('Error deleting reward:', err);
      setError('Failed to delete reward. Please check if it is linked to any redemptions.');
      // Ensure deleting state is cleared even on error
      closeDeleteConfirm();
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        imageFile: e.target.files![0]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setFormSubmitting(true);
      setError(null);

      const { imageFile, imageUrl, ...rewardData } = formData;

      // Upload image if provided
      let newImageUrl = imageUrl || '';
      if (imageFile) {
        newImageUrl = await uploadRewardImage(imageFile);
      }

      // Create new reward
      const newReward = await createNewReward({
        ...rewardData,
        imageUrl: newImageUrl
      });

      // Add new reward to the list
      setRewards(prev => [newReward, ...prev]);

      // Close modal
      closeModal();

    } catch (err) {
      console.error('Error creating reward:', err);
      setError('Failed to create reward. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingRewardId) return;

    try {
      setFormSubmitting(true);
      setError(null);

      const { imageFile, imageUrl, ...rewardData } = formData;

      // Upload image if provided
      let newImageUrl = imageUrl || '';
      if (imageFile) {
        newImageUrl = await uploadRewardImage(imageFile, editingRewardId);
      }

      // Prepare update data
      const updateData = {
        ...rewardData,
        imageUrl: newImageUrl
      };

      // Update reward
      await updateExistingReward(editingRewardId, updateData);

      // Update local state
      setRewards(prev =>
        prev.map(reward =>
          reward.id === editingRewardId
            ? { ...reward, ...updateData }
            : reward
        )
      );

      // Close modal
      closeEditModal();

    } catch (err) {
      console.error('Error updating reward:', err);
      setError('Failed to update reward. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };


  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Coupon Management</h1>
        <button
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          onClick={openModal}
        >
          Add New Reward
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col border-2 ${
                reward.isActive
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              {reward.imageUrl && (
                <div className="w-full h-40 bg-gray-200 flex-shrink-0">
                  <img
                    src={reward.imageUrl}
                    alt={reward.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-semibold text-gray-800 flex-1 mr-2 truncate">{reward.name}</h2>
                </div>
                <p className="text-sm text-gray-600 mb-1">{reward.nameJa}</p>
                <p className="text-sm text-gray-700 mb-2 line-clamp-3">{reward.description}</p>
                <p className="text-sm text-gray-500 line-clamp-2">{reward.descriptionJa}</p>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center mt-auto">
                <span className="font-bold text-orange-600">{reward.pointsCost} pts</span>
                <div className="space-x-2 flex items-center">
                  <button
                    onClick={() => handleToggleActive(reward.id, reward.isActive)}
                    className="px-3 py-1 text-xs rounded hover:bg-blue-100 text-blue-700"
                    title={reward.isActive ? 'Deactivate Reward' : 'Activate Reward'}
                  >
                    {reward.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEditModal(reward)}
                    className="px-3 py-1 text-xs rounded hover:bg-gray-200 text-gray-700"
                    title="Edit Reward"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(reward.id, reward.name)}
                    className="px-3 py-1 text-xs rounded hover:bg-red-100 text-red-700"
                    title="Delete Reward"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {rewards.length === 0 && !loading && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No rewards found. Create your first reward!
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Add New Reward</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name (English)
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="nameJa" className="block text-sm font-medium text-gray-700 mb-1">
                    Name (Japanese)
                  </label>
                  <input
                    type="text"
                    id="nameJa"
                    name="nameJa"
                    value={formData.nameJa}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (English)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="descriptionJa" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Japanese)
                </label>
                <textarea
                  id="descriptionJa"
                  name="descriptionJa"
                  value={formData.descriptionJa}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="pointsCost" className="block text-sm font-medium text-gray-700 mb-1">
                  Points Required
                </label>
                <input
                  type="number"
                  id="pointsCost"
                  name="pointsCost"
                  value={formData.pointsCost}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700 mb-1">
                  Reward Image
                </label>
                <input
                  type="file"
                  id="imageFile"
                  name="imageFile"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Recommended size: 400x300 pixels. Max size: 2MB.
                </p>
              </div>

              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active (immediately available to users)
                </label>
              </div>


              <div className="flex justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded mr-2 hover:bg-gray-200"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 ${formSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    'Create Reward'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Edit Reward</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name (English)
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-nameJa" className="block text-sm font-medium text-gray-700 mb-1">
                    Name (Japanese)
                  </label>
                  <input
                    type="text"
                    id="edit-nameJa"
                    name="nameJa"
                    value={formData.nameJa}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (English)
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="edit-descriptionJa" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Japanese)
                </label>
                <textarea
                  id="edit-descriptionJa"
                  name="descriptionJa"
                  value={formData.descriptionJa}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="edit-pointsCost" className="block text-sm font-medium text-gray-700 mb-1">
                  Points Required
                </label>
                <input
                  type="number"
                  id="edit-pointsCost"
                  name="pointsCost"
                  value={formData.pointsCost}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              <div className="mb-4">
                {formData.imageUrl && (
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Image
                    </label>
                    <img
                      src={formData.imageUrl}
                      alt="Current reward"
                      className="h-24 w-full object-contain rounded border border-gray-300"
                      loading="lazy"
                    />
                  </div>
                )}

                <label htmlFor="edit-imageFile" className="block text-sm font-medium text-gray-700 mb-1">
                  Change Reward Image
                </label>
                <input
                  type="file"
                  id="edit-imageFile"
                  name="imageFile"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty to keep current image. Recommended size: 400x300 pixels. Max size: 2MB.
                </p>
              </div>

              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="edit-isActive" className="ml-2 block text-sm text-gray-700">
                  Active (immediately available to users)
                </label>
              </div>


              <div className="flex justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded mr-2 hover:bg-gray-200"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 ${formSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    'Update Reward'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={handleDeleteReward}
        title="Confirm Reward Deletion"
        message={`Are you sure you want to delete the reward "${deletingRewardName}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        confirmButtonColor="red"
        isLoading={formSubmitting}
      />
    </div>
  );
};

export default AdminRewards;
