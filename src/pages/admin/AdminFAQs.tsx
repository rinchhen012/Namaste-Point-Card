import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';

interface FAQItem {
  id: string;
  question: { en: string; ja: string };
  answer: { en: string; ja: string };
  createdAt?: any; // Using any since the format varies
  updatedAt?: any; // Using any since the format varies
}

// Helper function to safely format dates
const formatDate = (dateValue: any): string => {
  if (!dateValue) return '';

  try {
    // Case 1: Firestore Timestamp with toDate() method
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate().toLocaleDateString();
    }

    // Case 2: Timestamp as seconds and nanoseconds
    if (dateValue.seconds !== undefined) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }

    // Case 3: Server timestamp (_seconds and _nanoseconds format)
    if (dateValue._seconds !== undefined) {
      return new Date(dateValue._seconds * 1000).toLocaleDateString();
    }

    // Case 4: ISO string date
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }

    // Case 5: Unix timestamp number
    if (typeof dateValue === 'number') {
      return new Date(dateValue).toLocaleDateString();
    }

    // Case 6: Server timestamp from Cloud Functions
    if (dateValue.value && dateValue.value._seconds) {
      return new Date(dateValue.value._seconds * 1000).toLocaleDateString();
    }

    // Case 7: Object with date fields - last resort
    if (typeof dateValue === 'object') {
      try {
        // Try constructing a date from the timestamp
        if (Object.prototype.hasOwnProperty.call(dateValue, 'timestamp')) {
          return new Date(dateValue.timestamp).toLocaleDateString();
        }

        // Try treating the whole object as a timestamp
        const date = new Date(JSON.parse(JSON.stringify(dateValue)));
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      } catch (err) {
        // Silently fail and return default
      }
    }

    return 'Date unavailable';
  } catch (err) {
    return 'Date format error';
  }
};

const AdminFAQs: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<string | null>(null);

  // State for form values
  const [isEditing, setIsEditing] = useState(false);
  const [currentFaqId, setCurrentFaqId] = useState<string | null>(null);
  const [questionEn, setQuestionEn] = useState('');
  const [questionJa, setQuestionJa] = useState('');
  const [answerEn, setAnswerEn] = useState('');
  const [answerJa, setAnswerJa] = useState('');

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the Cloud Function to get FAQs
      const getFAQs = httpsCallable(functions, 'getFAQsForUser');
      const result = await getFAQs();

      // Parse the result data
      const data = result.data as { success: boolean; faqs: FAQItem[] };

      if (data.success) {
        setFaqs(data.faqs || []);
      } else {
        throw new Error('Failed to fetch FAQ items');
      }
    } catch (err: any) {
      console.error('Error fetching FAQs:', err);
      setError(err.message || 'Failed to load FAQ items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentFaqId(null);
    setQuestionEn('');
    setQuestionJa('');
    setAnswerEn('');
    setAnswerJa('');
    setIsEditing(false);
  };

  const handleEditFaq = (faq: FAQItem) => {
    setCurrentFaqId(faq.id);
    setQuestionEn(faq.question.en);
    setQuestionJa(faq.question.ja);
    setAnswerEn(faq.answer.en);
    setAnswerJa(faq.answer.ja);
    setIsEditing(true);

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (faqId: string) => {
    setFaqToDelete(faqId);
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    if (!faqToDelete) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Use the Cloud Function to delete the FAQ
      const manageFAQItem = httpsCallable(functions, 'manageFAQItem');
      const result = await manageFAQItem({
        id: faqToDelete,
        action: 'delete'
      });

      // Parse the result
      const data = result.data as { success: boolean; message: string };

      if (data.success) {
        setSuccess('FAQ item deleted successfully');
        // Remove the deleted FAQ from state
        setFaqs(prevFaqs => prevFaqs.filter(faq => faq.id !== faqToDelete));
      } else {
        throw new Error(data.message || 'Failed to delete FAQ item');
      }
    } catch (err: any) {
      console.error('Error deleting FAQ:', err);
      setError(err.message || 'Failed to delete FAQ item. Please try again.');
    } finally {
      setSaving(false);
      setShowDeleteConfirmation(false);
      setFaqToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setFaqToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form fields
    if (!questionEn.trim() || !questionJa.trim() || !answerEn.trim() || !answerJa.trim()) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = {
        id: currentFaqId || undefined,
        question: { en: questionEn, ja: questionJa },
        answer: { en: answerEn, ja: answerJa },
        action: isEditing ? 'update' : 'create'
      };

      // Use the Cloud Function to create or update the FAQ
      const manageFAQItem = httpsCallable(functions, 'manageFAQItem');
      const result = await manageFAQItem(formData);

      // Parse the result
      const data = result.data as {
        success: boolean;
        message: string;
        id?: string;
      };

      if (data.success) {
        setSuccess(isEditing ? 'FAQ item updated successfully' : 'FAQ item created successfully');

        // Refresh FAQs to get the latest data
        await fetchFAQs();

        // Reset form
        resetForm();
      } else {
        throw new Error(data.message || 'Operation failed');
      }
    } catch (err: any) {
      console.error('Error managing FAQ:', err);
      setError(err.message || 'Failed to save FAQ item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  if (loading && faqs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">FAQ Management</h1>

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

      {/* FAQ Form */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          {isEditing ? 'Edit FAQ Item' : 'Create New FAQ Item'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="questionEn" className="block text-sm font-medium text-gray-700 mb-1">
              Question (English)
            </label>
            <input
              type="text"
              id="questionEn"
              value={questionEn}
              onChange={(e) => setQuestionEn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="questionJa" className="block text-sm font-medium text-gray-700 mb-1">
              Question (Japanese)
            </label>
            <input
              type="text"
              id="questionJa"
              value={questionJa}
              onChange={(e) => setQuestionJa(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="answerEn" className="block text-sm font-medium text-gray-700 mb-1">
              Answer (English)
            </label>
            <textarea
              id="answerEn"
              value={answerEn}
              onChange={(e) => setAnswerEn(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="answerJa" className="block text-sm font-medium text-gray-700 mb-1">
              Answer (Japanese)
            </label>
            <textarea
              id="answerJa"
              value={answerJa}
              onChange={(e) => setAnswerJa(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Saving...' : isEditing ? 'Update FAQ' : 'Create FAQ'}
            </button>
          </div>
        </form>
      </div>

      {/* FAQ List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700">FAQ Items</h2>
        </div>

        {faqs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No FAQ items found. Create your first one above.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{faq.question.en}</h3>
                    <h4 className="text-sm text-gray-600 mt-1">{faq.question.ja}</h4>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEditFaq(faq)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(faq.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-gray-800">{faq.answer.en}</p>
                  <p className="text-sm text-gray-600 mt-1">{faq.answer.ja}</p>
                </div>
                {faq.createdAt && (
                  <div className="mt-3 text-xs text-gray-500">
                    Created: {formatDate(faq.createdAt)}
                    {faq.updatedAt && ` • Updated: ${formatDate(faq.updatedAt)}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this FAQ item? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={saving}
                className={`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFAQs;
