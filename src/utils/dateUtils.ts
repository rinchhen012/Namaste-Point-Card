import { format } from 'date-fns';

/**
 * Formats a date to YYYY/MM/DD format
 * @param date - Date object or Firebase timestamp
 * @returns Formatted date string in YYYY/MM/DD format
 */
export const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  
  try {
    // Handle Firebase Timestamp
    if (typeof date.toDate === 'function') {
      return format(date.toDate(), 'yyyy/MM/dd');
    }
    
    // Handle Date objects or timestamp numbers
    return format(new Date(date), 'yyyy/MM/dd');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Formats a date to YYYY/MM/DD HH:mm format (with time)
 * @param date - Date object or Firebase timestamp
 * @returns Formatted date string in YYYY/MM/DD HH:mm format
 */
export const formatDateTime = (date: any): string => {
  if (!date) return 'N/A';
  
  try {
    // Handle Firebase Timestamp
    if (typeof date.toDate === 'function') {
      return format(date.toDate(), 'yyyy/MM/dd HH:mm');
    }
    
    // Handle Date objects or timestamp numbers
    return format(new Date(date), 'yyyy/MM/dd HH:mm');
  } catch (error) {
    console.error('Error formatting date time:', error);
    return 'Invalid Date';
  }
};

/**
 * Determines if a date is in the past
 * @param date - Date object or Firebase timestamp
 * @returns Boolean indicating if date is in the past
 */
export const isDateExpired = (date: any): boolean => {
  if (!date) return false;
  
  try {
    const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
    return dateObj < new Date();
  } catch (error) {
    console.error('Error checking if date is expired:', error);
    return false;
  }
}; 