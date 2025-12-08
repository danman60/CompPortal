'use client';

import { Fragment } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';
import {
  ChevronDown,
  RefreshCw,
  FileText,
  Mail,
  Eye,
  EyeOff,
  RotateCcw,
  Trash2,
} from 'lucide-react';

/**
 * ActionsDropdown Component
 *
 * Groups infrequently-used schedule actions into a compact dropdown menu.
 * Part of the top bar reorganization to reduce vertical space.
 */

interface ActionsDropdownProps {
  onRefresh: () => void;
  onExportPDF: () => void;
  onSaveAndEmail: () => void;
  onViewStudioSchedule: () => void;
  onManageVisibility: () => void;
  onResetDay: () => void;
  onResetAll: () => void;
  isRefreshing?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
}

export function ActionsDropdown({
  onRefresh,
  onExportPDF,
  onSaveAndEmail,
  onViewStudioSchedule,
  onManageVisibility,
  onResetDay,
  onResetAll,
  isRefreshing = false,
  isSaving = false,
  disabled = false,
}: ActionsDropdownProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        disabled={disabled}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          bg-gray-700 text-gray-200 border border-gray-600
          hover:bg-gray-600 transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        Actions
        <ChevronDown className="h-4 w-4" />
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-lg bg-gray-800 border border-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {/* Refresh */}
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className={`
                    ${active ? 'bg-gray-700' : ''}
                    ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}
                    flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-200
                  `}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              )}
            </MenuItem>

            {/* Export PDF */}
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onExportPDF}
                  className={`
                    ${active ? 'bg-gray-700' : ''}
                    flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-200
                  `}
                >
                  <FileText className="h-4 w-4" />
                  Export PDF
                </button>
              )}
            </MenuItem>

            {/* Save & Email Studios */}
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onSaveAndEmail}
                  disabled={isSaving}
                  className={`
                    ${active ? 'bg-gray-700' : ''}
                    ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                    flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-200
                  `}
                >
                  <Mail className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save & Email Studios'}
                </button>
              )}
            </MenuItem>

            <div className="my-1 border-t border-gray-700" />

            {/* View Studio Schedule */}
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onViewStudioSchedule}
                  className={`
                    ${active ? 'bg-gray-700' : ''}
                    flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-200
                  `}
                >
                  <Eye className="h-4 w-4" />
                  View Studio Schedule
                </button>
              )}
            </MenuItem>

            {/* Manage Visibility */}
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onManageVisibility}
                  className={`
                    ${active ? 'bg-gray-700' : ''}
                    flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-200
                  `}
                >
                  <EyeOff className="h-4 w-4" />
                  Manage Visibility
                </button>
              )}
            </MenuItem>

            <div className="my-1 border-t border-gray-700" />

            {/* Reset Day - Warning color */}
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onResetDay}
                  className={`
                    ${active ? 'bg-yellow-900/30' : ''}
                    flex w-full items-center gap-3 px-4 py-2 text-sm text-yellow-400
                  `}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Day
                </button>
              )}
            </MenuItem>

            {/* Reset All - Danger color */}
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onResetAll}
                  className={`
                    ${active ? 'bg-red-900/30' : ''}
                    flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400
                  `}
                >
                  <Trash2 className="h-4 w-4" />
                  Reset All
                </button>
              )}
            </MenuItem>
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
