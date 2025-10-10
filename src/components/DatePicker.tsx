'use client';

import { useState, useRef, useEffect } from 'react';
import { format, addDays, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns';

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  shortcuts?: boolean; // Show quick date shortcuts
  disabled?: boolean;
}

const QuickShortcuts = [
  { label: 'Today', getValue: () => new Date() },
  { label: 'Tomorrow', getValue: () => addDays(new Date(), 1) },
  { label: '1 Week', getValue: () => addDays(new Date(), 7) },
  { label: '1 Month', getValue: () => addMonths(new Date(), 1) },
  { label: '3 Months', getValue: () => addMonths(new Date(), 3) },
  { label: '6 Months', getValue: () => addMonths(new Date(), 6) },
];

/**
 * Smart Date Picker Component
 * Features:
 * - Quick date shortcuts (Today, Tomorrow, 1 Week, etc.)
 * - Calendar month view
 * - Min/max date constraints
 * - Keyboard navigation
 * - Mobile-friendly design
 */
export default function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  error,
  required,
  minDate,
  maxDate,
  shortcuts = true,
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDateSelect = (date: Date) => {
    onChange(date);
    setIsOpen(false);
  };

  const handleShortcutClick = (getValue: () => Date) => {
    const date = getValue();
    onChange(date);
    setIsOpen(false);
  };

  const isDateDisabled = (date: Date) => {
    const dateStart = startOfDay(date);
    if (minDate && isBefore(dateStart, startOfDay(minDate))) return true;
    if (maxDate && isBefore(startOfDay(maxDate), dateStart)) return true;
    return false;
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const previousMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="w-full" ref={containerRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Input Field */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-left flex items-center justify-between ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-white/20 focus:ring-purple-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={value ? 'text-white' : 'text-gray-400'}>
          {value ? format(value, 'MMM dd, yyyy') : placeholder}
        </span>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-400 flex items-start gap-1">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-gray-900 border border-white/20 rounded-xl shadow-2xl p-4 w-full md:w-96 animate-fade-in">
          {/* Quick Shortcuts */}
          {shortcuts && (
            <div className="mb-4 pb-4 border-b border-white/10">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Quick Select
              </div>
              <div className="grid grid-cols-3 gap-2">
                {QuickShortcuts.map((shortcut) => (
                  <button
                    key={shortcut.label}
                    onClick={() => handleShortcutClick(shortcut.getValue)}
                    className="px-3 py-2 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 rounded-lg text-xs font-medium text-gray-300 hover:text-purple-300 transition-all"
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-white font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((date, index) => {
              const disabled = isDateDisabled(date);
              const selected = value && format(date, 'yyyy-MM-dd') === format(value, 'yyyy-MM-dd');
              const today = isToday(date);

              return (
                <button
                  key={index}
                  onClick={() => !disabled && handleDateSelect(date)}
                  disabled={disabled}
                  className={`
                    p-2 rounded-lg text-sm font-medium transition-all
                    ${disabled ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-white/10'}
                    ${selected ? 'bg-purple-500 text-white hover:bg-purple-600' : ''}
                    ${today && !selected ? 'ring-1 ring-purple-500/50' : ''}
                    ${!isSameMonth(date, currentMonth) ? 'opacity-30' : ''}
                  `}
                >
                  {format(date, 'd')}
                </button>
              );
            })}
          </div>

          {/* Clear Button */}
          {value && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 rounded-lg text-sm font-medium text-gray-300 hover:text-red-300 transition-all"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
